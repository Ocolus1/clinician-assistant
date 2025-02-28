import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertAllySchema, insertGoalSchema, insertSubgoalSchema, insertBudgetItemSchema, insertBudgetSettingsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Debugging routes
  app.get("/api/debug/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  app.get("/api/clients", async (req, res) => {
    console.log("GET /api/clients - Retrieving all clients for debugging");
    try {
      // This is a debugging endpoint that returns all clients
      // In a real app with a database, you would use a query to get all clients
      
      // Since we're using MemStorage, we need to access the storage directly
      // Extract the clients from the private Map in a safe manner
      const clients = [];
      
      // Try to fetch specific clients we know might exist
      for (let i = 1; i <= 20; i++) {
        try {
          const client = await storage.getClient(i);
          if (client) {
            console.log(`Found client ${i}:`, client);
            clients.push(client);
          }
        } catch (err) {
          // Ignore errors for individual client fetches
        }
      }
      
      // For client 14 specifically (since that's the one causing issues)
      const client14 = await storage.getClient(14);
      if (client14) {
        console.log("Client 14 details:", JSON.stringify(client14));
      } else {
        console.log("Client 14 not found in storage");
      }
      
      console.log(`Found ${clients.length} clients`);
      res.json(clients);
    } catch (error) {
      console.error("Error in debug clients route:", error);
      res.status(500).json({ error: "Internal server error" });
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

  app.put("/api/clients/:clientId/allies/:id", async (req, res) => {
    const result = insertAllySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const ally = await storage.updateAlly(parseInt(req.params.id), result.data);
    res.json(ally);
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

  app.delete("/api/goals/:id", async (req, res) => {
    const goal = await storage.deleteGoal(parseInt(req.params.id));
    res.json(goal);
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
      const item = await storage.createBudgetItem(parseInt(req.params.clientId), result.data);
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

  app.put("/api/budget-settings/:id", async (req, res) => {
    const result = insertBudgetSettingsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const settings = await storage.updateBudgetSettings(parseInt(req.params.id), result.data);
    res.json(settings);
  });

  const httpServer = createServer(app);
  return httpServer;
}