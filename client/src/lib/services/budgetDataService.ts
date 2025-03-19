import { BudgetAnalysis } from '@/lib/agent/types';
import { BudgetItem, BudgetSettings, Session } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

/**
 * Service for fetching and analyzing budget data
 */
export const budgetDataService = {
  /**
   * Get comprehensive budget analysis for a client
   */
  async getBudgetAnalysis(clientId: number): Promise<BudgetAnalysis> {
    try {
      // Fetch budget data
      const budgetSettings = await this.fetchBudgetSettings(clientId);
      const budgetItems = await this.fetchBudgetItems(clientId);
      const sessions = await this.fetchSessions(clientId);
      
      // Calculate total budget
      const totalBudget = budgetSettings?.ndisFunds || 0;
      
      // Calculate allocated amount
      const totalAllocated = this.calculateAllocatedAmount(budgetItems);
      
      // Calculate spent amount
      const totalSpent = this.calculateSpentAmount(sessions, budgetItems);
      
      // Calculate remaining amount
      const remaining = totalBudget - totalSpent;
      
      // Calculate utilization rate
      const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      
      // Get spending by category
      const spendingByCategory = this.calculateSpendingByCategory(sessions, budgetItems);
      
      // Forecast depletion date
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
      console.error('Error analyzing budget data:', error);
      throw new Error('Failed to analyze budget data');
    }
  },
  
  /**
   * Fetch budget settings for a client
   */
  async fetchBudgetSettings(clientId: number): Promise<BudgetSettings | null> {
    try {
      const response = await apiRequest('GET', `/api/clients/${clientId}/budget-settings`);
      return response as unknown as BudgetSettings;
    } catch (error) {
      console.error('Error fetching budget settings:', error);
      return null;
    }
  },
  
  /**
   * Fetch budget items for a client
   */
  async fetchBudgetItems(clientId: number): Promise<BudgetItem[]> {
    try {
      const response = await apiRequest('GET', `/api/clients/${clientId}/budget-items`);
      return response as unknown as BudgetItem[];
    } catch (error) {
      console.error('Error fetching budget items:', error);
      return [];
    }
  },
  
  /**
   * Fetch sessions for a client
   */
  async fetchSessions(clientId: number): Promise<Session[]> {
    try {
      const response = await apiRequest('GET', `/api/clients/${clientId}/sessions`);
      return response as unknown as Session[];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  },
  
  /**
   * Calculate total allocated amount from budget items
   */
  calculateAllocatedAmount(budgetItems: BudgetItem[]): number {
    return budgetItems.reduce((total, item) => {
      const totalItemAmount = (item.quantity || 0) * (item.unitPrice || 0);
      return total + totalItemAmount;
    }, 0);
  },
  
  /**
   * Calculate amount spent based on sessions and associated products
   */
  calculateSpentAmount(sessions: Session[], budgetItems: BudgetItem[]): number {
    // In a real implementation, this would calculate actual spending
    // from session products and quantities
    
    // For now, use a simple heuristic based on completed sessions
    const completedSessions = sessions.filter(session => 
      session.status === 'completed' || session.status === 'billed'
    );
    
    // Let's assume each completed session uses one unit of a service
    const averageServiceCost = budgetItems.length > 0 
      ? budgetItems.reduce((sum, item) => sum + (item.unitPrice || 0), 0) / budgetItems.length
      : 100; // Default value if no budget items
    
    return completedSessions.length * averageServiceCost;
  },
  
  /**
   * Group spending by budget item category
   */
  calculateSpendingByCategory(sessions: Session[], budgetItems: BudgetItem[]): Record<string, number> {
    const categorySpending: Record<string, number> = {};
    
    // Group budget items by category
    const itemsByCategory = budgetItems.reduce((acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, BudgetItem[]>);
    
    // For this mock implementation, distribute spending across categories
    // based on the number of items in each category
    const totalSpent = this.calculateSpentAmount(sessions, budgetItems);
    
    Object.entries(itemsByCategory).forEach(([category, items]) => {
      const categoryRatio = items.length / budgetItems.length;
      categorySpending[category] = totalSpent * categoryRatio;
    });
    
    return categorySpending;
  },
  
  /**
   * Forecast budget depletion date based on current spending rate
   */
  forecastDepletion(totalBudget: number, totalSpent: number, sessions: Session[]): Date {
    // Calculate spending rate ($ per day)
    const completedSessions = sessions.filter(session => 
      session.status === 'completed' || session.status === 'billed'
    );
    
    if (completedSessions.length < 2) {
      // Not enough data for accurate forecast, return a date 6 months from now
      const result = new Date();
      result.setMonth(result.getMonth() + 6);
      return result;
    }
    
    // Find date range
    const sessionDates = completedSessions.map(s => new Date(s.sessionDate).getTime());
    const oldestDate = new Date(Math.min(...sessionDates));
    const newestDate = new Date(Math.max(...sessionDates));
    
    // Calculate days between first and last session
    const daysDiff = Math.max(1, (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate spending rate
    const spendingRate = totalSpent / daysDiff;
    
    // Calculate days until depletion
    const remainingAmount = totalBudget - totalSpent;
    const daysUntilDepletion = remainingAmount / spendingRate;
    
    // Calculate depletion date
    const today = new Date();
    const depletionDate = new Date(today);
    depletionDate.setDate(today.getDate() + Math.max(30, daysUntilDepletion)); // Minimum 30 days
    
    return depletionDate;
  }
};