/**
 * Clinician Assistant Service
 * 
 * This service provides methods for interacting with the assistant API,
 * including conversation management and message exchange.
 */

import { queryClient } from '@/lib/queryClient';
import {
  AssistantSettings,
  ConversationsResponse,
  ConnectionTestResponse,
  StatusResponse,
  CreateConversationRequest,
  UpdateConversationRequest,
  SendMessageRequest,
  UpdateSettingsRequest
} from '@shared/assistantTypes';

class AssistantService {
  /**
   * Get all conversations
   */
  async getConversations(): Promise<ConversationsResponse> {
    const response = await fetch('/api/assistant/conversations');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch conversations: ${errorText}`);
    }
    return await response.json();
  }
  
  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string) {
    const response = await fetch(`/api/assistant/conversations/${conversationId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch conversation: ${errorText}`);
    }
    return await response.json();
  }
  
  /**
   * Create a new conversation
   */
  async createConversation(data: CreateConversationRequest) {
    const response = await fetch('/api/assistant/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create conversation: ${errorText}`);
    }
    
    // Invalidate conversations cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return await response.json();
  }
  
  /**
   * Update a conversation (rename)
   */
  async updateConversation(data: UpdateConversationRequest) {
    const response = await fetch(`/api/assistant/conversations/${data.conversationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: data.name }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update conversation: ${errorText}`);
    }
    
    // Invalidate conversations cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return await response.json();
  }
  
  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string) {
    const response = await fetch(`/api/assistant/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete conversation: ${errorText}`);
    }
    
    // Invalidate conversations cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return await response.json();
  }
  
  /**
   * Clear a conversation's messages
   */
  async clearConversation(conversationId: string) {
    const response = await fetch(`/api/assistant/conversations/${conversationId}/clear`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to clear conversation: ${errorText}`);
    }
    
    // Invalidate conversations cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return await response.json();
  }
  
  /**
   * Send a message to the assistant
   */
  async sendMessage(data: SendMessageRequest) {
    const response = await fetch(`/api/assistant/conversations/${data.conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: data.message }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send message: ${errorText}`);
    }
    
    // Invalidate conversations cache
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
    
    return await response.json();
  }
  
  /**
   * Get assistant settings
   */
  async getSettings(): Promise<AssistantSettings> {
    const response = await fetch('/api/assistant/settings');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch settings: ${errorText}`);
    }
    return await response.json();
  }
  
  /**
   * Update assistant settings
   */
  async updateSettings(settings: UpdateSettingsRequest) {
    const response = await fetch('/api/assistant/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update settings: ${errorText}`);
    }
    
    // Invalidate related caches
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/settings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/assistant/status'] });
    
    return await response.json();
  }
  
  /**
   * Check assistant status
   */
  async checkStatus(): Promise<StatusResponse> {
    const response = await fetch('/api/assistant/status');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to check status: ${errorText}`);
    }
    return await response.json();
  }
  
  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<ConnectionTestResponse> {
    const response = await fetch('/api/assistant/test-connection');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to test connection: ${errorText}`);
    }
    return await response.json();
  }
}

export const assistantService = new AssistantService();