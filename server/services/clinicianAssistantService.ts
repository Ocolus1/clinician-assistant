/**
 * Clinician Assistant Service
 * 
 * This service handles the main logic for the Clinician Assistant,
 * including OpenAI integration and conversation management.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  ConfigureAssistantRequest, 
  ConfigureAssistantResponse,
  AssistantStatusResponse,
  Message
} from '@shared/assistantTypes';
import { getConversationService } from './conversationService';
import { getSQLQueryGenerator } from './sqlQueryGenerator';
import { getOpenAIService } from './openaiService';

/**
 * Clinician Assistant Service class
 */
export class ClinicianAssistantService {
  private apiKey: string | null = null;
  private model: string = 'gpt-4-turbo-preview';
  private temperature: number = 0.2;
  private isConfigured: boolean = false;
  private connectionValid: boolean = false;

  constructor() {}

  /**
   * Get the configuration status
   */
  async getStatus(): Promise<AssistantStatusResponse> {
    return {
      isConfigured: this.isConfigured,
      connectionValid: this.connectionValid,
    };
  }

  /**
   * Configure the assistant
   */
  async configure(request: ConfigureAssistantRequest): Promise<ConfigureAssistantResponse> {
    try {
      const { apiKey, model, temperature } = request.config;
      
      this.apiKey = apiKey;
      this.model = model || this.model;
      this.temperature = temperature ?? this.temperature;
      
      // Initialize OpenAI with the new API key
      const openAIService = getOpenAIService();
      await openAIService.initialize({
        apiKey: this.apiKey,
        model: this.model,
        temperature: this.temperature,
      });
      
      // Test the connection
      const connectionValid = await openAIService.testConnection();
      
      this.isConfigured = true;
      this.connectionValid = connectionValid;
      
      return {
        success: true,
        connectionValid,
      };
    } catch (error) {
      console.error('Error configuring clinician assistant:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        connectionValid: false,
      };
    }
  }

  /**
   * Process a message and generate a response
   */
  async processMessage(conversationId: string, messageContent: string): Promise<Message> {
    try {
      if (!this.isConfigured || !this.connectionValid) {
        throw new Error('Assistant is not properly configured');
      }

      // Get the conversation service and SQL query generator
      const conversationService = getConversationService();
      const sqlQueryGenerator = getSQLQueryGenerator();
      
      // Create and add the user message to the conversation
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: messageContent,
        createdAt: new Date().toISOString(),
      };
      
      await conversationService.addMessage(conversationId, userMessage);
      
      // Generate and execute SQL query
      const queryResult = await sqlQueryGenerator.generateAndExecute(messageContent);
      
      let assistantResponseContent = '';
      
      if (queryResult.error) {
        // If there was an error, return it as the response
        assistantResponseContent = `I encountered an error while trying to process your request: ${queryResult.error}`;
      } else {
        // If successful, explain the results
        const explanation = await sqlQueryGenerator.explainResults(
          messageContent,
          queryResult.sqlQuery,
          queryResult.data
        );
        
        assistantResponseContent = explanation;
      }
      
      // Create the assistant's response message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantResponseContent,
        createdAt: new Date().toISOString(),
      };
      
      // Add the assistant's response to the conversation
      await conversationService.addMessage(conversationId, assistantMessage);
      
      return assistantMessage;
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Create an error response
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        createdAt: new Date().toISOString(),
      };
      
      // Add the error message to the conversation
      const conversationService = getConversationService();
      await conversationService.addMessage(conversationId, errorMessage);
      
      return errorMessage;
    }
  }
}

// Create a singleton instance
let clinicianAssistantServiceInstance: ClinicianAssistantService | null = null;

/**
 * Get the Clinician Assistant Service instance
 */
export function getClinicianAssistantService(): ClinicianAssistantService {
  if (!clinicianAssistantServiceInstance) {
    clinicianAssistantServiceInstance = new ClinicianAssistantService();
  }
  return clinicianAssistantServiceInstance;
}