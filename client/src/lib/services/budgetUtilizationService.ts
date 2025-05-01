import { format, parseISO, differenceInDays, addDays, addMonths, isAfter, isBefore, isSameDay } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

// Types for budget items and calculations
export interface BudgetItem {
  id: number;
  patientId: number;
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
  patientId: number;
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
  patientId: number;
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

export const fetchPatientSessions = async (patientId: number): Promise<SessionWithProducts[]> => {
  try {
    const response = await apiRequest('GET', `/api/patients/${patientId}/sessions-with-products`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching patient sessions:', error);
    return [];
  }
};

export const budgetUtilizationService = {
  /**
   * Fetch budget utilization data for a patient
   * @param patientId The patient ID to fetch data for
   * @returns A summary of budget utilization
   */
  async getBudgetSummary(patientId: number): Promise<BudgetSummary | null> {
    try {
      // Fetch the required data
      const [budgetItems, budgetSettings, sessions] = await Promise.all([
        budgetUtilizationService.fetchBudgetItems(patientId),
        budgetUtilizationService.fetchBudgetSettings(patientId),
        budgetUtilizationService.fetchPatientSessions(patientId)
      ]);
      
      if (!budgetSettings || !budgetItems || budgetItems.length === 0) {
        console.warn('No active budget settings or items found');
        return null;
      }
      
      // Calculate the spending events from sessions
      const spendingEvents = budgetUtilizationService.calculateSpendingEvents(sessions, budgetItems);
      
      // Calculate the total budget from budget items
      // This ensures we're only counting budget items in the active plan
      let totalBudget = 0;
      
      // Always calculate from active budget items to ensure accuracy
      totalBudget = budgetUtilizationService.calculateTotalBudget(budgetItems);
      
      // Calculate the used budget
      const usedBudget = budgetUtilizationService.calculateUsedBudget(budgetItems);
      
      // Calculate the remaining budget
      const remainingBudget = totalBudget - usedBudget;
      
      // Calculate the utilization percentage
      const utilizationPercentage = totalBudget > 0 ? (usedBudget / totalBudget) * 100 : 0;
      
      // Get the start and end dates
      const startDate = budgetSettings.startDate || budgetSettings.createdAt;
      const endDate = budgetSettings.endDate || budgetSettings.endOfPlan || '';
      
      // Calculate the total days in the plan
      const totalDays = endDate ? differenceInDays(parseISO(endDate), parseISO(startDate)) : 0;
      
      // Calculate the days elapsed
      const today = new Date();
      const daysElapsed = differenceInDays(today, parseISO(startDate));
      
      // Calculate the remaining days
      const remainingDays = endDate ? Math.max(0, differenceInDays(parseISO(endDate), today)) : 0;
      
      // Calculate the daily budget
      const dailyBudget = totalDays > 0 ? totalBudget / totalDays : 0;
      
      // Calculate the daily spend rate
      const dailySpendRate = daysElapsed > 0 ? usedBudget / daysElapsed : 0;
      
      // Calculate the projected end date
      let projectedEndDate: string | null = null;
      let projectedOverspend: number | null = null;
      let projectedRemainingBudget = remainingBudget;
      
      if (dailySpendRate > 0 && remainingBudget > 0) {
        const daysRemaining = remainingBudget / dailySpendRate;
        const projectedEndDateObj = addDays(today, daysRemaining);
        projectedEndDate = projectedEndDateObj.toISOString();
        
        // Calculate projected overspend if we're spending too fast
        if (dailySpendRate > dailyBudget && endDate) {
          const daysToEnd = differenceInDays(parseISO(endDate), today);
          const projectedAdditionalSpend = dailySpendRate * daysToEnd;
          projectedOverspend = Math.max(0, projectedAdditionalSpend - remainingBudget);
          projectedRemainingBudget = remainingBudget - projectedAdditionalSpend;
        }
      }
      
      // Calculate monthly spending data for visualization
      const monthlySpending = budgetUtilizationService.calculateMonthlySpending(
        spendingEvents,
        startDate,
        endDate || addMonths(parseISO(startDate), 12).toISOString(), // Default to 12 months if no end date
        totalBudget
      );
      
      // Format the plan period name
      const planPeriodName = `${format(parseISO(startDate), 'MMM d, yyyy')} - ${
        endDate ? format(parseISO(endDate), 'MMM d, yyyy') : 'Ongoing'
      }`;
      
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
      console.error('Error calculating budget summary:', error);
      return null;
    }
  },
  
  /**
   * Fetch budget items for a patient
   * @param patientId The patient ID to fetch budget items for
   * @returns An array of budget items
   */
  async fetchBudgetItems(patientId: number): Promise<BudgetItem[]> {
    try {
      const response = await apiRequest('GET', `/api/patients/${patientId}/budget-items`);
      return response;
    } catch (error) {
      console.error('Error fetching budget items:', error);
      return [];
    }
  },
  
  /**
   * Fetch active budget settings for a patient
   * @param patientId The patient ID to fetch budget settings for
   * @returns The active budget settings or null if none found
   */
  async fetchBudgetSettings(patientId: number): Promise<BudgetSettings | null> {
    try {
      const response = await apiRequest('GET', `/api/patients/${patientId}/budget-settings`);
      return response;
    } catch (error) {
      console.error('Error fetching budget settings:', error);
      return null;
    }
  },
  
  /**
   * Fetch sessions with product usage for a patient
   * @param patientId The patient ID to fetch sessions for
   * @returns An array of sessions with product usage data
   */
  async fetchPatientSessions(patientId: number): Promise<SessionWithProducts[]> {
    try {
      const response = await apiRequest('GET', `/api/patients/${patientId}/sessions-with-products`);
      return response;
    } catch (error) {
      console.error('Error fetching patient sessions:', error);
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
      return total + (unitPrice * (item.usedQuantity || 0));
    }, 0);
  },
  
  /**
   * Calculate spending events from sessions with products
   * @param sessions Array of sessions with product usage
   * @param budgetItems Array of budget items for reference
   * @returns Array of spending events
   */
  calculateSpendingEvents(sessions: SessionWithProducts[], budgetItems: BudgetItem[]): SpendingEvent[] {
    const events: SpendingEvent[] = [];
    
    // Create a map of budget items for quick lookup
    const budgetItemMap = new Map<string, BudgetItem>();
    budgetItems.forEach(item => {
      budgetItemMap.set(item.itemCode, item);
    });
    
    sessions.forEach(session => {
      // Skip sessions without notes or products
      if (!session.note || !session.note.products || session.note.products.length === 0) {
        return;
      }
      
      // Process each product in the session
      session.note.products.forEach(product => {
        // Skip products without a code or quantity
        if (!product.productCode || !product.quantity) {
          return;
        }
        
        // Find the matching budget item
        const budgetItem = budgetItemMap.get(product.productCode);
        
        // Skip if no matching budget item is found
        if (!budgetItem) {
          console.warn(`No matching budget item found for product code: ${product.productCode}`);
          return;
        }
        
        // Calculate the amount for this product usage
        const unitPrice = product.unitPrice || parseFloat(budgetItem.unitPrice);
        const amount = unitPrice * product.quantity;
        
        // Add a spending event
        events.push({
          date: session.sessionDate,
          amount,
          description: product.productDescription || budgetItem.description,
          itemName: budgetItem.name || product.productCode
        });
      });
    });
    
    return events;
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
      // Parse the start and end dates
      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(endDate);
      
      // Create an array of daily data points
      const dailyData: MonthlySpending[] = [];
      
      // Get today's date for determining projected vs. actual data
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      
      // Initialize the current date to the start date
      let currentDate = startDateObj;
      
      // Loop through each day from start to end
      while (isBefore(currentDate, endDateObj) || isSameDay(currentDate, endDateObj)) {
        // Format the date for display and reference
        const monthLabel = format(currentDate, 'MMM yyyy');
        const exactDate = format(currentDate, 'yyyy-MM-dd');
        
        // Determine if this date is in the future (projected)
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
