import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";
import { db } from "../db";
import { 
  patients, 
  goals, 
  subgoals, 
  sessions, 
  sessionNotes, 
  goalAssessments, 
  strategies, 
  clinicians,
  patientClinicians,
  caregivers
} from "../../shared/schema";
import { 
  chatSessions, 
  chatMessages, 
  queryLogs, 
  chatMemories, 
  chatSummaries 
} from "../../shared/schema/chatbot";
import { eq, like, and, or, desc, asc, sql } from "drizzle-orm";
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { entityExtractionService } from "./entityExtractionService";
import { patientQueriesService } from "./patientQueriesService";
import { responseGenerationService } from "./responseGenerationService";
import { queryClassificationService } from "./queryClassificationService";
import { memoryService } from "./memoryService";
import { reactAgentService } from "./reactAgentService";
import { conversationManagementService } from "./conversationManagementService";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a schema representation for the LLM
const schemaDescription = `
Database Tables:
- patients: Contains patient information (id, name, dateOfBirth, gender, etc.)
- goals: Contains patient goals (id, patientId, title, description, importanceLevel, status)
- subgoals: Contains subgoals for each goal (id, goalId, title, description, status, completionDate)
- sessions: Contains therapy session information (id, patientId, therapistId, title, description, sessionDate, duration, status)
- sessionNotes: Contains notes from therapy sessions (id, sessionId, patientId, presentCaregivers, moodRating, notes)
- goalAssessments: Contains assessments of goals (id, sessionNoteId, goalId, subgoalId, achievementLevel, score, notes)
- strategies: Contains therapy strategies (id, name, category, description, effectiveness)
- clinicians: Contains clinician information (id, name, title, email, specialization)
- patientClinicians: Maps patients to clinicians (id, patientId, clinicianId, role)
- caregivers: Contains information about patient caregivers (id, patientId, name, relationship, email)

Common Relationships:
- patients have many goals
- goals have many subgoals
- patients have many sessions
- sessions have one sessionNote
- sessionNotes have many goalAssessments
- patients have many clinicians through patientClinicians
- patients have many caregivers
`;

// Create a class for the chatbot service
export class ChatbotService {
  private model: ChatOpenAI;
  private sessionId: number | null = null;
  private vectorStore: HNSWLib | null = null;
  private vectorStoreAvailable: boolean = true;
  
  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.2,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    // Initialize vector store
    this.initVectorStore();
  }
  
  private async initVectorStore() {
    try {
      // Create a new vector store
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
      
      this.vectorStore = new HNSWLib(
        embeddings,
        { space: 'cosine' }
      );
      
      // Load existing memories from the database
      const existingMemories = await db
        .select()
        .from(chatMemories);
      
      if (existingMemories.length > 0) {
        // Add existing memories to the vector store
        await this.vectorStore.addDocuments(
          existingMemories.map(memory => ({
            pageContent: memory.content,
            metadata: {
              id: memory.id,
              chatSessionId: memory.chatSessionId,
              createdAt: memory.createdAt,
            },
          }))
        );
      }
      
      this.vectorStoreAvailable = true;
      console.log("Vector store initialized successfully with", existingMemories.length, "memories");
    } catch (error) {
      console.error("Error initializing vector store:", error);
      this.vectorStoreAvailable = false;
    }
  }
  
  // Create a new chat session
  async createSession(clinicianId: number, title: string = "New Chat"): Promise<number> {
    const result = await db.insert(chatSessions).values({
      clinicianId,
      title,
    }).returning({ id: chatSessions.id });
    
    this.sessionId = result[0].id;
    
    return this.sessionId;
  }
  
  // Load an existing chat session
  async loadSession(sessionId: number): Promise<boolean> {
    const session = await db.select().from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
      
    if (session.length === 0) {
      return false;
    }
    
    this.sessionId = sessionId;
    
    return true;
  }
  
  // Process a user message
  async processMessage(message: string): Promise<string> {
    if (!this.sessionId) {
      throw new Error("No active session");
    }
    
    try {
      // First, classify the query to determine if it requires database access
      const classification = await queryClassificationService.classifyQuery(message);
      console.log(`Query classification: ${classification.queryType}, Requires DB: ${classification.requiresDatabase}`);
      
      // Save the user message to the database first
      await db.insert(chatMessages).values({
        chatSessionId: this.sessionId,
        role: 'user',
        content: message,
      });
      
      // Get recent conversation history for context
      const conversationHistory = await memoryService.getRecentConversationHistory(this.sessionId, 5);
      
      // For queries about previous conversation or context
      if (message.toLowerCase().includes("previous") || 
          message.toLowerCase().includes("last question") || 
          message.toLowerCase().includes("you said") ||
          message.toLowerCase().includes("i asked")) {
        console.log("Processing context-aware follow-up query");
        
        // Use the ReAct agent for context-aware responses
        const response = await reactAgentService.processQuery(message, this.sessionId);
        
        // Save the assistant message to the database
        await db.insert(chatMessages).values({
          chatSessionId: this.sessionId,
          role: 'assistant',
          content: response,
        });
        
        // Extract and store memories
        await this.addMemory(response);
        
        return response;
      }
      
      // For conversational queries that don't require database access, use a direct LLM response
      if (classification.queryType === "CONVERSATIONAL" && !classification.requiresDatabase) {
        console.log("Processing conversational query directly without database access");
        
        // Use a simple prompt for conversational responses with conversation history
        const conversationalPrompt = PromptTemplate.fromTemplate(`
          You are a helpful clinical assistant chatbot. Respond to the following conversational message:
          
          Recent conversation history:
          ${conversationHistory}
          
          User message: {input}
          
          Provide a friendly, helpful response without accessing patient data.
        `);
        
        const conversationalChain = RunnableSequence.from([
          conversationalPrompt,
          this.model,
          new StringOutputParser(),
        ]);
        
        const response = await conversationalChain.invoke({
          input: message,
        });
        
        // Save the assistant message to the database
        await db.insert(chatMessages).values({
          chatSessionId: this.sessionId,
          role: 'assistant',
          content: response,
        });
        
        // Extract and store memories
        await this.addMemory(response);
        
        return response;
      }
      
      // For informational queries that don't need specific patient data
      if (classification.queryType === "INFORMATIONAL" && !classification.requiresDatabase) {
        console.log("Processing informational query without patient-specific data");
        
        // Use a knowledge-based prompt for informational responses with conversation history
        const informationalPrompt = PromptTemplate.fromTemplate(`
          You are a knowledgeable clinical assistant chatbot. Respond to the following medical or clinical question:
          
          Recent conversation history:
          ${conversationHistory}
          
          User question: {input}
          
          Provide an informative, accurate response based on general medical knowledge without accessing specific patient data.
        `);
        
        const informationalChain = RunnableSequence.from([
          informationalPrompt,
          this.model,
          new StringOutputParser(),
        ]);
        
        const response = await informationalChain.invoke({
          input: message,
        });
        
        // Save the assistant message to the database
        await db.insert(chatMessages).values({
          chatSessionId: this.sessionId,
          role: 'assistant',
          content: response,
        });
        
        // Extract and store memories
        await this.addMemory(response);
        
        return response;
      }
      
      // For patient-specific queries that require database access, use the ReAct agent
      console.log("Processing patient-specific query with database access using ReAct agent");
      
      // Use the ReAct agent for complex queries
      const response = await reactAgentService.processQuery(message, this.sessionId);
      
      // Save the assistant message to the database
      await db.insert(chatMessages).values({
        chatSessionId: this.sessionId,
        role: 'assistant',
        content: response,
      });
      
      // Extract and store memories
      await this.addMemory(response);
      
      return response;
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Provide a fallback response
      const fallbackResponse = "I apologize, but I encountered an error processing your request. Please try again or rephrase your question.";
      
      return fallbackResponse;
    }
  }
  
  // Add a memory to the vector store
  async addMemory(content: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error("No active session");
    }
    
    // Skip vector store operations if it's not available
    if (!this.vectorStoreAvailable || !this.vectorStore) {
      console.warn("Vector store unavailable, skipping memory storage");
      
      // Still store in database
      await db.insert(chatMemories).values({
        chatSessionId: this.sessionId,
        content,
      });
      
      return;
    }
    
    try {
      // Store the memory in the database
      const memoryEntry = await db.insert(chatMemories).values({
        chatSessionId: this.sessionId,
        content,
      }).returning();
      
      // Add the memory to the vector store
      await this.vectorStore.addDocuments([
        {
          pageContent: content,
          metadata: {
            id: memoryEntry[0].id,
            chatSessionId: this.sessionId,
            createdAt: memoryEntry[0].createdAt,
          },
        },
      ]);
    } catch (error) {
      console.error("Error adding memory:", error);
    }
  }
  
  // Search for memories related to a query
  async searchMemories(query: string): Promise<any[]> {
    if (!this.sessionId) {
      throw new Error("No active session");
    }
    
    if (!this.vectorStoreAvailable || !this.vectorStore) {
      console.warn("Vector store unavailable, returning empty memory search results");
      return [];
    }
    
    try {
      const results = await this.vectorStore.similaritySearch(query, 5, {
        filter: (doc: any) => doc.metadata.chatSessionId === this.sessionId
      });
      
      return results;
    } catch (error) {
      console.error("Error searching memories:", error);
      // Mark vector store as unavailable if there's an error
      this.vectorStoreAvailable = false;
      return [];
    }
  }
  
  // Generate a summary of the chat session
  async generateSummary(): Promise<string> {
    if (!this.sessionId) {
      throw new Error("No active session");
    }
    
    // Get the chat history
    const messages = await this.getChatHistory();
    
    // Format the messages for the LLM
    const formattedHistory = messages.map(msg => {
      return `${msg.role === 'user' ? 'Human' : 'AI'}: ${msg.content}`;
    }).join('\n');
    
    // Use the LLM to generate a summary
    const summaryPrompt = PromptTemplate.fromTemplate(
      "Summarize the following conversation between a human and an AI assistant:\n\n{history}\n\nSummary:"
    );
    
    const summaryChain = RunnableSequence.from([
      summaryPrompt,
      this.model,
      new StringOutputParser(),
    ]);
    
    const result = await summaryChain.invoke({
      history: formattedHistory,
    });
    
    const summary = typeof result === 'string' ? result : '';
    
    // Store the summary in the database
    await db.insert(chatSummaries).values({
      chatSessionId: this.sessionId,
      summary: summary,
      messageRange: `1-${messages.length}`,
    });
    
    return summary;
  }
  
  // Get the chat history for a session
  async getChatHistory(): Promise<any[]> {
    if (!this.sessionId) {
      throw new Error("No active session");
    }
    
    // Get the chat history from the database
    const messages = await db.select().from(chatMessages)
      .where(eq(chatMessages.chatSessionId, this.sessionId))
      .orderBy(chatMessages.timestamp);
    
    return messages;
  }
  
  // End the current chat session
  async endSession(): Promise<boolean> {
    if (!this.sessionId) {
      return false;
    }
    
    const result = await conversationManagementService.endSession(this.sessionId);
    
    this.sessionId = null;
    
    return result;
  }
  
  // Rename a chat session
  async renameSession(sessionId: number, title: string): Promise<boolean> {
    return await conversationManagementService.renameSession(sessionId, title);
  }
  
  // Delete a chat session and all associated messages
  async deleteSession(sessionId: number): Promise<boolean> {
    return await conversationManagementService.deleteSession(sessionId);
  }
  
  // Get all chat sessions for a clinician
  async getClinicianSessions(clinicianId: number): Promise<any[]> {
    return await conversationManagementService.getClinicianSessions(clinicianId);
  }
  
  // Get all messages for a chat session
  async getSessionMessages(sessionId: number): Promise<any[]> {
    return await conversationManagementService.getSessionMessages(sessionId);
  }
  
  // Continue a previous conversation
  async continueSession(sessionId: number): Promise<boolean> {
    const result = await conversationManagementService.continueSession(sessionId);
    if (result) {
      this.sessionId = sessionId;
    }
    return result;
  }
  
  // Export a chat session as JSON
  async exportSession(sessionId: number): Promise<any> {
    return await conversationManagementService.exportSession(sessionId);
  }
  
  // Search for sessions by content
  async searchSessions(clinicianId: number, searchTerm: string): Promise<any[]> {
    return await conversationManagementService.searchSessions(clinicianId, searchTerm);
  }
}

// Export a singleton instance of the chatbot service
export const chatbotService = new ChatbotService();
