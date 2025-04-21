/**
 * OpenAI Service
 * 
 * This service handles communication with the OpenAI API for generating
 * chat completions and handling other AI-related tasks.
 */

import OpenAI from 'openai';
import { MessageRole } from '@shared/assistantTypes';

/**
 * Message for OpenAI chat completion
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Configuration for the OpenAI service
 */
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
}

/**
 * OpenAI Service class
 */
export class OpenAIService {
  private openai: OpenAI | null = null;
  private config: OpenAIConfig | null = null;
  
  /**
   * Initialize the OpenAI service with API credentials
   * Prioritizes environment variables if available
   */
  initialize(config: OpenAIConfig): void {
    // Use environment variable API key if available, otherwise use the provided one
    const apiKey = process.env.OPENAI_API_KEY || config.apiKey;
    
    this.config = {
      ...config,
      apiKey: apiKey // Update the config with the resolved API key
    };
    
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    
    console.log(`OpenAI service initialized with model: ${config.model}`);
  }
  
  /**
   * Check if the OpenAI service is configured
   */
  isConfigured(): boolean {
    return !!this.openai && !!this.config;
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): OpenAIConfig | null {
    return this.config;
  }
  
  /**
   * Create a chat completion
   * @param messages - Array of chat messages
   * @param jsonResponse - Whether to request a JSON response format
   */
  async createChatCompletion(messages: ChatMessage[], jsonResponse = false): Promise<string> {
    if (!this.openai || !this.config) {
      throw new Error('OpenAI service not initialized');
    }
    
    try {
      const completionOptions: any = {
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: this.config.temperature
      };
      
      // If JSON response is requested, add the response_format option
      if (jsonResponse) {
        completionOptions.response_format = { type: "json_object" };
      }
      
      const response = await this.openai.chat.completions.create(completionOptions);
      
      // Return the message content
      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('Error calling OpenAI API:', error);
      throw new Error(`OpenAI API Error: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Test the connection to OpenAI
   */
  async testConnection(): Promise<boolean> {
    if (!this.openai || !this.config) {
      return false;
    }
    
    try {
      // Simple test message
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'user', content: 'Hello, please reply with "Connection successful"' }
        ],
        max_tokens: 20,
        temperature: 0
      });
      
      const reply = response.choices[0]?.message?.content?.toLowerCase() || '';
      return reply.includes('connection successful');
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const openaiService = new OpenAIService();