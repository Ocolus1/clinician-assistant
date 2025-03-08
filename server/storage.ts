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
  Strategy,
  clients, allies, goals, subgoals, budgetItems, budgetSettings, budgetItemCatalog, sessions,
  sessionNotes, performanceAssessments, milestoneAssessments, strategies
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
  
  // Strategies
  getAllStrategies(): Promise<Strategy[]>;
  getStrategyById(id: number): Promise<Strategy | undefined>;
  getStrategiesByCategory(category: string): Promise<Strategy[]>;
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
        availableFunds: client.availableFunds !== undefined ? Number(client.availableFunds) : undefined,
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
}

export const storage = new DBStorage();