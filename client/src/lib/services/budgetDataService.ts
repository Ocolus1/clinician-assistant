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
      // Get budget settings
      const budgetSettings = await apiRequest('GET', `/api/budget-settings/active/${clientId}`);
      
      // Get budget items
      const budgetItems = await apiRequest('GET', `/api/budget-items/client/${clientId}`);
      
      // Get sessions to calculate spending
      const sessions = await apiRequest('GET', `/api/sessions/client/${clientId}`);
      
      // Calculate metrics
      const totalBudget = budgetSettings?.ndisFunds || 0;
      const totalAllocated = this.calculateAllocatedAmount(budgetItems || []);
      const totalSpent = this.calculateSpentAmount(sessions || [], budgetItems || []);
      const remaining = totalBudget - totalSpent;
      
      // Group spending by category
      const spendingByCategory = this.calculateSpendingByCategory(sessions || [], budgetItems || []);
      
      return {
        totalBudget,
        totalAllocated,
        totalSpent,
        remaining,
        utilizationRate: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        forecastedDepletion: this.forecastDepletion(totalBudget, totalSpent, sessions || []),
        budgetItems: budgetItems || [],
        spendingByCategory,
      };
    } catch (error) {
      console.error('Error fetching budget analysis:', error);
      throw error;
    }
  },
  
  /**
   * Calculate total allocated amount from budget items
   */
  calculateAllocatedAmount(budgetItems: BudgetItem[]): number {
    return budgetItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  },
  
  /**
   * Calculate amount spent based on sessions and associated products
   */
  calculateSpentAmount(sessions: Session[], budgetItems: BudgetItem[]): number {
    // In a real implementation, this would calculate based on session products
    // For now, we'll use a simplified approach
    
    // Get total number of sessions
    const sessionCount = sessions.length;
    
    // If we have no sessions or budget items, return 0
    if (sessionCount === 0 || budgetItems.length === 0) return 0;
    
    // Get average cost per session
    // In a real implementation, we would use the actual products used in sessions
    const averageCostPerSession = budgetItems.reduce((total, item) => {
      // Items are usually consumed across multiple sessions
      // This is a simplification - real logic would be based on actual usage
      return total + (item.unitPrice / 10); // Assume 10 sessions per item
    }, 0);
    
    return averageCostPerSession * sessionCount;
  },
  
  /**
   * Group spending by budget item category
   */
  calculateSpendingByCategory(sessions: Session[], budgetItems: BudgetItem[]): Record<string, number> {
    // Simplified implementation
    const categories: Record<string, number> = {};
    
    // Group budget items by category
    budgetItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = 0;
      }
      
      // Simplified: assume spending is proportional to allocation
      // In a real implementation, this would be based on actual usage
      categories[category] += (item.unitPrice * item.quantity) * 0.4; // Assume 40% utilization
    });
    
    return categories;
  },
  
  /**
   * Forecast budget depletion date based on current spending rate
   */
  forecastDepletion(totalBudget: number, totalSpent: number, sessions: Session[]): Date {
    // If no sessions or no budget, return 1 year from now
    if (sessions.length === 0 || totalBudget === 0) {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      return oneYearFromNow;
    }
    
    // Calculate daily spending rate
    const firstSessionDate = new Date(Math.min(...sessions.map(s => new Date(s.date).getTime())));
    const today = new Date();
    
    // Number of days since first session
    const daysSinceFirstSession = Math.max(1, Math.floor((today.getTime() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Daily spending rate
    const dailySpendingRate = totalSpent / daysSinceFirstSession;
    
    // Calculate days until depletion
    const remainingBudget = totalBudget - totalSpent;
    const daysUntilDepletion = dailySpendingRate > 0 ? Math.floor(remainingBudget / dailySpendingRate) : 365;
    
    // Calculate depletion date
    const depletionDate = new Date(today);
    depletionDate.setDate(depletionDate.getDate() + daysUntilDepletion);
    
    return depletionDate;
  }
};