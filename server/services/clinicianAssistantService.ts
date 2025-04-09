/**
 * Clinician Assistant Service
 * 
 * This service provides the main functionality for the Clinician Assistant,
 * coordinating between OpenAI, conversation management, and SQL query execution.
 */

import { OpenAIConfig } from './openaiService';
import { openaiService } from './openaiService';
import { conversationService } from './conversationService';
import { sqlQueryGenerator } from './sqlQueryGenerator';
import { schemaProvider } from './schemaProvider';
import { ChatMessage } from './openaiService';
import { Message, AssistantStatusResponse } from '@shared/assistantTypes';

/**
 * Clinician Assistant Service class
 */
export class ClinicianAssistantService {
  private initialized: boolean = false;
  
  /**
   * Initialize the assistant
   */
  async initialize(): Promise<void> {
    try {
      // Only initialize schema provider if not already initialized
      if (!this.initialized) {
        await schemaProvider.initialize();
        this.initialized = true;
        console.log('Clinician Assistant Service initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Clinician Assistant Service:', error);
      throw new Error('Failed to initialize Clinician Assistant Service');
    }
  }
  
  /**
   * Configure the assistant with OpenAI API settings
   */
  configureAssistant(config: OpenAIConfig): void {
    openaiService.initialize(config);
  }
  
  /**
   * Get the current status of the assistant
   */
  getStatus(): AssistantStatusResponse {
    const isConfigured = openaiService.isConfigured();
    const config = openaiService.getConfig();
    
    return {
      isConfigured,
      connectionValid: isConfigured, // Will be tested separately
      model: config?.model
    };
  }
  
  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<boolean> {
    return await openaiService.testConnection();
  }
  
  /**
   * Send a message to the assistant and get a response
   */
  async processMessage(conversationId: string, messageContent: string): Promise<Message | null> {
    try {
      // Validate conversation exists
      const conversation = conversationService.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
      
      // Add the user message to the conversation
      const userMessage = conversationService.addMessage(conversationId, 'user', messageContent);
      if (!userMessage) {
        throw new Error('Failed to add user message to conversation');
      }
      
      // Get message history for context
      const messageHistory = conversationService.getMessageHistory(conversationId);
      
      // Extract recent messages for context (limit to last 10 for performance)
      const recentMessages = messageHistory
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      // Create the system message
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `
          You are a helpful assistant for speech therapists at a clinic. 
          You can help answer questions about clients, sessions, budgets, goals, and other clinical data.
          
          When a user asks you questions about data, you should:
          1. Generate an appropriate SQL query
          2. Execute the query to get the data
          3. Provide a helpful and concise response based on the data
          
          Always be professional, supportive, and objective. Format numerical data clearly.
          Don't make up information - if you don't know, say so.
        `
      };
      
      // First, try to understand if this is a data-related question
      const isDataQuestion = await this.isDataRelatedQuestion(messageContent);
      
      if (isDataQuestion) {
        // Generate SQL query
        const query = await sqlQueryGenerator.generateQuery(messageContent);
        
        // Execute the query
        const result = await sqlQueryGenerator.executeQuery(query);
        
        // Generate a response based on the query results
        const sqlContext = `
          I executed the following SQL query:
          \`\`\`sql
          ${result.query}
          \`\`\`
          
          ${result.error 
            ? `The query failed with error: ${result.error}`
            : `The query returned ${result.data.length} rows of data: ${JSON.stringify(result.data, null, 2)}`
          }
          
          Based on this data, provide a clear, concise response to the user's question.
          If there was an error or no data, explain what might be the issue.
          Don't mention that you ran an SQL query unless the user specifically asked about database queries.
        `;
        
        // Generate response with SQL context
        const responseContent = await openaiService.createChatCompletion([
          systemMessage,
          ...recentMessages,
          { role: 'user', content: sqlContext }
        ]);
        
        // Add assistant response to conversation
        return conversationService.addMessage(conversationId, 'assistant', responseContent);
      } else {
        // For non-data questions, just use the conversation history
        const responseContent = await openaiService.createChatCompletion([
          systemMessage,
          ...recentMessages
        ]);
        
        // Add assistant response to conversation
        return conversationService.addMessage(conversationId, 'assistant', responseContent);
      }
    } catch (error: any) {
      console.error('Error processing message:', error);
      
      // Add error message to conversation
      return conversationService.addMessage(
        conversationId,
        'assistant',
        `I'm sorry, I encountered an error while processing your request: ${error.message}`
      );
    }
  }
  
  /**
   * Determine if a message is asking about data that would require SQL
   */
  private async isDataRelatedQuestion(message: string): Promise<boolean> {
    try {
      // If the OpenAI service isn't configured, assume it's not a data question
      if (!openaiService.isConfigured()) {
        return false;
      }
      
      const prompt = `
        Determine if the following message is asking about data that would require querying a database.
        Data-related questions typically ask about specific client information, metrics, statistics,
        or records that would be stored in a database. Examples include:
        - "How many sessions did client X have last month?"
        - "What is the progress of client Y on goal Z?"
        - "Show me all budget items for client A"
        
        Message: "${message}"
        
        Respond with ONLY "yes" or "no".
      `;
      
      const response = await openaiService.createChatCompletion([
        { role: 'user', content: prompt }
      ]);
      
      // Check if the response indicates this is a data question
      return response.toLowerCase().includes('yes');
    } catch (error) {
      console.error('Error determining if message is data-related:', error);
      // Default to false on error
      return false;
    }
  }
}

// Create a singleton instance
export const clinicianAssistantService = new ClinicianAssistantService();