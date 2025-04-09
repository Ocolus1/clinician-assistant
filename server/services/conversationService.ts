/**
 * Conversation Service
 * 
 * This service manages conversations between users and the Clinician Assistant.
 * It stores conversation history, handles message exchanges, and provides
 * conversation management operations.
 */

import { randomUUID } from 'crypto';
import { Conversation, Message, MessageRole } from '@shared/assistantTypes';

/**
 * Conversation Service class
 */
export class ConversationService {
  private conversations: Map<string, Conversation> = new Map();
  
  /**
   * Create a new conversation
   */
  createConversation(name: string): Conversation {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    const conversation: Conversation = {
      id,
      name,
      messages: [],
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now
    };
    
    this.conversations.set(id, conversation);
    return conversation;
  }
  
  /**
   * Get all conversations
   */
  getConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => {
        const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return dateB - dateA;
      });
  }
  
  /**
   * Get a conversation by ID
   */
  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }
  
  /**
   * Update a conversation
   */
  updateConversation(id: string, updates: Partial<Conversation>): boolean {
    const conversation = this.conversations.get(id);
    
    if (!conversation) {
      return false;
    }
    
    // Update the conversation with the provided fields
    Object.assign(conversation, updates);
    
    return true;
  }
  
  /**
   * Delete a conversation
   */
  deleteConversation(id: string): boolean {
    return this.conversations.delete(id);
  }
  
  /**
   * Clear all messages from a conversation
   */
  clearConversation(id: string): boolean {
    const conversation = this.conversations.get(id);
    
    if (!conversation) {
      return false;
    }
    
    conversation.messages = [];
    conversation.lastMessageAt = new Date().toISOString();
    
    return true;
  }
  
  /**
   * Add a message to a conversation
   */
  addMessage(conversationId: string, role: MessageRole, content: string): Message | null {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return null;
    }
    
    const now = new Date().toISOString();
    
    const message: Message = {
      id: randomUUID(),
      role,
      content,
      createdAt: now
    };
    
    conversation.messages.push(message);
    conversation.lastMessageAt = now;
    
    return message;
  }
  
  /**
   * Get the message history for a conversation
   */
  getMessageHistory(conversationId: string): Message[] {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return [];
    }
    
    return conversation.messages;
  }
}

// Create a singleton instance
export const conversationService = new ConversationService();