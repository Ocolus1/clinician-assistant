/**
 * Conversation Service
 * 
 * This service manages conversations between users and the Clinician Assistant.
 * It stores conversation history in the database, handles message exchanges,
 * and provides conversation management operations.
 */

import { randomUUID } from 'crypto';
import { sql } from '../db';
import { Conversation, Message, MessageRole } from '@shared/assistantTypes';

/**
 * Conversation Service class
 */
export class ConversationService {
  /**
   * Create a new conversation
   */
  async createConversation(name: string): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const isoNow = now.toISOString();
    
    // Insert the conversation into the database
    await sql`
      INSERT INTO assistant_conversations (id, name, created_at, updated_at, last_message_at)
      VALUES (${id}, ${name}, ${now}, ${now}, ${now})
    `;
    
    // Return the conversation object
    return {
      id,
      name,
      messages: [],
      lastMessageAt: isoNow,
      createdAt: isoNow,
      updatedAt: isoNow
    };
  }
  
  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      // Get all conversations from the database
      const dbConversations = await sql`
        SELECT * FROM assistant_conversations
        ORDER BY last_message_at DESC
      `;
      
      // Map database conversations to the Conversation interface
      return await Promise.all(dbConversations.map(async (conv) => {
        const messages = await this.getMessageHistory(conv.id);
        
        return {
          id: conv.id,
          name: conv.name,
          createdAt: conv.created_at?.toISOString() || new Date().toISOString(),
          updatedAt: conv.updated_at?.toISOString() || new Date().toISOString(),
          lastMessageAt: conv.last_message_at?.toISOString(),
          messages: messages
        };
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }
  
  /**
   * Get a conversation by ID with its messages
   */
  async getConversation(id: string): Promise<Conversation | undefined> {
    try {
      // Get the conversation from the database
      const conversations = await sql`
        SELECT * FROM assistant_conversations
        WHERE id = ${id}
        LIMIT 1
      `;
      
      const conversation = conversations[0];
      if (!conversation) {
        return undefined;
      }
      
      // Get messages for this conversation
      const messages = await this.getMessageHistory(id);
      
      // Return the conversation with messages
      return {
        id: conversation.id,
        name: conversation.name,
        createdAt: conversation.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: conversation.updated_at?.toISOString() || new Date().toISOString(),
        lastMessageAt: conversation.last_message_at?.toISOString(),
        messages
      };
    } catch (error) {
      console.error(`Error fetching conversation ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Update a conversation
   */
  async updateConversation(id: string, updates: Partial<Conversation>): Promise<boolean> {
    try {
      // First check if the conversation exists
      const conversations = await sql`
        SELECT id FROM assistant_conversations
        WHERE id = ${id}
        LIMIT 1
      `;
      
      if (conversations.length === 0) {
        return false;
      }
      
      const now = new Date();
      
      // Update the conversation in the database
      if (updates.name) {
        await sql`
          UPDATE assistant_conversations
          SET name = ${updates.name}, updated_at = ${now}
          WHERE id = ${id}
        `;
      } else {
        await sql`
          UPDATE assistant_conversations
          SET updated_at = ${now}
          WHERE id = ${id}
        `;
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating conversation ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<boolean> {
    try {
      // Check if conversation exists
      const conversations = await sql`
        SELECT id FROM assistant_conversations
        WHERE id = ${id}
        LIMIT 1
      `;
      
      if (conversations.length === 0) {
        return false;
      }
      
      // Delete the conversation (this will cascade delete messages due to FK constraint)
      await sql`
        DELETE FROM assistant_conversations
        WHERE id = ${id}
      `;
      
      return true;
    } catch (error) {
      console.error(`Error deleting conversation ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Clear all messages from a conversation
   */
  async clearConversation(id: string): Promise<boolean> {
    try {
      // Check if conversation exists
      const conversations = await sql`
        SELECT id FROM assistant_conversations
        WHERE id = ${id}
        LIMIT 1
      `;
      
      if (conversations.length === 0) {
        return false;
      }
      
      const now = new Date();
      
      // Delete all messages for this conversation
      await sql`
        DELETE FROM assistant_messages
        WHERE conversation_id = ${id}
      `;
      
      // Update the lastMessageAt timestamp
      await sql`
        UPDATE assistant_conversations
        SET last_message_at = ${now}, updated_at = ${now}
        WHERE id = ${id}
      `;
      
      return true;
    } catch (error) {
      console.error(`Error clearing messages for conversation ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId: string, role: MessageRole, content: string): Promise<Message | null> {
    try {
      // Check if conversation exists
      const conversations = await sql`
        SELECT id FROM assistant_conversations
        WHERE id = ${conversationId}
        LIMIT 1
      `;
      
      if (conversations.length === 0) {
        return null;
      }
      
      const id = randomUUID();
      const now = new Date();
      
      // Insert the message
      await sql`
        INSERT INTO assistant_messages (id, conversation_id, role, content, created_at)
        VALUES (${id}, ${conversationId}, ${role}, ${content}, ${now})
      `;
      
      // Update the conversation's lastMessageAt timestamp
      await sql`
        UPDATE assistant_conversations
        SET last_message_at = ${now}, updated_at = ${now}
        WHERE id = ${conversationId}
      `;
      
      // Return the message
      return {
        id,
        role,
        content,
        createdAt: now.toISOString()
      };
    } catch (error) {
      console.error(`Error adding message to conversation ${conversationId}:`, error);
      return null;
    }
  }
  
  /**
   * Get the message history for a conversation
   */
  async getMessageHistory(conversationId: string): Promise<Message[]> {
    try {
      // Get messages from the database
      const messages = await sql`
        SELECT * FROM assistant_messages
        WHERE conversation_id = ${conversationId}
        ORDER BY created_at ASC
      `;
      
      // Map database messages to the Message interface
      return messages.map((msg) => ({
        id: msg.id,
        role: msg.role as MessageRole,
        content: msg.content,
        createdAt: msg.created_at?.toISOString() || new Date().toISOString()
      }));
    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error);
      return [];
    }
  }
}

// Create a singleton instance
export const conversationService = new ConversationService();