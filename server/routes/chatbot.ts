import express from "express";
import { chatbotService } from "../services/chatbotService";
import { agentService } from "../services/agentService";
import { memoryService } from "../services/memoryService";
import { entityExtractionService } from "../services/entityExtractionService";
import { patientQueriesService } from "../services/patientQueriesService";
import { responseGenerationService } from "../services/responseGenerationService";
import { reactAgentService } from "../services/reactAgentService";
import { conversationManagementService } from "../services/conversationManagementService";
import { db } from "../db";
import { chatSessions, chatMessages, queryLogs, chatMemories, chatSummaries } from "../../shared/schema/chatbot";
import { clinicians } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";

const router = express.Router();

// Hardcoded clinicianId for development (will be replaced with authentication later)
const DEV_CLINICIAN_ID = 1;

// Create a new chat session
router.post("/sessions", async (req, res) => {
  try {
    // Use hardcoded clinicianId during development
    const clinicianId = DEV_CLINICIAN_ID;
    const { title } = req.body;
    
    const sessionId = await chatbotService.createSession(clinicianId, title);
    
    res.status(201).json({ sessionId });
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

// Get all chat sessions for a clinician
router.get("/sessions/clinician/:clinicianId", async (req, res) => {
  try {
    // Use hardcoded clinicianId during development
    const clinicianId = DEV_CLINICIAN_ID;
    
    const sessions = await chatbotService.getClinicianSessions(clinicianId);
    
    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error getting clinician sessions:", error);
    res.status(500).json({ error: "Failed to get clinician sessions" });
  }
});

// Get a specific chat session
router.get("/sessions/:sessionId", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    const session = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
    
    if (session.length === 0) {
      return res.status(404).json({ error: "Chat session not found" });
    }
    
    res.status(200).json(session[0]);
  } catch (error) {
    console.error("Error getting chat session:", error);
    res.status(500).json({ error: "Failed to get chat session" });
  }
});

// Rename a chat session
router.put("/sessions/:sessionId/rename", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    await chatbotService.renameSession(sessionId, title);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error renaming chat session:", error);
    res.status(500).json({ error: "Failed to rename chat session" });
  }
});

// Update a chat session title
router.put("/sessions/:sessionId", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    await chatbotService.renameSession(sessionId, title);
    
    res.status(200).json({ message: "Session updated successfully" });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
});

// Delete a chat session
router.delete("/sessions/:sessionId", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    // First delete all related records that have foreign key constraints
    try {
      // Delete all query logs for the session
      // We need to first get all messages for this session
      const messages = await db.select({ id: chatMessages.id })
        .from(chatMessages)
        .where(eq(chatMessages.chatSessionId, sessionId));
      
      // Then delete query logs associated with these messages
      if (messages.length > 0) {
        const messageIds = messages.map(msg => msg.id);
        await db.delete(queryLogs)
          .where(sql`${queryLogs.chatMessageId} IN (${sql.join(messageIds, sql`, `)})`);
      }
    } catch (error) {
      console.error("Error deleting query logs:", error);
      // Continue with other deletions even if this fails
    }
    
    try {
      // Delete all memories for the session
      await db.delete(chatMemories)
        .where(eq(chatMemories.chatSessionId, sessionId));
    } catch (error) {
      console.error("Error deleting chat memories:", error);
      // Continue with other deletions even if this fails
    }
    
    try {
      // Delete all summaries for the session
      await db.delete(chatSummaries)
        .where(eq(chatSummaries.chatSessionId, sessionId));
    } catch (error) {
      console.error("Error deleting chat summaries:", error);
      // Continue with other deletions even if this fails
    }
    
    try {
      // Delete all messages for the session
      await db.delete(chatMessages)
        .where(eq(chatMessages.chatSessionId, sessionId));
    } catch (error) {
      console.error("Error deleting chat messages:", error);
      // Continue with other deletions even if this fails
    }
    
    // Finally delete the session itself
    await db.delete(chatSessions)
      .where(eq(chatSessions.id, sessionId));
    
    res.status(200).json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// Get all messages for a chat session
router.get("/sessions/:sessionId/messages", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    const messages = await chatbotService.getSessionMessages(sessionId);
    
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error getting session messages:", error);
    res.status(500).json({ error: "Failed to get session messages" });
  }
});

// Send a message to the chatbot
router.post("/sessions/:sessionId/messages", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Load the session
    await chatbotService.loadSession(sessionId);
    
    // Process the message
    const response = await chatbotService.processMessage(message);
    
    res.status(200).json({ response });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Process a message using the agent (for more complex queries)
router.post("/agent/query", async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    const response = await agentService.processQuery(query);
    
    res.status(200).json({ response });
  } catch (error) {
    console.error("Error processing agent query:", error);
    res.status(500).json({ error: "Failed to process query" });
  }
});

// Process a message using the ReAct agent (for complex queries with reasoning)
router.post("/react/query", async (req, res) => {
  try {
    const { query, sessionId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    
    const response = await reactAgentService.processQuery(query, sessionId);
    
    res.status(200).json({ response });
  } catch (error) {
    console.error("Error processing query with ReAct agent:", error);
    res.status(500).json({ error: "Failed to process query with ReAct agent" });
  }
});

// Extract entities from a query (new Phase 2 endpoint)
router.post("/extract-entities", async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    const entities = await entityExtractionService.processQuery(query);
    
    res.status(200).json(entities);
  } catch (error) {
    console.error("Error extracting entities:", error);
    res.status(500).json({ error: "Failed to extract entities" });
  }
});

// Search for patients by name (new Phase 2 endpoint)
router.get("/patients/search", async (req, res) => {
  try {
    const { name, limit } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: "Name query parameter is required" });
    }
    
    const patients = await patientQueriesService.findPatientsByName(
      name as string,
      limit ? parseInt(limit as string) : 5
    );
    
    res.status(200).json(patients);
  } catch (error) {
    console.error("Error searching patients:", error);
    res.status(500).json({ error: "Failed to search patients" });
  }
});

// Get patient goals (new Phase 2 endpoint)
router.get("/patients/:patientId/goals", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    
    const goals = await patientQueriesService.getPatientGoals(patientId);
    
    res.status(200).json(goals);
  } catch (error) {
    console.error("Error getting patient goals:", error);
    res.status(500).json({ error: "Failed to get patient goals" });
  }
});

// Get patient goal progress (new Phase 2 endpoint)
router.get("/patients/:patientId/goal-progress", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const { goalId } = req.query;
    
    const progress = await patientQueriesService.getPatientGoalProgress(
      patientId,
      goalId ? parseInt(goalId as string) : undefined
    );
    
    res.status(200).json(progress);
  } catch (error) {
    console.error("Error getting patient goal progress:", error);
    res.status(500).json({ error: "Failed to get patient goal progress" });
  }
});

// Get patients with expiring budgets (new Phase 2 endpoint)
router.get("/patients/expiring-budgets", async (req, res) => {
  try {
    const { days } = req.query;
    
    const patients = await patientQueriesService.getPatientsWithExpiringBudgets(
      days ? parseInt(days as string) : 30
    );
    
    res.status(200).json(patients);
  } catch (error) {
    console.error("Error getting patients with expiring budgets:", error);
    res.status(500).json({ error: "Failed to get patients with expiring budgets" });
  }
});

// Get summaries for a chat session
router.get("/sessions/:sessionId/summaries", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    const summaries = await memoryService.getSessionSummaries(sessionId);
    
    res.status(200).json(summaries);
  } catch (error) {
    console.error("Error getting session summaries:", error);
    res.status(500).json({ error: "Failed to get session summaries" });
  }
});

// Create a summary for a chat session
router.post("/sessions/:sessionId/summaries", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { startMessageId, endMessageId } = req.body;
    
    if (!startMessageId || !endMessageId) {
      return res.status(400).json({ error: "Start and end message IDs are required" });
    }
    
    const summary = await memoryService.summarizeConversation(
      sessionId,
      startMessageId,
      endMessageId
    );
    
    res.status(201).json({ summary });
  } catch (error) {
    console.error("Error creating summary:", error);
    res.status(500).json({ error: "Failed to create summary" });
  }
});

// Extract memories from a chat session
router.post("/sessions/:sessionId/memories/extract", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    await memoryService.extractMemoriesFromConversation(sessionId);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error extracting memories:", error);
    res.status(500).json({ error: "Failed to extract memories" });
  }
});

// Search for relevant memories
router.get("/memories/search", async (req, res) => {
  try {
    const { query, limit } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    const memories = await memoryService.searchMemories(
      query as string,
      limit ? parseInt(limit as string) : 5
    );
    
    res.status(200).json(memories);
  } catch (error) {
    console.error("Error searching memories:", error);
    res.status(500).json({ error: "Failed to search memories" });
  }
});

// Continue a previous conversation
router.post("/sessions/:sessionId/continue", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    const success = await chatbotService.continueSession(sessionId);
    
    if (!success) {
      return res.status(404).json({ error: "Failed to continue session" });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error continuing session:", error);
    res.status(500).json({ error: "Failed to continue session" });
  }
});

// Export a chat session as JSON
router.get("/sessions/:sessionId/export", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    const exportData = await chatbotService.exportSession(sessionId);
    
    res.status(200).json(exportData);
  } catch (error) {
    console.error("Error exporting session:", error);
    res.status(500).json({ error: "Failed to export session" });
  }
});

// Search for sessions by content
router.get("/sessions/search", async (req, res) => {
  try {
    // Use hardcoded clinicianId during development
    const clinicianId = DEV_CLINICIAN_ID;
    const { term } = req.query;
    
    if (!term) {
      return res.status(400).json({ error: "Search term is required" });
    }
    
    const results = await chatbotService.searchSessions(clinicianId, term as string);
    
    res.status(200).json(results);
  } catch (error) {
    console.error("Error searching sessions:", error);
    res.status(500).json({ error: "Failed to search sessions" });
  }
});

// Run periodic memory management
router.post("/memory/periodic-management", async (req, res) => {
  try {
    await memoryService.periodicMemoryManagement();
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error running periodic memory management:", error);
    res.status(500).json({ error: "Failed to run periodic memory management" });
  }
});

// Delete a specific message from a chat session
router.delete("/messages/:messageId", async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    
    const success = await conversationManagementService.deleteMessage(messageId);
    
    if (!success) {
      return res.status(404).json({ error: "Failed to delete message" });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// Generate a summary of the entire session
router.post("/sessions/:sessionId/generate-summary", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    const summary = await conversationManagementService.generateSessionSummary(sessionId);
    
    res.status(200).json({ summary });
  } catch (error) {
    console.error("Error generating session summary:", error);
    res.status(500).json({ error: "Failed to generate session summary" });
  }
});

// Create a dummy clinician for development if it doesn't exist
router.get("/setup-dev-clinician", async (req, res) => {
  try {
    // Check if the dev clinician already exists
    const existingClinician = await db
      .select()
      .from(clinicians)
      .where(eq(clinicians.id, DEV_CLINICIAN_ID))
      .limit(1);
    
    if (existingClinician.length > 0) {
      return res.status(200).json({ 
        message: "Development clinician already exists", 
        clinician: existingClinician[0] 
      });
    }
    
    // Create a new clinician with ID 1 for development
    await db.insert(clinicians).values({
      id: DEV_CLINICIAN_ID,
      name: "Development Clinician",
      title: "Therapist",
      email: "dev@example.com",
      specialization: "Development Testing",
      active: true,
      notes: "This is a dummy clinician created for development purposes"
    });
    
    res.status(201).json({ 
      message: "Development clinician created successfully",
      clinicianId: DEV_CLINICIAN_ID
    });
  } catch (error) {
    console.error("Error setting up development clinician:", error);
    res.status(500).json({ error: "Failed to set up development clinician" });
  }
});

export default router;
