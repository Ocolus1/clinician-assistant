/**
 * Progress Data Service
 * 
 * A service layer for fetching and analyzing client goal progress data
 * from the backend. This service provides real client performance metrics
 * based on actual session data rather than task completion status.
 */

import { apiRequest } from "@/lib/queryClient";

/**
 * Interface for the performance data returned from the API
 * Maps goalId -> performance percentage (0-100) or null when no data available
 */
export interface GoalPerformanceMap {
  [goalId: number]: number | null;
}

/**
 * Progress Data Service
 * Provides methods for fetching and analyzing client performance data
 */
export const progressDataService = {
  /**
   * Fetch performance data for all goals of a client
   * 
   * @param clientId The client ID to fetch performance data for
   * @returns A map of goal IDs to their performance percentage or null
   */
  async getClientGoalPerformance(clientId: number): Promise<GoalPerformanceMap> {
    if (!clientId) {
      console.warn('Cannot fetch goal performance: Invalid client ID');
      return {};
    }
    
    try {
      const response = await apiRequest<GoalPerformanceMap>(
        'GET', 
        `/api/clients/${clientId}/goals/performance`
      );
      
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
   * @returns The performance percentage for the goal or null
   */
  async getGoalPerformance(clientId: number, goalId: number): Promise<number | null> {
    if (!clientId || !goalId) {
      console.warn('Cannot fetch goal performance: Invalid client or goal ID');
      return null;
    }
    
    try {
      const response = await apiRequest<GoalPerformanceMap>(
        'GET', 
        `/api/clients/${clientId}/goals/performance?goalId=${goalId}`
      );
      
      return response?.[goalId] ?? null;
    } catch (error) {
      console.error(`Error fetching performance data for goal ${goalId}:`, error);
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