/**
 * LangChain Service
 * 
 * This service provides LangChain-based conversation and memory management for
 * more sophisticated AI interactions. It replaces direct OpenAI API calls with
 * LangChain's more powerful abstractions.
 * 
 * It now includes long-term memory using PostgreSQL vector storage for improved
 * context retention across conversations.
 */

import { ChatOpenAI } from "@langchain/openai";
import { 
  ConversationChain,
  LLMChain
} from "langchain/chains";
import { 
  ChatPromptTemplate, 
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate, 
  MessagesPlaceholder
} from "@langchain/core/prompts";
import { 
  BufferMemory, 
  ConversationSummaryMemory 
} from "langchain/memory";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatMessage } from "./openaiService";
import { StructuredTool } from "@langchain/core/tools";
import { vectorStoreService } from "./vectorStoreService";
import { Message, MessageRole } from '@shared/assistantTypes';
import { z } from "zod";

/**
 * Configuration for the LangChain service
 */
export interface LangChainConfig {
  apiKey: string;
  model: string;
  temperature: number;
}

/**
 * SQL Query Tool for LangChain
 */
class SQLQueryTool extends StructuredTool {
  name = "query_database";
  description = "Useful for querying the database to answer questions about client data";
  schema = z.object({
    query: z.string().describe("The SQL query to execute")
  });

  constructor(private executeQueryFn: (query: string) => Promise<any>) {
    super();
  }

  async _call(input: { query: string }): Promise<string> {
    try {
      const result = await this.executeQueryFn(input.query);
      return JSON.stringify(result, null, 2);
    } catch (error: any) {
      return `Error executing query: ${error.message}`;
    }
  }
}

/**
 * LangChain Service class
 */
export class LangChainService {
  private model: ChatOpenAI | null = null;
  private config: LangChainConfig | null = null;
  private conversationChains: Map<string, ConversationChain> = new Map();
  private sqlQueryTool: SQLQueryTool | null = null;
  
  /**
   * Initialize the LangChain service with API credentials
   */
  async initialize(config: LangChainConfig, executeQueryFn: (query: string) => Promise<any>): Promise<void> {
    this.config = config;
    this.model = new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model,
      temperature: config.temperature
    });
    
    this.sqlQueryTool = new SQLQueryTool(executeQueryFn);
    
    // Initialize vector store for long-term memory
    try {
      await vectorStoreService.initialize(config.apiKey);
      console.log('Vector store long-term memory initialized');
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      // Continue even if vector store initialization fails
    }
    
    console.log(`LangChain service initialized with model: ${config.model}`);
  }
  
  /**
   * Check if the LangChain service is configured
   */
  isConfigured(): boolean {
    return !!this.model && !!this.config;
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): LangChainConfig | null {
    return this.config;
  }

  /**
   * Convert ChatMessage array to LangChain BaseMessage array
   */
  private convertToLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
    return messages.map(msg => {
      const content = msg.content;
      
      switch (msg.role) {
        case 'system':
          return new SystemMessage(content);
        case 'user':
          return new HumanMessage(content);
        case 'assistant':
          return new AIMessage(content);
        default:
          return new HumanMessage(content);
      }
    });
  }
  
  /**
   * Get or create a conversation chain for a specific conversation
   */
  private getConversationChain(conversationId: string, systemPrompt: string): ConversationChain {
    // Check if we already have a chain for this conversation
    if (this.conversationChains.has(conversationId)) {
      return this.conversationChains.get(conversationId)!;
    }
    
    // Create a new conversation chain with memory
    const chatPrompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(systemPrompt),
      new MessagesPlaceholder("history"),
      HumanMessagePromptTemplate.fromTemplate("{input}")
    ]);
    
    // Use ConversationSummaryMemory for long conversations
    const memory = new ConversationSummaryMemory({
      llm: this.model!,
      memoryKey: "history",
      returnMessages: true,
      inputKey: "input",
      outputKey: "response"
    });
    
    const chain = new ConversationChain({
      llm: this.model!,
      prompt: chatPrompt,
      memory: memory,
      verbose: false // Set to true for debugging
    });
    
    // Store the chain for future use
    this.conversationChains.set(conversationId, chain);
    return chain;
  }
  
  /**
   * Process a message within a conversation
   */
  async processConversation(
    conversationId: string, 
    userMessage: string, 
    systemPrompt: string,
    recentMessages: ChatMessage[] = []
  ): Promise<string> {
    if (!this.model || !this.config) {
      throw new Error('LangChain service not initialized');
    }
    
    try {
      // Get the conversation chain for this conversation
      const chain = this.getConversationChain(conversationId, systemPrompt);
      
      // Try to retrieve relevant past messages from the vector store
      let longTermContext = "";
      if (vectorStoreService.isInitialized()) {
        try {
          // Retrieve similar messages from long-term memory
          const similarMessages = await vectorStoreService.retrieveSimilarMessages(
            conversationId, 
            userMessage,
            5 // Limit to 5 most relevant messages
          );
          
          if (similarMessages.length > 0) {
            // Format the messages for context
            longTermContext = `\n\nRelevant information from past conversations:\n`;
            similarMessages.forEach(msg => {
              longTermContext += `- ${msg.role === 'user' ? 'User asked' : 'You responded'}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}\n`;
            });
            
            console.log(`Added ${similarMessages.length} relevant past messages as context`);
          }
        } catch (error) {
          console.error('Error retrieving from long-term memory:', error);
          // Continue without long-term memory if it fails
        }
      }
      
      // Include long-term memory context if available
      const enhancedUserMessage = longTermContext ? 
        `${userMessage}\n\n${longTermContext}` : 
        userMessage;
      
      // Process the message through the chain
      const response = await chain.invoke({
        input: enhancedUserMessage
      });
      
      // After successful processing, store the messages in the vector database
      if (vectorStoreService.isInitialized()) {
        try {
          // Create message objects for storage
          const messagesToStore = [
            {
              id: `user-${Date.now()}`,
              role: 'user' as MessageRole,
              content: userMessage,
              createdAt: new Date().toISOString()
            },
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant' as MessageRole,
              content: response.response,
              createdAt: new Date().toISOString()
            }
          ];
          
          // Store in vector database asynchronously (don't wait for completion)
          vectorStoreService.storeMessages(conversationId, messagesToStore)
            .catch(error => console.error('Error storing messages in vector database:', error));
            
        } catch (error) {
          console.error('Error preparing messages for vector storage:', error);
          // Continue even if storing fails
        }
      }
      
      return response.response;
    } catch (error: any) {
      console.error('Error in LangChain conversation:', error);
      throw new Error(`LangChain Error: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Process a message for data-related queries
   */
  async processDataQuery(
    conversationId: string,
    userMessage: string,
    systemPrompt: string,
    sqlContext: string
  ): Promise<string> {
    if (!this.model || !this.config) {
      throw new Error('LangChain service not initialized');
    }
    
    try {
      // For data queries, we use a simpler approach with direct prompting
      // This gives us more control over how SQL queries are executed
      
      const messages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessage),
        new AIMessage("I'll help you with that query. Let me check the database."),
        new HumanMessage(sqlContext)
      ];
      
      const response = await this.model.invoke(messages);
      return response.content as string;
    } catch (error: any) {
      console.error('Error in LangChain data query:', error);
      throw new Error(`LangChain Error: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Check if a message is asking about data
   */
  async isDataRelatedQuestion(message: string): Promise<boolean> {
    if (!this.model || !this.config) {
      return false;
    }
    
    try {
      const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(`
          Your task is to determine if the following message is asking about data that would 
          require querying a database. Data-related questions typically ask about specific 
          client information, metrics, statistics, or records that would be stored in a database.
          
          Examples of data-related questions:
          - "How many sessions did client X have last month?"
          - "What is the progress of client Y on goal Z?"
          - "Show me all budget items for client A"
          
          Respond with ONLY "yes" or "no".
        `),
        HumanMessagePromptTemplate.fromTemplate("{input}")
      ]);
      
      const chain = new LLMChain({
        llm: this.model,
        prompt: prompt
      });
      
      const response = await chain.invoke({
        input: message
      });
      
      return response.text.toLowerCase().includes('yes');
    } catch (error) {
      console.error('Error determining if message is data-related:', error);
      return false;
    }
  }
  
  /**
   * Test the connection to OpenAI
   */
  async testConnection(): Promise<boolean> {
    if (!this.model || !this.config) {
      return false;
    }
    
    try {
      const testMessage = new HumanMessage('Hello, please reply with "Connection successful"');
      const response = await this.model.invoke([testMessage]);
      
      const reply = response.content.toString().toLowerCase();
      return reply.includes('connection successful');
    } catch (error) {
      console.error('LangChain connection test failed:', error);
      return false;
    }
  }
  
  /**
   * Create a chat completion directly (fallback method)
   */
  async createChatCompletion(messages: ChatMessage[]): Promise<string> {
    if (!this.model || !this.config) {
      throw new Error('LangChain service not initialized');
    }
    
    try {
      const langChainMessages = this.convertToLangChainMessages(messages);
      const response = await this.model.invoke(langChainMessages);
      return response.content as string;
    } catch (error: any) {
      console.error('Error in LangChain chat completion:', error);
      throw new Error(`LangChain Error: ${error.message || 'Unknown error'}`);
    }
  }
}

// Create a singleton instance
export const langchainService = new LangChainService();