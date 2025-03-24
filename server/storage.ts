import { 
  Client, InsertClient,
  Ally, InsertAlly,
  Goal, InsertGoal,
  Subgoal, InsertSubgoal,
  BudgetItem, InsertBudgetItem,
  BudgetSettings, InsertBudgetSettings,
  BudgetItemCatalog, InsertBudgetItemCatalog,
  Session, InsertSession,
  SessionNote, InsertSessionNote,
  PerformanceAssessment, InsertPerformanceAssessment,
  MilestoneAssessment, InsertMilestoneAssessment,
  Strategy, InsertStrategy,
  Clinician, InsertClinician,
  ClientClinician, InsertClientClinician,
  // Import dashboard data types
  AppointmentStats, BudgetExpirationStats, UpcomingTaskStats, 
  clients, allies, goals, subgoals, budgetItems, budgetSettings, budgetItemCatalog, sessions,
  sessionNotes, performanceAssessments, milestoneAssessments, strategies, clinicians, clientClinicians
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Clients
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: number): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>; // Added method to get all clients for debugging
  deleteClient(id: number): Promise<void>; // Added deleteClient function
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>; // Added updateClient function

  // Allies
  createAlly(clientId: number, ally: InsertAlly): Promise<Ally>;
  getAlliesByClient(clientId: number): Promise<Ally[]>;
  updateAlly(id: number, ally: InsertAlly): Promise<Ally>; // Added updateAlly function
  deleteAlly(id: number): Promise<void>; // Added deleteAlly function
  
  // Clinicians
  createClinician(clinician: InsertClinician): Promise<Clinician>;
  getClinician(id: number): Promise<Clinician | undefined>;
  getAllClinicians(): Promise<Clinician[]>;
  updateClinician(id: number, clinician: Partial<InsertClinician>): Promise<Clinician>;
  deleteClinician(id: number): Promise<void>;
  
  // Client-Clinician Assignments
  assignClinicianToClient(clientId: number, assignment: InsertClientClinician): Promise<ClientClinician>;
  getCliniciansByClient(clientId: number): Promise<(ClientClinician & { clinician: Clinician })[]>;
  removeClinicianFromClient(assignmentId: number): Promise<void>;
  
  // Strategies
  getAllStrategies(): Promise<Strategy[]>;
  getStrategyById(id: number): Promise<Strategy | undefined>;
  getStrategiesByCategory(category: string): Promise<Strategy[]>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: number, strategy: Partial<InsertStrategy>): Promise<Strategy>;
  deleteStrategy(id: number): Promise<void>;

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
  getAllBudgetSettingsByClient(clientId: number): Promise<BudgetSettings[]>;
  updateBudgetSettings(id: number, settings: InsertBudgetSettings): Promise<BudgetSettings>;

  // Budget Items
  createBudgetItem(clientId: number, budgetSettingsId: number, item: InsertBudgetItem): Promise<BudgetItem>;
  getBudgetItemsByClient(clientId: number): Promise<BudgetItem[]>;
  getBudgetItemsBySettings(budgetSettingsId: number): Promise<BudgetItem[]>;
  updateBudgetItem(id: number, item: Partial<InsertBudgetItem>): Promise<BudgetItem>;
  deleteBudgetItem(id: number): Promise<void>;
  
  // Budget Item Catalog
  createBudgetItemCatalog(item: InsertBudgetItemCatalog): Promise<BudgetItemCatalog>;
  getBudgetItemCatalog(): Promise<BudgetItemCatalog[]>;
  getBudgetItemCatalogByCode(itemCode: string): Promise<BudgetItemCatalog | undefined>;
  updateBudgetItemCatalog(id: number, item: InsertBudgetItemCatalog): Promise<BudgetItemCatalog>;
  
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSessionById(id: number): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  getSessionsByClient(clientId: number): Promise<Session[]>;
  updateSession(id: number, session: InsertSession): Promise<Session>;
  deleteSession(id: number): Promise<void>;
  
  // Session Notes
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;
  getSessionNoteById(id: number): Promise<SessionNote | undefined>;
  getSessionNoteBySessionId(sessionId: number): Promise<SessionNote | undefined>;
  updateSessionNote(id: number, note: InsertSessionNote): Promise<SessionNote>;
  deleteSessionNote(id: number): Promise<void>;
  
  // Performance Assessments
  createPerformanceAssessment(assessment: InsertPerformanceAssessment): Promise<PerformanceAssessment>;
  getPerformanceAssessmentsBySessionNote(sessionNoteId: number): Promise<PerformanceAssessment[]>;
  getPerformanceAssessmentById(id: number): Promise<PerformanceAssessment | undefined>;
  updatePerformanceAssessment(id: number, assessment: InsertPerformanceAssessment): Promise<PerformanceAssessment>;
  deletePerformanceAssessment(id: number): Promise<void>;
  
  // Milestone Assessments
  createMilestoneAssessment(assessment: InsertMilestoneAssessment): Promise<MilestoneAssessment>;
  getMilestoneAssessmentsByPerformanceAssessment(performanceAssessmentId: number): Promise<MilestoneAssessment[]>;
  updateMilestoneAssessment(id: number, assessment: InsertMilestoneAssessment): Promise<MilestoneAssessment>;
  deleteMilestoneAssessment(id: number): Promise<void>;
  
  // Dashboard Data
  getDashboardAppointmentStats(timeframe: 'day' | 'week' | 'month' | 'year'): Promise<AppointmentStats>;
  getBudgetExpirationStats(months: number): Promise<BudgetExpirationStats>;
  getUpcomingTaskStats(months: number): Promise<UpcomingTaskStats>;
  
  // Goal Performance Data
  getGoalPerformanceData(clientId: number, goalId?: number): Promise<Record<number, number | null>>;
}

/**
 * PostgreSQL database implementation of the Storage interface
 */
export class DBStorage implements IStorage {
  async createClient(client: InsertClient): Promise<Client> {
    console.log(`Creating client:`, JSON.stringify(client));
    
    // Generate a unique 6-digit identifier
    const uniqueIdentifier = Math.floor(100000 + Math.random() * 900000).toString();
    const originalName = client.name;
    const nameWithIdentifier = `${originalName}-${uniqueIdentifier}`;
    
    console.log(`Generated unique identifier: ${uniqueIdentifier}`);
    console.log(`Original name: ${originalName}`);
    console.log(`Name with identifier: ${nameWithIdentifier}`);
    
    // Process client data for storage
    const processedClient = {
      ...client,
      name: nameWithIdentifier, // Set the name with identifier
      originalName: originalName, // Store the original name
      uniqueIdentifier: uniqueIdentifier, // Store just the identifier
      ndisFunds: Number(client.ndisFunds) || 0,
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
  
  async deleteClient(id: number): Promise<void> {
    console.log(`Deleting client with ID ${id}`);
    try {
      await db.delete(clients)
        .where(eq(clients.id, id));
      console.log(`Successfully deleted client with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting client with ID ${id}:`, error);
      throw error;
    }
  }
  
  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    console.log(`Updating client with ID ${id}:`, JSON.stringify(client));
    try {
      // Process client data for storage - handle nullable fields properly
      const processedClient = {
        ...client,
        // Convert any string numbers to actual numbers
        ndisFunds: client.ndisFunds !== undefined ? Number(client.ndisFunds) : undefined,
        // Ensure null fields are properly handled
        fundsManagement: client.fundsManagement || null,
        gender: client.gender || null,
        preferredLanguage: client.preferredLanguage || null,
        contactEmail: client.contactEmail || null,
        contactPhone: client.contactPhone || null,
        address: client.address || null,
        medicalHistory: client.medicalHistory || null,
        communicationNeeds: client.communicationNeeds || null,
        therapyPreferences: client.therapyPreferences || null
      };
      
      const [updatedClient] = await db.update(clients)
        .set(processedClient)
        .where(eq(clients.id, id))
        .returning();
      
      if (!updatedClient) {
        console.error(`Client with ID ${id} not found`);
        throw new Error("Client not found");
      }
      
      console.log(`Successfully updated client with ID ${id}`);
      return updatedClient;
    } catch (error) {
      console.error(`Error updating client with ID ${id}:`, error);
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

  async updateAlly(id: number, ally: InsertAlly): Promise<Ally> {
    console.log(`Updating ally with ID ${id}:`, JSON.stringify(ally));
    try {
      const [updatedAlly] = await db.update(allies)
        .set(ally)
        .where(eq(allies.id, id))
        .returning();
      
      if (!updatedAlly) {
        console.error(`Ally with ID ${id} not found`);
        throw new Error("Ally not found");
      }
      
      console.log(`Successfully updated ally with ID ${id}`);
      return updatedAlly;
    } catch (error) {
      console.error(`Error updating ally with ID ${id}:`, error);
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
  
  async updateBudgetItem(id: number, item: Partial<InsertBudgetItem>): Promise<BudgetItem> {
    console.log(`Updating budget item with ID ${id}:`, JSON.stringify(item));
    try {
      // Process item data for storage
      const processedItem: Partial<InsertBudgetItem> = {
        ...item
      };
      
      // Convert values to numbers if present
      if (item.unitPrice !== undefined) {
        processedItem.unitPrice = Number(item.unitPrice);
      }
      
      if (item.quantity !== undefined) {
        processedItem.quantity = Number(item.quantity);
      }
      
      const [updatedBudgetItem] = await db.update(budgetItems)
        .set(processedItem)
        .where(eq(budgetItems.id, id))
        .returning();
      
      if (!updatedBudgetItem) {
        console.error(`Budget item with ID ${id} not found`);
        throw new Error("Budget item not found");
      }
      
      console.log(`Successfully updated budget item with ID ${id}`);
      return updatedBudgetItem;
    } catch (error) {
      console.error(`Error updating budget item with ID ${id}:`, error);
      throw error;
    }
  }

  async createBudgetSettings(clientId: number, settings: InsertBudgetSettings): Promise<BudgetSettings> {
    console.log(`Creating budget settings for client ${clientId}:`, JSON.stringify(settings));
    try {
      // If the new plan is set to active, deactivate any existing active plans for this client
      if (settings.isActive) {
        console.log(`New plan is active, deactivating any existing active plans for client ${clientId}`);
        
        // Find all active plans for this client
        const activePlans = await db.select()
          .from(budgetSettings)
          .where(and(
            eq(budgetSettings.clientId, clientId),
            eq(budgetSettings.isActive, true)
          ));
        
        // If there are any active plans, deactivate them
        if (activePlans.length > 0) {
          console.log(`Found ${activePlans.length} active plans to deactivate`);
          
          for (const plan of activePlans) {
            console.log(`Deactivating plan ${plan.id}`);
            await db.update(budgetSettings)
              .set({ isActive: false })
              .where(eq(budgetSettings.id, plan.id));
          }
        }
      }
      
      // Process settings data for storage
      const processedSettings = {
        ...settings,
        ndisFunds: Number(settings.ndisFunds || 0),
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
      
      // Find and return the active budget settings
      const activeSetting = result.find(setting => setting.isActive);
      
      console.log(`Found budget settings for client ${clientId}`);
      return activeSetting || result[0]; // Return active or first one if no active is found
    } catch (error) {
      console.error(`Error fetching budget settings for client ${clientId}:`, error);
      throw error;
    }
  }
  
  // New method to get all budget settings for a client
  async getAllBudgetSettingsByClient(clientId: number): Promise<BudgetSettings[]> {
    console.log(`Getting all budget settings for client ${clientId}`);
    try {
      const result = await db.select()
        .from(budgetSettings)
        .where(eq(budgetSettings.clientId, clientId));
      
      console.log(`Found ${result.length} budget settings for client ${clientId}`);
      return result;
    } catch (error) {
      console.error(`Error fetching all budget settings for client ${clientId}:`, error);
      throw error;
    }
  }

  async updateBudgetSettings(id: number, settings: InsertBudgetSettings): Promise<BudgetSettings> {
    console.log(`Updating budget settings with ID ${id}:`, JSON.stringify(settings));
    try {
      // First get the existing settings to check if active status is changing
      const existingSettings = await db.select()
        .from(budgetSettings)
        .where(eq(budgetSettings.id, id));
      
      if (existingSettings.length === 0) {
        console.error(`Budget settings with ID ${id} not found`);
        throw new Error("Budget settings not found");
      }
      
      const existing = existingSettings[0];
      
      // If this plan is being activated and it wasn't active before, deactivate other active plans
      if (settings.isActive === true && existing.isActive === false) {
        console.log(`Plan ${id} is being activated, deactivating other active plans for client ${existing.clientId}`);
        
        // Find all other active plans for this client
        const activePlans = await db.select()
          .from(budgetSettings)
          .where(and(
            eq(budgetSettings.clientId, existing.clientId),
            eq(budgetSettings.isActive, true)
          ));
        
        // If there are any active plans, deactivate them
        if (activePlans.length > 0) {
          console.log(`Found ${activePlans.length} active plans to deactivate`);
          
          for (const plan of activePlans) {
            console.log(`Deactivating plan ${plan.id}`);
            await db.update(budgetSettings)
              .set({ isActive: false })
              .where(eq(budgetSettings.id, plan.id));
          }
        }
      }
      
      // Process settings data for update
      const processedSettings = {
        ...settings,
        ndisFunds: Number(settings.ndisFunds || 0),
        endOfPlan: settings.endOfPlan || null
      };
      
      const [updatedSettings] = await db.update(budgetSettings)
        .set(processedSettings)
        .where(eq(budgetSettings.id, id))
        .returning();
      
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
  
  // Sessions methods implementation
  async createSession(session: InsertSession): Promise<Session> {
    console.log(`Creating session:`, JSON.stringify(session));
    try {
      const [newSession] = await db.insert(sessions)
        .values(session)
        .returning();
      
      console.log(`Successfully created session with ID ${newSession.id}`);
      return newSession;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }
  
  async getSessionById(id: number): Promise<Session | undefined> {
    console.log(`Getting session with ID ${id}`);
    try {
      const result = await db.select()
        .from(sessions)
        .where(eq(sessions.id, id));
      
      if (result.length === 0) {
        console.log(`Session with ID ${id} not found`);
        return undefined;
      }
      
      console.log(`Found session with ID ${id}`);
      return result[0];
    } catch (error) {
      console.error(`Error fetching session with ID ${id}:`, error);
      throw error;
    }
  }
  
  async getAllSessions(): Promise<Session[]> {
    console.log(`Getting all sessions`);
    try {
      const allSessions = await db.select().from(sessions);
      console.log(`Found ${allSessions.length} sessions`);
      return allSessions;
    } catch (error) {
      console.error("Error fetching all sessions:", error);
      throw error;
    }
  }
  
  async getSessionsByClient(clientId: number): Promise<Session[]> {
    console.log(`Getting sessions for client ${clientId}`);
    try {
      const clientSessions = await db.select()
        .from(sessions)
        .where(eq(sessions.clientId, clientId));
      
      console.log(`Found ${clientSessions.length} sessions for client ${clientId}`);
      return clientSessions;
    } catch (error) {
      console.error(`Error fetching sessions for client ${clientId}:`, error);
      throw error;
    }
  }
  
  async updateSession(id: number, session: InsertSession): Promise<Session> {
    console.log(`Updating session with ID ${id}:`, JSON.stringify(session));
    try {
      const [updatedSession] = await db.update(sessions)
        .set(session)
        .where(eq(sessions.id, id))
        .returning();
      
      if (!updatedSession) {
        console.error(`Session with ID ${id} not found`);
        throw new Error("Session not found");
      }
      
      console.log(`Successfully updated session with ID ${id}`);
      return updatedSession;
    } catch (error) {
      console.error(`Error updating session with ID ${id}:`, error);
      throw error;
    }
  }
  
  async deleteSession(id: number): Promise<void> {
    console.log(`Deleting session with ID ${id}`);
    try {
      await db.delete(sessions)
        .where(eq(sessions.id, id));
      console.log(`Successfully deleted session with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting session with ID ${id}:`, error);
      throw error;
    }
  }

  // Session Notes Methods
  async createSessionNote(note: InsertSessionNote): Promise<SessionNote> {
    console.log(`Creating session note for session ${note.sessionId}:`, JSON.stringify(note));
    try {
      const [newNote] = await db.insert(sessionNotes)
        .values(note)
        .returning();
      
      console.log(`Successfully created session note with ID ${newNote.id}`);
      return newNote;
    } catch (error) {
      console.error(`Error creating session note for session ${note.sessionId}:`, error);
      throw error;
    }
  }

  async getSessionNoteById(id: number): Promise<SessionNote | undefined> {
    console.log(`Getting session note with ID ${id}`);
    try {
      const result = await db.select()
        .from(sessionNotes)
        .where(eq(sessionNotes.id, id));
      
      if (result.length === 0) {
        console.log(`Session note with ID ${id} not found`);
        return undefined;
      }
      
      console.log(`Found session note with ID ${id}`);
      return result[0];
    } catch (error) {
      console.error(`Error getting session note with ID ${id}:`, error);
      throw error;
    }
  }

  async getSessionNoteBySessionId(sessionId: number): Promise<SessionNote | undefined> {
    console.log(`Getting session note for session ${sessionId}`);
    try {
      const result = await db.select()
        .from(sessionNotes)
        .where(eq(sessionNotes.sessionId, sessionId));
      
      if (result.length === 0) {
        console.log(`No session note found for session ${sessionId}`);
        return undefined;
      }
      
      console.log(`Found session note for session ${sessionId}`);
      return result[0];
    } catch (error) {
      console.error(`Error getting session note for session ${sessionId}:`, error);
      throw error;
    }
  }

  async updateSessionNote(id: number, note: InsertSessionNote): Promise<SessionNote> {
    console.log(`Updating session note with ID ${id}:`, JSON.stringify(note));
    try {
      const [updatedNote] = await db.update(sessionNotes)
        .set(note)
        .where(eq(sessionNotes.id, id))
        .returning();
      
      if (!updatedNote) {
        console.error(`Session note with ID ${id} not found`);
        throw new Error("Session note not found");
      }
      
      console.log(`Successfully updated session note with ID ${id}`);
      return updatedNote;
    } catch (error) {
      console.error(`Error updating session note with ID ${id}:`, error);
      throw error;
    }
  }

  async deleteSessionNote(id: number): Promise<void> {
    console.log(`Deleting session note with ID ${id}`);
    try {
      await db.delete(sessionNotes)
        .where(eq(sessionNotes.id, id));
      console.log(`Successfully deleted session note with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting session note with ID ${id}:`, error);
      throw error;
    }
  }

  // Performance Assessment Methods
  async createPerformanceAssessment(assessment: InsertPerformanceAssessment): Promise<PerformanceAssessment> {
    console.log(`Creating performance assessment for session note ${assessment.sessionNoteId}:`, JSON.stringify(assessment));
    try {
      const [newAssessment] = await db.insert(performanceAssessments)
        .values(assessment)
        .returning();
      
      console.log(`Successfully created performance assessment with ID ${newAssessment.id}`);
      return newAssessment;
    } catch (error) {
      console.error(`Error creating performance assessment for session note ${assessment.sessionNoteId}:`, error);
      throw error;
    }
  }

  async getPerformanceAssessmentsBySessionNote(sessionNoteId: number): Promise<PerformanceAssessment[]> {
    console.log(`Getting performance assessments for session note ${sessionNoteId}`);
    try {
      const assessments = await db.select()
        .from(performanceAssessments)
        .where(eq(performanceAssessments.sessionNoteId, sessionNoteId));
      
      console.log(`Found ${assessments.length} performance assessments for session note ${sessionNoteId}`);
      return assessments;
    } catch (error) {
      console.error(`Error getting performance assessments for session note ${sessionNoteId}:`, error);
      throw error;
    }
  }

  async getPerformanceAssessmentById(id: number): Promise<PerformanceAssessment | undefined> {
    console.log(`Getting performance assessment with ID ${id}`);
    try {
      const result = await db.select()
        .from(performanceAssessments)
        .where(eq(performanceAssessments.id, id));
      
      if (result.length === 0) {
        console.log(`Performance assessment with ID ${id} not found`);
        return undefined;
      }
      
      console.log(`Found performance assessment with ID ${id}`);
      return result[0];
    } catch (error) {
      console.error(`Error getting performance assessment with ID ${id}:`, error);
      throw error;
    }
  }

  async updatePerformanceAssessment(id: number, assessment: InsertPerformanceAssessment): Promise<PerformanceAssessment> {
    console.log(`Updating performance assessment with ID ${id}:`, JSON.stringify(assessment));
    try {
      const [updatedAssessment] = await db.update(performanceAssessments)
        .set(assessment)
        .where(eq(performanceAssessments.id, id))
        .returning();
      
      if (!updatedAssessment) {
        console.error(`Performance assessment with ID ${id} not found`);
        throw new Error("Performance assessment not found");
      }
      
      console.log(`Successfully updated performance assessment with ID ${id}`);
      return updatedAssessment;
    } catch (error) {
      console.error(`Error updating performance assessment with ID ${id}:`, error);
      throw error;
    }
  }

  async deletePerformanceAssessment(id: number): Promise<void> {
    console.log(`Deleting performance assessment with ID ${id}`);
    try {
      await db.delete(performanceAssessments)
        .where(eq(performanceAssessments.id, id));
      console.log(`Successfully deleted performance assessment with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting performance assessment with ID ${id}:`, error);
      throw error;
    }
  }

  // Milestone Assessment Methods
  async createMilestoneAssessment(assessment: InsertMilestoneAssessment): Promise<MilestoneAssessment> {
    console.log(`Creating milestone assessment for performance assessment ${assessment.performanceAssessmentId}:`, JSON.stringify(assessment));
    try {
      const [newAssessment] = await db.insert(milestoneAssessments)
        .values(assessment)
        .returning();
      
      console.log(`Successfully created milestone assessment with ID ${newAssessment.id}`);
      return newAssessment;
    } catch (error) {
      console.error(`Error creating milestone assessment for performance assessment ${assessment.performanceAssessmentId}:`, error);
      throw error;
    }
  }

  async getMilestoneAssessmentsByPerformanceAssessment(performanceAssessmentId: number): Promise<MilestoneAssessment[]> {
    console.log(`Getting milestone assessments for performance assessment ${performanceAssessmentId}`);
    try {
      const assessments = await db.select()
        .from(milestoneAssessments)
        .where(eq(milestoneAssessments.performanceAssessmentId, performanceAssessmentId));
      
      console.log(`Found ${assessments.length} milestone assessments for performance assessment ${performanceAssessmentId}`);
      return assessments;
    } catch (error) {
      console.error(`Error getting milestone assessments for performance assessment ${performanceAssessmentId}:`, error);
      throw error;
    }
  }

  async updateMilestoneAssessment(id: number, assessment: InsertMilestoneAssessment): Promise<MilestoneAssessment> {
    console.log(`Updating milestone assessment with ID ${id}:`, JSON.stringify(assessment));
    try {
      const [updatedAssessment] = await db.update(milestoneAssessments)
        .set(assessment)
        .where(eq(milestoneAssessments.id, id))
        .returning();
      
      if (!updatedAssessment) {
        console.error(`Milestone assessment with ID ${id} not found`);
        throw new Error("Milestone assessment not found");
      }
      
      console.log(`Successfully updated milestone assessment with ID ${id}`);
      return updatedAssessment;
    } catch (error) {
      console.error(`Error updating milestone assessment with ID ${id}:`, error);
      throw error;
    }
  }

  async deleteMilestoneAssessment(id: number): Promise<void> {
    console.log(`Deleting milestone assessment with ID ${id}`);
    try {
      await db.delete(milestoneAssessments)
        .where(eq(milestoneAssessments.id, id));
      console.log(`Successfully deleted milestone assessment with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting milestone assessment with ID ${id}:`, error);
      throw error;
    }
  }

  // Strategy Methods
  async getAllStrategies(): Promise<Strategy[]> {
    console.log("Getting all strategies");
    try {
      const allStrategies = await db.select().from(strategies);
      console.log(`Found ${allStrategies.length} strategies`);
      return allStrategies;
    } catch (error) {
      console.error("Error getting all strategies:", error);
      throw error;
    }
  }

  async getStrategyById(id: number): Promise<Strategy | undefined> {
    console.log(`Getting strategy with ID ${id}`);
    try {
      const result = await db.select()
        .from(strategies)
        .where(eq(strategies.id, id));
      
      if (result.length === 0) {
        console.log(`Strategy with ID ${id} not found`);
        return undefined;
      }
      
      console.log(`Found strategy with ID ${id}`);
      return result[0];
    } catch (error) {
      console.error(`Error getting strategy with ID ${id}:`, error);
      throw error;
    }
  }

  async getStrategiesByCategory(category: string): Promise<Strategy[]> {
    console.log(`Getting strategies for category ${category}`);
    try {
      const categoryStrategies = await db.select()
        .from(strategies)
        .where(eq(strategies.category, category));
      
      console.log(`Found ${categoryStrategies.length} strategies for category ${category}`);
      return categoryStrategies;
    } catch (error) {
      console.error(`Error getting strategies for category ${category}:`, error);
      throw error;
    }
  }
  
  async createStrategy(strategy: InsertStrategy): Promise<Strategy> {
    console.log(`Creating strategy:`, JSON.stringify(strategy));
    try {
      const [newStrategy] = await db.insert(strategies)
        .values(strategy)
        .returning();
      
      console.log(`Successfully created strategy with ID ${newStrategy.id}`);
      return newStrategy;
    } catch (error) {
      console.error("Error creating strategy:", error);
      throw error;
    }
  }
  
  async updateStrategy(id: number, strategy: Partial<InsertStrategy>): Promise<Strategy> {
    console.log(`Updating strategy with ID ${id}:`, JSON.stringify(strategy));
    try {
      const [updatedStrategy] = await db.update(strategies)
        .set(strategy)
        .where(eq(strategies.id, id))
        .returning();
      
      if (!updatedStrategy) {
        console.error(`Strategy with ID ${id} not found`);
        throw new Error("Strategy not found");
      }
      
      console.log(`Successfully updated strategy with ID ${id}`);
      return updatedStrategy;
    } catch (error) {
      console.error(`Error updating strategy with ID ${id}:`, error);
      throw error;
    }
  }
  
  async deleteStrategy(id: number): Promise<void> {
    console.log(`Deleting strategy with ID ${id}`);
    try {
      await db.delete(strategies)
        .where(eq(strategies.id, id));
      console.log(`Successfully deleted strategy with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting strategy with ID ${id}:`, error);
      throw error;
    }
  }

  // Clinician methods
  async createClinician(clinician: InsertClinician): Promise<Clinician> {
    console.log(`Creating clinician:`, JSON.stringify(clinician));
    try {
      const [newClinician] = await db.insert(clinicians)
        .values(clinician)
        .returning();
      
      console.log(`Successfully created clinician with ID ${newClinician.id}`);
      return newClinician;
    } catch (error) {
      console.error("Error creating clinician:", error);
      throw error;
    }
  }

  async getClinician(id: number): Promise<Clinician | undefined> {
    console.log(`Getting clinician with ID ${id}`);
    try {
      const result = await db.select()
        .from(clinicians)
        .where(eq(clinicians.id, id));
      
      if (result.length === 0) {
        console.log(`Clinician with ID ${id} not found`);
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error(`Error fetching clinician with ID ${id}:`, error);
      throw error;
    }
  }

  async getAllClinicians(): Promise<Clinician[]> {
    console.log("Getting all clinicians");
    try {
      const allClinicians = await db.select()
        .from(clinicians)
        .where(eq(clinicians.active, true));
      
      console.log(`Found ${allClinicians.length} active clinicians`);
      return allClinicians;
    } catch (error) {
      console.error("Error fetching clinicians:", error);
      throw error;
    }
  }

  async updateClinician(id: number, clinician: Partial<InsertClinician>): Promise<Clinician> {
    console.log(`Updating clinician with ID ${id}:`, JSON.stringify(clinician));
    try {
      const [updatedClinician] = await db.update(clinicians)
        .set(clinician)
        .where(eq(clinicians.id, id))
        .returning();
      
      if (!updatedClinician) {
        console.error(`Clinician with ID ${id} not found`);
        throw new Error("Clinician not found");
      }
      
      console.log(`Successfully updated clinician with ID ${id}`);
      return updatedClinician;
    } catch (error) {
      console.error(`Error updating clinician with ID ${id}:`, error);
      throw error;
    }
  }

  async deleteClinician(id: number): Promise<void> {
    console.log(`Deleting clinician with ID ${id}`);
    try {
      // Soft delete by setting active to false
      await db.update(clinicians)
        .set({ active: false })
        .where(eq(clinicians.id, id));
        
      console.log(`Successfully deactivated clinician with ID ${id}`);
    } catch (error) {
      console.error(`Error deactivating clinician with ID ${id}:`, error);
      throw error;
    }
  }

  // Client-Clinician Assignment methods
  async assignClinicianToClient(clientId: number, assignment: InsertClientClinician): Promise<ClientClinician> {
    console.log(`Assigning clinician to client ${clientId}:`, JSON.stringify(assignment));
    try {
      const [newAssignment] = await db.insert(clientClinicians)
        .values({
          ...assignment,
          clientId
        })
        .returning();
      
      console.log(`Successfully assigned clinician to client with assignment ID ${newAssignment.id}`);
      return newAssignment;
    } catch (error) {
      console.error(`Error assigning clinician to client ${clientId}:`, error);
      throw error;
    }
  }

  async getCliniciansByClient(clientId: number): Promise<(ClientClinician & { clinician: Clinician })[]> {
    console.log(`Getting clinicians for client ${clientId}`);
    try {
      // Join client_clinicians with clinicians to get full clinician info
      const result = await db.select({
        assignment: clientClinicians,
        clinician: clinicians
      })
      .from(clientClinicians)
      .innerJoin(clinicians, eq(clientClinicians.clinicianId, clinicians.id))
      .where(eq(clientClinicians.clientId, clientId));
      
      // Transform the result to match the expected return type
      const formattedResult = result.map(item => ({
        ...item.assignment,
        clinician: item.clinician
      }));
      
      console.log(`Found ${formattedResult.length} clinicians assigned to client ${clientId}`);
      return formattedResult;
    } catch (error) {
      console.error(`Error fetching clinicians for client ${clientId}:`, error);
      throw error;
    }
  }

  async removeClinicianFromClient(assignmentId: number): Promise<void> {
    console.log(`Removing clinician assignment with ID ${assignmentId}`);
    try {
      await db.delete(clientClinicians)
        .where(eq(clientClinicians.id, assignmentId));
      
      console.log(`Successfully removed clinician assignment with ID ${assignmentId}`);
    } catch (error) {
      console.error(`Error removing clinician assignment with ID ${assignmentId}:`, error);
      throw error;
    }
  }

  // Dashboard Data Methods
  async getDashboardAppointmentStats(timeframe: 'day' | 'week' | 'month' | 'year'): Promise<AppointmentStats> {
    console.log(`Getting dashboard appointment stats with timeframe: ${timeframe}`);
    try {
      // Get session data from the database
      const allSessions = await db.select().from(sessions);
      console.log(`Found ${allSessions.length} sessions in database`);
      
      // Initialize stats with empty arrays
      const stats: AppointmentStats = {
        daily: [],
        weekly: [],
        monthly: [],
        yearly: []
      };
      
      if (allSessions.length === 0) {
        return stats;
      }
      
      // Group sessions by day, week, month, and year
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      // Filter to sessions within the last year
      const recentSessions = allSessions.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= oneYearAgo && sessionDate <= today;
      });
      
      // Process stats based on timeframe
      const dailyStats = this.processDailyStats(recentSessions);
      const weeklyStats = this.processWeeklyStats(recentSessions);
      const monthlyStats = this.processMonthlyStats(recentSessions);
      const yearlyStats = this.processYearlyStats(recentSessions);
      
      return {
        daily: dailyStats,
        weekly: weeklyStats,
        monthly: monthlyStats,
        yearly: yearlyStats
      };
    } catch (error) {
      console.error("Error getting dashboard appointment stats:", error);
      throw error;
    }
  }
  
  // Helper methods for processing appointment stats
  private processDailyStats(sessions: Session[]): Array<{ period: string, count: number, percentChange?: number }> {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }).reverse();
    
    const dailyCounts = last30Days.map(day => {
      const count = sessions.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate.toISOString().split('T')[0] === day;
      }).length;
      
      return { period: day, count, percentChange: undefined as number | undefined };
    });
    
    // Calculate percent changes
    for (let i = 1; i < dailyCounts.length; i++) {
      const prevCount = dailyCounts[i - 1].count;
      const currCount = dailyCounts[i].count;
      
      if (prevCount > 0) {
        dailyCounts[i].percentChange = ((currCount - prevCount) / prevCount) * 100;
      }
    }
    
    return dailyCounts;
  }
  
  private processWeeklyStats(sessions: Session[]): Array<{ period: string, count: number, percentChange?: number }> {
    // Group by week for the last 12 weeks
    const last12Weeks = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Sunday of week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Saturday of week
      
      return {
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`
      };
    }).reverse();
    
    const weeklyCounts = last12Weeks.map(week => {
      const count = sessions.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= week.start && sessionDate <= week.end;
      }).length;
      
      return { period: week.label, count, percentChange: undefined as number | undefined };
    });
    
    // Calculate percent changes
    for (let i = 1; i < weeklyCounts.length; i++) {
      const prevCount = weeklyCounts[i - 1].count;
      const currCount = weeklyCounts[i].count;
      
      if (prevCount > 0) {
        weeklyCounts[i].percentChange = ((currCount - prevCount) / prevCount) * 100;
      }
    }
    
    return weeklyCounts;
  }
  
  private processMonthlyStats(sessions: Session[]): Array<{ period: string, count: number, percentChange?: number }> {
    // Group by month for the last 12 months
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      const monthName = monthStart.toLocaleString('default', { month: 'long' });
      return {
        start: monthStart,
        end: monthEnd,
        label: `${monthName} ${year}`
      };
    }).reverse();
    
    const monthlyCounts = last12Months.map(month => {
      const count = sessions.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= month.start && sessionDate <= month.end;
      }).length;
      
      return { period: month.label, count, percentChange: undefined as number | undefined };
    });
    
    // Calculate percent changes
    for (let i = 1; i < monthlyCounts.length; i++) {
      const prevCount = monthlyCounts[i - 1].count;
      const currCount = monthlyCounts[i].count;
      
      if (prevCount > 0) {
        monthlyCounts[i].percentChange = ((currCount - prevCount) / prevCount) * 100;
      }
    }
    
    return monthlyCounts;
  }
  
  private processYearlyStats(sessions: Session[]): Array<{ period: string, count: number, percentChange?: number }> {
    // Group by year for the last 3 years
    const last3Years = Array.from({ length: 3 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      
      return {
        start: yearStart,
        end: yearEnd,
        label: `${year}`
      };
    }).reverse();
    
    const yearlyCounts = last3Years.map(year => {
      const count = sessions.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= year.start && sessionDate <= year.end;
      }).length;
      
      return { period: year.label, count, percentChange: undefined as number | undefined };
    });
    
    // Calculate percent changes
    for (let i = 1; i < yearlyCounts.length; i++) {
      const prevCount = yearlyCounts[i - 1].count;
      const currCount = yearlyCounts[i].count;
      
      if (prevCount > 0) {
        yearlyCounts[i].percentChange = ((currCount - prevCount) / prevCount) * 100;
      }
    }
    
    return yearlyCounts;
  }
  
  async getBudgetExpirationStats(months: number): Promise<BudgetExpirationStats> {
    console.log(`Getting budget expiration stats for the next ${months} months`);
    try {
      // Get all budget settings and join with clients
      const allBudgetSettings = await db.select().from(budgetSettings);
      const allClients = await db.select().from(clients);
      
      // Get all budget items for calculating used funds
      const allBudgetItems = await db.select().from(budgetItems);
      
      // Identify which plans expire next month
      const today = new Date();
      const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      
      // Find plans expiring next month
      const expiringPlans = allBudgetSettings.filter(plan => {
        if (!plan.endOfPlan) return false;
        
        const endDate = new Date(plan.endOfPlan);
        return endDate >= nextMonthStart && endDate <= nextMonthEnd;
      });
      
      // Format client info for expiring plans
      const expiringClientsInfo = expiringPlans.map(plan => {
        const client = allClients.find(c => c.id === plan.clientId);
        return {
          clientId: plan.clientId,
          clientName: client ? client.name : `Client ${plan.clientId}`,
          planId: plan.id,
          planName: plan.planCode || `Plan ${plan.id}`
        };
      });
      
      // Calculate remaining funds by month for the requested number of months
      const monthlyData = Array.from({ length: months }, (_, i) => {
        const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        
        // Format for display: MMM YYYY
        const monthLabel = month.toISOString().split('T')[0].substring(0, 7);
        
        // Find plans active during this month
        const activePlans = allBudgetSettings.filter(plan => {
          if (!plan.endOfPlan) return true; // Plans with no end date are considered active
          
          const endDate = new Date(plan.endOfPlan);
          return endDate >= month;
        });
        
        // Calculate total funds and remaining funds
        let totalRemainingAmount = 0;
        
        activePlans.forEach(plan => {
          // Calculate used funds for this plan
          const planItems = allBudgetItems.filter(item => 
            item.budgetSettingsId === plan.id
          );
          
          const usedFunds = planItems.reduce((sum, item) => 
            sum + (Number(item.unitPrice) * Number(item.quantity)), 0);
          
          // Add remaining funds to total
          const planRemainingFunds = Number(plan.ndisFunds) - usedFunds;
          if (planRemainingFunds > 0) {
            totalRemainingAmount += planRemainingFunds;
          }
        });
        
        return {
          month: monthLabel,
          amount: totalRemainingAmount,
          planCount: activePlans.length
        };
      });
      
      return {
        expiringNextMonth: {
          count: expiringPlans.length,
          byClient: expiringClientsInfo
        },
        remainingFunds: monthlyData
      };
    } catch (error) {
      console.error("Error getting budget expiration stats:", error);
      throw error;
    }
  }
  
  async getUpcomingTaskStats(months: number): Promise<UpcomingTaskStats> {
    console.log(`Getting upcoming task stats for the next ${months} months`);
    try {
      // Get all sessions to calculate future tasks
      const allSessions = await db.select().from(sessions);
      
      // Generate data for the next X months
      const today = new Date();
      const monthlyData = Array.from({ length: months }, (_, i) => {
        const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        
        // Format for display: YYYY-MM
        const monthLabel = month.toISOString().split('T')[0].substring(0, 7);
        
        // Calculate upcoming sessions for different task types
        const monthSessions = allSessions.filter(session => {
          const sessionDate = new Date(session.sessionDate);
          return sessionDate >= month && sessionDate <= monthEnd;
        });
        
        // Categorize sessions based on title/description
        // This is a simplification - in a real system, you'd have actual task types
        const reports = monthSessions.filter(s => 
          s.title.toLowerCase().includes('report') || 
          (s.description && s.description.toLowerCase().includes('report'))
        ).length;
        
        const letters = monthSessions.filter(s => 
          s.title.toLowerCase().includes('letter') || 
          (s.description && s.description.toLowerCase().includes('letter'))
        ).length;
        
        const assessments = monthSessions.filter(s => 
          s.title.toLowerCase().includes('assessment') || 
          (s.description && s.description.toLowerCase().includes('assessment'))
        ).length;
        
        // Count other sessions (those not in above categories)
        const categorizedCount = reports + letters + assessments;
        const other = Math.max(0, monthSessions.length - categorizedCount);
        
        return {
          month: monthLabel,
          reports,
          letters,
          assessments,
          other
        };
      });
      
      return {
        byMonth: monthlyData
      };
    } catch (error) {
      console.error("Error getting upcoming task stats:", error);
      throw error;
    }
  }
  
  /**
   * Get performance data for goals
   * Returns a map of goalId -> average score (or null if no data)
   */
  async getGoalPerformanceData(clientId: number, goalId?: number): Promise<Record<number, number | null>> {
    console.log(`Getting goal performance data for client ${clientId}${goalId ? ` and goal ${goalId}` : ''}`);
    
    try {
      const result: Record<number, number | null> = {};
      
      // If a specific goal is requested
      if (goalId) {
        // First, get all subgoals for this goal
        const goalSubgoals = await this.getSubgoalsByGoal(goalId);
        
        if (goalSubgoals.length === 0) {
          console.log(`No subgoals found for goal ${goalId}, returning null score`);
          result[goalId] = null;
          return result;
        }
        
        // Get subgoal IDs
        const subgoalIds = goalSubgoals.map(sg => sg.id);
        
        // Query performance assessments for these subgoals - use multiple OR conditions instead of IN
        let query = db
          .select({
            subgoalId: performanceAssessments.subgoalId,
            score: performanceAssessments.score
          })
          .from(performanceAssessments);
        
        // If we have subgoals, add WHERE conditions one by one
        if (subgoalIds.length > 0) {
          const orConditions = subgoalIds.map(id => eq(performanceAssessments.subgoalId, id));
          
          // Handle first condition
          let whereCondition = orConditions[0];
          
          // Add OR for remaining conditions
          for (let i = 1; i < orConditions.length; i++) {
            whereCondition = or(whereCondition, orConditions[i]);
          }
          
          query = query.where(whereCondition);
        }
        
        const performanceData = await query;
        
        if (performanceData.length === 0) {
          console.log(`No performance data found for goal ${goalId}, returning null score`);
          result[goalId] = null;
          return result;
        }
        
        // Calculate average score
        const totalScore = performanceData.reduce((sum, item) => sum + Number(item.score || 0), 0);
        const avgScore = totalScore / performanceData.length;
        
        // Convert to percentage (assuming scores are out of 10)
        const percentage = Math.round((avgScore / 10) * 100);
        
        console.log(`Calculated average score for goal ${goalId}: ${avgScore} (${percentage}%)`);
        result[goalId] = percentage;
      } else {
        // Get all goals for this client
        const clientGoals = await this.getGoalsByClient(clientId);
        
        if (clientGoals.length === 0) {
          console.log(`No goals found for client ${clientId}`);
          return result;
        }
        
        // Process each goal
        for (const goal of clientGoals) {
          // Get subgoals for this goal
          const goalSubgoals = await this.getSubgoalsByGoal(goal.id);
          
          if (goalSubgoals.length === 0) {
            console.log(`No subgoals found for goal ${goal.id}, setting null score`);
            result[goal.id] = null;
            continue;
          }
          
          // Get subgoal IDs
          const subgoalIds = goalSubgoals.map(sg => sg.id);
          
          // Query performance assessments for these subgoals - use multiple OR conditions
          let query = db
            .select({
              subgoalId: performanceAssessments.subgoalId,
              score: performanceAssessments.score
            })
            .from(performanceAssessments);
          
          // If we have subgoals, add WHERE conditions
          if (subgoalIds.length > 0) {
            const conditions = subgoalIds.map(id => eq(performanceAssessments.subgoalId, id));
            query = query.where(or(...conditions));
          }
          
          const performanceData = await query;
          
          if (performanceData.length === 0) {
            console.log(`No performance data found for goal ${goal.id}, setting null score`);
            result[goal.id] = null;
            continue;
          }
          
          // Calculate average score
          const totalScore = performanceData.reduce((sum, item) => sum + Number(item.score || 0), 0);
          const avgScore = totalScore / performanceData.length;
          
          // Convert to percentage (assuming scores are out of 10)
          const percentage = Math.round((avgScore / 10) * 100);
          
          console.log(`Calculated average score for goal ${goal.id}: ${avgScore} (${percentage}%)`);
          result[goal.id] = percentage;
        }
      }
      
      console.log(`Returning performance data for ${Object.keys(result).length} goals`);
      return result;
    } catch (error) {
      console.error(`Error fetching goal performance data:`, error);
      throw error;
    }
  }
}

export const storage = new DBStorage();