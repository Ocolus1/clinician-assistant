/**
 * Client-side service for interacting with the Clinician Assistant API
 */

import { queryClient, apiRequest } from '@/lib/queryClient';
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
}

// Create a singleton instance
export const assistantService = new AssistantService();