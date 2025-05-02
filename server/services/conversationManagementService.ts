import { db } from "../db";
import { 
  chatSessions, 
  chatMessages, 
  chatSummaries 
} from "../../shared/schema/chatbot";
import { eq, desc, asc } from "drizzle-orm";
import { memoryService } from "./memoryService";

export class ConversationManagementService {
  // Create a new chat session
  async createSession(clinicianId: number, title: string = "New Chat"): Promise<number> {
    try {
      const result = await db.insert(chatSessions).values({
        clinicianId,
        title,
        startTime: new Date(),
      }).returning();
      
      console.log(`Created new chat session ${result[0].id} for clinician ${clinicianId}`);
      return result[0].id;
    } catch (error) {
      console.error("Error creating chat session:", error);
      throw new Error("Failed to create chat session");
    }
  }
  
  // Rename a chat session
  async renameSession(sessionId: number, title: string): Promise<boolean> {
    try {
      await db.update(chatSessions)
        .set({ title })
        .where(eq(chatSessions.id, sessionId));
      
      console.log(`Renamed chat session ${sessionId} to "${title}"`);
      return true;
    } catch (error) {
      console.error(`Error renaming chat session ${sessionId}:`, error);
      return false;
    }
  }
  
  // Delete a chat session and all associated data
  async deleteSession(sessionId: number): Promise<boolean> {
    try {
      // Delete the session (cascade will delete messages, memories, and summaries)
      await db.delete(chatSessions)
        .where(eq(chatSessions.id, sessionId));
      
      console.log(`Deleted chat session ${sessionId} and all associated data`);
      return true;
    } catch (error) {
      console.error(`Error deleting chat session ${sessionId}:`, error);
      return false;
    }
  }
  
  // End a chat session (mark as completed)
  async endSession(sessionId: number): Promise<boolean> {
    try {
      await db.update(chatSessions)
        .set({ endTime: new Date() })
        .where(eq(chatSessions.id, sessionId));
      
      // Generate a final summary of the conversation
      await this.generateSessionSummary(sessionId);
      
      console.log(`Ended chat session ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`Error ending chat session ${sessionId}:`, error);
      return false;
    }
  }
  
  // Get all chat sessions for a clinician
  async getClinicianSessions(clinicianId: number): Promise<any[]> {
    try {
      return await db.select().from(chatSessions)
        .where(eq(chatSessions.clinicianId, clinicianId))
        .orderBy(desc(chatSessions.startTime));
    } catch (error) {
      console.error(`Error getting chat sessions for clinician ${clinicianId}:`, error);
      return [];
    }
  }
  
  // Get all messages for a chat session
  async getSessionMessages(sessionId: number): Promise<any[]> {
    try {
      return await db.select().from(chatMessages)
        .where(eq(chatMessages.chatSessionId, sessionId))
        .orderBy(asc(chatMessages.timestamp));
    } catch (error) {
      console.error(`Error getting messages for chat session ${sessionId}:`, error);
      return [];
    }
  }
  
  // Delete a specific message from a chat session
  async deleteMessage(messageId: number): Promise<boolean> {
    try {
      await db.delete(chatMessages)
        .where(eq(chatMessages.id, messageId));
      
      console.log(`Deleted message ${messageId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting message ${messageId}:`, error);
      return false;
    }
  }
  
  // Generate a summary of the entire session
  async generateSessionSummary(sessionId: number): Promise<string> {
    try {
      // Get all messages for the session
      const messages = await this.getSessionMessages(sessionId);
      
      if (messages.length === 0) {
        return "No messages to summarize";
      }
      
      // Find the first and last message IDs
      const firstMessageId = messages[0].id;
      const lastMessageId = messages[messages.length - 1].id;
      
      // Generate a summary using the memory service
      const summary = await memoryService.summarizeConversation(
        sessionId,
        firstMessageId - 1, // Start before the first message
        lastMessageId + 1   // End after the last message
      );
      
      // Update the session with the summary
      await db.update(chatSessions)
        .set({ 
          // Add summary as metadata since it's not a direct column
          metadata: { summary }
        })
        .where(eq(chatSessions.id, sessionId));
      
      console.log(`Generated summary for session ${sessionId}`);
      return summary;
    } catch (error) {
      console.error(`Error generating summary for session ${sessionId}:`, error);
      return "Failed to generate session summary";
    }
  }
  
  // Export a chat session as JSON
  async exportSession(sessionId: number): Promise<any> {
    try {
      // Get session details
      const session = await db.select().from(chatSessions)
        .where(eq(chatSessions.id, sessionId))
        .limit(1);
      
      if (session.length === 0) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // Get all messages
      const messages = await this.getSessionMessages(sessionId);
      
      // Get all summaries
      const summaries = await memoryService.getSessionSummaries(sessionId);
      
      // Compile the export data
      const exportData = {
        session: session[0],
        messages,
        summaries,
        exportDate: new Date(),
      };
      
      console.log(`Exported session ${sessionId} with ${messages.length} messages and ${summaries.length} summaries`);
      return exportData;
    } catch (error) {
      console.error(`Error exporting session ${sessionId}:`, error);
      throw new Error("Failed to export session");
    }
  }
  
  // Continue a previous conversation
  async continueSession(sessionId: number): Promise<boolean> {
    try {
      // Check if the session exists and is ended
      const session = await db.select().from(chatSessions)
        .where(eq(chatSessions.id, sessionId))
        .limit(1);
      
      if (session.length === 0) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // If the session is already active, no need to continue it
      if (!session[0].endTime) {
        console.log(`Session ${sessionId} is already active`);
        return true;
      }
      
      // Reactivate the session by clearing the end time
      await db.update(chatSessions)
        .set({ endTime: null })
        .where(eq(chatSessions.id, sessionId));
      
      console.log(`Continued session ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`Error continuing session ${sessionId}:`, error);
      return false;
    }
  }
  
  // Search for sessions by content
  async searchSessions(clinicianId: number, searchTerm: string): Promise<any[]> {
    try {
      // Get all sessions for the clinician
      const sessions = await this.getClinicianSessions(clinicianId);
      
      // For each session, check if it contains the search term
      const results = [];
      
      for (const session of sessions) {
        // Get messages for this session
        const messages = await this.getSessionMessages(session.id);
        
        // Check if any message contains the search term
        const matchingMessages = messages.filter(msg => 
          msg.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matchingMessages.length > 0) {
          results.push({
            session,
            matchCount: matchingMessages.length,
            firstMatch: matchingMessages[0],
          });
        }
      }
      
      // Sort by match count (most matches first)
      results.sort((a, b) => b.matchCount - a.matchCount);
      
      console.log(`Found ${results.length} sessions matching "${searchTerm}" for clinician ${clinicianId}`);
      return results;
    } catch (error) {
      console.error(`Error searching sessions for clinician ${clinicianId}:`, error);
      return [];
    }
  }
}

// Export an instance of the conversation management service
export const conversationManagementService = new ConversationManagementService();
