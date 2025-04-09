import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sql } from "./db";
import { db } from "./drizzle"; // Added for direct DB access
import { and, eq } from "drizzle-orm"; // Added for query building
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
  insertMilestoneAssessmentSchema,
  insertStrategySchema,
  insertClinicianSchema,
  insertClientClinicianSchema,
  CLINICIAN_ROLES,
  budgetItems // Added for query building
} from "@shared/schema";

/**
 * Formats and standardizes error responses
 * @param error The error object
 * @returns Formatted error message
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

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
    // Check if the onboarding status is valid
    if (req.body.onboardingStatus !== 'complete' && req.body.onboardingStatus !== 'pending') {
      return res.status(400).json({ 
        error: "Invalid onboarding status. Must be 'complete' or 'pending'." 
      });
    }
    
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
      await sql`
        UPDATE allies SET archived = ${archived} WHERE id = ${allyId}
      `;
      
      // Get the updated ally
      const result = await sql`
        SELECT * FROM allies WHERE id = ${allyId}
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Ally not found" });
      }
      
      res.json(result[0]);
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
  
  // New endpoint to get goal performance data
  app.get("/api/clients/:clientId/goals/performance", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const goalId = req.query.goalId ? parseInt(req.query.goalId as string) : undefined;
    
    console.log(`GET /api/clients/${clientId}/goals/performance - Getting goal performance data${goalId ? ` for goal ${goalId}` : ''}`);
    
    try {
      const performanceData = await storage.getGoalPerformanceData(clientId, goalId);
      res.json(performanceData);
    } catch (error) {
      console.error(`Error retrieving goal performance data:`, error);
      res.status(500).json({ error: formatError(error) });
    }
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
    try {
      const goalId = req.params.goalId;
      // Validate that goalId is a valid number
      if (!goalId || isNaN(parseInt(goalId))) {
        return res.status(400).json({ error: "Invalid goalId parameter. Must be a valid number." });
      }
      const subgoals = await storage.getSubgoalsByGoal(parseInt(goalId));
      res.json(subgoals);
    } catch (error) {
      console.error("Error fetching subgoals:", error);
      res.status(500).json({ error: formatError(error) });
    }
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
    const clientId = parseInt(req.params.clientId);
    console.log(`POST /api/clients/${clientId}/budget-items - Creating new budget item`);
    console.log("Budget item request body:", JSON.stringify(req.body));

    const result = insertBudgetItemSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Budget item validation error:", result.error);
      return res.status(400).json({ error: result.error });
    }

    console.log("Budget item after validation:", JSON.stringify(result.data));

    try {
      // Get the budget settings ID either from the original request data
      // or fall back to the active settings
      let budgetSettingsId: number;
      
      // IMPORTANT FIX: Always respect the budgetSettingsId from the request body
      // This ensures budget items stay with their original plan instead of migrating
      // to a new active plan when one is created
      if (req.body.budgetSettingsId && typeof req.body.budgetSettingsId === 'number') {
        // Use the explicitly provided budgetSettingsId from raw request body
        budgetSettingsId = req.body.budgetSettingsId;
        console.log(`Using provided budgetSettingsId from request: ${budgetSettingsId}`);
        
        // Verify that this budget setting exists and belongs to this client
        const allSettings = await storage.getAllBudgetSettingsByClient(clientId);
        const settingExists = allSettings.some(s => s.id === budgetSettingsId);
        
        if (!settingExists) {
          console.error(`Specified budgetSettingsId ${budgetSettingsId} not found for client ${clientId}`);
          return res.status(400).json({ 
            error: "Invalid budget plan. The specified budget plan does not exist or does not belong to this client." 
          });
        }
      } else {
        // Fallback to getting the active budget settings only if no ID is provided
        // This should rarely happen as the client always sends budgetSettingsId
        console.warn(`No budgetSettingsId provided, fetching active plan for client ${clientId}`);
        
        const settings = await storage.getBudgetSettingsByClient(clientId);
        if (!settings) {
          console.error(`No active budget settings found for client ${clientId}`);
          return res.status(404).json({ 
            error: "No active budget plan found. Please create a budget plan first." 
          });
        }
        
        budgetSettingsId = settings.id;
        console.log(`Using active budgetSettingsId as fallback: ${budgetSettingsId}`);
      }
      
      // Create the budget item with the determined budgetSettingsId
      const item = await storage.createBudgetItem(
        clientId,
        budgetSettingsId,
        result.data
      );
      
      console.log(`Successfully created budget item ${item.id} for client ${clientId} with budgetSettingsId ${budgetSettingsId}`);
      res.json(item);
    } catch (error) {
      console.error(`Error creating budget item for client ${clientId}:`, error);
      res.status(500).json({ error: "Failed to create budget item" });
    }
  });

  app.get("/api/clients/:clientId/budget-items", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const budgetSettingsId = req.query.budgetSettingsId ? parseInt(req.query.budgetSettingsId as string) : undefined;
    const strict = req.query.strict === 'true';
    
    console.log(`GET /api/clients/${clientId}/budget-items - Fetching budget items for client`);
    if (budgetSettingsId) {
      console.log(`  With budgetSettingsId filter: ${budgetSettingsId}, strict mode: ${strict}`);
    }
    
    try {
      // Get all the budget items for this client
      let items;
      
      // If a specific budget settings ID is provided, filter items for that plan
      if (budgetSettingsId) {
        items = await storage.getBudgetItemsBySettings(budgetSettingsId);
        console.log(`Found ${items.length} budget items for plan ${budgetSettingsId}`);
      } else {
        items = await storage.getBudgetItemsByClient(clientId);
        console.log(`Found ${items.length} budget items for client ${clientId}`);
      }
      
      // Get all budget settings (plans) for this client to check active status
      const allBudgetSettings = await storage.getAllBudgetSettingsByClient(clientId);
      if (!allBudgetSettings || allBudgetSettings.length === 0) {
        // If no budget settings, just return the items as-is
        return res.json(items);
      }
      
      // Fetch session notes with products to calculate real usage
      const sessionNotesWithProducts = await storage.getSessionNotesWithProductsByClient(clientId);
      console.log(`Found ${sessionNotesWithProducts.length} session notes with products for client ${clientId}`);
      
      // Calculate itemCode usage from session notes
      const itemUsage: Record<string, number> = {};
      
      // Process session notes to extract product usage
      for (const note of sessionNotesWithProducts) {
        // Skip session notes that aren't completed
        if (note.status !== 'completed') {
          continue;
        }
        
        // Process products in the note
        let products = note.products || [];
        
        // Parse products if it's a string
        if (typeof products === 'string') {
          try {
            products = JSON.parse(products);
          } catch (e) {
            console.error(`Error parsing products JSON in note ${note.id}:`, e);
            products = [];
          }
        }
        
        // Add usage for each product based on the product code
        for (const product of products) {
          // Look for both productCode and itemCode fields (they use different naming)
          const itemCode = typeof product === 'object' ? (product.itemCode || product.productCode) : null;
          if (itemCode) {
            const quantity = typeof product === 'object' ? (Number(product.quantity) || 1) : 1;
            itemUsage[itemCode] = (itemUsage[itemCode] || 0) + quantity;
            console.log(`Added ${quantity} usage for product code ${itemCode} from session note ${note.id}`);
          }
        }
      }
      
      // For each item, add a property indicating if it belongs to an active plan
      // This helps the client-side know which items belong to active vs. inactive plans
      let enhancedItems = items.map(item => {
        // Find the budget settings associated with this item
        const itemSettings = allBudgetSettings.find(s => s.id === item.budgetSettingsId);
        
        // CRITICAL FIX: Ensure budget items maintain their association with their original budget plan.
        // This is essential to prevent items from appearing to migrate between plans.
        const originalBudgetSettingsId = item.budgetSettingsId;
        
        // Get actual usage from session notes (more accurate than stored usedQuantity)
        const actualUsedQuantity = itemUsage[item.itemCode] || 0;
        
        // If the calculated usage is different from the stored one, log the discrepancy
        if (actualUsedQuantity !== item.usedQuantity) {
          console.log(`Usage discrepancy for item ${item.id} (${item.itemCode}): 
            Database value: ${item.usedQuantity || 0}
            Calculated from sessions: ${actualUsedQuantity}
          `);
        }
        
        // Add the isActivePlan property to help client determine if this is from an active plan
        return {
          ...item,
          // Important: Budget settings ID should never be changed from the original
          budgetSettingsId: originalBudgetSettingsId,
          isActivePlan: itemSettings ? !!itemSettings.isActive : false,
          planSerialNumber: itemSettings?.planSerialNumber || null,
          planCode: itemSettings?.planCode || null,
          // Use calculated usage from session notes instead of stored value
          usedQuantity: actualUsedQuantity
        };
      });
      
      // If strict mode is enabled, only return items from the exact plan requested
      if (strict && budgetSettingsId) {
        // Double check that items truly belong to the requested plan
        enhancedItems = enhancedItems.filter(item => item.budgetSettingsId === budgetSettingsId);
        console.log(`Strict mode enabled: Filtered to ${enhancedItems.length} items belonging to plan ${budgetSettingsId}`);
      }
      
      console.log(`Returning ${enhancedItems.length} enhanced budget items`);
      res.json(enhancedItems);
    } catch (error) {
      console.error(`Error fetching budget items for client ${clientId}:`, error);
      res.status(500).json({ error: "Failed to retrieve budget items" });
    }
  });

  app.delete("/api/budget-items/:id", async (req, res) => {
    await storage.deleteBudgetItem(parseInt(req.params.id));
    res.json({ success: true });
  });
  
  // Route to update a budget item
  app.put("/api/budget-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid budget item ID" });
      }
      
      const result = insertBudgetItemSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      const updatedItem = await storage.updateBudgetItem(id, result.data);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating budget item:", error);
      res.status(500).json({ error: "Failed to update budget item" });
    }
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

  // Budget Plans - Alternative URL for the front-end plans view
  app.get("/api/clients/:clientId/budget/plans", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    
    try {
      // Return all budget settings for the client
      const allSettings = await storage.getAllBudgetSettingsByClient(clientId);
      res.json(allSettings || []);
    } catch (error) {
      console.error(`Error getting budget plans for client ${clientId}:`, error);
      res.status(500).json({ error: "Failed to get budget plans" });
    }
  });

  app.get("/api/clients/:clientId/budget-settings", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const all = req.query.all === 'true';
    
    console.log(`Getting budget settings for client ${clientId}, all=${all}`);
    
    try {
      if (all) {
        // Return all budget settings for the client
        console.log(`Getting all budget settings for client ${clientId}`);
        const allSettings = await storage.getAllBudgetSettingsByClient(clientId);
        
        if (!allSettings || allSettings.length === 0) {
          console.log(`No budget settings found for client ${clientId}`);
          // If no settings exist, return an empty array instead of 404 error
          return res.json([]);
        }
        
        console.log(`Found ${allSettings.length} budget settings for client ${clientId}`);
        return res.json(allSettings);
      } else {
        // Return active or single budget setting
        console.log(`Getting active budget setting for client ${clientId}`);
        const settings = await storage.getBudgetSettingsByClient(clientId);
        
        if (!settings) {
          console.log(`No active budget setting found for client ${clientId}`);
          // Return 404 when specifically looking for a single active budget
          return res.status(404).json({ error: "Budget settings not found" });
        }
        
        console.log(`Found budget settings for client ${clientId}`);
        res.json(settings);
      }
    } catch (error) {
      console.error(`Error fetching budget settings for client ${clientId}:`, error);
      res.status(500).json({ error: "Failed to retrieve budget settings" });
    }
  });
  
  // Endpoint to mark a client as complete in the onboarding process
  app.post("/api/clients/:clientId/complete-onboarding", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    console.log(`POST /api/clients/${clientId}/complete-onboarding - Marking client as complete`);
    
    try {
      // Update client onboarding status to complete
      await sql`
        UPDATE clients 
        SET onboarding_status = 'complete'
        WHERE id = ${clientId}
      `;
      
      res.json({ success: true, message: "Client onboarding marked as complete" });
    } catch (error) {
      console.error(`Error marking client ${clientId} as complete:`, error);
      res.status(500).json({ error: "Failed to mark client as complete" });
    }
  });

  app.put("/api/budget-settings/:id", async (req, res) => {
    console.log(`PUT /api/budget-settings/${req.params.id} - Updating budget settings`);
    const budgetSettingsId = parseInt(req.params.id);
    
    try {
      const result = insertBudgetSettingsSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Validation error updating budget settings:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      // Before updating, check if isActive is changing from false to true
      // When a plan is being activated, we need to deactivate any other active plans for the client
      if (result.data.isActive === true) {
        console.log(`Plan ${budgetSettingsId} is being activated`);
        
        const existingPlan = await sql`
          SELECT id, client_id, is_active FROM budget_settings WHERE id = ${budgetSettingsId}
        `;
        
        if (existingPlan.length === 0) {
          return res.status(404).json({ error: "Budget settings not found" });
        }
        
        // If plan was already active, no need for special handling
        if (existingPlan[0].is_active) {
          console.log(`Plan ${budgetSettingsId} was already active, updating normally`);
          const settings = await storage.updateBudgetSettings(budgetSettingsId, result.data);
          return res.json(settings);
        }
        
        // Get client ID from the plan being activated
        const clientId = existingPlan[0].client_id;
        console.log(`Plan belongs to client ${clientId}`);
        
        // Find any other active plans for this client and deactivate them
        console.log(`Finding other active plans for client ${clientId}`);
        const activePlans = await sql`
          SELECT id FROM budget_settings 
          WHERE client_id = ${clientId} 
          AND is_active = true 
          AND id != ${budgetSettingsId}
        `;
        
        try {
          // Deactivate other active plans
          for (const plan of activePlans) {
            console.log(`Deactivating plan ${plan.id}`);
            await sql`UPDATE budget_settings SET is_active = false WHERE id = ${plan.id}`;
          }
          
          // Activate the new plan
          console.log(`Activating plan ${budgetSettingsId}`);
          await sql`
            UPDATE budget_settings SET 
              is_active = ${result.data.isActive},
              plan_serial_number = ${result.data.planSerialNumber},
              plan_code = ${result.data.planCode},
              ndis_funds = ${result.data.ndisFunds},
              end_of_plan = ${result.data.endOfPlan}
            WHERE id = ${budgetSettingsId}
          `;
          
          // CRITICAL FIX: Do NOT update budgetSettingsId on budget items
          // This ensures items stay with their original plan even when plan activation changes
          
          console.log(`Successfully activated plan ${budgetSettingsId} and deactivated ${activePlans.length} other plans`);
          
          // Get the updated settings
          const updatedSettings = await storage.getBudgetSettingsByClient(clientId);
          res.json(updatedSettings);
        } catch (error) {
          console.error(`Error during plan activation:`, error);
          throw error;
        }
      } else {
        // For non-activation updates, just update normally
        console.log(`Updating plan ${budgetSettingsId} normally (not an activation)`);
        const settings = await storage.updateBudgetSettings(budgetSettingsId, result.data);
        res.json(settings);
      }
    } catch (error) {
      console.error(`Error updating budget settings ${budgetSettingsId}:`, error);
      res.status(500).json({ error: "Failed to update budget settings" });
    }
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
  
  // Delete all sessions except for the first one
  app.delete("/api/sessions/cleanup", async (req, res) => {
    console.log("DELETE /api/sessions/cleanup - Cleaning up sessions");
    try {
      const sessions = await storage.getAllSessions();
      console.log(`Found ${sessions.length} sessions to clean up`);
      
      if (sessions.length <= 1) {
        console.log("No cleanup needed - fewer than 2 sessions exist");
        return res.json({ success: true, deleted: 0 });
      }
      
      // Sort by ID and keep the first one
      sessions.sort((a, b) => a.id - b.id);
      const keepSessionId = sessions[0].id;
      
      // Delete all except for the first session
      let deletedCount = 0;
      for (const session of sessions) {
        if (session.id !== keepSessionId) {
          await storage.deleteSession(session.id);
          deletedCount++;
        }
      }
      
      console.log(`Successfully deleted ${deletedCount} sessions, kept session with ID ${keepSessionId}`);
      res.json({ success: true, deleted: deletedCount, keptId: keepSessionId });
    } catch (error) {
      console.error("Error cleaning up sessions:", error);
      res.status(500).json({ error: "Failed to clean up sessions" });
    }
  });

  // Direct endpoint to get session notes with products for budget calculations
  app.get("/api/clients/:clientId/session-notes-with-products", async (req, res) => {
    console.log(`GET /api/clients/${req.params.clientId}/session-notes-with-products - Retrieving session notes with products`);
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: "Invalid client ID" });
      }
      
      // First get all sessions for this client
      const sessions = await storage.getSessionsByClient(clientId);
      console.log(`Found ${sessions.length} sessions for client ${clientId}`);
      
      // Then get notes for all these sessions
      const sessionIds = sessions.map(session => session.id);
      
      // If no sessions, return empty array
      if (sessionIds.length === 0) {
        return res.json([]);
      }
      
      // Get session notes for all sessions, but directly with raw queries to ensure we get all data
      const notes = [];
      for (const sessionId of sessionIds) {
        try {
          const result = await pool.query(`
            SELECT * FROM session_notes 
            WHERE session_id = $1
          `, [sessionId]);
          
          if (result.rows.length > 0) {
            // Process products field if it exists and is a string
            const note = result.rows[0];
            if (note.products && typeof note.products === 'string') {
              try {
                note.products = JSON.parse(note.products);
              } catch (e) {
                console.error(`Error parsing products for session note ${note.id}:`, e);
                note.products = [];
              }
            }
            notes.push(note);
          }
        } catch (e) {
          console.error(`Error fetching session note for session ${sessionId}:`, e);
        }
      }
      
      console.log(`Found ${notes.length} session notes with products for client ${clientId}`);
      
      // Return the processed notes
      res.json(notes);
    } catch (error) {
      console.error(`Error retrieving session notes with products for client ${req.params.clientId}:`, error);
      res.status(500).json({ error: "Failed to retrieve session notes with products" });
    }
  });
  
  app.get("/api/clients/:clientId/sessions", async (req, res) => {
    console.log(`GET /api/clients/${req.params.clientId}/sessions - Retrieving sessions for client`);
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: "Invalid client ID" });
      }

      // Get all sessions for the client
      const sessions = await storage.getSessionsByClient(clientId);
      console.log(`Found ${sessions.length} sessions for client ${clientId}`);
      
      // Get session notes for all sessions
      const sessionNotesPromises = sessions.map(session => {
        return storage.getSessionNoteBySessionId(session.id)
          .then(note => note ? { sessionId: session.id, note } : null)
          .catch(err => {
            console.error(`Error fetching note for session ${session.id}:`, err);
            return null;
          });
      });
      
      const sessionNotesResults = await Promise.all(sessionNotesPromises);
      const sessionNotes = sessionNotesResults.filter(result => result !== null);
      
      // Attach notes to their respective sessions
      const sessionsWithNotes = sessions.map(session => {
        const noteResult = sessionNotes.find(note => note?.sessionId === session.id);
        return {
          ...session,
          sessionNote: noteResult?.note || null,
          // Keep backwards compatibility with older versions of the API
          note: noteResult?.note || null
        };
      });
      
      console.log(`Returning ${sessionsWithNotes.length} sessions with attached notes`);
      res.json(sessionsWithNotes);
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

      // Get the session note
      const sessionNote = await storage.getSessionNoteBySessionId(sessionId);
      
      // Attach the note to the session
      const sessionWithNote = {
        ...session,
        sessionNote: sessionNote || null,
        // Keep backwards compatibility with older versions of the API
        note: sessionNote || null
      };

      res.json(sessionWithNote);
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

      // If a therapistId is provided, ensure it exists as an assigned clinician
      if (result.data.therapistId) {
        const assignments = await storage.getCliniciansByClient(result.data.clientId);
        const therapistExists = assignments.some((assignment: { clinicianId: number }) => assignment.clinicianId === result.data.therapistId);
        if (!therapistExists) {
          return res.status(400).json({ error: "Therapist must be assigned to this client" });
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

      // If a therapistId is provided, ensure it exists as an assigned clinician
      if (result.data.therapistId) {
        const assignments = await storage.getCliniciansByClient(result.data.clientId);
        const therapistExists = assignments.some((assignment: { clinicianId: number }) => assignment.clinicianId === result.data.therapistId);
        if (!therapistExists) {
          return res.status(400).json({ error: "Therapist must be assigned to this client" });
        }
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
        console.log(`No session note found for session ${sessionId}`);
        // Return empty data structure instead of 404 to simplify client handling
        return res.json({
          presentAllies: [],
          presentAllyIds: [],
          moodRating: 0,
          focusRating: 0,
          cooperationRating: 0,
          physicalActivityRating: 0,
          notes: "",
          products: [],
          status: "draft"
        });
      }
      
      res.json(note);
    } catch (error) {
      console.error(`Error getting session note for session ${req.params.sessionId}:`, error);
      res.status(500).json({ error: "Failed to get session note" });
    }
  });
  
  // Get assessments for a session
  app.get("/api/sessions/:sessionId/assessments", async (req, res) => {
    console.log(`GET /api/sessions/${req.params.sessionId}/assessments - Getting performance assessments`);
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      // First get the session note to find its ID
      const note = await storage.getSessionNoteBySessionId(sessionId);
      
      if (!note) {
        console.log(`No session note found for session ${sessionId}, returning empty assessments array`);
        return res.json([]);
      }
      
      // Then get the performance assessments for the session note
      const assessments = await storage.getPerformanceAssessmentsBySessionNote(note.id);
      
      if (!assessments || assessments.length === 0) {
        console.log(`No performance assessments found for session note ${note.id}`);
        return res.json([]);
      }
      
      res.json(assessments);
    } catch (error) {
      console.error(`Error getting performance assessments for session ${req.params.sessionId}:`, error);
      res.status(500).json({ error: "Failed to get performance assessments" });
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
  
  // Direct session-notes creation endpoint for compatibility with frontend forms
  app.post("/api/session-notes", async (req, res) => {
    console.log(`POST /api/session-notes - Creating session note`);
    try {
      const { sessionId, ...noteData } = req.body;
      
      // First check if the session exists
      const session = await storage.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const result = insertSessionNoteSchema.safeParse({
        ...noteData,
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
      console.error(`Error creating session note:`, error);
      res.status(500).json({ error: "Failed to create session note" });
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
  
  // Strategy routes
  app.get("/api/strategies", async (req, res) => {
    console.log("GET /api/strategies - Retrieving all strategies");
    try {
      const category = req.query.category as string | undefined;
      
      let strategies;
      if (category) {
        console.log(`Filtering strategies by category: ${category}`);
        strategies = await storage.getStrategiesByCategory(category);
      } else {
        strategies = await storage.getAllStrategies();
      }
      
      console.log(`Returning ${strategies.length} strategies`);
      res.json(strategies);
    } catch (error) {
      console.error("Error retrieving strategies:", formatError(error));
      res.status(500).json({ error: "Failed to retrieve strategies" });
    }
  });
  
  app.get("/api/strategies/:id", async (req, res) => {
    console.log(`GET /api/strategies/${req.params.id} - Retrieving strategy by ID`);
    try {
      const strategyId = parseInt(req.params.id);
      
      if (isNaN(strategyId)) {
        return res.status(400).json({ error: "Invalid strategy ID" });
      }
      
      const strategy = await storage.getStrategyById(strategyId);
      
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      
      res.json(strategy);
    } catch (error) {
      console.error(`Error retrieving strategy ${req.params.id}:`, formatError(error));
      res.status(500).json({ error: "Failed to retrieve strategy" });
    }
  });
  
  app.post("/api/strategies", async (req, res) => {
    console.log("POST /api/strategies - Creating new strategy");
    try {
      const validatedData = insertStrategySchema.parse(req.body);
      const newStrategy = await storage.createStrategy(validatedData);
      console.log(`Successfully created strategy with ID ${newStrategy.id}`);
      res.status(201).json(newStrategy);
    } catch (error) {
      console.error("Error creating strategy:", formatError(error));
      res.status(400).json({ error: "Failed to create strategy" });
    }
  });
  
  app.put("/api/strategies/:id", async (req, res) => {
    console.log(`PUT /api/strategies/${req.params.id} - Updating strategy`);
    try {
      const strategyId = parseInt(req.params.id);
      const validatedData = insertStrategySchema.parse(req.body);
      const updatedStrategy = await storage.updateStrategy(strategyId, validatedData);
      res.json(updatedStrategy);
    } catch (error) {
      console.error(`Error updating strategy ${req.params.id}:`, formatError(error));
      res.status(400).json({ error: "Failed to update strategy" });
    }
  });
  
  app.delete("/api/strategies/:id", async (req, res) => {
    console.log(`DELETE /api/strategies/${req.params.id} - Deleting strategy`);
    try {
      const strategyId = parseInt(req.params.id);
      
      if (isNaN(strategyId)) {
        return res.status(400).json({ error: "Invalid strategy ID" });
      }
      
      // Check if strategy exists
      const strategy = await storage.getStrategyById(strategyId);
      
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      
      await storage.deleteStrategy(strategyId);
      res.json({ success: true, message: "Strategy deleted successfully" });
    } catch (error) {
      console.error(`Error deleting strategy ${req.params.id}:`, formatError(error));
      res.status(500).json({ error: "Failed to delete strategy" });
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

  // Dashboard consolidated endpoint - regular API path
  app.get("/api/dashboard", async (req, res) => {
    console.log("GET /api/dashboard - Retrieving consolidated dashboard data");
    try {
      // Default to 6 months of data if not specified
      const months = req.query.months ? parseInt(req.query.months as string) : 6;
      
      // Fetch all required dashboard data in parallel
      const [appointmentStats, budgetStats, taskStats] = await Promise.all([
        storage.getDashboardAppointmentStats('day'), // Default to daily view
        storage.getBudgetExpirationStats(months),
        storage.getUpcomingTaskStats(months)
      ]);
      
      // Consolidate all data into a single response
      const dashboardData = {
        appointments: appointmentStats,
        budgets: budgetStats,
        tasks: taskStats,
        lastUpdated: new Date().toISOString()
      };
      
      console.log("Dashboard data retrieved successfully");
      res.json(dashboardData);
    } catch (error) {
      console.error("Error retrieving dashboard data:", error);
      res.status(500).json({ 
        error: "Failed to retrieve dashboard data",
        details: formatError(error)
      });
    }
  });
  
  // Alternative dashboard endpoint that bypasses the Vite catch-all route
  app.get("/dashboard-api", async (req, res) => {
    console.log("GET /dashboard-api - Retrieving consolidated dashboard data (direct route)");
    try {
      // Default to 6 months of data if not specified
      const months = req.query.months ? parseInt(req.query.months as string) : 6;
      
      // Fetch all required dashboard data in parallel
      const [appointmentStats, budgetStats, taskStats] = await Promise.all([
        storage.getDashboardAppointmentStats('day'), // Default to daily view
        storage.getBudgetExpirationStats(months),
        storage.getUpcomingTaskStats(months)
      ]);
      
      // Consolidate all data into a single response
      const dashboardData = {
        appointments: appointmentStats,
        budgets: budgetStats,
        tasks: taskStats,
        lastUpdated: new Date().toISOString()
      };
      
      console.log("Dashboard data (direct route) retrieved successfully");
      res.json({ data: dashboardData });
    } catch (error) {
      console.error("Error retrieving dashboard data (direct route):", error);
      res.status(500).json({ 
        error: "Failed to retrieve dashboard data",
        details: formatError(error)
      });
    }
  });
  
  // Dashboard appointment stats endpoint with timeframe parameter
  app.get("/api/dashboard/appointments", async (req, res) => {
    console.log("GET /api/dashboard/appointments - Retrieving appointment statistics");
    try {
      // Parse the timeframe parameter
      const timeframe = (req.query.timeframe as string || 'day') as 'day' | 'week' | 'month' | 'year';
      
      // Validate timeframe
      if (!['day', 'week', 'month', 'year'].includes(timeframe)) {
        return res.status(400).json({ 
          error: "Invalid timeframe. Must be one of: day, week, month, year" 
        });
      }
      
      const stats = await storage.getDashboardAppointmentStats(timeframe);
      console.log(`Appointment stats retrieved successfully for timeframe: ${timeframe}`);
      res.json(stats);
    } catch (error) {
      console.error("Error retrieving appointment statistics:", error);
      res.status(500).json({ 
        error: "Failed to retrieve appointment statistics",
        details: formatError(error)
      });
    }
  });
  
  // Alternative appointment stats endpoint that bypasses the Vite catch-all route
  app.get("/dashboard-api/appointments", async (req, res) => {
    console.log("GET /dashboard-api/appointments - Retrieving appointment statistics (direct route)");
    try {
      // Parse the timeframe parameter
      const timeframe = (req.query.timeframe as string || 'day') as 'day' | 'week' | 'month' | 'year';
      
      // Validate timeframe
      if (!['day', 'week', 'month', 'year'].includes(timeframe)) {
        return res.status(400).json({ 
          error: "Invalid timeframe. Must be one of: day, week, month, year" 
        });
      }
      
      const stats = await storage.getDashboardAppointmentStats(timeframe);
      console.log(`Appointment stats (direct route) retrieved successfully for timeframe: ${timeframe}`);
      res.json({ data: stats });
    } catch (error) {
      console.error("Error retrieving appointment statistics (direct route):", error);
      res.status(500).json({ 
        error: "Failed to retrieve appointment statistics",
        details: formatError(error)
      });
    }
  });

  // Budget Settings Active Route
  app.get("/api/budget-settings/active/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }
      
      console.log(`GET /api/budget-settings/active/${clientId} - Getting active budget setting`);
      const settings = await storage.getBudgetSettingsByClient(clientId);
      
      if (!settings) {
        console.log(`No active budget setting found for client ${clientId}`);
        return res.status(404).json({ error: "Budget settings not found" });
      }
      
      console.log(`Found active budget settings for client ${clientId}`);
      res.json(settings);
    } catch (error) {
      console.error('Error fetching active budget settings:', error);
      return res.status(500).json({ error: formatError(error) });
    }
  });
  
  // Budget Items by Client Route
  app.get("/api/budget-items/client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }
      
      console.log(`GET /api/budget-items/client/${clientId} - Getting budget items for client`);
      const budgetItems = await storage.getBudgetItemsByClient(clientId);
      
      console.log(`Found ${budgetItems.length} budget items for client ${clientId}`);
      return res.json(budgetItems);
    } catch (error) {
      console.error('Error fetching budget items for client:', error);
      return res.status(500).json({ error: formatError(error) });
    }
  });

  // Clinician routes
  app.get("/api/clinicians", async (req, res) => {
    console.log("GET /api/clinicians - Retrieving all clinicians");
    try {
      const clinicians = await storage.getAllClinicians();
      console.log(`Found ${clinicians.length} active clinicians`);
      res.json(clinicians);
    } catch (error) {
      console.error("Error retrieving clinicians:", error);
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.post("/api/clinicians", async (req, res) => {
    console.log("POST /api/clinicians - Creating new clinician");
    try {
      const result = insertClinicianSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Clinician validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }

      const clinician = await storage.createClinician(result.data);
      console.log(`Successfully created clinician with ID ${clinician.id}`);
      res.json(clinician);
    } catch (error) {
      console.error("Error creating clinician:", error);
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.get("/api/clinicians/:id", async (req, res) => {
    const clinicianId = parseInt(req.params.id);
    console.log(`GET /api/clinicians/${clinicianId} - Fetching clinician`);
    
    if (isNaN(clinicianId) || clinicianId <= 0) {
      console.error(`Invalid clinician ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid clinician ID" });
    }
    
    try {
      const clinician = await storage.getClinician(clinicianId);
      
      if (!clinician) {
        console.log(`Clinician with ID ${clinicianId} not found`);
        return res.status(404).json({ error: "Clinician not found" });
      }
      
      res.json(clinician);
    } catch (error) {
      console.error(`Error fetching clinician with ID ${clinicianId}:`, error);
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.put("/api/clinicians/:id", async (req, res) => {
    const clinicianId = parseInt(req.params.id);
    console.log(`PUT /api/clinicians/${clinicianId} - Updating clinician`);
    
    if (isNaN(clinicianId) || clinicianId <= 0) {
      console.error(`Invalid clinician ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid clinician ID" });
    }
    
    try {
      const result = insertClinicianSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Clinician validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      const clinician = await storage.updateClinician(clinicianId, result.data);
      console.log(`Successfully updated clinician with ID ${clinicianId}`);
      res.json(clinician);
    } catch (error) {
      console.error(`Error updating clinician with ID ${clinicianId}:`, error);
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.delete("/api/clinicians/:id", async (req, res) => {
    const clinicianId = parseInt(req.params.id);
    console.log(`DELETE /api/clinicians/${clinicianId} - Deactivating clinician`);
    
    if (isNaN(clinicianId) || clinicianId <= 0) {
      console.error(`Invalid clinician ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid clinician ID" });
    }
    
    try {
      await storage.deleteClinician(clinicianId);
      console.log(`Successfully deactivated clinician with ID ${clinicianId}`);
      res.json({ success: true, message: "Clinician successfully deactivated" });
    } catch (error) {
      console.error(`Error deactivating clinician with ID ${clinicianId}:`, error);
      res.status(500).json({ error: formatError(error) });
    }
  });

  // Client-Clinician Assignment routes
  app.get("/api/clients/:clientId/clinicians", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    console.log(`GET /api/clients/${clientId}/clinicians - Fetching assigned clinicians`);
    
    if (isNaN(clientId) || clientId <= 0) {
      console.error(`Invalid client ID: ${req.params.clientId}`);
      return res.status(400).json({ error: "Invalid client ID" });
    }
    
    try {
      const assignments = await storage.getCliniciansByClient(clientId);
      console.log(`Found ${assignments.length} clinicians assigned to client ${clientId}`);
      res.json(assignments);
    } catch (error) {
      console.error(`Error fetching clinicians for client ${clientId}:`, error);
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.post("/api/clients/:clientId/clinicians", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    console.log(`POST /api/clients/${clientId}/clinicians - Assigning clinician to client`);
    console.log("Request body:", req.body);
    
    if (isNaN(clientId) || clientId <= 0) {
      console.error(`Invalid client ID: ${req.params.clientId}`);
      return res.status(400).json({ error: "Invalid client ID" });
    }

    // Ensure clientId is in the body for schema validation
    const requestWithClientId = {
      ...req.body,
      clientId
    };
    
    try {
      const result = insertClientClinicianSchema.safeParse(requestWithClientId);
      if (!result.success) {
        console.error("Client-clinician assignment validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      const assignment = await storage.assignClinicianToClient(clientId, result.data);
      console.log(`Successfully assigned clinician to client ${clientId}`);
      res.json(assignment);
    } catch (error) {
      console.error(`Error assigning clinician to client ${clientId}:`, error);
      res.status(500).json({ error: formatError(error) });
    }
  });
  
  // Delete clinician assignment
  app.delete("/api/client-clinicians/:id", async (req, res) => {
    const assignmentId = parseInt(req.params.id);
    console.log(`DELETE /api/client-clinicians/${assignmentId} - Removing clinician assignment`);
    
    if (isNaN(assignmentId) || assignmentId <= 0) {
      console.error(`Invalid assignment ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid assignment ID" });
    }
    
    try {
      await storage.removeClinicianFromClient(assignmentId);
      console.log(`Successfully removed clinician assignment with ID ${assignmentId}`);
      res.json({ success: true, message: "Clinician assignment successfully removed" });
    } catch (error) {
      console.error(`Error removing clinician assignment with ID ${assignmentId}:`, error);
      res.status(500).json({ error: formatError(error) });
    }
  });

  // Agent Assistant functionality has been removed
  
  // Debug endpoint for budget item usage
  app.get("/api/debug/budget-items/:itemCode", async (req, res) => {
    console.log(`GET /api/debug/budget-items/${req.params.itemCode} - Getting budget items by code`);
    try {
      const itemCode = req.params.itemCode;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      
      // Use raw SQL query instead of the query builder to fix the error
      let queryText = `
        SELECT * FROM budget_items 
        WHERE item_code = $1
      `;
      
      const queryParams = [itemCode];
      
      // Add client filter if provided
      if (clientId && !isNaN(clientId)) {
        queryText += ` AND client_id = $2`;
        queryParams.push(String(clientId));  // Convert clientId to string to fix type error
      }
      
      const result = await pool.query(queryText, queryParams);
      const items = result.rows;
      
      res.json({
        itemCode,
        clientId: clientId || "all",
        count: items.length,
        items: items
      });
    } catch (error) {
      console.error(`Error getting budget items for code ${req.params.itemCode}:`, error);
      res.status(500).json({ error: "Failed to get budget items by code" });
    }
  });
  
  // Register report API routes
  try {
    console.log("Registering report API routes");
    
    // Import and register report routes
    import('./routes/reports').then(module => {
      const { registerReportRoutes } = module;
      registerReportRoutes(app);
      console.log("Successfully registered report API routes");
    }).catch(error => {
      console.error("Error importing report routes:", error);
    });
  } catch (error) {
    console.error("Error registering report routes:", error);
  }

  const httpServer = createServer(app);
  return httpServer;
}