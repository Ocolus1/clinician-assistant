/**
 * Conversation Service
 * 
 * This service handles the conversation management for the Clinician Assistant.
 */

import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message } from '@shared/assistantTypes';

/**
 * Conversation Service class
 */
export class ConversationService {
  private conversations: Conversation[] = [];

  constructor() {}

  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    return this.conversations;
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const conversation = this.conversations.find(c => c.id === id);
    return conversation || null;
  }

  /**
   * Create a new conversation
   */
  async createConversation(name: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: uuidv4(),
      name,
      messages: [],
      lastMessageAt: new Date().toISOString(),
    };

    this.conversations.push(conversation);
    return conversation;
  }

  /**
   * Update a conversation
   */
  async updateConversation(id: string, name: string): Promise<void> {
    const conversation = await this.getConversation(id);
    if (!conversation) {
      throw new Error(`Conversation not found: ${id}`);
    }

    conversation.name = name;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    const index = this.conversations.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Conversation not found: ${id}`);
    }

    this.conversations.splice(index, 1);
  }

  /**
   * Clear all messages from a conversation
   */
  async clearConversation(id: string): Promise<void> {
    const conversation = await this.getConversation(id);
    if (!conversation) {
      throw new Error(`Conversation not found: ${id}`);
    }

    conversation.messages = [];
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId: string, message: Message): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    conversation.messages.push(message);
    conversation.lastMessageAt = new Date().toISOString();
  }
}

// Create a singleton instance
let conversationServiceInstance: ConversationService | null = null;

/**
 * Get the Conversation Service instance
 */
export function getConversationService(): ConversationService {
  if (!conversationServiceInstance) {
    conversationServiceInstance = new ConversationService();
  }
  return conversationServiceInstance;
}