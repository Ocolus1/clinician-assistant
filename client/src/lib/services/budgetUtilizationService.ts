import { format, parseISO, differenceInDays, addDays, addMonths, isAfter, isBefore } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

// Types for budget items and calculations
export interface BudgetItem {
  id: number;
  clientId: number;
  budgetSettingsId: number;
  itemCode: string;
  name: string | null;
  description: string;
  unitPrice: string;
  quantity: number;
  usedQuantity: number;
  category: string | null;
  isActivePlan: boolean;
  planSerialNumber: string;
  planCode: string | null;
}

export interface BudgetSettings {
  id: number;
  clientId: number;
  planName?: string;
  planCode: string | null;
  planSerialNumber: string;
  startDate?: string;
  endDate?: string;
  endOfPlan?: string;
  totalFunds?: string;
  ndisFunds?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SpendingEvent {
  date: string;
  amount: number;
  description: string;
  itemName: string;
}

export interface SessionWithProducts {
  id: number;
  clientId: number;
  date: string;
  therapistId: number;
  therapistName: string;
  status: string;
  note?: {
    id: number;
    products: {
      code: string;
      quantity: number;
      name?: string;
      description?: string;
      unitPrice?: string;
    }[];
  };
}

export interface BudgetSummary {
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  utilizationPercentage: number;
  startDate: string;
  endDate: string;
  remainingDays: number;
  daysElapsed: number;
  totalDays: number;
  planPeriodName: string;
  dailyBudget: number;
  dailySpendRate: number;
  projectedEndDate: string | null;
  projectedOverspend: number | null;
  budgetItems: BudgetItem[];
  spendingEvents: SpendingEvent[];
}

export const budgetUtilizationService = {
  /**
   * Fetch budget utilization data for a client
   * @param clientId The client ID to fetch data for
   * @returns A summary of budget utilization
   */
  async getBudgetSummary(clientId: number): Promise<BudgetSummary | null> {
    try {
      // Fetch the required data
      const [budgetItems, budgetSettings, sessions] = await Promise.all([
        this.fetchBudgetItems(clientId),
        this.fetchBudgetSettings(clientId),
        this.fetchClientSessions(clientId)
      ]);
      
      if (!budgetSettings || !budgetItems || budgetItems.length === 0) {
        console.warn('No active budget settings or items found');
        return null;
      }
      
      // Calculate the spending events from sessions
      const spendingEvents = this.calculateSpendingEvents(sessions, budgetItems);
      
      // Calculate the total budget
      // First check if there's a totalFunds or ndisFunds field in budgetSettings
      let totalBudget = 0;
      
      // If we have totalFunds or ndisFunds, use that
      if (budgetSettings.totalFunds) {
        totalBudget = parseFloat(budgetSettings.totalFunds);
      } else if (budgetSettings.ndisFunds) {
        totalBudget = parseFloat(budgetSettings.ndisFunds);
      } else {
        // Otherwise calculate from budget items
        totalBudget = this.calculateTotalBudget(budgetItems);
      }
      
      // Calculate the used budget
      const usedBudget = this.calculateUsedBudget(budgetItems);
      
      // Calculate the remaining budget
      const remainingBudget = totalBudget - usedBudget;
      
      // Calculate utilization percentage
      const utilizationPercentage = (usedBudget / totalBudget) * 100;
      
      // Parse dates with safe fallbacks
      let startDate = budgetSettings.startDate || budgetSettings.createdAt;
      let endDate = budgetSettings.endDate || budgetSettings.endOfPlan;
      
      // Ensure we have valid dates
      if (!startDate) {
        console.warn("No start date found in budget settings, using today");
        startDate = format(new Date(), 'yyyy-MM-dd');
      }
      
      if (!endDate) {
        console.warn("No end date found in budget settings, using 6 months from start");
        // Default to 6 months from start date
        const tempStartDate = parseISO(startDate);
        endDate = format(addMonths(tempStartDate, 6), 'yyyy-MM-dd');
      }
      
      // Add logging for debugging
      console.log("Using dates for budget calculations:", { 
        startDate, 
        endDate, 
        originalData: budgetSettings 
      });
      
      // Calculate days
      const today = new Date();
      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(endDate);
      
      const totalDays = differenceInDays(endDateObj, startDateObj);
      const daysElapsed = Math.min(
        differenceInDays(today, startDateObj),
        totalDays
      );
      const remainingDays = Math.max(0, totalDays - daysElapsed);
      
      // Daily budget calculation (with safety check)
      const totalDaysSafe = totalDays > 0 ? totalDays : 180; // Default to 6 months if calculation is wrong
      const dailyBudget = totalBudget / totalDaysSafe;
      
      // Current spending rate (based on actual usage)
      const dailySpendRate = daysElapsed > 0 ? usedBudget / daysElapsed : 0;
      
      // Add safeguards for projection calculations
      let projectedEndDate = null;
      let projectedOverspend = null;
      
      try {
        // Projection calculations - with safety limits
        if (dailySpendRate > 0 && remainingBudget > 0) {
          // Limit daysUntilDepletion to a reasonable number
          const daysUntilDepletion = Math.min(
            Math.floor(remainingBudget / dailySpendRate),
            365 // Cap at 1 year to prevent unreasonable projections
          );
          
          // Calculate projected end date
          const projectedEndDateObj = addDays(today, daysUntilDepletion);
          
          // Only set if date is before the plan end date
          if (isBefore(projectedEndDateObj, endDateObj)) {
            projectedEndDate = format(projectedEndDateObj, 'yyyy-MM-dd');
          }
        }
        
        // Calculate projected overspend if spending rate exceeds budget rate
        if (dailySpendRate > dailyBudget) {
          const projectedTotalSpend = usedBudget + (dailySpendRate * remainingDays);
          if (projectedTotalSpend > totalBudget) {
            projectedOverspend = projectedTotalSpend - totalBudget;
          }
        }
      } catch (error) {
        console.error("Error in projection calculations:", error);
        // Set safe defaults if calculations fail
        projectedEndDate = null;
        projectedOverspend = null;
      }
      
      // Get a meaningful plan name from available data
      const planPeriodName = budgetSettings.planName || 
                             budgetSettings.planSerialNumber || 
                             `Plan from ${format(startDateObj, 'MMM yyyy')}`;
      
      return {
        totalBudget,
        usedBudget,
        remainingBudget,
        utilizationPercentage,
        startDate,
        endDate,
        remainingDays,
        daysElapsed,
        totalDays,
        planPeriodName,
        dailyBudget,
        dailySpendRate,
        projectedEndDate,
        projectedOverspend,
        budgetItems,
        spendingEvents
      };
    } catch (error) {
      console.error('Error getting budget summary:', error);
      return null;
    }
  },
  
  /**
   * Fetch budget items for a client
   * @param clientId The client ID to fetch budget items for
   * @returns An array of budget items
   */
  async fetchBudgetItems(clientId: number): Promise<BudgetItem[]> {
    try {
      return await apiRequest<BudgetItem[]>('GET', `/api/clients/${clientId}/budget-items`);
    } catch (error) {
      console.error('Error fetching budget items:', error);
      return [];
    }
  },
  
  /**
   * Fetch active budget settings for a client
   * @param clientId The client ID to fetch budget settings for
   * @returns The active budget settings or null if none found
   */
  async fetchBudgetSettings(clientId: number): Promise<BudgetSettings | null> {
    try {
      return await apiRequest<BudgetSettings>('GET', `/api/clients/${clientId}/budget-settings`);
    } catch (error) {
      console.error('Error fetching budget settings:', error);
      return null;
    }
  },
  
  /**
   * Fetch sessions with product usage for a client
   * @param clientId The client ID to fetch sessions for
   * @returns An array of sessions with product usage data
   */
  async fetchClientSessions(clientId: number): Promise<SessionWithProducts[]> {
    try {
      return await apiRequest<SessionWithProducts[]>('GET', `/api/clients/${clientId}/sessions`);
    } catch (error) {
      console.error('Error fetching client sessions:', error);
      return [];
    }
  },
  
  /**
   * Calculate the total budget from budget items
   * @param budgetItems Array of budget items
   * @returns The total budget amount
   */
  calculateTotalBudget(budgetItems: BudgetItem[]): number {
    return budgetItems.reduce((total, item) => {
      const unitPrice = parseFloat(item.unitPrice);
      return total + (unitPrice * item.quantity);
    }, 0);
  },
  
  /**
   * Calculate the used budget from budget items
   * @param budgetItems Array of budget items
   * @returns The used budget amount
   */
  calculateUsedBudget(budgetItems: BudgetItem[]): number {
    return budgetItems.reduce((total, item) => {
      const unitPrice = parseFloat(item.unitPrice);
      return total + (unitPrice * item.usedQuantity);
    }, 0);
  },
  
  /**
   * Calculate spending events from sessions with products
   * @param sessions Array of sessions with product usage
   * @param budgetItems Array of budget items for reference
   * @returns Array of spending events
   */
  calculateSpendingEvents(sessions: SessionWithProducts[], budgetItems: BudgetItem[]): SpendingEvent[] {
    // Create a map of product codes to budget items for quick lookup
    const budgetItemMap = new Map<string, BudgetItem>();
    budgetItems.forEach(item => {
      budgetItemMap.set(item.itemCode, item);
    });
    
    // Convert sessions to spending events
    const events: SpendingEvent[] = [];
    
    sessions.forEach(session => {
      // Skip sessions without notes or products
      if (!session.note || !session.note.products || session.note.products.length === 0) {
        return;
      }
      
      // Process each product used in the session
      session.note.products.forEach(product => {
        const budgetItem = budgetItemMap.get(product.code);
        if (!budgetItem) return;
        
        const unitPrice = parseFloat(product.unitPrice || budgetItem.unitPrice);
        const amount = unitPrice * product.quantity;
        
        events.push({
          date: session.date,
          amount,
          description: `Session with ${session.therapistName}`,
          itemName: product.description || budgetItem.description || product.code
        });
      });
    });
    
    // Sort by date (most recent first)
    return events.sort((a, b) => {
      return isBefore(parseISO(a.date), parseISO(b.date)) ? 1 : -1;
    });
  }
};