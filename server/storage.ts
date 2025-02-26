import { 
  Client, InsertClient,
  Ally, InsertAlly,
  Goal, InsertGoal,
  Subgoal, InsertSubgoal,
  BudgetItem, InsertBudgetItem
} from "@shared/schema";

export interface IStorage {
  // Clients
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: number): Promise<Client | undefined>;

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

  // Budget Items
  createBudgetItem(clientId: number, item: InsertBudgetItem): Promise<BudgetItem>;
  getBudgetItemsByClient(clientId: number): Promise<BudgetItem[]>;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private allies: Map<number, Ally>;
  private goals: Map<number, Goal>;
  private subgoals: Map<number, Subgoal>;
  private budgetItems: Map<number, BudgetItem>;
  private currentId: number;

  constructor() {
    this.clients = new Map();
    this.allies = new Map();
    this.goals = new Map();
    this.subgoals = new Map();
    this.budgetItems = new Map();
    this.currentId = 1;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.currentId++;
    const newClient = { ...client, id };
    this.clients.set(id, newClient);
    return newClient;
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createAlly(clientId: number, ally: InsertAlly): Promise<Ally> {
    const id = this.currentId++;
    const newAlly = { ...ally, id, clientId };
    this.allies.set(id, newAlly);
    return newAlly;
  }

  async getAlliesByClient(clientId: number): Promise<Ally[]> {
    return Array.from(this.allies.values()).filter(ally => ally.clientId === clientId);
  }

  async deleteAlly(id: number): Promise<void> {
    this.allies.delete(id);
  }

  async updateGoal(id: number, goal: InsertGoal): Promise<Goal> {
    const existingGoal = this.goals.get(id);
    if (!existingGoal) {
      throw new Error("Goal not found");
    }
    const updatedGoal = { ...existingGoal, ...goal };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }

  async updateAlly(id: number, ally: InsertAlly): Promise<Ally> {
    const existingAlly = this.allies.get(id);
    if (!existingAlly) {
      throw new Error("Ally not found");
    }
    const updatedAlly = { ...existingAlly, ...ally };
    this.allies.set(id, updatedAlly);
    return updatedAlly;
  }

  async createGoal(clientId: number, goal: InsertGoal): Promise<Goal> {
    const id = this.currentId++;
    const newGoal = { ...goal, id, clientId };
    this.goals.set(id, newGoal);
    return newGoal;
  }

  async getGoalsByClient(clientId: number): Promise<Goal[]> {
    return Array.from(this.goals.values()).filter(goal => goal.clientId === clientId);
  }

  async createSubgoal(goalId: number, subgoal: InsertSubgoal): Promise<Subgoal> {
    const id = this.currentId++;
    const newSubgoal = { ...subgoal, id, goalId };
    this.subgoals.set(id, newSubgoal);
    return newSubgoal;
  }

  async getSubgoalsByGoal(goalId: number): Promise<Subgoal[]> {
    return Array.from(this.subgoals.values()).filter(subgoal => subgoal.goalId === goalId);
  }

  async createBudgetItem(clientId: number, item: InsertBudgetItem): Promise<BudgetItem> {
    try {
      console.log("Creating budget item with data:", JSON.stringify(item));

      // Ensure unitPrice is a number
      const processedItem = {
        ...item,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity)
      };

      const id = this.currentId++;
      const newItem = { ...processedItem, id, clientId };

      console.log("Final budget item to store:", JSON.stringify(newItem));

      this.budgetItems.set(id, newItem);
      return newItem;
    } catch (error) {
      console.error("Error in createBudgetItem:", error);
      throw error;
    }
  }

  async getBudgetItemsByClient(clientId: number): Promise<BudgetItem[]> {
    return Array.from(this.budgetItems.values()).filter(item => item.clientId === clientId);
  }

  async deleteBudgetItem(id: number): Promise<void> {
    this.budgetItems.delete(id);
  }

  async deleteSubgoal(id: number): Promise<void> {
    this.subgoals.delete(id);
  }

  async deleteGoal(id: number): Promise<void> {
    // Delete associated subgoals first
    const subgoalsToDelete = Array.from(this.subgoals.values())
      .filter(subgoal => subgoal.goalId === id);

    for (const subgoal of subgoalsToDelete) {
      this.subgoals.delete(subgoal.id);
    }

    // Then delete the goal
    this.goals.delete(id);
  }

  async updateSubgoal(id: number, data: any): Promise<Subgoal> {
    const existingSubgoal = this.subgoals.get(id);
    if (!existingSubgoal) {
      throw new Error("Subgoal not found");
    }
    const updatedSubgoal = { ...existingSubgoal, ...data };
    this.subgoals.set(id, updatedSubgoal);
    return updatedSubgoal;
  }
}

export const storage = new MemStorage();