import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { 
  insertClientSchema, 
  insertAllySchema, 
  insertGoalSchema, 
  insertSubgoalSchema, 
  insertBudgetItemSchema, 
  insertBudgetSettingsSchema,
  insertBudgetItemCatalogSchema,
  insertSessionSchema,
  insertSessionNoteSchema,
  insertPerformanceAssessmentSchema,
  insertMilestoneAssessmentSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Debugging routes
  app.get("/api/debug/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  app.get("/api/clients", async (req, res) => {
    console.log("GET /api/clients - Retrieving all clients");
    try {
      // Check if we should include incomplete clients
      const includeIncomplete = req.query.includeIncomplete === 'true';
      console.log(`Include incomplete clients: ${includeIncomplete}`);
      
      // Get all clients using the storage's getAllClients method
      const allClients = await storage.getAllClients();
      console.log(`Found ${allClients.length} clients in database`);
      
      // Filter out incomplete clients unless specifically requested
      const clients = includeIncomplete 
        ? allClients 
        : allClients.filter(client => client.onboardingStatus === 'complete');
      
      console.log(`Returning ${clients.length} clients after filtering`);
      res.json(clients);
    } catch (error) {
      console.error("Error retrieving clients:", error);
      res.status(500).json({ error: "Failed to retrieve clients" });
    }
  });
  // Client routes
  app.post("/api/clients", async (req, res) => {
    const result = insertClientSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const client = await storage.createClient(result.data);
    res.json(client);
  });

  app.get("/api/clients/:id", async (req, res) => {
    const clientId = parseInt(req.params.id);
    console.log(`GET /api/clients/${clientId} - Fetching client with ID: ${clientId}`);
    
    if (isNaN(clientId) || clientId <= 0) {
      console.error(`Invalid client ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid client ID" });
    }
    
    try {
      const client = await storage.getClient(clientId);
      
      if (!client) {
        console.log(`Client with ID ${clientId} not found`);
        return res.status(404).json({ error: "Client not found" });
      }
      
      console.log(`Client with ID ${clientId} found:`, client);
      res.json(client);
    } catch (error) {
      console.error(`Error fetching client with ID ${clientId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.put("/api/clients/:id", async (req, res) => {
    const clientId = parseInt(req.params.id);
    console.log(`PUT /api/clients/${clientId} - Updating client with ID: ${clientId}`);
    
    if (isNaN(clientId) || clientId <= 0) {
      console.error(`Invalid client ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid client ID" });
    }
    
    try {
      // Check if client exists first
      const existingClient = await storage.getClient(clientId);
      
      if (!existingClient) {
        console.log(`Client with ID ${clientId} not found`);
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Update the client with the new data
      console.log(`Updating client ${clientId} with data:`, req.body);
      const updatedClient = await storage.updateClient(clientId, req.body);
      
      res.json(updatedClient);
    } catch (error) {
      console.error(`Error updating client with ID ${clientId}:`, error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    const clientId = parseInt(req.params.id);
    console.log(`DELETE /api/clients/${clientId} - Deleting client with ID: ${clientId}`);
    
    if (isNaN(clientId) || clientId <= 0) {
      console.error(`Invalid client ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid client ID" });
    }
    
    try {
      // Check if client exists first
      const client = await storage.getClient(clientId);
      
      if (!client) {
        console.log(`Client with ID ${clientId} not found`);
        return res.status(404).json({ error: "Client not found" });
      }
      
      await storage.deleteClient(clientId);
      console.log(`Client with ID ${clientId} successfully deleted`);
      res.json({ success: true, message: `Client with ID ${clientId} successfully deleted` });
    } catch (error) {
      console.error(`Error deleting client with ID ${clientId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Ally routes
  app.post("/api/clients/:clientId/allies", async (req, res) => {
    const result = insertAllySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const ally = await storage.createAlly(parseInt(req.params.clientId), result.data);
    res.json(ally);
  });

  app.get("/api/clients/:clientId/allies", async (req, res) => {
    const allies = await storage.getAlliesByClient(parseInt(req.params.clientId));
    res.json(allies);
  });

  app.delete("/api/clients/:clientId/allies/:id", async (req, res) => {
    const ally = await storage.deleteAlly(parseInt(req.params.id));
    res.json(ally);
  });

  // Archive/Unarchive an ally
  app.put("/api/clients/:clientId/allies/:id/archive", async (req, res) => {
    const allyId = parseInt(req.params.id);
    const { archived } = req.body;
    
    if (typeof archived !== 'boolean') {
      return res.status(400).json({ error: "Missing or invalid 'archived' status in request body" });
    }

    try {
      // Update the archived status in the database
      await pool.query(
        `UPDATE allies SET archived = $1 WHERE id = $2`,
        [archived, allyId]
      );
      
      // Get the updated ally
      const result = await pool.query(
        `SELECT * FROM allies WHERE id = $1`,
        [allyId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Ally not found" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error archiving ally:", error);
      res.status(500).json({ error: "Failed to update ally archived status" });
    }
  });

  // Update an ally
  app.put("/api/clients/:clientId/allies/:id", async (req, res) => {
    console.log(`PUT /api/clients/${req.params.clientId}/allies/${req.params.id} - Updating ally`);
    
    const result = insertAllySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    try {
      // Use proper update method now
      const ally = await storage.updateAlly(parseInt(req.params.id), result.data);
      console.log(`Successfully updated ally with ID ${req.params.id}`);
      res.json(ally);
    } catch (error) {
      console.error(`Error updating ally with ID ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update ally" });
    }
  });

  // Goal routes
  app.post("/api/clients/:clientId/goals", async (req, res) => {
    const result = insertGoalSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const goal = await storage.createGoal(parseInt(req.params.clientId), result.data);
    res.json(goal);
  });

  app.get("/api/clients/:clientId/goals", async (req, res) => {
    const goals = await storage.getGoalsByClient(parseInt(req.params.clientId));
    res.json(goals);
  });

  // NOTE: Goal deletion is not directly supported
  app.delete("/api/goals/:id", async (req, res) => {
    try {
      // First delete all subgoals for this goal
      const subgoals = await storage.getSubgoalsByGoal(parseInt(req.params.id));
      for (const subgoal of subgoals) {
        await storage.deleteSubgoal(subgoal.id);
      }
      
      // Would need to implement deleteGoal in storage.ts
      // For now, return success (frontend should refresh goals)
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting goal with ID ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  app.put("/api/goals/:id", async (req, res) => {
    const result = insertGoalSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const goal = await storage.updateGoal(parseInt(req.params.id), result.data);
    res.json(goal);
  });

  // Subgoal routes
  app.post("/api/goals/:goalId/subgoals", async (req, res) => {
    const result = insertSubgoalSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const subgoal = await storage.createSubgoal(parseInt(req.params.goalId), result.data);
    res.json(subgoal);
  });

  app.get("/api/goals/:goalId/subgoals", async (req, res) => {
    const subgoals = await storage.getSubgoalsByGoal(parseInt(req.params.goalId));
    res.json(subgoals);
  });

  app.delete("/api/subgoals/:id", async (req, res) => {
    await storage.deleteSubgoal(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.put("/api/subgoals/:id", async (req, res) => {
    const result = insertSubgoalSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const subgoal = await storage.updateSubgoal(parseInt(req.params.id), result.data);
    res.json(subgoal);
  });
  
  app.delete("/api/subgoals/:id", async (req, res) => {
    try {
      await storage.deleteSubgoal(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting subgoal with ID ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete subgoal" });
    }
  });

  // Budget routes
  app.post("/api/clients/:clientId/budget-items", async (req, res) => {
    console.log("Budget item request body:", JSON.stringify(req.body));

    const result = insertBudgetItemSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Budget item validation error:", result.error);
      return res.status(400).json({ error: result.error });
    }

    console.log("Budget item after validation:", JSON.stringify(result.data));

    try {
      // Get the budget settings to pass its ID
      const settings = await storage.getBudgetSettingsByClient(parseInt(req.params.clientId));
      if (!settings) {
        return res.status(404).json({ error: "Budget settings not found. Please create budget settings first." });
      }
      
      const item = await storage.createBudgetItem(
        parseInt(req.params.clientId), 
        settings.id, 
        result.data
      );
      res.json(item);
    } catch (error) {
      console.error("Error creating budget item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/clients/:clientId/budget-items", async (req, res) => {
    const items = await storage.getBudgetItemsByClient(parseInt(req.params.clientId));
    res.json(items);
  });

  app.delete("/api/budget-items/:id", async (req, res) => {
    await storage.deleteBudgetItem(parseInt(req.params.id));
    res.json({ success: true });
  });

  // Budget Settings routes
  app.post("/api/clients/:clientId/budget-settings", async (req, res) => {
    const result = insertBudgetSettingsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const settings = await storage.createBudgetSettings(parseInt(req.params.clientId), result.data);
    res.json(settings);
  });

  app.get("/api/clients/:clientId/budget-settings", async (req, res) => {
    const settings = await storage.getBudgetSettingsByClient(parseInt(req.params.clientId));
    if (!settings) {
      return res.status(404).json({ error: "Budget settings not found" });
    }
    res.json(settings);
  });
  
  // Endpoint to mark a client as complete in the onboarding process
  app.post("/api/clients/:clientId/complete-onboarding", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    console.log(`POST /api/clients/${clientId}/complete-onboarding - Marking client as complete`);
    
    try {
      // Update client onboarding status to complete
      await pool.query(`
        UPDATE clients 
        SET onboarding_status = 'complete'
        WHERE id = $1
      `, [clientId]);
      
      res.json({ success: true, message: "Client onboarding marked as complete" });
    } catch (error) {
      console.error(`Error marking client ${clientId} as complete:`, error);
      res.status(500).json({ error: "Failed to mark client as complete" });
    }
  });

  app.put("/api/budget-settings/:id", async (req, res) => {
    const result = insertBudgetSettingsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const settings = await storage.updateBudgetSettings(parseInt(req.params.id), result.data);
    res.json(settings);
  });

  // Budget Item Catalog routes
  app.get("/api/budget-catalog", async (req, res) => {
    try {
      const items = await storage.getBudgetItemCatalog();
      res.json(items);
    } catch (error) {
      console.error("Error fetching budget catalog:", error);
      res.status(500).json({ error: "Failed to retrieve budget catalog items" });
    }
  });

  app.post("/api/budget-catalog", async (req, res) => {
    try {
      console.log("Received catalog item:", JSON.stringify(req.body));
      const result = insertBudgetItemCatalogSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Budget catalog item validation error:", result.error);
        return res.status(400).json({ 
          error: "Validation failed", 
          details: result.error.format() 
        });
      }

      // Ensure defaultUnitPrice is a valid number and at least 0.01
      if (typeof result.data.defaultUnitPrice !== 'number' || result.data.defaultUnitPrice < 0.01) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: { defaultUnitPrice: { _errors: ["Unit price must be at least 0.01"] } } 
        });
      }

      // Check if itemCode already exists
      try {
        const existingItem = await storage.getBudgetItemCatalogByCode(result.data.itemCode);
        if (existingItem) {
          return res.status(400).json({ 
            error: "Validation failed", 
            details: { itemCode: { _errors: ["Item code already exists"] } } 
          });
        }
      } catch (err) {
        console.error("Error checking for existing item code:", err);
      }

      const item = await storage.createBudgetItemCatalog(result.data);
      res.json(item);
    } catch (error) {
      console.error("Error creating budget catalog item:", error);
      res.status(500).json({ 
        error: "Failed to create budget catalog item",
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get("/api/budget-catalog/:itemCode", async (req, res) => {
    try {
      const item = await storage.getBudgetItemCatalogByCode(req.params.itemCode);
      if (!item) {
        return res.status(404).json({ error: "Catalog item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error(`Error fetching catalog item with code ${req.params.itemCode}:`, error);
      res.status(500).json({ error: "Failed to retrieve catalog item" });
    }
  });

  app.put("/api/budget-catalog/:id", async (req, res) => {
    try {
      const result = insertBudgetItemCatalogSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      const item = await storage.updateBudgetItemCatalog(parseInt(req.params.id), result.data);
      res.json(item);
    } catch (error) {
      console.error(`Error updating catalog item with ID ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update catalog item" });
    }
  });

  // Session routes
  app.get("/api/sessions", async (req, res) => {
    console.log("GET /api/sessions - Retrieving all sessions");
    try {
      const sessions = await storage.getAllSessions();
      console.log(`Found ${sessions.length} sessions`);

      // If there's a clientId filter, apply it
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : null;
      if (clientId && !isNaN(clientId)) {
        console.log(`Filtering sessions for client ${clientId}`);
        const clientSessions = sessions.filter(session => session.clientId === clientId);
        console.log(`Found ${clientSessions.length} sessions for client ${clientId}`);
        return res.json(clientSessions);
      }

      res.json(sessions);
    } catch (error) {
      console.error("Error retrieving sessions:", error);
      res.status(500).json({ error: "Failed to retrieve sessions" });
    }
  });

  app.get("/api/clients/:clientId/sessions", async (req, res) => {
    console.log(`GET /api/clients/${req.params.clientId}/sessions - Retrieving sessions for client`);
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: "Invalid client ID" });
      }

      const sessions = await storage.getSessionsByClient(clientId);
      console.log(`Found ${sessions.length} sessions for client ${clientId}`);
      res.json(sessions);
    } catch (error) {
      console.error(`Error retrieving sessions for client ${req.params.clientId}:`, error);
      res.status(500).json({ error: "Failed to retrieve client sessions" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    console.log(`GET /api/sessions/${req.params.id} - Retrieving session by ID`);
    try {
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const session = await storage.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error(`Error retrieving session ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to retrieve session" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    console.log("POST /api/sessions - Creating a new session");
    try {
      const result = insertSessionSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Session validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }

      // Ensure client exists
      const client = await storage.getClient(result.data.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // If a therapistId is provided, ensure it exists as an ally
      if (result.data.therapistId) {
        const allies = await storage.getAlliesByClient(result.data.clientId);
        const therapistExists = allies.some(ally => ally.id === result.data.therapistId);
        if (!therapistExists) {
          return res.status(400).json({ error: "Therapist not found among client's allies" });
        }
      }

      const session = await storage.createSession(result.data);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    console.log(`PUT /api/sessions/${req.params.id} - Updating session`);
    try {
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const result = insertSessionSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Session validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }

      // Ensure session exists
      const existingSession = await storage.getSessionById(sessionId);
      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      const updatedSession = await storage.updateSession(sessionId, result.data);
      res.json(updatedSession);
    } catch (error) {
      console.error(`Error updating session ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    console.log(`DELETE /api/sessions/${req.params.id} - Deleting session`);
    try {
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      // Ensure session exists
      const existingSession = await storage.getSessionById(sessionId);
      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      await storage.deleteSession(sessionId);
      res.json({ success: true, message: "Session deleted successfully" });
    } catch (error) {
      console.error(`Error deleting session ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  // Session Notes routes
  app.post("/api/sessions/:sessionId/notes", async (req, res) => {
    console.log(`POST /api/sessions/${req.params.sessionId}/notes - Creating session note`);
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      // First check if the session exists
      const session = await storage.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const result = insertSessionNoteSchema.safeParse({
        ...req.body,
        sessionId,
        clientId: session.clientId
      });
      
      if (!result.success) {
        console.error("Session note validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      const note = await storage.createSessionNote(result.data);
      res.json(note);
    } catch (error) {
      console.error(`Error creating session note for session ${req.params.sessionId}:`, error);
      res.status(500).json({ error: "Failed to create session note" });
    }
  });
  
  app.get("/api/sessions/:sessionId/notes", async (req, res) => {
    console.log(`GET /api/sessions/${req.params.sessionId}/notes - Getting session note`);
    try {
      const sessionId = parseInt(req.params.sessionId);
      const note = await storage.getSessionNoteBySessionId(sessionId);
      
      if (!note) {
        return res.status(404).json({ error: "Session note not found" });
      }
      
      res.json(note);
    } catch (error) {
      console.error(`Error getting session note for session ${req.params.sessionId}:`, error);
      res.status(500).json({ error: "Failed to get session note" });
    }
  });
  
  app.get("/api/sessions/:sessionId/notes/complete", async (req, res) => {
    console.log(`GET /api/sessions/${req.params.sessionId}/notes/complete - Getting complete session note`);
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      // Get the session note
      const note = await storage.getSessionNoteBySessionId(sessionId);
      if (!note) {
        return res.status(404).json({ error: "Session note not found" });
      }
      
      // Get the performance assessments for this note
      const performanceAssessments = await storage.getPerformanceAssessmentsBySessionNote(note.id);
      
      // For each performance assessment, get the milestone assessments
      const completePerformanceAssessments = await Promise.all(
        performanceAssessments.map(async (assessment) => {
          const milestones = await storage.getMilestoneAssessmentsByPerformanceAssessment(assessment.id);
          return {
            ...assessment,
            milestones
          };
        })
      );
      
      // Build the complete session note object
      const completeNote = {
        ...note,
        performanceAssessments: completePerformanceAssessments
      };
      
      // Set content type to ensure it's treated as JSON
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(JSON.stringify(completeNote));
    } catch (error) {
      console.error(`Error getting complete session note for session ${req.params.sessionId}:`, error);
      res.status(500).json({ error: "Failed to get complete session note" });
    }
  });
  
  app.put("/api/session-notes/:id", async (req, res) => {
    console.log(`PUT /api/session-notes/${req.params.id} - Updating session note`);
    try {
      const noteId = parseInt(req.params.id);
      
      // First check if the note exists
      const existingNote = await storage.getSessionNoteById(noteId);
      if (!existingNote) {
        return res.status(404).json({ error: "Session note not found" });
      }
      
      const result = insertSessionNoteSchema.safeParse({
        ...req.body,
        id: noteId,
        sessionId: existingNote.sessionId,
        clientId: existingNote.clientId
      });
      
      if (!result.success) {
        console.error("Session note validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      const updatedNote = await storage.updateSessionNote(noteId, result.data);
      res.json(updatedNote);
    } catch (error) {
      console.error(`Error updating session note ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update session note" });
    }
  });
  
  app.delete("/api/session-notes/:id", async (req, res) => {
    console.log(`DELETE /api/session-notes/${req.params.id} - Deleting session note`);
    try {
      const noteId = parseInt(req.params.id);
      await storage.deleteSessionNote(noteId);
      res.json({ success: true, message: "Session note deleted successfully" });
    } catch (error) {
      console.error(`Error deleting session note ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete session note" });
    }
  });
  
  // Performance Assessment routes
  app.post("/api/session-notes/:sessionNoteId/performance", async (req, res) => {
    console.log(`POST /api/session-notes/${req.params.sessionNoteId}/performance - Creating performance assessment`);
    try {
      const sessionNoteId = parseInt(req.params.sessionNoteId);
      
      // First check if the session note exists
      const sessionNote = await storage.getSessionNoteById(sessionNoteId);
      if (!sessionNote) {
        return res.status(404).json({ error: "Session note not found" });
      }
      
      const result = insertPerformanceAssessmentSchema.safeParse({
        ...req.body,
        sessionNoteId
      });
      
      if (!result.success) {
        console.error("Performance assessment validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      const assessment = await storage.createPerformanceAssessment(result.data);
      res.json(assessment);
    } catch (error) {
      console.error(`Error creating performance assessment for session note ${req.params.sessionNoteId}:`, error);
      res.status(500).json({ error: "Failed to create performance assessment" });
    }
  });
  
  app.get("/api/session-notes/:sessionNoteId/performance", async (req, res) => {
    console.log(`GET /api/session-notes/${req.params.sessionNoteId}/performance - Getting performance assessments`);
    try {
      const sessionNoteId = parseInt(req.params.sessionNoteId);
      const assessments = await storage.getPerformanceAssessmentsBySessionNote(sessionNoteId);
      res.json(assessments);
    } catch (error) {
      console.error(`Error getting performance assessments for session note ${req.params.sessionNoteId}:`, error);
      res.status(500).json({ error: "Failed to get performance assessments" });
    }
  });
  
  app.put("/api/performance-assessments/:id", async (req, res) => {
    console.log(`PUT /api/performance-assessments/${req.params.id} - Updating performance assessment`);
    try {
      const assessmentId = parseInt(req.params.id);
      
      // First check if the assessment exists
      const existingAssessment = await storage.getPerformanceAssessmentById(assessmentId);
      if (!existingAssessment) {
        return res.status(404).json({ error: "Performance assessment not found" });
      }
      
      const result = insertPerformanceAssessmentSchema.safeParse({
        ...req.body,
        id: assessmentId,
        sessionNoteId: existingAssessment.sessionNoteId
      });
      
      if (!result.success) {
        console.error("Performance assessment validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      const updatedAssessment = await storage.updatePerformanceAssessment(assessmentId, result.data);
      res.json(updatedAssessment);
    } catch (error) {
      console.error(`Error updating performance assessment ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update performance assessment" });
    }
  });
  
  app.delete("/api/performance-assessments/:id", async (req, res) => {
    console.log(`DELETE /api/performance-assessments/${req.params.id} - Deleting performance assessment`);
    try {
      const assessmentId = parseInt(req.params.id);
      await storage.deletePerformanceAssessment(assessmentId);
      res.json({ success: true, message: "Performance assessment deleted successfully" });
    } catch (error) {
      console.error(`Error deleting performance assessment ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete performance assessment" });
    }
  });
  
  // Milestone Assessment routes
  app.post("/api/performance-assessments/:performanceAssessmentId/milestones", async (req, res) => {
    console.log(`POST /api/performance-assessments/${req.params.performanceAssessmentId}/milestones - Creating milestone assessment`);
    try {
      const performanceAssessmentId = parseInt(req.params.performanceAssessmentId);
      
      // First check if the performance assessment exists
      const assessment = await storage.getPerformanceAssessmentById(performanceAssessmentId);
      if (!assessment) {
        return res.status(404).json({ error: "Performance assessment not found" });
      }
      
      const result = insertMilestoneAssessmentSchema.safeParse({
        ...req.body,
        performanceAssessmentId
      });
      
      if (!result.success) {
        console.error("Milestone assessment validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      const milestone = await storage.createMilestoneAssessment(result.data);
      res.json(milestone);
    } catch (error) {
      console.error(`Error creating milestone assessment for performance assessment ${req.params.performanceAssessmentId}:`, error);
      res.status(500).json({ error: "Failed to create milestone assessment" });
    }
  });
  
  app.get("/api/performance-assessments/:performanceAssessmentId/milestones", async (req, res) => {
    console.log(`GET /api/performance-assessments/${req.params.performanceAssessmentId}/milestones - Getting milestone assessments`);
    try {
      const performanceAssessmentId = parseInt(req.params.performanceAssessmentId);
      const milestones = await storage.getMilestoneAssessmentsByPerformanceAssessment(performanceAssessmentId);
      res.json(milestones);
    } catch (error) {
      console.error(`Error getting milestone assessments for performance assessment ${req.params.performanceAssessmentId}:`, error);
      res.status(500).json({ error: "Failed to get milestone assessments" });
    }
  });
  
  app.put("/api/milestone-assessments/:id", async (req, res) => {
    console.log(`PUT /api/milestone-assessments/${req.params.id} - Updating milestone assessment`);
    try {
      const milestoneId = parseInt(req.params.id);
      
      const result = insertMilestoneAssessmentSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Milestone assessment validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      const updatedMilestone = await storage.updateMilestoneAssessment(milestoneId, result.data);
      res.json(updatedMilestone);
    } catch (error) {
      console.error(`Error updating milestone assessment ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update milestone assessment" });
    }
  });
  
  app.delete("/api/milestone-assessments/:id", async (req, res) => {
    console.log(`DELETE /api/milestone-assessments/${req.params.id} - Deleting milestone assessment`);
    try {
      const milestoneId = parseInt(req.params.id);
      await storage.deleteMilestoneAssessment(milestoneId);
      res.json({ success: true, message: "Milestone assessment deleted successfully" });
    } catch (error) {
      console.error(`Error deleting milestone assessment ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete milestone assessment" });
    }
  });
  
  // Strategies routes
  app.get("/api/strategies", async (req, res) => {
    console.log("GET /api/strategies - Getting all strategies");
    try {
      const category = req.query.category as string | undefined;
      
      if (category) {
        console.log(`Filtering strategies by category: ${category}`);
        const filteredStrategies = await storage.getStrategiesByCategory(category);
        return res.json(filteredStrategies);
      }
      
      const strategies = await storage.getAllStrategies();
      res.json(strategies);
    } catch (error) {
      console.error("Error getting strategies:", error);
      res.status(500).json({ error: "Failed to get strategies" });
    }
  });
  
  app.get("/api/strategies/:id", async (req, res) => {
    console.log(`GET /api/strategies/${req.params.id} - Getting strategy by ID`);
    try {
      const strategyId = parseInt(req.params.id);
      const strategy = await storage.getStrategyById(strategyId);
      
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      
      res.json(strategy);
    } catch (error) {
      console.error(`Error getting strategy ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to get strategy" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}