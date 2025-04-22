/**
 * Vector Store Service
 * 
 * This service provides long-term memory capabilities for the Clinician Assistant
 * by storing and retrieving message embeddings in PostgreSQL using pgvector.
 */

import { sql } from '../db';
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";
import { Message, MessageRole } from '@shared/assistantTypes';

/**
 * Interface for storing embeddings
 */
interface EmbeddingEntry {
  id: number;
  conversationId: string;
  text: string;
  embedding: number[];
  metadata: any;
  createdAt: Date;
}

/**
 * Vector Store Service class
 */
export class VectorStoreService {
  private embeddings: OpenAIEmbeddings | null = null;
  private memoryStore: MemoryVectorStore | null = null;
  private initialized = false;

  /**
   * Initialize the vector store service
   */
  async initialize(apiKey: string): Promise<void> {
    try {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: apiKey,
        modelName: "text-embedding-ada-002", // Using the cost-effective embedding model
      });

      console.log('Vector Store Service initialized with OpenAI embeddings');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Vector Store Service:', error);
      throw new Error('Failed to initialize Vector Store Service');
    }
  }

  /**
   * Store messages in the vector database
   */
  async storeMessages(conversationId: string, messages: Message[]): Promise<void> {
    if (!this.initialized || !this.embeddings) {
      throw new Error('Vector Store Service not initialized');
    }

    try {
      console.log(`Storing ${messages.length} messages for conversation ${conversationId}`);

      // Only store user and assistant messages, not system messages
      const messagesToStore = messages.filter(
        msg => msg.role === 'user' || msg.role === 'assistant'
      );

      // Process each message
      for (const message of messagesToStore) {
        // Generate embedding for the message
        const embeddingArray = await this.embeddings.embedQuery(message.content);

        // Store in database with metadata
        await sql`
          INSERT INTO assistant_memory.embeddings 
            (conversation_id, text, embedding, metadata, created_at)
          VALUES (
            ${conversationId}, 
            ${message.content}, 
            ${JSON.stringify(embeddingArray)}::vector, 
            ${JSON.stringify({
              role: message.role,
              messageId: message.id,
              createdAt: message.createdAt
            })}, 
            ${new Date()}
          )
        `;
      }

      console.log(`Successfully stored ${messagesToStore.length} messages with embeddings`);
    } catch (error) {
      console.error(`Error storing messages in vector database:`, error);
      throw error;
    }
  }

  /**
   * Retrieve relevant messages from the database
   */
  async retrieveSimilarMessages(
    conversationId: string, 
    query: string, 
    limit: number = 5
  ): Promise<Message[]> {
    if (!this.initialized || !this.embeddings) {
      throw new Error('Vector Store Service not initialized');
    }

    try {
      console.log(`Retrieving messages similar to: "${query.substring(0, 50)}..."`);

      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Perform a similarity search in the database
      const results = await sql`
        SELECT 
          id, 
          conversation_id, 
          text, 
          metadata,
          created_at,
          embedding <-> ${JSON.stringify(queryEmbedding)}::vector as distance
        FROM assistant_memory.embeddings
        WHERE conversation_id = ${conversationId}
        ORDER BY distance ASC
        LIMIT ${limit}
      `;

      // Transform the results into Message objects
      const messages: Message[] = results.map(row => {
        const metadata = row.metadata || {};
        return {
          id: metadata.messageId || `memory-${row.id}`,
          role: metadata.role as MessageRole || 'assistant',
          content: row.text,
          createdAt: metadata.createdAt || row.created_at.toISOString()
        };
      });

      console.log(`Retrieved ${messages.length} similar messages`);
      return messages;
    } catch (error) {
      console.error('Error retrieving similar messages:', error);
      return [];
    }
  }

  /**
   * Delete all stored embeddings for a conversation
   */
  async clearConversationMemory(conversationId: string): Promise<boolean> {
    try {
      console.log(`Clearing memory for conversation ${conversationId}`);
      
      await sql`
        DELETE FROM assistant_memory.embeddings
        WHERE conversation_id = ${conversationId}
      `;
      
      return true;
    } catch (error) {
      console.error(`Error clearing memory for conversation ${conversationId}:`, error);
      return false;
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create a singleton instance
export const vectorStoreService = new VectorStoreService();