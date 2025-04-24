/**
 * Memory Management Service
 * 
 * This service manages the combined memory system, including summarization
 * of long-term memory and tiered retrieval of relevant context.
 */

import { ChatOpenAI } from "@langchain/openai";
import { ConversationSummaryMemory } from "langchain/memory";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { sql } from '../db';
import { vectorStoreService } from './vectorStoreService';
import { Message, MessageRole } from '@shared/assistantTypes';

/**
 * Interface for summarized memory entries
 */
interface MemorySummary {
  id: string;
  conversationId: string;
  content: string;
  startTimestamp: string;
  endTimestamp: string;
  messageCount: number;
  topics: string[];
  createdAt: string;
}

/**
 * Structure defining a memory retrieval result
 */
interface MemoryRetrievalResult {
  recentMessages: Message[];
  relevantMessages: Message[];
  summaries: MemorySummary[];
  combinedContext: string;
}

/**
 * Memory Management Service class
 */
export class MemoryManagementService {
  private llm: ChatOpenAI | null = null;
  private summarizationMemory: ConversationSummaryMemory | null = null;
  private initialized = false;
  
  // Configuration options
  private summaryMessageThreshold = 10; // Create a summary after this many messages
  private recentMessageCount = 5; // Number of recent messages to include
  private relevantMessageCount = 5; // Number of relevant messages to retrieve
  private summaryCount = 3; // Number of relevant summaries to retrieve
  private maxTokensPerType = 1000; // Token budget for each type of context

  /**
   * Initialize the memory management service
   */
  async initialize(apiKey: string, model: string = "gpt-4o"): Promise<void> {
    try {
      // Use ChatOpenAI instead of OpenAI
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        temperature: 0.2, // Use low temperature for summarization
        maxConcurrency: 1, // Limit concurrent requests to reduce overhead
        timeout: 60000, // Increase timeout for summarization
      });
      
      this.summarizationMemory = new ConversationSummaryMemory({
        llm: this.llm,
        memoryKey: "history",
        returnMessages: true,
        inputKey: "input",
        outputKey: "response"
      });
      
      // Ensure the schema exists
      try {
        await this.ensureDatabase();
      } catch (dbError) {
        // Log the error but continue initialization
        console.warn('Memory database schema initialization warning:', dbError);
        console.log('Will continue without memory schema, it may already exist');
      }
      
      this.initialized = true;
      console.log('Memory Management Service initialized');
    } catch (error) {
      console.error('Failed to initialize Memory Management Service:', error);
      // Log error but don't throw - allow application to continue without memory
      this.initialized = false;
      console.log('Memory Management will run in degraded mode');
    }
  }
  
  /**
   * Ensure the database schema exists for memory management
   */
  private async ensureDatabase(): Promise<void> {
    try {
      // Create schema if not exists
      await sql`
        CREATE SCHEMA IF NOT EXISTS assistant_memory;
      `;
      
      // Create tables if they don't exist
      await sql`
        CREATE TABLE IF NOT EXISTS assistant_memory.summaries (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          content TEXT NOT NULL,
          start_timestamp TEXT NOT NULL,
          end_timestamp TEXT NOT NULL,
          message_count INTEGER NOT NULL,
          topics JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      
      console.log('Memory management database schema initialized');
    } catch (error) {
      console.error('Error initializing memory database schema:', error);
      throw error;
    }
  }
  
  /**
   * Process conversation messages and generate summaries when needed
   */
  async processConversationMemory(
    conversationId: string,
    messages: Message[]
  ): Promise<void> {
    if (!this.initialized || !this.llm) {
      console.warn('Memory Management Service not initialized');
      return;
    }
    
    if (messages.length < 2) {
      // Not enough messages to process
      return;
    }
    
    try {
      // First store individual messages in vector store
      await vectorStoreService.storeMessages(conversationId, messages);
      
      // Check if we need to create a new summary
      // Get existing summaries to see when the last one was created
      const existingSummaries = await this.getSummariesForConversation(conversationId);
      const lastSummaryTimestamp = existingSummaries.length > 0 
        ? existingSummaries[0].endTimestamp
        : '';
        
      // Find messages that haven't been summarized
      const unsummarizedMessages = lastSummaryTimestamp 
        ? messages.filter(msg => msg.createdAt > lastSummaryTimestamp)
        : messages;
        
      // If we have enough new messages, create a summary
      if (unsummarizedMessages.length >= this.summaryMessageThreshold) {
        await this.createConversationSummary(conversationId, unsummarizedMessages);
      }
    } catch (error) {
      console.error('Error processing conversation memory:', error);
      // Continue even if memory processing fails
    }
  }
  
  /**
   * Create a summary of conversation messages
   */
  private async createConversationSummary(
    conversationId: string,
    messages: Message[]
  ): Promise<void> {
    if (!this.llm || !this.summarizationMemory) {
      return;
    }
    
    try {
      // Sort messages by timestamp
      const sortedMessages = [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      if (sortedMessages.length < 2) {
        return; // Need at least a user message and assistant response
      }
      
      // Prepare messages for summarization
      let conversationText = '';
      sortedMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'Human' : 'Assistant';
        conversationText += `${role}: ${msg.content}\n\n`;
      });
      
      // Generate summary using ChatOpenAI's invoke method with proper types
      const summaryResponse = await this.llm.invoke([
        new SystemMessage('You are a helpful assistant that summarizes conversations accurately and concisely.'),
        new HumanMessage(`Summarize the following conversation in a concise paragraph. Focus on the key points, questions asked, and information provided:
          
          ${conversationText}
          
          Summary:`)
      ]);
      
      // Extract the summary text
      const summary = summaryResponse.content.toString();
      
      // Extract topics
      const topicsResponse = await this.llm.invoke([
        new SystemMessage('You identify key topics from conversations and format them as a JSON array only.'),
        new HumanMessage(`Identify 3-5 key topics from this conversation:
          
          ${conversationText}
          
          Format as a JSON array only, nothing else. For example: ["topic1", "topic2", "topic3"]`)
      ]);
      
      const topicsString = topicsResponse.content.toString();
      
      // Parse topics (handle potential formatting issues)
      let topics: string[] = [];
      try {
        // Find anything that looks like a JSON array
        const match = topicsString.match(/\[([\s\S]*)\]/);
        if (match) {
          topics = JSON.parse(`[${match[1]}]`);
        } else {
          topics = JSON.parse(topicsString);
        }
      } catch (e) {
        console.warn('Error parsing topics, using as-is:', e);
        topics = [topicsString.trim()];
      }
      
      // Store the summary
      const summaryId = `summary-${Date.now()}`;
      const startTime = sortedMessages[0].createdAt;
      const endTime = sortedMessages[sortedMessages.length - 1].createdAt;
      const messageCount = sortedMessages.length;
      const topicsJson = JSON.stringify(topics);
      const createdAt = new Date().toISOString();
      
      await sql`
        INSERT INTO assistant_memory.summaries (
          id, conversation_id, content, start_timestamp, end_timestamp,
          message_count, topics, created_at
        ) VALUES (
          ${summaryId},
          ${conversationId},
          ${summary},
          ${startTime},
          ${endTime},
          ${messageCount},
          ${topicsJson}::jsonb,
          ${createdAt}
        )
      `;
      
      console.log(`Created summary for conversation ${conversationId} with ${sortedMessages.length} messages`);
    } catch (error) {
      console.error('Error creating conversation summary:', error);
      // Continue even if summary creation fails
    }
  }
  
  /**
   * Retrieve all summaries for a conversation
   */
  private async getSummariesForConversation(
    conversationId: string
  ): Promise<MemorySummary[]> {
    try {
      const results = await sql`
        SELECT 
          id, conversation_id, content, start_timestamp, end_timestamp,
          message_count, topics, created_at
        FROM assistant_memory.summaries
        WHERE conversation_id = ${conversationId}
        ORDER BY end_timestamp DESC
      `;
      
      return results.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        content: row.content,
        startTimestamp: row.start_timestamp,
        endTimestamp: row.end_timestamp,
        messageCount: row.message_count,
        topics: row.topics,
        createdAt: row.created_at.toISOString()
      }));
    } catch (error) {
      console.error('Error retrieving conversation summaries:', error);
      return [];
    }
  }
  
  /**
   * Find relevant summaries based on a query
   */
  private async findRelevantSummaries(
    conversationId: string,
    query: string,
    limit: number = 3
  ): Promise<MemorySummary[]> {
    if (!this.initialized) {
      return [];
    }
    
    try {
      // Create embedding for the query
      const embedding = await vectorStoreService.createEmbedding(query);
      
      // Find relevant summaries using the embedding
      const results = await sql`
        WITH summary_embeddings AS (
          SELECT 
            s.id, 
            s.conversation_id, 
            s.content, 
            s.start_timestamp, 
            s.end_timestamp,
            s.message_count, 
            s.topics, 
            s.created_at,
            e.embedding
          FROM assistant_memory.summaries s
          JOIN assistant_memory.embeddings e ON e.text = s.content
          WHERE s.conversation_id = ${conversationId}
        )
        SELECT 
          id, 
          conversation_id, 
          content, 
          start_timestamp, 
          end_timestamp,
          message_count, 
          topics, 
          created_at,
          embedding <-> ${JSON.stringify(embedding)}::vector as distance
        FROM summary_embeddings
        ORDER BY distance ASC
        LIMIT ${limit}
      `;
      
      return results.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        content: row.content,
        startTimestamp: row.start_timestamp,
        endTimestamp: row.end_timestamp,
        messageCount: row.message_count,
        topics: row.topics,
        createdAt: row.created_at.toISOString()
      }));
    } catch (error) {
      console.error('Error finding relevant summaries:', error);
      
      // Fallback to getting the most recent summaries
      try {
        return await this.getSummariesForConversation(conversationId);
      } catch (e) {
        return [];
      }
    }
  }
  
  /**
   * Extract entities from message content for memory context
   */
  private extractEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    // Extract client identifiers (Name-ID format)
    const clientPattern = /([A-Za-z]+)-([0-9]+)/g;
    const clientMatches = Array.from(message.matchAll(clientPattern));
    
    if (clientMatches.length > 0) {
      entities.clients = clientMatches.map(match => match[0]);
    }
    
    // Extract common client base names without identifiers
    if (!entities.clients || entities.clients.length === 0) {
      const commonClients = ["Radwan", "Test", "Mariam", "Gabriel", "Mohamad", "Muhammad", "Leo", "Olivia"];
      const foundClients = [];
      
      // Look for exact name matches (using word boundaries)
      for (const name of commonClients) {
        const nameRegex = new RegExp(`\\b${name}\\b`, 'i');
        if (nameRegex.test(message)) {
          foundClients.push(name);
        }
      }
      
      if (foundClients.length > 0) {
        entities.clients = foundClients;
      }
    }
    
    return entities;
  }
  
  /**
   * Get tiered memory context for a conversation
   */
  async getTieredMemoryContext(
    conversationId: string,
    userMessage: string,
    recentMessages: Message[]
  ): Promise<MemoryRetrievalResult> {
    // Default empty result
    const emptyResult = {
      recentMessages: [],
      relevantMessages: [],
      summaries: [],
      combinedContext: ''
    };
    
    // Skip if not initialized
    if (!this.initialized) {
      console.log('Memory system not initialized, skipping context retrieval');
      return emptyResult;
    }
    
    try {
      console.log(`Retrieving memory context for conversation ${conversationId}`);
      
      // 1. Get recent messages (this is the most reliable source since it comes from the current session)
      let sortedRecentMessages: Message[] = [];
      try {
        sortedRecentMessages = [...recentMessages]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, this.recentMessageCount);
        console.log(`Retrieved ${sortedRecentMessages.length} recent messages`);
      } catch (recentError) {
        console.error('Error processing recent messages:', recentError);
        // Continue with empty recent messages
      }
      
      // 2. Try to get relevant past messages using vector search (might fail if vector store is not available)
      let relevantMessages: Message[] = [];
      try {
        if (vectorStoreService.isInitialized()) {
          relevantMessages = await vectorStoreService.retrieveSimilarMessages(
            conversationId,
            userMessage,
            this.relevantMessageCount
          );
          console.log(`Retrieved ${relevantMessages.length} relevant past messages`);
        }
      } catch (vectorError) {
        console.error('Error retrieving relevant messages from vector store:', vectorError);
        // Continue without relevant messages
      }
      
      // 3. Try to get relevant summaries (might fail if database is not available)
      let relevantSummaries: MemorySummary[] = [];
      try {
        relevantSummaries = await this.findRelevantSummaries(
          conversationId,
          userMessage,
          this.summaryCount
        );
        console.log(`Retrieved ${relevantSummaries.length} relevant summaries`);
      } catch (summaryError) {
        console.error('Error retrieving summaries:', summaryError);
        // Continue without summaries
      }
      
      // 4. Combine available context
      const combinedContext = this.constructCombinedContext(
        sortedRecentMessages,
        relevantMessages,
        relevantSummaries
      );
      
      return {
        recentMessages: sortedRecentMessages,
        relevantMessages,
        summaries: relevantSummaries,
        combinedContext
      };
    } catch (error) {
      console.error('Error getting tiered memory context:', error);
      return emptyResult;
    }
  }
  
  /**
   * Construct combined context from different memory sources
   */
  private constructCombinedContext(
    recentMessages: Message[],
    relevantMessages: Message[],
    summaries: MemorySummary[]
  ): string {
    let context = '';
    
    // Extract entities from recent messages to add as context
    const entityContext: Record<string, any> = {};
    
    // Process recent messages to extract entities
    if (recentMessages.length > 0) {
      // Combine all user messages for entity extraction
      const allUserContent = recentMessages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');
      
      // Extract entities
      const extractedEntities = this.extractEntities(allUserContent);
      
      // Add client context if found
      if (extractedEntities.clients && extractedEntities.clients.length > 0) {
        entityContext.clients = extractedEntities.clients;
      }
    }
    
    // Add entity context to the beginning for highest visibility
    if (Object.keys(entityContext).length > 0) {
      context += 'Current context entities:\n';
      
      if (entityContext.clients) {
        context += `- Client(s) being discussed: ${entityContext.clients.join(', ')}\n`;
      }
      
      context += '\n';
    }
    
    // Add recent conversation
    if (recentMessages.length > 0) {
      context += 'Recent conversation:\n';
      recentMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        context += `${role}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}\n`;
      });
    }
    
    // Add relevant past messages
    if (relevantMessages.length > 0) {
      context += '\nRelevant past messages:\n';
      relevantMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'User asked' : 'You responded';
        context += `- ${role}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}\n`;
      });
    }
    
    // Add conversation summaries
    if (summaries.length > 0) {
      context += '\nSummaries of earlier conversations:\n';
      summaries.forEach(summary => {
        context += `- ${summary.content}\n`;
        if (summary.topics && summary.topics.length > 0) {
          context += `  Topics: ${summary.topics.join(', ')}\n`;
        }
      });
    }
    
    return context;
  }
  
  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create a singleton instance
export const memoryManagementService = new MemoryManagementService();