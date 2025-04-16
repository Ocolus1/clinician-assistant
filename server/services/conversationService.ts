/**
 * Conversation Service
 * 
 * This service manages conversations between users and the Clinician Assistant.
 * It stores conversation history in the database, handles message exchanges,
 * and provides conversation management operations.
 */

import { randomUUID } from 'crypto';
import { sql } from '../db';
import { Conversation, Message, MessageRole, QueryResult } from '@shared/assistantTypes';

/**
 * Helper function to format dates consistently
 */
const formatDate = (date: any): string => {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  return new Date().toISOString();
};

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
    
    // Convert Date objects to ISO strings for PostgreSQL compatibility
    try {
      console.log(`Creating conversation "${name}" with id ${id}`);
      
      // Insert the conversation into the database
      await sql`
        INSERT INTO assistant_conversations (id, name, created_at, updated_at, last_message_at)
        VALUES (${id}, ${name}, ${isoNow}, ${isoNow}, ${isoNow})
      `;
      
      console.log(`Successfully created conversation "${name}"`);
      
      // Return the conversation object
      return {
        id,
        name,
        messages: [],
        lastMessageAt: isoNow,
        createdAt: isoNow,
        updatedAt: isoNow
      };
    } catch (error) {
      console.error('Error in createConversation:', error);
      throw error;
    }
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
          createdAt: formatDate(conv.created_at),
          updatedAt: formatDate(conv.updated_at),
          lastMessageAt: formatDate(conv.last_message_at),
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
      `;
      
      const conversation = conversations[0];
      if (!conversation) {
        return undefined;
      }
      
      // Get messages for this conversation
      const messages = await this.getMessageHistory(id);
      
      return {
        id: conversation.id,
        name: conversation.name,
        createdAt: formatDate(conversation.created_at),
        updatedAt: formatDate(conversation.updated_at),
        lastMessageAt: formatDate(conversation.last_message_at),
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
      `;
      
      if (conversations.length === 0) {
        return false;
      }
      
      const now = new Date();
      const isoNow = now.toISOString();
      
      // Update the conversation in the database
      if (updates.name) {
        await sql`
          UPDATE assistant_conversations
          SET name = ${updates.name}, updated_at = ${isoNow}
          WHERE id = ${id}
        `;
      } else {
        await sql`
          UPDATE assistant_conversations
          SET updated_at = ${isoNow}
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
      `;
      
      if (conversations.length === 0) {
        return false;
      }
      
      const now = new Date();
      const isoNow = now.toISOString();
      
      // Delete all messages for this conversation
      await sql`
        DELETE FROM assistant_messages
        WHERE conversation_id = ${id}
      `;
      
      // Update the lastMessageAt timestamp
      await sql`
        UPDATE assistant_conversations
        SET last_message_at = ${isoNow}, updated_at = ${isoNow}
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
  async addMessage(conversationId: string, role: MessageRole, content: string, queryResult?: QueryResult): Promise<Message | null> {
    try {
      // Check if conversation exists
      const conversations = await sql`
        SELECT id FROM assistant_conversations
        WHERE id = ${conversationId}
      `;
      
      if (conversations.length === 0) {
        return null;
      }
      
      const id = randomUUID();
      const now = new Date();
      const isoNow = now.toISOString();
      
      // Convert query result to JSON string if present
      const queryResultJSON = queryResult ? JSON.stringify(queryResult) : null;
      
      try {
        console.log(`Adding message to conversation ${conversationId} with role ${role}`);
        
        // Insert the message with optional query result
        await sql`
          INSERT INTO assistant_messages (id, conversation_id, role, content, query_result, created_at)
          VALUES (${id}, ${conversationId}, ${role}, ${content}, ${queryResultJSON}, ${isoNow})
        `;
        
        // Update the conversation's lastMessageAt timestamp
        await sql`
          UPDATE assistant_conversations
          SET last_message_at = ${isoNow}, updated_at = ${isoNow}
          WHERE id = ${conversationId}
        `;
        
        console.log(`Successfully added message to conversation ${conversationId}`);
        
        // Return the message
        return {
          id,
          role,
          content,
          createdAt: isoNow,
          queryResult
        };
      } catch (err) {
        console.error(`Database error adding message to conversation ${conversationId}:`, err);
        throw err;
      }
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
      return messages.map((msg) => {
        let queryResult: QueryResult | undefined = undefined;
        
        // Parse query_result JSON if present
        if (msg.query_result) {
          try {
            console.log(`Parsing query result JSON for message ${msg.id}:`, msg.query_result)
            queryResult = JSON.parse(msg.query_result);
          } catch (e) {
            console.error('Error parsing query result JSON:', e);
          }
        }
        
        return {
          id: msg.id,
          role: msg.role as MessageRole,
          content: msg.content,
          createdAt: formatDate(msg.created_at),
          queryResult
        };
      });
    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error);
      return [];
    }
  }
}

// Create a singleton instance
export const conversationService = new ConversationService();