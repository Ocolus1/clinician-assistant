/**
 * Client Reports API
 * 
 * Functions for fetching report data from the server
 */
import { getQueryFn } from '@/lib/queryClient';
import { getDummyClientReport, getDummyClientStrategiesReport } from '@/../../shared/dummy-data';

// Flag to control dummy data for development
const useDummyData = false;

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
 * Uses dummy data if useDummyData flag is true
 */
export const getClientPerformanceReport = ({ queryKey }: { queryKey: unknown[] }) => {
  const [_base, clientId, dateRange] = queryKey as [
    string, 
    number, 
    DateRangeParams | undefined
  ];

  // If using dummy data, return the dummy report directly
  if (useDummyData) {
    console.log("Using dummy client report data for client", clientId);
    return Promise.resolve(getDummyClientReport(clientId));
  }
  
  // Otherwise use the real API endpoint
  const url = `/api/clients/${clientId}/reports/performance`;
  
  // Return params instead of building the URL with query string
  let params: Record<string, string> = {};
  
  if (dateRange) {
    if (dateRange.startDate) {
      params.startDate = dateRange.startDate;
    }
    
    if (dateRange.endDate) {
      params.endDate = dateRange.endDate;
    }
  }

  // Use fetch directly
  return fetch(url + (Object.keys(params).length > 0 ? 
    '?' + new URLSearchParams(params).toString() : ''))
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch client report data');
      return res.json();
    });
};

/**
 * Get client strategies data for detailed visualization
 * Uses dummy data if useDummyData flag is true
 */
export const getClientStrategiesReport = ({ queryKey }: { queryKey: unknown[] }) => {
  const [_base, clientId, dateRange] = queryKey as [
    string, 
    number, 
    DateRangeParams | undefined
  ];

  // If using dummy data, return the dummy strategies report directly
  if (useDummyData) {
    console.log("Using dummy client strategies data for client", clientId);
    return Promise.resolve(getDummyClientStrategiesReport(clientId));
  }
  
  // Otherwise use the real API endpoint
  const url = `/api/clients/${clientId}/reports/strategies`;
  
  // Return params instead of building the URL with query string
  let params: Record<string, string> = {};
  
  if (dateRange) {
    if (dateRange.startDate) {
      params.startDate = dateRange.startDate;
    }
    
    if (dateRange.endDate) {
      params.endDate = dateRange.endDate;
    }
  }

  // Use fetch directly
  return fetch(url + (Object.keys(params).length > 0 ? 
    '?' + new URLSearchParams(params).toString() : ''))
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch client strategies data');
      return res.json();
    });
};