import { apiRequest } from '@/lib/queryClient';
import { BudgetItem, BudgetSettings, Session } from '@shared/schema';
import { BudgetAnalysis, EnhancedBudgetItem } from '@/lib/agent/types';
import { formatCurrency } from '@/lib/utils';

/**
 * Service for fetching and analyzing budget data
 */
export const budgetDataService = {
  /**
   * Get comprehensive budget analysis for a patient
   */
  async getBudgetAnalysis(patientId: number): Promise<BudgetAnalysis> {
    try {
      // Fetch budget settings, budget items, and sessions
      const budgetSettings = await this.fetchBudgetSettings(patientId);
      const budgetItems = await this.fetchBudgetItems(patientId);
      const sessions = await this.fetchSessions(patientId);
      
      // Calculate key metrics
      const totalBudget = budgetSettings?.ndisFunds || 0;
      const totalAllocated = this.calculateAllocatedAmount(budgetItems);
      const totalSpent = this.calculateSpentAmount(sessions, budgetItems);
      const remaining = totalBudget - totalSpent;
      const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      
      // Calculate spending by category
      const spendingByCategory = this.calculateSpendingByCategory(sessions, budgetItems);
      
      // Detect spending patterns and trends
      const spendingPatterns = this.detectSpendingPatterns(sessions, budgetItems);
      
      // Enhance budget items with additional data for visualization
      const enhancedBudgetItems: EnhancedBudgetItem[] = budgetItems.map((item, index) => {
        const amount = item.quantity * item.unitPrice;
        
        // Determine if this is a high-usage category
        const category = item.category || 'Uncategorized';
        const isHighUsageCategory = spendingPatterns.highUsageCategories.includes(category);
        const isLowUtilization = spendingPatterns.lowUtilizationItems.includes(index);
        const isProjectedOverage = spendingPatterns.projectedOverages.includes(category);
        
        // Calculate a spent amount with more sophisticated estimation
        let estimatedSpent: number;
        
        if (category in spendingByCategory) {
          // Determine this item's proportion of the category's total allocation
          const categoryItems = budgetItems.filter(i => (i.category || 'Uncategorized') === category);
          const categoryAllocation = categoryItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
          const itemProportion = categoryAllocation > 0 ? amount / categoryAllocation : 0;
          
          // Estimate this item's spending based on its proportion of the category's spending
          estimatedSpent = spendingByCategory[category] * itemProportion;
        } else {
          // Fallback to utilization rate if category not found in spending data
          estimatedSpent = Math.min(amount * (utilizationRate / 100), amount);
        }
        
        // Ensure spent amount doesn't exceed allocated amount
        const totalSpent = Math.min(estimatedSpent, amount);
        const percentUsed = amount > 0 ? (totalSpent / amount) * 100 : 0;
        
        return {
          ...item,
          amount,
          totalSpent,
          percentUsed,
          isHighUsage: isHighUsageCategory,
          isLowUtilization,
          isProjectedOverage
        };
      });
      
      // Forecast depletion date using enhanced algorithm
      const forecastedDepletion = this.forecastDepletion(totalBudget, totalSpent, sessions);
      
      // Calculate spending velocity (rate of change)
      let spendingVelocity = 0;
      if (spendingPatterns.seasonality === 'increasing') {
        spendingVelocity = 1; // Accelerating
      } else if (spendingPatterns.seasonality === 'decreasing') {
        spendingVelocity = -1; // Decelerating
      } else if (spendingPatterns.seasonality === 'fluctuating') {
        spendingVelocity = 0.5; // Variable but trending up slightly
      }
      
      return {
        totalBudget,
        totalAllocated,
        totalSpent,
        remaining,
        utilizationRate,
        forecastedDepletion,
        budgetItems: enhancedBudgetItems,
        spendingByCategory,
        spendingPatterns: {
          trend: spendingPatterns.seasonality,
          highUsageCategories: spendingPatterns.highUsageCategories,
          projectedOverages: spendingPatterns.projectedOverages
        },
        spendingVelocity
      };
    } catch (error) {
      console.error('Error in getBudgetAnalysis:', error);
      throw error;
    }
  },

  /**
   * Fetch budget settings for a patient
   */
  async fetchBudgetSettings(patientId: number): Promise<BudgetSettings | null> {
    try {
      // Using the correct endpoint that matches server routes
      const response = await apiRequest('GET', `/api/patients/${patientId}/budget-settings`);
      return response as unknown as BudgetSettings;
    } catch (error) {
      console.error('Error fetching budget settings:', error);
      return null;
    }
  },

  /**
   * Fetch budget items for a patient
   */
  async fetchBudgetItems(patientId: number): Promise<BudgetItem[]> {
    try {
      // Using the correct endpoint that matches server routes
      const response = await apiRequest('GET', `/api/patients/${patientId}/budget-items`);
      return response as unknown as BudgetItem[];
    } catch (error) {
      console.error('Error fetching budget items:', error);
      return [];
    }
  },

  /**
   * Fetch sessions for a patient
   */
  async fetchSessions(patientId: number): Promise<Session[]> {
    try {
      // Using the correct endpoint that matches server routes
      const response = await apiRequest('GET', `/api/patients/${patientId}/sessions`);
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
   * Forecast budget depletion date based on current spending rate with enhanced algorithms
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
    
    // Use enhanced forecasting with session frequency analysis and trend detection
    return this.calculateEnhancedForecast(totalBudget, totalSpent, completedSessions);
  },
  
  /**
   * Enhanced forecast calculation using multiple algorithms
   */
  calculateEnhancedForecast(totalBudget: number, totalSpent: number, sessions: Session[]): Date {
    // Sort sessions by date
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
    );
    
    // Basic calculation using weighted averages of multiple algorithms
    const basicForecast = this.calculateBasicForecast(totalBudget, totalSpent, sortedSessions);
    const frequencyForecast = this.calculateFrequencyBasedForecast(totalBudget, totalSpent, sortedSessions);
    const trendAwareForecast = this.calculateTrendAwareForecast(totalBudget, totalSpent, sortedSessions);
    
    // Calculate weighted average of different forecasting methods
    // Weight more heavily toward trend-aware forecast if we have enough data
    let weights = { basic: 0.2, frequency: 0.3, trendAware: 0.5 };
    
    // If limited data, adjust weights
    if (sortedSessions.length < 5) {
      weights = { basic: 0.5, frequency: 0.3, trendAware: 0.2 };
    }
    
    // Calculate days until depletion with weighted average
    const averageDaysRemaining = 
      (basicForecast.daysRemaining * weights.basic) +
      (frequencyForecast.daysRemaining * weights.frequency) +
      (trendAwareForecast.daysRemaining * weights.trendAware);
    
    // Return depletion date
    const depletionDate = new Date();
    depletionDate.setDate(depletionDate.getDate() + averageDaysRemaining);
    
    return depletionDate;
  },
  
  /**
   * Basic forecast calculation based on simple average spending rate
   */
  calculateBasicForecast(totalBudget: number, totalSpent: number, sortedSessions: Session[]): {
    dailyRate: number;
    daysRemaining: number;
  } {
    // Get the first and last session dates
    const firstSessionDate = new Date(sortedSessions[0].sessionDate);
    const lastSessionDate = new Date(sortedSessions[sortedSessions.length - 1].sessionDate);
    
    // Calculate days between first and last session
    const daysBetween = Math.max(
      1, 
      (lastSessionDate.getTime() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate daily spend rate
    const dailyRate = totalSpent / daysBetween;
    
    // Calculate days until depletion
    const remainingBudget = totalBudget - totalSpent;
    const daysRemaining = dailyRate > 0 ? remainingBudget / dailyRate : 365;
    
    return {
      dailyRate,
      daysRemaining: Math.min(daysRemaining, 365 * 2) // Cap at 2 years for reasonableness
    };
  },
  
  /**
   * Frequency-based forecast that accounts for session frequency patterns
   */
  calculateFrequencyBasedForecast(totalBudget: number, totalSpent: number, sortedSessions: Session[]): {
    dailyRate: number;
    daysRemaining: number;
  } {
    // Calculate average spend per session
    const avgSpendPerSession = totalSpent / sortedSessions.length;
    
    // Calculate session frequency (sessions per week)
    const firstSessionDate = new Date(sortedSessions[0].sessionDate);
    const lastSessionDate = new Date(sortedSessions[sortedSessions.length - 1].sessionDate);
    
    const weeksBetween = Math.max(
      1, 
      (lastSessionDate.getTime() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );
    
    const sessionsPerWeek = sortedSessions.length / weeksBetween;
    
    // Calculate daily rate based on session frequency
    const dailyRate = (avgSpendPerSession * sessionsPerWeek) / 7;
    
    // Calculate days until depletion
    const remainingBudget = totalBudget - totalSpent;
    const daysRemaining = dailyRate > 0 ? remainingBudget / dailyRate : 365;
    
    return {
      dailyRate,
      daysRemaining: Math.min(daysRemaining, 365 * 2) // Cap at 2 years for reasonableness
    };
  },
  
  /**
   * Trend-aware forecast that accounts for accelerating or decelerating spending
   */
  calculateTrendAwareForecast(totalBudget: number, totalSpent: number, sortedSessions: Session[]): {
    dailyRate: number;
    daysRemaining: number;
  } {
    // If not enough sessions for trend analysis, use basic forecast
    if (sortedSessions.length < 3) {
      return this.calculateBasicForecast(totalBudget, totalSpent, sortedSessions);
    }
    
    // Split sessions into two halves to detect trend
    const midpoint = Math.floor(sortedSessions.length / 2);
    const olderSessions = sortedSessions.slice(0, midpoint);
    const newerSessions = sortedSessions.slice(midpoint);
    
    // Calculate time periods for each half
    const getAverageDate = (sessions: Session[]) => {
      const sum = sessions.reduce((sum, session) => sum + new Date(session.sessionDate).getTime(), 0);
      return new Date(sum / sessions.length);
    };
    
    const olderMidDate = getAverageDate(olderSessions);
    const newerMidDate = getAverageDate(newerSessions);
    
    // Calculate days between midpoints
    const daysBetweenMidpoints = Math.max(
      1, 
      (newerMidDate.getTime() - olderMidDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate spending for each half
    // Using session duration as a proxy for spending if amounts aren't directly available
    const olderSpending = olderSessions.reduce((sum, session) => 
      sum + (session.duration || 60), 0);
    const newerSpending = newerSessions.reduce((sum, session) => 
      sum + (session.duration || 60), 0);
    
    // Calculate spending rates per day for each period
    const olderRate = olderSpending / daysBetweenMidpoints;
    const newerRate = newerSpending / daysBetweenMidpoints;
    
    // Calculate trend factor (how much the rate is changing)
    const trendFactor = olderRate > 0 ? newerRate / olderRate : 1;
    
    // Get base rate from basic forecast
    const { dailyRate: baseRate } = this.calculateBasicForecast(totalBudget, totalSpent, sortedSessions);
    
    // Apply trend factor (with dampening to avoid extreme projections)
    // Use square root to dampen effect: sqrt(2) ≈ 1.414 instead of 2
    const dampedTrendFactor = trendFactor > 1 ? 
      1 + (Math.sqrt(trendFactor) - 1) : 
      1 - (Math.sqrt(1/trendFactor) - 1);
    
    // Apply trend-adjusted rate with bounds
    const adjustedFactor = Math.max(0.5, Math.min(2.0, dampedTrendFactor));
    const trendAdjustedRate = baseRate * adjustedFactor;
    
    // Calculate days until depletion
    const remainingBudget = totalBudget - totalSpent;
    const daysRemaining = trendAdjustedRate > 0 ? remainingBudget / trendAdjustedRate : 365;
    
    return {
      dailyRate: trendAdjustedRate,
      daysRemaining: Math.min(daysRemaining, 365 * 2) // Cap at 2 years for reasonableness
    };
  },
  
  /**
   * Detect spending patterns in the budget data
   * @returns Object with pattern analysis
   */
  detectSpendingPatterns(sessions: Session[], budgetItems: BudgetItem[]): {
    seasonality: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
    highUsageCategories: string[];
    lowUtilizationItems: number[];
    projectedOverages: string[];
  } {
    // Get completed sessions
    const completedSessions = sessions.filter(session => 
      session.status === 'completed' || session.status === 'billed'
    );
    
    // Sort by date
    const sortedSessions = [...completedSessions].sort((a, b) => 
      new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
    );
    
    // Analyze seasonality/trend
    let seasonality: 'increasing' | 'decreasing' | 'stable' | 'fluctuating' = 'stable';
    
    if (sortedSessions.length >= 6) {
      // Split into thirds to analyze trend pattern
      const chunkSize = Math.floor(sortedSessions.length / 3);
      const firstChunk = sortedSessions.slice(0, chunkSize);
      const secondChunk = sortedSessions.slice(chunkSize, chunkSize * 2);
      const thirdChunk = sortedSessions.slice(chunkSize * 2);
      
      // Use session frequency as a proxy for spending intensity
      const getChunkIntensity = (chunk: Session[]) => {
        if (chunk.length <= 1) return 0;
        const firstDate = new Date(chunk[0].sessionDate);
        const lastDate = new Date(chunk[chunk.length - 1].sessionDate);
        const days = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        return chunk.length / days; // Sessions per day
      };
      
      const firstIntensity = getChunkIntensity(firstChunk);
      const secondIntensity = getChunkIntensity(secondChunk);
      const thirdIntensity = getChunkIntensity(thirdChunk);
      
      // Determine pattern
      const firstToSecond = secondIntensity - firstIntensity;
      const secondToThird = thirdIntensity - secondIntensity;
      
      if (firstToSecond > 0 && secondToThird > 0) {
        seasonality = 'increasing';
      } else if (firstToSecond < 0 && secondToThird < 0) {
        seasonality = 'decreasing';
      } else if (Math.abs(firstToSecond) < 0.1 && Math.abs(secondToThird) < 0.1) {
        seasonality = 'stable';
      } else {
        seasonality = 'fluctuating';
      }
    }
    
    // Find high usage categories
    const spendingByCategory = this.calculateSpendingByCategory(sessions, budgetItems);
    const totalSpending = Object.values(spendingByCategory).reduce((sum, amount) => sum + amount, 0);
    
    const highUsageCategories = Object.entries(spendingByCategory)
      .filter(([_, amount]) => amount > (totalSpending * 0.25)) // Categories using more than 25% of total
      .map(([category, _]) => category);
    
    // Find low utilization items (less than 10% used)
    const lowUtilizationItems = budgetItems
      .map((item, index) => {
        const allocated = item.quantity * item.unitPrice;
        const category = item.category || 'Uncategorized';
        const categorySpend = spendingByCategory[category] || 0;
        
        // Estimate item's spending based on category proportion
        const totalCategoryAllocation = budgetItems
          .filter(i => (i.category || 'Uncategorized') === category)
          .reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
        
        const estimatedItemSpend = totalCategoryAllocation > 0 ? 
          categorySpend * (allocated / totalCategoryAllocation) : 0;
        
        const utilization = allocated > 0 ? (estimatedItemSpend / allocated) * 100 : 0;
        
        return { index, utilization };
      })
      .filter(item => item.utilization < 10)
      .map(item => item.index);
    
    // Identify categories that may exceed budget
    const projectedOverages = Object.entries(spendingByCategory)
      .filter(([category, amount]) => {
        // Calculate total allocation for this category
        const categoryAllocation = budgetItems
          .filter(item => (item.category || 'Uncategorized') === category)
          .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        
        // Check if projected spending exceeds allocation
        // Use trend to project forward
        const trendfactor = seasonality === 'increasing' ? 1.5 : 
                           seasonality === 'decreasing' ? 0.8 : 1.2;
        
        return amount * trendfactor > categoryAllocation;
      })
      .map(([category, _]) => category);
    
    return {
      seasonality,
      highUsageCategories,
      lowUtilizationItems,
      projectedOverages
    };
  }
};
