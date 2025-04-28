import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { BufferMemory } from "@langchain/core/memory";
import { ConversationChain } from "@langchain/core/chains";
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

// Create a memory system for conversation history
class ChatSessionMemory {
  private sessionId: number;
  
  constructor(sessionId: number) {
    this.sessionId = sessionId;
  }
  
  async loadMemoryVariables() {
    // Retrieve messages for this session from the database
    const messages = await db.select().from(chatMessages)
      .where(eq(chatMessages.chatSessionId, this.sessionId))
      .orderBy(chatMessages.timestamp);
      
    // Format messages for LangChain
    const formattedHistory = messages.map(msg => {
      return `${msg.role === 'user' ? 'Human' : 'AI'}: ${msg.content}`;
    }).join('\n');
    
    return { history: formattedHistory };
  }
  
  async saveContext(inputValues: Record<string, any>, outputValues: Record<string, any>) {
    // Save user message
    await db.insert(chatMessages).values({
      chatSessionId: this.sessionId,
      role: 'user',
      content: inputValues.input,
    });
    
    // Save assistant message
    await db.insert(chatMessages).values({
      chatSessionId: this.sessionId,
      role: 'assistant',
      content: outputValues.response,
    });
  }
  
  async clear() {
    // Delete all messages for this session
    await db.delete(chatMessages)
      .where(eq(chatMessages.chatSessionId, this.sessionId));
  }
  
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
      const memoryEntry = await db.insert(chatMemories).values({
        chatSessionId: this.sessionId,
        content,
      }).returning();
      
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
      // Mark vector store as unavailable if there's an error
      this.vectorStoreAvailable = false;
    }
  }
  
  async searchMemories(query: string): Promise<any[]> {
    if (!this.sessionId) {
      throw new Error("No active session");
    }
    
    // Return empty array if vector store is not available
    if (!this.vectorStoreAvailable || !this.vectorStore) {
      console.warn("Vector store unavailable, returning empty memory search results");
      return [];
    }
    
    try {
      const results = await this.vectorStore.similaritySearch(query, 5, {
        chatSessionId: this.sessionId,
      });
      
      return results;
    } catch (error) {
      console.error("Error searching memories:", error);
      // Mark vector store as unavailable if there's an error
      this.vectorStoreAvailable = false;
      return [];
    }
  }
}

// Create a class for the chatbot service
export class ChatbotService {
  private model: ChatOpenAI;
  private memory: ChatSessionMemory | null = null;
  private sessionId: number | null = null;
  private vectorStore: HNSWLib | null = null;
  private vectorStoreAvailable: boolean = true;
  
  constructor() {
    this.model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.2,
    });
    
    // Initialize vector store
    this.initVectorStore().catch(error => {
      console.error("Failed to initialize vector store:", error);
      this.vectorStoreAvailable = false;
    });
  }
  
  private async initVectorStore() {
    try {
      const embeddings = new OpenAIEmbeddings();
      const vectorStorePath = path.join(__dirname, '..', '..', 'data', 'vector_store');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(vectorStorePath)) {
        fs.mkdirSync(vectorStorePath, { recursive: true });
      }
      
      try {
        // Check if vector store exists
        if (fs.existsSync(path.join(vectorStorePath, 'hnswlib.index'))) {
          // Use the new method for loading from disk
          this.vectorStore = await HNSWLib.load(
            vectorStorePath,
            embeddings
          );
          console.log("Vector store loaded from disk");
        } else {
          // Create a new vector store with empty documents array
          this.vectorStore = new HNSWLib(embeddings, {
            space: 'cosine',
            numDimensions: 1536 // OpenAI embeddings dimensions
          });
          
          // Initialize with empty documents array to avoid "not initialized" error
          await this.vectorStore.addDocuments([
            { pageContent: "Initial document", metadata: { id: 0 } }
          ]);
          
          // Save the initialized vector store
          await this.vectorStore.save(vectorStorePath);
          console.log("Created new vector store");
        }
      } catch (innerError) {
        console.error("Error with existing vector store, creating new one:", innerError);
        
        // Fallback: Create a new vector store if loading fails
        this.vectorStore = new HNSWLib(embeddings, {
          space: 'cosine',
          numDimensions: 1536
        });
        
        // Initialize with empty documents array
        await this.vectorStore.addDocuments([
          { pageContent: "Initial document", metadata: { id: 0 } }
        ]);
        
        // Save the new vector store
        await this.vectorStore.save(vectorStorePath);
        console.log("Created fallback vector store");
      }
    } catch (error) {
      console.error("Error initializing vector store:", error);
      // Instead of throwing, set a flag that vector store is unavailable
      this.vectorStoreAvailable = false;
      console.warn("Vector store will be unavailable for this session");
    }
  }
  
  // Create a new chat session
  async createSession(clinicianId: number, title: string = "New Chat"): Promise<number> {
    const result = await db.insert(chatSessions).values({
      clinicianId,
      title,
    }).returning({ id: chatSessions.id });
    
    this.sessionId = result[0].id;
    this.memory = new ChatSessionMemory(this.sessionId);
    
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
    this.memory = new ChatSessionMemory(sessionId);
    
    return true;
  }
  
  // Process a user message
  async processMessage(message: string): Promise<string> {
    if (!this.sessionId || !this.memory) {
      throw new Error("No active session");
    }
    
    try {
      // Generate a response using the chatbot model
      const { query, tables } = await this.generateDrizzleQuery(message);
      
      // Log the query
      await db.insert(queryLogs).values({
        chatSessionId: this.sessionId,
        query: query.toString(),
        timestamp: new Date(),
      });
      
      // Execute the query
      const queryResult = await query(
        db, eq, like, and, or, desc, asc, sql,
        patients, goals, subgoals, sessions, sessionNotes, goalAssessments,
        strategies, clinicians, patientClinicians, caregivers
      );
      
      // Generate a response
      const response = await generateResponseFromResult(message, queryResult);
      
      // Save the conversation to memory
      await this.memory.saveContext({ input: message }, { response });
      
      // Extract and store important information
      await this.extractAndStoreMemories(message, response);
      
      return response;
    } catch (error) {
      console.error("Error processing message:", error);
      return "I'm sorry, I encountered an error processing your message. Please try again.";
    }
  }
  
  // Extract and store important information from the conversation
  private async extractAndStoreMemories(userMessage: string, aiResponse: string): Promise<void> {
    try {
      // For now, just store the AI response as a memory
      // In the future, we could use LLM to extract key information
      await this.addMemory(aiResponse);
    } catch (error) {
      console.error("Error extracting memories:", error);
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
      const memoryEntry = await db.insert(chatMemories).values({
        chatSessionId: this.sessionId,
        content,
      }).returning();
      
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
      // Mark vector store as unavailable if there's an error
      this.vectorStoreAvailable = false;
    }
  }
  
  // Search for memories related to a query
  async searchMemories(query: string): Promise<any[]> {
    if (!this.sessionId) {
      throw new Error("No active session");
    }
    
    // Return empty array if vector store is not available
    if (!this.vectorStoreAvailable || !this.vectorStore) {
      console.warn("Vector store unavailable, returning empty memory search results");
      return [];
    }
    
    try {
      const results = await this.vectorStore.similaritySearch(query, 5, {
        chatSessionId: this.sessionId,
      });
      
      return results;
    } catch (error) {
      console.error("Error searching memories:", error);
      // Mark vector store as unavailable if there's an error
      this.vectorStoreAvailable = false;
      return [];
    }
  }
  
  // Generate a Drizzle query from natural language
  private async generateDrizzleQuery(question: string): Promise<any> {
    // Implementation of query generation logic
    // This is a placeholder - the actual implementation would use LLM to generate SQL
    return {
      query: async (db: any, eq: any, like: any, and: any, or: any, desc: any, asc: any, sql: any, ...tables: any[]) => {
        // For now, just return some dummy data
        return [{ result: "This is a placeholder result" }];
      },
      tables: ["patients", "goals"]
    };
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
    
    const summary = await summaryChain.invoke({
      history: formattedHistory,
    });
    
    // Store the summary in the database
    await db.insert(chatSummaries).values({
      chatSessionId: this.sessionId,
      content: summary,
      createdAt: new Date(),
    });
    
    return summary;
  }
  
  // End the current chat session
  async endSession(): Promise<boolean> {
    if (!this.sessionId) {
      return false;
    }
    
    await db.update(chatSessions)
      .set({ endTime: new Date() })
      .where(eq(chatSessions.id, this.sessionId));
      
    this.sessionId = null;
    this.memory = null;
    
    return true;
  }
  
  // Rename a chat session
  async renameSession(sessionId: number, title: string): Promise<boolean> {
    await db.update(chatSessions)
      .set({ title })
      .where(eq(chatSessions.id, sessionId));
      
    return true;
  }
  
  // Delete a chat session and all associated messages
  async deleteSession(sessionId: number): Promise<boolean> {
    await db.delete(chatSessions)
      .where(eq(chatSessions.id, sessionId));
      
    return true;
  }
  
  // Get all chat sessions for a clinician
  async getClinicianSessions(clinicianId: number): Promise<any[]> {
    return await db.select().from(chatSessions)
      .where(eq(chatSessions.clinicianId, clinicianId))
      .orderBy(desc(chatSessions.startTime));
  }
  
  // Get all messages for a chat session
  async getSessionMessages(sessionId: number): Promise<any[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.chatSessionId, sessionId))
      .orderBy(asc(chatMessages.timestamp));
  }
}

// Export a singleton instance of the chatbot service
export const chatbotService = new ChatbotService();
