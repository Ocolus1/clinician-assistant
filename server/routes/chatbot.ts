import express from "express";
import { chatbotService } from "../services/chatbotService";
import { agentService } from "../services/agentService";
import { memoryService } from "../services/memoryService";
import { db } from "../db";
import { chatSessions, chatMessages } from "../../shared/schema/chatbot";
import { eq } from "drizzle-orm";

const router = express.Router();

// Hardcoded clinicianId for development (will be replaced with authentication later)
const DEV_CLINICIAN_ID = 0;

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

// Delete a chat session
router.delete("/sessions/:sessionId", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    await chatbotService.deleteSession(sessionId);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting chat session:", error);
    res.status(500).json({ error: "Failed to delete chat session" });
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
    const sessionLoaded = await chatbotService.loadSession(sessionId);
    
    if (!sessionLoaded) {
      return res.status(404).json({ error: "Chat session not found" });
    }
    
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

export default router;
