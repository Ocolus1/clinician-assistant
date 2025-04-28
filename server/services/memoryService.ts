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
import { eq, and, gt, lt } from "drizzle-orm";

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
    } catch (error) {
      console.error("Error initializing vector store:", error);
    }
  }
  
  // Add a memory to the vector store
  async addMemory(sessionId: number, content: string): Promise<void> {
    try {
      if (!this.vectorStore) {
        await this.initVectorStore();
      }
      
      // Store the memory in the database
      const memoryEntry = await db.insert(chatMemories).values({
        chatSessionId: sessionId,
        content,
      }).returning();
      
      // Add the memory to the vector store
      await this.vectorStore?.addDocuments([
        {
          pageContent: content,
          metadata: {
            id: memoryEntry[0].id,
            chatSessionId: sessionId,
            createdAt: memoryEntry[0].createdAt,
          },
        },
      ]);
    } catch (error) {
      console.error("Error adding memory:", error);
    }
  }
  
  // Search for relevant memories
  async searchMemories(query: string, limit: number = 5): Promise<any[]> {
    try {
      if (!this.vectorStore) {
        await this.initVectorStore();
      }
      
      const results = await this.vectorStore?.similaritySearch(query, limit);
      return results || [];
    } catch (error) {
      console.error("Error searching memories:", error);
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
      
      // Format the conversation for summarization
      const conversation = messages
        .map((msg) => `${msg.role === "user" ? "Clinician" : "AI"}: ${msg.content}`)
        .join("\n\n");
      
      // Generate a summary
      const result = await summarizationChain.invoke({
        conversation,
      });
      
      const summary = result.content || result.text || JSON.stringify(result);
      
      // Store the summary in the database
      await db.insert(chatSummaries).values({
        chatSessionId: sessionId,
        summary,
        messageRange: `${startMessageId}-${endMessageId}`,
      });
      
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
      
      // Format the conversation
      const conversation = messages
        .map((msg) => `${msg.role === "user" ? "Clinician" : "AI"}: ${msg.content}`)
        .join("\n\n");
      
      // Create a prompt for memory extraction
      const memoryExtractionPrompt = PromptTemplate.fromTemplate(`
        Extract key pieces of information from the following conversation between a clinician and an AI assistant.
        Focus on facts about patients, goals, progress, and clinical insights.
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
      
      const extractedInfo = result.content || result.text || JSON.stringify(result);
      
      // Split into individual memories
      const memories = extractedInfo.split("\n").filter((line: string) => line.trim() !== "");
      
      // Store each memory
      for (const memory of memories) {
        await this.addMemory(sessionId, memory);
      }
    } catch (error) {
      console.error("Error extracting memories from conversation:", error);
    }
  }
}

// Export an instance of the memory service
export const memoryService = new MemoryService();
