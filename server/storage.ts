import { 
  Client, InsertClient,
  Ally, InsertAlly,
  Goal, InsertGoal,
  Subgoal, InsertSubgoal,
  BudgetItem, InsertBudgetItem,
  BudgetSettings, InsertBudgetSettings,
  BudgetItemCatalog, InsertBudgetItemCatalog,
  clients, allies, goals, subgoals, budgetItems, budgetSettings, budgetItemCatalog
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Clients
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: number): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>; // Added method to get all clients for debugging

  // Allies
  createAlly(clientId: number, ally: InsertAlly): Promise<Ally>;
  getAlliesByClient(clientId: number): Promise<Ally[]>;
  deleteAlly(id: number): Promise<void>; // Added deleteAlly function

  // Goals
  createGoal(clientId: number, goal: InsertGoal): Promise<Goal>;
  getGoalsByClient(clientId: number): Promise<Goal[]>;
  updateGoal(id: number, goal: InsertGoal): Promise<Goal>;

  // Subgoals  
  createSubgoal(goalId: number, subgoal: InsertSubgoal): Promise<Subgoal>;
  getSubgoalsByGoal(goalId: number): Promise<Subgoal[]>;
  updateSubgoal(id: number, data: any): Promise<Subgoal>; //Added updateSubgoal
  deleteSubgoal(id: number): Promise<void>; // Added deleteSubgoal function

  // Budget Settings
  createBudgetSettings(clientId: number, settings: InsertBudgetSettings): Promise<BudgetSettings>;
  getBudgetSettingsByClient(clientId: number): Promise<BudgetSettings | undefined>;
  updateBudgetSettings(id: number, settings: InsertBudgetSettings): Promise<BudgetSettings>;

  // Budget Items
  createBudgetItem(clientId: number, budgetSettingsId: number, item: InsertBudgetItem): Promise<BudgetItem>;
  getBudgetItemsByClient(clientId: number): Promise<BudgetItem[]>;
  getBudgetItemsBySettings(budgetSettingsId: number): Promise<BudgetItem[]>;
  deleteBudgetItem(id: number): Promise<void>;
  
  // Budget Item Catalog
  createBudgetItemCatalog(item: InsertBudgetItemCatalog): Promise<BudgetItemCatalog>;
  getBudgetItemCatalog(): Promise<BudgetItemCatalog[]>;
  getBudgetItemCatalogByCode(itemCode: string): Promise<BudgetItemCatalog | undefined>;
  updateBudgetItemCatalog(id: number, item: InsertBudgetItemCatalog): Promise<BudgetItemCatalog>;
}

/**
 * PostgreSQL database implementation of the Storage interface
 */
export class DBStorage implements IStorage {
  async createClient(client: InsertClient): Promise<Client> {
    console.log(`Creating client:`, JSON.stringify(client));
    
    // Process client data for storage
    const processedClient = {
      ...client,
      availableFunds: Number(client.availableFunds) || 0,
      fundsManagement: client.fundsManagement || null,
      // Make sure these fields are passed through properly
      gender: client.gender || null,
      preferredLanguage: client.preferredLanguage || null,
      contactEmail: client.contactEmail || null,
      contactPhone: client.contactPhone || null,
      address: client.address || null,
      medicalHistory: client.medicalHistory || null,
      communicationNeeds: client.communicationNeeds || null,
      therapyPreferences: client.therapyPreferences || null
    };
    
    console.log("Processed client data:", processedClient);
    
    try {
      const [newClient] = await db.insert(clients)
        .values(processedClient)
        .returning();
      
      console.log(`Successfully created client with ID ${newClient.id}:`, newClient);
      return newClient;
    } catch (error) {
      console.error("Error creating client:", error);
      throw error;
    }
  }

  async getClient(id: number): Promise<Client | undefined> {
    console.log(`Attempting to get client with ID: ${id}`);
    if (isNaN(id) || id <= 0) {
      console.error(`Invalid client ID: ${id}`);
      return undefined;
    }
    
    try {
      const result = await db.select()
        .from(clients)
        .where(eq(clients.id, id));
      
      if (result.length === 0) {
        console.log(`Client with ID ${id} not found in database`);
        return undefined;
      }
      
      console.log(`Found client with ID ${id}: ${JSON.stringify(result[0])}`);
      return result[0];
    } catch (error) {
      console.error(`Error fetching client with ID ${id}:`, error);
      throw error;
    }
  }

  async getAllClients(): Promise<Client[]> {
    console.log("Getting all clients from database");
    try {
      const allClients = await db.select().from(clients);
      console.log(`Found ${allClients.length} clients in database`);
      return allClients;
    } catch (error) {
      console.error("Error fetching all clients:", error);
      throw error;
    }
  }

  async createAlly(clientId: number, ally: InsertAlly): Promise<Ally> {
    console.log(`Creating ally for client ${clientId}:`, JSON.stringify(ally));
    try {
      const [newAlly] = await db.insert(allies)
        .values({
          ...ally,
          clientId
        })
        .returning();
      
      console.log(`Successfully created ally with ID ${newAlly.id}`);
      return newAlly;
    } catch (error) {
      console.error(`Error creating ally for client ${clientId}:`, error);
      throw error;
    }
  }

  async getAlliesByClient(clientId: number): Promise<Ally[]> {
    console.log(`Getting allies for client ${clientId}`);
    try {
      const clientAllies = await db.select()
        .from(allies)
        .where(eq(allies.clientId, clientId));
      
      console.log(`Found ${clientAllies.length} allies for client ${clientId}`);
      return clientAllies;
    } catch (error) {
      console.error(`Error fetching allies for client ${clientId}:`, error);
      throw error;
    }
  }

  async deleteAlly(id: number): Promise<void> {
    console.log(`Deleting ally with ID ${id}`);
    try {
      await db.delete(allies)
        .where(eq(allies.id, id));
      console.log(`Successfully deleted ally with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting ally with ID ${id}:`, error);
      throw error;
    }
  }

  async updateGoal(id: number, goal: InsertGoal): Promise<Goal> {
    console.log(`Updating goal with ID ${id}:`, JSON.stringify(goal));
    try {
      const [updatedGoal] = await db.update(goals)
        .set(goal)
        .where(eq(goals.id, id))
        .returning();
      
      if (!updatedGoal) {
        console.error(`Goal with ID ${id} not found`);
        throw new Error("Goal not found");
      }
      
      console.log(`Successfully updated goal with ID ${id}`);
      return updatedGoal;
    } catch (error) {
      console.error(`Error updating goal with ID ${id}:`, error);
      throw error;
    }
  }

  async createGoal(clientId: number, goal: InsertGoal): Promise<Goal> {
    console.log(`Creating goal for client ${clientId}:`, JSON.stringify(goal));
    try {
      const [newGoal] = await db.insert(goals)
        .values({
          ...goal,
          clientId
        })
        .returning();
      
      console.log(`Successfully created goal with ID ${newGoal.id}`);
      return newGoal;
    } catch (error) {
      console.error(`Error creating goal for client ${clientId}:`, error);
      throw error;
    }
  }

  async getGoalsByClient(clientId: number): Promise<Goal[]> {
    console.log(`Getting goals for client ${clientId}`);
    try {
      const clientGoals = await db.select()
        .from(goals)
        .where(eq(goals.clientId, clientId));
      
      console.log(`Found ${clientGoals.length} goals for client ${clientId}`);
      return clientGoals;
    } catch (error) {
      console.error(`Error fetching goals for client ${clientId}:`, error);
      throw error;
    }
  }

  async createSubgoal(goalId: number, subgoal: InsertSubgoal): Promise<Subgoal> {
    console.log(`Creating subgoal for goal ${goalId}:`, JSON.stringify(subgoal));
    try {
      const [newSubgoal] = await db.insert(subgoals)
        .values({
          ...subgoal,
          goalId
        })
        .returning();
      
      console.log(`Successfully created subgoal with ID ${newSubgoal.id}`);
      return newSubgoal;
    } catch (error) {
      console.error(`Error creating subgoal for goal ${goalId}:`, error);
      throw error;
    }
  }

  async getSubgoalsByGoal(goalId: number): Promise<Subgoal[]> {
    console.log(`Getting subgoals for goal ${goalId}`);
    try {
      const goalSubgoals = await db.select()
        .from(subgoals)
        .where(eq(subgoals.goalId, goalId));
      
      console.log(`Found ${goalSubgoals.length} subgoals for goal ${goalId}`);
      return goalSubgoals;
    } catch (error) {
      console.error(`Error fetching subgoals for goal ${goalId}:`, error);
      throw error;
    }
  }

  async updateSubgoal(id: number, data: any): Promise<Subgoal> {
    console.log(`Updating subgoal with ID ${id}:`, JSON.stringify(data));
    try {
      const [updatedSubgoal] = await db.update(subgoals)
        .set(data)
        .where(eq(subgoals.id, id))
        .returning();
      
      if (!updatedSubgoal) {
        console.error(`Subgoal with ID ${id} not found`);
        throw new Error("Subgoal not found");
      }
      
      console.log(`Successfully updated subgoal with ID ${id}`);
      return updatedSubgoal;
    } catch (error) {
      console.error(`Error updating subgoal with ID ${id}:`, error);
      throw error;
    }
  }
  
  async deleteSubgoal(id: number): Promise<void> {
    console.log(`Deleting subgoal with ID ${id}`);
    try {
      await db.delete(subgoals)
        .where(eq(subgoals.id, id));
      console.log(`Successfully deleted subgoal with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting subgoal with ID ${id}:`, error);
      throw error;
    }
  }

  async createBudgetItem(clientId: number, budgetSettingsId: number, item: InsertBudgetItem): Promise<BudgetItem> {
    console.log(`Creating budget item for client ${clientId} and budgetSettings ${budgetSettingsId}:`, JSON.stringify(item));
    try {
      // Process item data for storage
      const processedItem = {
        ...item,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity)
      };
      
      // Make sure budgetSettingsId is stored correctly
      const [newBudgetItem] = await db.insert(budgetItems)
        .values({
          ...processedItem,
          clientId,
          budgetSettingsId
        })
        .returning();
      
      console.log(`Successfully created budget item with ID ${newBudgetItem.id}`);
      return newBudgetItem;
    } catch (error) {
      console.error(`Error creating budget item for client ${clientId}:`, error);
      throw error;
    }
  }

  async getBudgetItemsByClient(clientId: number): Promise<BudgetItem[]> {
    console.log(`Getting budget items for client ${clientId}`);
    try {
      const clientBudgetItems = await db.select()
        .from(budgetItems)
        .where(eq(budgetItems.clientId, clientId));
      
      console.log(`Found ${clientBudgetItems.length} budget items for client ${clientId}`);
      return clientBudgetItems;
    } catch (error) {
      console.error(`Error fetching budget items for client ${clientId}:`, error);
      throw error;
    }
  }
  
  async getBudgetItemsBySettings(budgetSettingsId: number): Promise<BudgetItem[]> {
    console.log(`Getting budget items for budget settings ${budgetSettingsId}`);
    try {
      const settingsBudgetItems = await db.select()
        .from(budgetItems)
        .where(eq(budgetItems.budgetSettingsId, budgetSettingsId));
      
      console.log(`Found ${settingsBudgetItems.length} budget items for budget settings ${budgetSettingsId}`);
      return settingsBudgetItems;
    } catch (error) {
      console.error(`Error fetching budget items for budget settings ${budgetSettingsId}:`, error);
      throw error;
    }
  }
  
  async deleteBudgetItem(id: number): Promise<void> {
    console.log(`Deleting budget item with ID ${id}`);
    try {
      await db.delete(budgetItems)
        .where(eq(budgetItems.id, id));
      console.log(`Successfully deleted budget item with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting budget item with ID ${id}:`, error);
      throw error;
    }
  }

  async createBudgetSettings(clientId: number, settings: InsertBudgetSettings): Promise<BudgetSettings> {
    console.log(`Creating budget settings for client ${clientId}:`, JSON.stringify(settings));
    try {
      // Process settings data for storage
      const processedSettings = {
        ...settings,
        availableFunds: Number(settings.availableFunds || 0),
        endOfPlan: settings.endOfPlan || null
      };
      
      const [newBudgetSettings] = await db.insert(budgetSettings)
        .values({
          ...processedSettings,
          clientId
        })
        .returning();
      
      console.log(`Successfully created budget settings with ID ${newBudgetSettings.id}`);
      return newBudgetSettings;
    } catch (error) {
      console.error(`Error creating budget settings for client ${clientId}:`, error);
      throw error;
    }
  }

  async getBudgetSettingsByClient(clientId: number): Promise<BudgetSettings | undefined> {
    console.log(`Getting budget settings for client ${clientId}`);
    try {
      const result = await db.select()
        .from(budgetSettings)
        .where(eq(budgetSettings.clientId, clientId));
      
      if (result.length === 0) {
        console.log(`Budget settings for client ${clientId} not found`);
        return undefined;
      }
      
      console.log(`Found budget settings for client ${clientId}`);
      return result[0];
    } catch (error) {
      console.error(`Error fetching budget settings for client ${clientId}:`, error);
      throw error;
    }
  }

  async updateBudgetSettings(id: number, settings: InsertBudgetSettings): Promise<BudgetSettings> {
    console.log(`Updating budget settings with ID ${id}:`, JSON.stringify(settings));
    try {
      // Process settings data for update
      const processedSettings = {
        ...settings,
        availableFunds: Number(settings.availableFunds || 0),
        endOfPlan: settings.endOfPlan || null
      };
      
      const [updatedSettings] = await db.update(budgetSettings)
        .set(processedSettings)
        .where(eq(budgetSettings.id, id))
        .returning();
      
      if (!updatedSettings) {
        console.error(`Budget settings with ID ${id} not found`);
        throw new Error("Budget settings not found");
      }
      
      console.log(`Successfully updated budget settings with ID ${id}`);
      return updatedSettings;
    } catch (error) {
      console.error(`Error updating budget settings with ID ${id}:`, error);
      throw error;
    }
  }
  
  // Budget Item Catalog methods
  async createBudgetItemCatalog(item: InsertBudgetItemCatalog): Promise<BudgetItemCatalog> {
    console.log(`Creating budget item catalog entry:`, JSON.stringify(item));
    try {
      const processedItem = {
        ...item,
        defaultUnitPrice: Number(item.defaultUnitPrice || 0)
      };
      
      const [newCatalogItem] = await db.insert(budgetItemCatalog)
        .values(processedItem)
        .returning();
      
      console.log(`Successfully created budget item catalog entry with ID ${newCatalogItem.id}`);
      return newCatalogItem;
    } catch (error) {
      console.error(`Error creating budget item catalog entry:`, error);
      throw error;
    }
  }
  
  async getBudgetItemCatalog(): Promise<BudgetItemCatalog[]> {
    console.log(`Getting all budget item catalog entries`);
    try {
      const catalogItems = await db.select()
        .from(budgetItemCatalog);
      
      console.log(`Found ${catalogItems.length} budget item catalog entries`);
      return catalogItems;
    } catch (error) {
      console.error(`Error fetching budget item catalog:`, error);
      throw error;
    }
  }
  
  async getBudgetItemCatalogByCode(itemCode: string): Promise<BudgetItemCatalog | undefined> {
    console.log(`Getting budget item catalog entry with code ${itemCode}`);
    try {
      const result = await db.select()
        .from(budgetItemCatalog)
        .where(eq(budgetItemCatalog.itemCode, itemCode));
      
      if (result.length === 0) {
        console.log(`Budget item catalog entry with code ${itemCode} not found`);
        return undefined;
      }
      
      console.log(`Found budget item catalog entry for code ${itemCode}`);
      return result[0];
    } catch (error) {
      console.error(`Error fetching budget item catalog entry with code ${itemCode}:`, error);
      throw error;
    }
  }
  
  async updateBudgetItemCatalog(id: number, item: InsertBudgetItemCatalog): Promise<BudgetItemCatalog> {
    console.log(`Updating budget item catalog entry with ID ${id}:`, JSON.stringify(item));
    try {
      const processedItem = {
        ...item,
        defaultUnitPrice: Number(item.defaultUnitPrice || 0)
      };
      
      const [updatedCatalogItem] = await db.update(budgetItemCatalog)
        .set(processedItem)
        .where(eq(budgetItemCatalog.id, id))
        .returning();
      
      if (!updatedCatalogItem) {
        console.error(`Budget item catalog entry with ID ${id} not found`);
        throw new Error("Budget item catalog entry not found");
      }
      
      console.log(`Successfully updated budget item catalog entry with ID ${id}`);
      return updatedCatalogItem;
    } catch (error) {
      console.error(`Error updating budget item catalog entry with ID ${id}:`, error);
      throw error;
    }
  }
}

// Create and export an instance of DBStorage
export const storage = new DBStorage();