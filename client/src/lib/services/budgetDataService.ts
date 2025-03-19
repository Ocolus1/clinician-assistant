import { apiRequest } from '@/lib/queryClient';
import { BudgetItem, BudgetSettings, Session } from '@shared/schema';
import { BudgetAnalysis, EnhancedBudgetItem } from '@/lib/agent/types';
import { formatCurrency } from '@/lib/utils';

/**
 * Service for fetching and analyzing budget data
 */
export const budgetDataService = {
  /**
   * Get comprehensive budget analysis for a client
   */
  async getBudgetAnalysis(clientId: number): Promise<BudgetAnalysis> {
    try {
      // Fetch budget settings, budget items, and sessions
      const budgetSettings = await this.fetchBudgetSettings(clientId);
      const budgetItems = await this.fetchBudgetItems(clientId);
      const sessions = await this.fetchSessions(clientId);
      
      // Calculate key metrics
      const totalBudget = budgetSettings?.ndisFunds || 0;
      const totalAllocated = this.calculateAllocatedAmount(budgetItems);
      const totalSpent = this.calculateSpentAmount(sessions, budgetItems);
      const remaining = totalBudget - totalSpent;
      const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      
      // Calculate spending by category
      const spendingByCategory = this.calculateSpendingByCategory(sessions, budgetItems);
      
      // Enhance budget items with additional data for visualization
      const enhancedBudgetItems: EnhancedBudgetItem[] = budgetItems.map(item => {
        const amount = item.quantity * item.unitPrice;
        // Calculate a simulated spent amount based on the utilization rate
        // In a production environment, this would use actual usage data
        const totalSpent = Math.min(amount * (utilizationRate / 100), amount);
        const percentUsed = amount > 0 ? (totalSpent / amount) * 100 : 0;
        
        return {
          ...item,
          amount,
          totalSpent,
          percentUsed
        };
      });
      
      // Forecast depletion date
      const forecastedDepletion = this.forecastDepletion(totalBudget, totalSpent, sessions);
      
      return {
        totalBudget,
        totalAllocated,
        totalSpent,
        remaining,
        utilizationRate,
        forecastedDepletion,
        budgetItems: enhancedBudgetItems,
        spendingByCategory
      };
    } catch (error) {
      console.error('Error in getBudgetAnalysis:', error);
      throw error;
    }
  },

  /**
   * Fetch budget settings for a client
   */
  async fetchBudgetSettings(clientId: number): Promise<BudgetSettings | null> {
    try {
      const response = await apiRequest('GET', `/api/budget-settings/client/${clientId}`);
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
      const response = await apiRequest('GET', `/api/budget-items/client/${clientId}`);
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
      const response = await apiRequest('GET', `/api/sessions/client/${clientId}`);
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
      return total + (item.quantity * item.unitPrice);
    }, 0);
  },

  /**
   * Calculate amount spent based on sessions and associated products
   * In a real application, this would parse actual session products/charges
   */
  calculateSpentAmount(sessions: Session[], budgetItems: BudgetItem[]): number {
    // Calculate total possible budget
    const totalBudget = this.calculateAllocatedAmount(budgetItems);
    
    // If no sessions, return 0 spent
    if (sessions.length === 0) return 0;
    
    // Calculate spent amount based on session attendance
    // This is a simplified calculation - in production, would use actual product usage data
    const completedSessions = sessions.filter(session => 
      session.status === 'completed' || session.status === 'billed'
    );
    
    // Extract products from session notes if available
    // For demo, we'll use a simpler calculation based on completed sessions
    return totalBudget * (completedSessions.length / Math.max(sessions.length, 1)) * 0.7;
  },

  /**
   * Group spending by budget item category
   */
  calculateSpendingByCategory(sessions: Session[], budgetItems: BudgetItem[]): Record<string, number> {
    // Create a map of categories to total allocated amounts
    const categoryAllocations: Record<string, number> = {};
    
    // Calculate allocated amount per category
    budgetItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      const amount = item.quantity * item.unitPrice;
      
      if (!categoryAllocations[category]) {
        categoryAllocations[category] = 0;
      }
      
      categoryAllocations[category] += amount;
    });
    
    // Calculate total allocated
    const totalAllocated = Object.values(categoryAllocations).reduce((sum, amount) => sum + amount, 0);
    
    // Calculate total spent
    const totalSpent = this.calculateSpentAmount(sessions, budgetItems);
    
    // Calculate spending by category based on allocated proportions
    const result: Record<string, number> = {};
    
    if (totalAllocated > 0) {
      Object.entries(categoryAllocations).forEach(([category, amount]) => {
        // Calculate spent amount proportionally
        const proportion = amount / totalAllocated;
        result[category] = totalSpent * proportion;
      });
    }
    
    return result;
  },

  /**
   * Forecast budget depletion date based on current spending rate
   */
  forecastDepletion(totalBudget: number, totalSpent: number, sessions: Session[]): Date {
    // If no spending or no budget, return a default date (1 year from now)
    if (totalSpent === 0 || totalBudget === 0) {
      const defaultDate = new Date();
      defaultDate.setFullYear(defaultDate.getFullYear() + 1);
      return defaultDate;
    }
    
    // Get completed sessions and their dates
    const completedSessions = sessions.filter(session => 
      session.status === 'completed' || session.status === 'billed'
    );
    
    // If no completed sessions, return a default date
    if (completedSessions.length === 0) {
      const defaultDate = new Date();
      defaultDate.setFullYear(defaultDate.getFullYear() + 1);
      return defaultDate;
    }
    
    // Sort sessions by date
    completedSessions.sort((a, b) => {
      return new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime();
    });
    
    // Calculate average spend per day
    const firstSessionDate = new Date(completedSessions[0].sessionDate);
    const lastSessionDate = new Date(completedSessions[completedSessions.length - 1].sessionDate);
    
    // Calculate days between first and last session
    const daysBetween = Math.max(
      1, 
      (lastSessionDate.getTime() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate daily spend rate
    const dailySpendRate = totalSpent / daysBetween;
    
    // Calculate days until depletion
    const remainingBudget = totalBudget - totalSpent;
    const daysUntilDepletion = dailySpendRate > 0 ? remainingBudget / dailySpendRate : 365;
    
    // Calculate depletion date
    const depletionDate = new Date();
    depletionDate.setDate(depletionDate.getDate() + daysUntilDepletion);
    
    return depletionDate;
  }
};