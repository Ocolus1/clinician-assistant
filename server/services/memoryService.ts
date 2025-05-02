import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { db } from "../db";
import { 
  chatSessions, 
  chatMessages, 
  chatMemories, 
  chatSummaries 
} from "../../shared/schema/chatbot";
import { eq, and, gt, lt, desc } from "drizzle-orm";

// Create a model for summarization
const summarizationModel = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.2,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Create a prompt template for summarization
const summarizationPromptTemplate = PromptTemplate.fromTemplate(`
Summarize the following conversation between a clinician and an AI assistant.
Focus on key information about patients, goals, and clinical insights.
Be concise but comprehensive.

Conversation:
{conversation}

Summary:
`);

// Create a chain for summarization
const summarizationChain = RunnableSequence.from([
  summarizationPromptTemplate,
  summarizationModel,
]);

export class MemoryService {
  private vectorStore: HNSWLib | null = null;
  private embeddings: OpenAIEmbeddings;
  private vectorStoreAvailable: boolean = true;
  
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    // Initialize vector store
    this.initVectorStore();
  }
  
  private async initVectorStore() {
    try {
      // Create a new vector store
      this.vectorStore = new HNSWLib(
        this.embeddings,
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
  
  // Add a memory to the vector store
  async addMemory(sessionId: number, content: string): Promise<void> {
    try {
      if (!this.vectorStore && this.vectorStoreAvailable) {
        await this.initVectorStore();
      }
      
      // Store the memory in the database
      const memoryEntry = await db.insert(chatMemories).values({
        chatSessionId: sessionId,
        content,
      }).returning();
      
      // Add the memory to the vector store if available
      if (this.vectorStoreAvailable && this.vectorStore) {
        await this.vectorStore.addDocuments([
          {
            pageContent: content,
            metadata: {
              id: memoryEntry[0].id,
              chatSessionId: sessionId,
              createdAt: memoryEntry[0].createdAt,
            },
          },
        ]);
        console.log("Added memory to vector store:", content.substring(0, 50) + "...");
      } else {
        console.warn("Vector store unavailable, memory only saved to database");
      }
    } catch (error) {
      console.error("Error adding memory:", error);
    }
  }
  
  // Search for relevant memories
  async searchMemories(query: string, limit: number = 5): Promise<any[]> {
    try {
      if (!this.vectorStore && this.vectorStoreAvailable) {
        await this.initVectorStore();
      }
      
      if (!this.vectorStoreAvailable || !this.vectorStore) {
        console.warn("Vector store unavailable, falling back to keyword search");
        // Fallback to simple keyword search in database if vector store is unavailable
        const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 3);
        if (keywords.length === 0) return [];
        
        const memories = await db.select().from(chatMemories);
        const results = memories.filter(memory => {
          const content = memory.content.toLowerCase();
          return keywords.some(keyword => content.includes(keyword));
        }).slice(0, limit);
        
        return results.map(memory => ({
          pageContent: memory.content,
          metadata: {
            id: memory.id,
            chatSessionId: memory.chatSessionId,
            createdAt: memory.createdAt,
          },
        }));
      }
      
      const results = await this.vectorStore.similaritySearch(query, limit);
      console.log("Found", results.length, "relevant memories for query:", query);
      return results;
    } catch (error) {
      console.error("Error searching memories:", error);
      this.vectorStoreAvailable = false;
      return [];
    }
  }
  
  // Summarize a conversation
  async summarizeConversation(sessionId: number, startMessageId: number, endMessageId: number): Promise<string> {
    try {
      // Get the messages in the specified range
      const messages = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.chatSessionId, sessionId),
            gt(chatMessages.id, startMessageId),
            lt(chatMessages.id, endMessageId)
          )
        )
        .orderBy(chatMessages.timestamp);
      
      if (messages.length === 0) {
        return "No messages to summarize";
      }
      
      // Format the conversation for summarization
      const conversation = messages
        .map((msg) => `${msg.role === "user" ? "Clinician" : "AI"}: ${msg.content}`)
        .join("\n\n");
      
      // Generate a summary
      const result = await summarizationChain.invoke({
        conversation,
      });
      
      const summary = typeof result.content === 'string' 
        ? result.content 
        : typeof result.text === 'string' 
          ? result.text 
          : JSON.stringify(result);
      
      // Store the summary in the database
      await db.insert(chatSummaries).values({
        chatSessionId: sessionId,
        summary,
        messageRange: `${startMessageId}-${endMessageId}`,
      });
      
      // Also store the summary as a memory for retrieval
      await this.addMemory(sessionId, `Conversation Summary: ${summary}`);
      
      console.log("Generated summary for session", sessionId, "messages", startMessageId, "to", endMessageId);
      return summary;
    } catch (error) {
      console.error("Error summarizing conversation:", error);
      return "Failed to summarize conversation";
    }
  }
  
  // Get all summaries for a session
  async getSessionSummaries(sessionId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(chatSummaries)
        .where(eq(chatSummaries.chatSessionId, sessionId))
        .orderBy(chatSummaries.createdAt);
    } catch (error) {
      console.error("Error getting session summaries:", error);
      return [];
    }
  }
  
  // Extract key information from a conversation and store as memories
  async extractMemoriesFromConversation(sessionId: number): Promise<void> {
    try {
      // Get all messages for the session
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.chatSessionId, sessionId))
        .orderBy(chatMessages.timestamp);
      
      if (messages.length === 0) {
        console.log("No messages to extract memories from for session", sessionId);
        return;
      }
      
      // Format the conversation
      const conversation = messages
        .map((msg) => `${msg.role === "user" ? "Clinician" : "AI"}: ${msg.content}`)
        .join("\n\n");
      
      // Create a prompt for memory extraction
      const memoryExtractionPrompt = PromptTemplate.fromTemplate(`
        Extract key pieces of information from the following conversation between a clinician and an AI assistant.
        Focus on facts about patients, goals, progress, and clinical insights.
        Each piece of information should be specific, factual, and useful for future reference.
        Format each piece of information as a complete sentence that can stand on its own.
        Return each piece of information on a new line.
        
        Conversation:
        {conversation}
        
        Key Information:
      `);
      
      // Create a chain for memory extraction
      const memoryExtractionChain = RunnableSequence.from([
        memoryExtractionPrompt,
        summarizationModel,
      ]);
      
      // Extract memories
      const result = await memoryExtractionChain.invoke({
        conversation,
      });
      
      const extractedInfo = typeof result.content === 'string' 
        ? result.content 
        : typeof result.text === 'string' 
          ? result.text 
          : JSON.stringify(result);
      
      // Split into individual memories
      const memories = extractedInfo.split("\n").filter((line: string) => line.trim() !== "");
      
      console.log("Extracted", memories.length, "memories from conversation in session", sessionId);
      
      // Store each memory
      for (const memory of memories) {
        await this.addMemory(sessionId, memory);
      }
    } catch (error) {
      console.error("Error extracting memories from conversation:", error);
    }
  }
  
  // Periodically summarize conversations and extract memories
  async periodicMemoryManagement(): Promise<void> {
    try {
      // Get all active sessions
      const activeSessions = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.endTime, null));
      
      console.log("Running periodic memory management for", activeSessions.length, "active sessions");
      
      for (const session of activeSessions) {
        // Get the latest summary for this session
        const latestSummary = await db
          .select()
          .from(chatSummaries)
          .where(eq(chatSummaries.chatSessionId, session.id))
          .orderBy(desc(chatSummaries.createdAt))
          .limit(1);
        
        // Get the latest message ID that was summarized
        let lastSummarizedMessageId = 0;
        if (latestSummary.length > 0) {
          const messageRange = latestSummary[0].messageRange;
          const endId = parseInt(messageRange.split('-')[1]);
          lastSummarizedMessageId = endId;
        }
        
        // Get the latest message ID for this session
        const latestMessage = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.chatSessionId, session.id))
          .orderBy(desc(chatMessages.id))
          .limit(1);
        
        if (latestMessage.length === 0) continue;
        
        const latestMessageId = latestMessage[0].id;
        
        // If there are at least 10 new messages since the last summary, create a new summary
        if (latestMessageId - lastSummarizedMessageId >= 10) {
          console.log("Creating new summary for session", session.id, "from message", lastSummarizedMessageId, "to", latestMessageId);
          await this.summarizeConversation(session.id, lastSummarizedMessageId, latestMessageId);
        }
        
        // Extract memories from the conversation
        await this.extractMemoriesFromConversation(session.id);
      }
    } catch (error) {
      console.error("Error in periodic memory management:", error);
    }
  }
  
  // Get recent conversation history for a session
  async getRecentConversationHistory(sessionId: number, messageCount: number = 5): Promise<string> {
    try {
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.chatSessionId, sessionId))
        .orderBy(desc(chatMessages.timestamp))
        .limit(messageCount);
      
      if (messages.length === 0) {
        return "No recent conversation history.";
      }
      
      // Reverse to get chronological order
      messages.reverse();
      
      // Format the conversation
      const conversation = messages
        .map((msg) => `${msg.role === "user" ? "Clinician" : "AI"}: ${msg.content}`)
        .join("\n\n");
      
      return conversation;
    } catch (error) {
      console.error("Error getting recent conversation history:", error);
      return "Error retrieving conversation history.";
    }
  }
}

// Export an instance of the memory service
export const memoryService = new MemoryService();
