/**
 * Client-side service for interacting with the Clinician Assistant API
 */

import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/utils';
import {
  AssistantStatusResponse,
  ConfigureAssistantRequest,
  ConfigureAssistantResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  GetConversationsResponse,
  SendMessageRequest,
  SendMessageResponse,
  UpdateConversationRequest,
  GetAssistantSettingsResponse,
} from '@shared/assistantTypes';

/**
 * Assistant Service class
 */
class AssistantService {
  /**
   * Check the status of the assistant
   */
  async checkStatus(): Promise<AssistantStatusResponse> {
    const response = await apiRequest('GET', '/api/assistant/status');
    return response;
  }

  /**
   * Configure the assistant
   */
  async configureAssistant(request: ConfigureAssistantRequest): Promise<ConfigureAssistantResponse> {
    const response = await apiRequest('POST', '/api/assistant/configure', request);
    return response;
  }

  /**
   * Get all conversations
   */
  async getConversations(): Promise<GetConversationsResponse> {
    const response = await apiRequest('GET', '/api/assistant/conversations');
    return response;
  }

  /**
   * Create a new conversation
   */
  async createConversation(request: CreateConversationRequest): Promise<CreateConversationResponse> {
    const response = await apiRequest('POST', '/api/assistant/conversations', request);
    
    // Invalidate conversations query cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return response;
  }

  /**
   * Update a conversation
   */
  async updateConversation(request: UpdateConversationRequest): Promise<{ success: boolean }> {
    const response = await apiRequest('PUT', `/api/assistant/conversations/${request.conversationId}`, { name: request.name });
    
    // Invalidate conversations query cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return response;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await apiRequest('DELETE', `/api/assistant/conversations/${conversationId}`);
    
    // Invalidate conversations query cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return response;
  }

  /**
   * Clear all messages from a conversation
   */
  async clearConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await apiRequest('POST', `/api/assistant/conversations/${conversationId}/clear`);
    
    // Invalidate conversations query cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return response;
  }

  /**
   * Send a message to the assistant
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await apiRequest('POST', `/api/assistant/conversations/${request.conversationId}/messages`, { message: request.message });
    
    // Invalidate conversations query cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return response;
  }
  
  /**
   * Get assistant settings
   */
  async getSettings(): Promise<GetAssistantSettingsResponse> {
    const response = await apiRequest('GET', '/api/assistant/settings');
    return response;
  }
  
  /**
   * Save assistant settings
   */
  async saveSettings(settings: any): Promise<{ success: boolean }> {
    const response = await apiRequest('POST', '/api/assistant/settings', settings);
    
    // Invalidate settings and status query cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/settings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/status'] });
    
    return response;
  }
  
  /**
   * Test OpenAI connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const response = await apiRequest('POST', '/api/assistant/test-connection');
    return response;
  }
  
  /**
   * Request OpenAI API key via secrets
   */
  async requestAPIKeyViaSecrets(): Promise<{ success: boolean }> {
    const response = await apiRequest('POST', '/api/assistant/request-api-key');
    
    // Invalidate settings and status query cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/settings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/status'] });
    
    return response;
  }
}

// Create a singleton instance
export const assistantService = new AssistantService();