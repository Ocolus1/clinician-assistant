/**
 * Client Reports API
 * 
 * Functions for fetching report data from the server
 */
import { getQueryFn } from '@/lib/queryClient';

export interface ClientReportData {
  clientDetails: ClientDetailsData;
  keyMetrics: KeyMetricsData;
  observations: ObservationsData;
  cancellations: CancellationsData;
  strategies: StrategiesData;
  goals: GoalsData;
}

export interface ClientDetailsData {
  id: number;
  name: string;
  age: number;
  fundsManagement: string;
  allies: Array<{
    name: string;
    relationship: string;
    preferredLanguage: string;
  }>;
}

export interface KeyMetricsData {
  spendingDeviation: number;
  planExpiration: number; // Days until expiration
  cancellationRate?: number; // Percentage
}

export interface ObservationsData {
  physicalActivity: number;
  cooperation: number;
  focus: number;
  mood: number;
}

export interface CancellationsData {
  completed: number; // Percentage
  waived: number; // Percentage
  changed: number; // Percentage
  total: number; // Total number of sessions
}

export interface StrategiesData {
  strategies: Array<{
    id: number;
    name: string;
    timesUsed: number;
    averageScore: number;
  }>;
}

export interface GoalsData {
  goals: Array<{
    id: number;
    title: string;
    score: number; // 0-10 scale
  }>;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

/**
 * Get client performance report
 */
export const getClientPerformanceReport = getQueryFn<ClientReportData>({
  on401: "throw",
  getFn: async ({ queryKey }) => {
    const [_base, clientId, dateRange] = queryKey as [
      string, 
      number, 
      DateRangeParams | undefined
    ];
    
    // Build URL with date range parameters if provided
    let url = `/api/clients/${clientId}/reports/performance`;
    
    if (dateRange) {
      const params = new URLSearchParams();
      
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      if (params.toString().length > 0) {
        url += `?${params.toString()}`;
      }
    }
    
    return { url };
  }
});

/**
 * Get client strategies data for detailed visualization
 */
export const getClientStrategiesReport = getQueryFn<StrategiesData>({
  on401: "throw",
  getFn: async ({ queryKey }) => {
    const [_base, clientId, dateRange] = queryKey as [
      string, 
      number, 
      DateRangeParams | undefined
    ];
    
    // Build URL with date range parameters if provided
    let url = `/api/clients/${clientId}/reports/strategies`;
    
    if (dateRange) {
      const params = new URLSearchParams();
      
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      if (params.toString().length > 0) {
        url += `?${params.toString()}`;
      }
    }
    
    return { url };
  }
});