import { BudgetSettings, BudgetItem, Session } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { BudgetAnalysis } from '../agent/types';

/**
 * Service for fetching and analyzing budget data
 */
export const budgetDataService = {
  /**
   * Get comprehensive budget analysis for a client
   */
  async getBudgetAnalysis(clientId: number): Promise<BudgetAnalysis> {
    try {
      // Fetch budget settings for the client
      const budgetSettings = await this.fetchBudgetSettings(clientId);
      
      // Fetch budget items for the client
      const budgetItems = await this.fetchBudgetItems(clientId);
      
      // Fetch sessions to calculate spending
      const sessions = await this.fetchSessions(clientId);
      
      // Calculate total budget amount
      const totalBudget = budgetSettings?.ndisFunds || 0;
      
      // Calculate allocated amount
      const totalAllocated = this.calculateAllocatedAmount(budgetItems);
      
      // Calculate spent amount
      const totalSpent = this.calculateSpentAmount(sessions, budgetItems);
      
      // Calculate remaining amount
      const remaining = totalBudget - totalSpent;
      
      // Calculate utilization rate
      const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      
      // Calculate spending by category
      const spendingByCategory = this.calculateSpendingByCategory(sessions, budgetItems);
      
      // Calculate forecasted depletion date
      const forecastedDepletion = this.forecastDepletion(totalBudget, totalSpent, sessions);
      
      return {
        totalBudget,
        totalAllocated,
        totalSpent,
        remaining,
        utilizationRate,
        forecastedDepletion,
        budgetItems,
        spendingByCategory
      };
    } catch (error) {
      console.error("Error fetching budget analysis:", error);
      throw error;
    }
  },
  
  /**
   * Fetch budget settings for a client
   */
  async fetchBudgetSettings(clientId: number): Promise<BudgetSettings | null> {
    try {
      const response = await apiRequest('GET', `/api/clients/${clientId}/budget-settings`);
      return response as BudgetSettings;
    } catch (error) {
      console.error("Error fetching budget settings:", error);
      return null;
    }
  },
  
  /**
   * Fetch budget items for a client
   */
  async fetchBudgetItems(clientId: number): Promise<BudgetItem[]> {
    try {
      const response = await apiRequest('GET', `/api/clients/${clientId}/budget-items`);
      return response as BudgetItem[];
    } catch (error) {
      console.error("Error fetching budget items:", error);
      return [];
    }
  },
  
  /**
   * Fetch sessions for a client
   */
  async fetchSessions(clientId: number): Promise<Session[]> {
    try {
      const response = await apiRequest('GET', `/api/clients/${clientId}/sessions`);
      return response as Session[];
    } catch (error) {
      console.error("Error fetching sessions:", error);
      return [];
    }
  },
  
  /**
   * Calculate total allocated amount from budget items
   */
  calculateAllocatedAmount(budgetItems: BudgetItem[]): number {
    return budgetItems.reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  },
  
  /**
   * Calculate amount spent based on sessions and associated products
   */
  calculateSpentAmount(sessions: Session[], budgetItems: BudgetItem[]): number {
    // In a real implementation, this would analyze session products and costs
    // For now, we'll use a simple approximation based on completed sessions
    
    // Get budget items with their unit prices
    const itemPrices: Record<number, number> = {};
    budgetItems.forEach(item => {
      itemPrices[item.id] = item.unitPrice;
    });
    
    // Calculate total spent
    return sessions.reduce((total, session) => {
      // In a real implementation, we would sum the cost of products used in each session
      // For now, use a flat rate per session
      const sessionCost = 150; // Default cost per session
      
      // Only include completed sessions in the calculation
      if (session.status === 'completed') {
        return total + sessionCost;
      }
      
      return total;
    }, 0);
  },
  
  /**
   * Group spending by budget item category
   */
  calculateSpendingByCategory(sessions: Session[], budgetItems: BudgetItem[]): Record<string, number> {
    // Group budget items by category
    const categories = budgetItems.reduce((acc, item) => {
      const category = item.category || 'Other';
      
      if (!acc[category]) {
        acc[category] = 0;
      }
      
      // In a real implementation, we would calculate actual spending per category
      // For now, allocate spending proportionally based on item amounts
      acc[category] += item.unitPrice * item.quantity;
      
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate total of all categories
    const total = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
    
    // Calculate total spent
    const totalSpent = this.calculateSpentAmount(sessions, budgetItems);
    
    // Allocate spent amount proportionally to each category
    if (total > 0) {
      for (const category in categories) {
        const proportion = categories[category] / total;
        categories[category] = totalSpent * proportion;
      }
    }
    
    return categories;
  },
  
  /**
   * Forecast budget depletion date based on current spending rate
   */
  forecastDepletion(totalBudget: number, totalSpent: number, sessions: Session[]): Date {
    // Calculate remaining budget
    const remaining = totalBudget - totalSpent;
    
    if (remaining <= 0) {
      // Budget already depleted
      return new Date();
    }
    
    // Calculate spending rate per day
    // Get completed sessions
    const completedSessions = sessions.filter(session => session.status === 'completed');
    
    if (completedSessions.length === 0) {
      // No completed sessions, can't calculate rate
      // Return a date 12 months from now
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      return futureDate;
    }
    
    // Get the earliest and latest session dates
    const sessionDates = completedSessions.map(session => new Date(session.date).getTime());
    const earliestDate = new Date(Math.min(...sessionDates));
    const latestDate = new Date(Math.max(...sessionDates));
    
    // Calculate days elapsed
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysElapsed = Math.max(
      1, // Avoid division by zero
      Math.round((latestDate.getTime() - earliestDate.getTime()) / msPerDay)
    );
    
    // Calculate daily spending rate
    const dailySpendingRate = totalSpent / daysElapsed;
    
    if (dailySpendingRate <= 0) {
      // No spending rate, can't forecast
      // Return a date 12 months from now
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      return futureDate;
    }
    
    // Calculate days until depletion
    const daysUntilDepletion = Math.round(remaining / dailySpendingRate);
    
    // Calculate depletion date
    const today = new Date();
    const depletionDate = new Date(today.getTime() + (daysUntilDepletion * msPerDay));
    
    return depletionDate;
  }
}