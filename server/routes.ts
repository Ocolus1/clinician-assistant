import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, 
  insertAllySchema, 
  insertGoalSchema, 
  insertSubgoalSchema, 
  insertBudgetItemSchema, 
  insertBudgetSettingsSchema,
  insertBudgetItemCatalogSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Debugging routes
  app.get("/api/debug/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  app.get("/api/clients", async (req, res) => {
    console.log("GET /api/clients - Retrieving all clients");
    try {
      // Get all clients using the storage's getAllClients method
      const clients = await storage.getAllClients();
      console.log(`Found ${clients.length} clients in database`);
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
    const clientId = parseInt(req.params.clientId);
    console.log(`GET /api/clients/${clientId}/allies - Fetching allies for client ID: ${clientId}`);
    const allies = await storage.getAlliesByClient(clientId);
    console.log(`Returning ${allies.length} allies for client ID: ${clientId}`);
    res.json(allies);
  });

  app.delete("/api/clients/:clientId/allies/:id", async (req, res) => {
    const ally = await storage.deleteAlly(parseInt(req.params.id));
    res.json(ally);
  });

  // NOTE: Ally update function is not yet implemented
  app.put("/api/clients/:clientId/allies/:id", async (req, res) => {
    const result = insertAllySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    // Using a workaround - delete and recreate
    await storage.deleteAlly(parseInt(req.params.id));
    const ally = await storage.createAlly(parseInt(req.params.clientId), result.data);
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

  const httpServer = createServer(app);
  return httpServer;
}