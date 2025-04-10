import { format, parseISO, differenceInDays, addDays, addMonths, isAfter, isBefore, isSameDay } from 'date-fns';
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
  sessionDate: string; // API returns sessionDate, not date
  therapistId: number;
  title?: string;
  status: string;
  note?: {
    id: number;
    products: {
      productCode: string;  // API returns productCode, not code 
      quantity: number;
      productDescription?: string;
      unitPrice?: number;
      budgetItemId?: number;
    }[];
  };
}

export interface MonthlySpending {
  month: string; // Formatted month string (e.g., "Jan 2023")
  date: Date;    // Exact date for precise plotting
  exactDate: string; // ISO formatted date string for precise reference
  actualSpending: number;
  targetSpending: number;
  projectedSpending: number | null;
  cumulativeActual: number;
  cumulativeTarget: number;
  cumulativeProjected: number | null;
  isProjected: boolean;
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
  monthlySpending: MonthlySpending[];
  projectedRemainingBudget: number;
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
      
      // Calculate the total budget from budget items
      // This ensures we're only counting budget items in the active plan
      let totalBudget = 0;
      
      // Always calculate from active budget items to ensure accuracy
      totalBudget = this.calculateTotalBudget(budgetItems);
      
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
      
      // Calculate monthly spending data for visualization
      const monthlySpending = this.calculateMonthlySpending(
        spendingEvents,
        startDate,
        endDate,
        totalBudget
      );
      
      // Calculate the projected remaining budget at the end of the plan
      const projectedRemainingBudget = (() => {
        // If we have no monthly data or projections, just return the current remaining budget
        if (!monthlySpending.length) return remainingBudget;
        
        // Get the last month's cumulative projected spending
        const lastMonth = monthlySpending[monthlySpending.length - 1];
        if (lastMonth.cumulativeProjected !== null) {
          // Return the difference between total budget and projected total spending
          return Math.max(0, totalBudget - lastMonth.cumulativeProjected);
        }
        
        // If no projection available, return current remaining budget
        return remainingBudget;
      })();
      
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
        spendingEvents,
        monthlySpending,
        projectedRemainingBudget
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
      console.log(`Fetching budget items for client ID: ${clientId}, type: ${typeof clientId}`);
      
      // Check if clientId is valid
      if (!clientId || isNaN(clientId) || clientId <= 0) {
        console.error(`Invalid client ID: ${clientId}`);
        return [];
      }
      
      // Make the API request with detailed logging
      // using the fixed apiRequest signature (method, url, body)
      const response = await apiRequest<BudgetItem[]>('GET', `/api/clients/${clientId}/budget-items`);
      console.log(`Budget items response:`, response);
      return response;
    } catch (error) {
      console.error('Error fetching budget items:', error);
      console.error('Error details:', JSON.stringify(error));
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
      console.log(`Fetching budget settings for client ID: ${clientId}, type: ${typeof clientId}`);
      
      // Check if clientId is valid
      if (!clientId || isNaN(clientId) || clientId <= 0) {
        console.error(`Invalid client ID for budget settings: ${clientId}`);
        return null;
      }
      
      // Make the API request with detailed logging
      const response = await apiRequest<BudgetSettings>('GET', `/api/clients/${clientId}/budget-settings`);
      console.log(`Budget settings response:`, response);
      return response;
    } catch (error) {
      console.error('Error fetching budget settings:', error);
      console.error('Error details:', JSON.stringify(error));
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
      console.log(`Fetching sessions for client ID: ${clientId}, type: ${typeof clientId}`);
      
      // Check if clientId is valid
      if (!clientId || isNaN(clientId) || clientId <= 0) {
        console.error(`Invalid client ID for sessions: ${clientId}`);
        return [];
      }
      
      // Make the API request with detailed logging
      const response = await apiRequest<SessionWithProducts[]>('GET', `/api/clients/${clientId}/sessions`);
      console.log(`Client sessions response:`, response);
      return response;
    } catch (error) {
      console.error('Error fetching client sessions:', error);
      console.error('Error details:', JSON.stringify(error));
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
    console.log('Budget items count:', budgetItems.length);
    
    budgetItems.forEach(item => {
      console.log('Adding budget item to map:', item.itemCode, item.description, 'price:', item.unitPrice);
      budgetItemMap.set(item.itemCode, item);
    });
    
    // Convert sessions to spending events
    const events: SpendingEvent[] = [];
    console.log('Processing sessions count:', sessions.length);
    
    sessions.forEach(session => {
      console.log('Session:', session.id, 'date:', session.sessionDate, 'has note:', !!session.note);
      
      // Skip sessions without notes or products
      if (!session.note || !session.note.products || session.note.products.length === 0) {
        console.log('Session has no products, skipping');
        return;
      }
      
      console.log('Session products count:', session.note.products.length);
      
      // Process each product used in the session
      session.note.products.forEach(product => {
        console.log('Processing product:', product.productCode, 'quantity:', product.quantity);
        
        const budgetItem = budgetItemMap.get(product.productCode);
        if (!budgetItem) {
          console.log('No matching budget item found for product code:', product.productCode);
          return;
        }
        
        // Convert unitPrice to number if it's a string
        const unitPrice = typeof product.unitPrice === 'number' 
          ? product.unitPrice 
          : parseFloat(budgetItem.unitPrice);
          
        const amount = unitPrice * product.quantity;
        
        console.log('Adding spending event for', product.productCode, 'amount:', amount, 'date:', session.sessionDate);
        
        events.push({
          date: session.sessionDate,
          amount,
          description: `Session on ${format(parseISO(session.sessionDate), 'MMM d, yyyy')}`,
          itemName: product.productDescription || budgetItem.description || product.productCode
        });
      });
    });
    
    console.log('Total spending events generated:', events.length);
    
    // Sort by date (most recent first)
    return events.sort((a, b) => {
      return isBefore(parseISO(a.date), parseISO(b.date)) ? 1 : -1;
    });
  },
  
  /**
   * Calculate daily spending data for chart visualization with monthly x-axis labels
   * @param spendingEvents Array of spending events
   * @param startDate Budget plan start date
   * @param endDate Budget plan end date
   * @param totalBudget Total budget amount
   * @returns Array of daily spending data points with monthly labels
   */
  calculateMonthlySpending(
    spendingEvents: SpendingEvent[],
    startDate: string,
    endDate: string,
    totalBudget: number
  ): MonthlySpending[] {
    try {
      console.log('Calculating daily spending with', spendingEvents.length, 'spending events');
      console.log('Date range:', startDate, 'to', endDate);
      console.log('Total budget:', totalBudget);
      
      if (spendingEvents.length > 0) {
        console.log('First spending event:', spendingEvents[0]);
        console.log('Last spending event:', spendingEvents[spendingEvents.length - 1]);
      }

      const today = new Date();
      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(endDate);
      
      // Generate daily data points from start to end date
      const dailyData: MonthlySpending[] = [];
      let currentDate = startDateObj;
      
      // Generate a data point for each day
      while (isBefore(currentDate, endDateObj) || isSameDay(currentDate, endDateObj)) {
        // Format the month label for grouping (e.g., "Jan 2023")
        const monthLabel = format(currentDate, 'MMM yyyy');
        
        // Format the exact date for precise data points
        const exactDate = format(currentDate, 'yyyy-MM-dd');
        
        // Determine if this date is in the future (for projection)
        const isDateProjected = isAfter(currentDate, today);
        
        // Add a new data point for this day
        dailyData.push({
          month: monthLabel,        // Month label for x-axis grouping
          date: new Date(currentDate), // Full date object for precise plotting
          exactDate,                // ISO date string for reference
          actualSpending: 0,
          targetSpending: 0,
          projectedSpending: null,
          cumulativeActual: 0,
          cumulativeTarget: 0,
          cumulativeProjected: null,
          isProjected: isDateProjected
        });
        
        // Move to the next day
        currentDate = addDays(currentDate, 1);
      }
      
      // Sort spending events by date (earliest first)
      const sortedEvents = [...spendingEvents].sort((a, b) => {
        return isBefore(parseISO(a.date), parseISO(b.date)) ? -1 : 1;
      });
      
      // Calculate the target daily budget (evenly distributed)
      const totalDays = dailyData.length;
      const dailyBudgetTarget = totalBudget / totalDays;
      
      console.log('Daily data points:', totalDays);
      
      // Assign spending amounts to each day
      sortedEvents.forEach(event => {
        const eventDate = parseISO(event.date);
        const eventDateString = format(eventDate, 'yyyy-MM-dd');
        
        console.log('Processing event date:', event.date, 'formatted as:', eventDateString);
        
        // Find the corresponding day in our data array
        const dayIndex = dailyData.findIndex(d => d.exactDate === eventDateString);
        if (dayIndex !== -1) {
          console.log('Found matching day at index:', dayIndex, 'adding amount:', event.amount);
          dailyData[dayIndex].actualSpending += event.amount;
        } else {
          console.log('WARNING: No matching day found for event date:', event.date);
        }
      });
      
      // Add target budget to each day and calculate cumulative values
      let cumulativeActual = 0;
      let cumulativeTarget = 0;
      
      dailyData.forEach((day, index) => {
        // Set target budget for each day
        day.targetSpending = dailyBudgetTarget;
        
        // Calculate cumulative values
        cumulativeActual += day.actualSpending;
        cumulativeTarget += day.targetSpending;
        
        day.cumulativeActual = cumulativeActual;
        day.cumulativeTarget = cumulativeTarget;
      });
      
      // Calculate projected spending for future days
      // Find the index of today
      const todayIndex = dailyData.findIndex(d => 
        d.isProjected === true
      ) - 1; // The day before the first projected day
      
      if (todayIndex !== -2) { // If today was found
        const actualTodayIndex = todayIndex >= 0 ? todayIndex : 0; // Handle case when today is the first day
        
        // Calculate average daily spending from actual data
        const pastDays = dailyData.slice(0, actualTodayIndex + 1);
        const totalActualSpending = pastDays.reduce((sum, day) => sum + day.actualSpending, 0);
        
        // Calculate the average daily spending rate (use at least 1 day to avoid division by zero)
        const averageDailySpending = totalActualSpending / Math.max(1, pastDays.length);
        
        // Apply projections to future days
        let projectedCumulative = pastDays.reduce((sum, day) => sum + day.actualSpending, 0);
        
        for (let i = actualTodayIndex + 1; i < dailyData.length; i++) {
          dailyData[i].projectedSpending = averageDailySpending;
          projectedCumulative += averageDailySpending;
          dailyData[i].cumulativeProjected = projectedCumulative;
        }
      }
      
      console.log('Final daily data (sample):', dailyData.slice(0, 5).map(d => ({
        date: d.exactDate,
        month: d.month,
        actualSpending: d.actualSpending,
        cumulativeActual: d.cumulativeActual,
        isProjected: d.isProjected
      })));
      
      return dailyData;
    } catch (error) {
      console.error('Error calculating monthly spending:', error);
      return [];
    }
  }
};