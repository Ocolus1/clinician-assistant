import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertAllySchema, insertGoalSchema, insertSubgoalSchema, insertBudgetItemSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
    const client = await storage.getClient(parseInt(req.params.id));
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(client);
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

  // Budget routes
  app.post("/api/clients/:clientId/budget-items", async (req, res) => {
    const result = insertBudgetItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const item = await storage.createBudgetItem(parseInt(req.params.clientId), result.data);
    res.json(item);
  });

  app.get("/api/clients/:clientId/budget-items", async (req, res) => {
    const items = await storage.getBudgetItemsByClient(parseInt(req.params.clientId));
    res.json(items);
  });

  const httpServer = createServer(app);
  return httpServer;
}
