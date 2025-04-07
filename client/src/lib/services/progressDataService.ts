/**
 * Progress Data Service
 * 
 * A service layer for fetching and analyzing client goal progress data
 * from the backend. This service provides real client performance metrics
 * based on actual session data rather than task completion status.
 */

import { apiRequest } from "@/lib/queryClient";
import { format, subMonths } from "date-fns";

/**
 * Interface for the performance data returned from the API
 * Maps goalId -> performance percentage (0-100) or null when no data available
 */
export interface GoalPerformanceMap {
  [goalId: number]: number | null;
}

/**
 * Interface for milestone performance data
 */
export interface MilestonePerformanceData {
  id: number;
  title: string;
  description?: string;
  hasValidDataForLine: boolean;
  isEmpty?: boolean; // Flag for empty milestone placeholder display
  values: {
    month: string; // Format: "YYYY-MM"
    score: number;
  }[];
}

/**
 * Progress Data Service
 * Provides methods for fetching and analyzing client performance data
 */
export const progressDataService = {
  /**
   * Get last 6 months formatted for charts and data visualization
   * 
   * @param startDate Optional start date to use (defaults to 6 months ago)
   * @returns Array of month objects with value and display properties
   */
  getLast6Months(startDate?: string): Array<{ value: string, display: string }> {
    const months = [];
    let currentDate = new Date();
    
    // If a startDate is provided and it's valid, use it as the base
    // Otherwise default to 6 months from current date
    if (startDate) {
      try {
        const parsedStartDate = new Date(startDate);
        // Check if the date is valid
        if (!isNaN(parsedStartDate.getTime())) {
          // Find the earlier of the two: 6 months ago or the budget start date
          const sixMonthsAgo = subMonths(currentDate, 6);
          currentDate = parsedStartDate > sixMonthsAgo ? sixMonthsAgo : parsedStartDate;
        }
      } catch (e) {
        console.warn("Invalid startDate provided to getLast6Months:", startDate);
        // Default to 6 months if date is invalid
        currentDate = subMonths(new Date(), 6);
      }
    } else {
      // No startDate provided, use 6 months ago
      currentDate = subMonths(new Date(), 6);
    }
    
    // Generate 6 months from the starting point
    for (let i = 0; i < 6; i++) {
      // Use the adjusted currentDate from above logic as starting point
      const date = new Date(new Date(currentDate).setMonth(currentDate.getMonth() + i));
      const monthStr = format(date, "yyyy-MM");
      const displayMonth = format(date, "MMM");
      months.push({ value: monthStr, display: displayMonth });
    }
    
    return months;
  },

  /**
   * Fetch performance data for all goals of a client
   * 
   * @param clientId The client ID to fetch performance data for
   * @param startDate Optional start date for filtering
   * @returns A map of goal IDs to their performance percentage or null
   */
  async getClientGoalPerformance(clientId: number, startDate?: string): Promise<GoalPerformanceMap> {
    if (!clientId) {
      console.warn('Cannot fetch goal performance: Invalid client ID');
      return {};
    }
    
    try {
      let url = `/api/clients/${clientId}/goals/performance`;
      
      if (startDate) {
        url += `?startDate=${encodeURIComponent(startDate)}`;
      }
      
      const response = await apiRequest<GoalPerformanceMap>('GET', url);
      
      return response || {};
    } catch (error) {
      console.error('Error fetching goal performance data:', error);
      throw error;
    }
  },
  
  /**
   * Fetch performance data for a specific goal
   * 
   * @param clientId The client ID the goal belongs to
   * @param goalId The specific goal ID to fetch performance for
   * @param startDate Optional start date for filtering
   * @returns The performance percentage for the goal or null
   */
  async getGoalPerformance(clientId: number, goalId: number, startDate?: string): Promise<number | null> {
    if (!clientId || !goalId) {
      console.warn('Cannot fetch goal performance: Invalid client or goal ID');
      return null;
    }
    
    try {
      let url = `/api/clients/${clientId}/goals/performance?goalId=${goalId}`;
      
      if (startDate) {
        url += `&startDate=${encodeURIComponent(startDate)}`;
      }
      
      const response = await apiRequest<GoalPerformanceMap>('GET', url);
      
      return response?.[goalId] ?? null;
    } catch (error) {
      console.error(`Error fetching performance data for goal ${goalId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get milestone performance data for visualizations
   * 
   * @param clientId The client ID
   * @param goalId The goal ID to fetch milestone data for
   * @param subgoals The subgoals to include in the report
   * @param startDate Optional start date for filtering (defaults to 6 months ago)
   * @returns Array of milestone performance data objects
   */
  async getMilestonePerformanceData(
    clientId: number, 
    goalId: number,
    subgoals: any[],
    startDate?: string
  ): Promise<MilestonePerformanceData[]> {
    console.log("getMilestonePerformanceData called with:", { clientId, goalId, subgoalsLength: subgoals?.length, startDate });
    
    if (!clientId || !goalId || !Array.isArray(subgoals) || subgoals.length === 0) {
      console.warn('Cannot fetch milestone performance: Invalid parameters');
      return [];
    }
    
    // Get the months we'll use for the data
    const months = this.getLast6Months(startDate);
    
    try {
      // For now, simulate milestone data - in a real implementation this would call the API
      // This will be replaced with actual API data in the future
      return Promise.resolve(
        subgoals.map(subgoal => {
          if (!subgoal || !subgoal.id || !subgoal.title) {
            console.warn('Invalid subgoal object:', subgoal);
            return null;
          }
          
          // For now we create random data for visualization - this will be replaced with real API data
          const values = months.map(month => ({
            month: month.value,
            score: Math.floor(Math.random() * 11) // Random score 0-10
          }));
          
          // Check if we have at least one non-zero value
          const hasValidData = values.some(v => v.score > 0);
          
          return {
            id: subgoal.id,
            title: subgoal.title,
            description: subgoal.description || '',
            hasValidDataForLine: hasValidData,
            values
          };
        }).filter(Boolean) as MilestonePerformanceData[]
      );
    } catch (error) {
      console.error(`Error fetching milestone performance data:`, error);
      throw error;
    }
  },
  
  /**
   * Format a performance percentage for display
   * 
   * @param performance The performance value (0-100) or null
   * @returns A formatted string for display
   */
  formatPerformance(performance: number | null | undefined): string {
    if (performance === null || performance === undefined) {
      return 'N/A';
    }
    
    return `${Math.round(performance)}%`;
  },
  
  /**
   * Get appropriate color for a performance value
   * 
   * @param performance The performance value (0-100) or null 
   * @returns A Tailwind CSS color class
   */
  getPerformanceColor(performance: number | null | undefined): string {
    if (performance === null || performance === undefined) {
      return 'text-gray-400';
    }
    
    if (performance >= 80) {
      return 'text-green-600';
    } else if (performance >= 60) {
      return 'text-yellow-600';
    } else {
      return 'text-amber-600';
    }
  }
};