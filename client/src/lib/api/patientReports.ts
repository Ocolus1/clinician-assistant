/**
 * Patient Reports API
 * 
 * Functions for fetching report data from the server
 */
import { getQueryFn } from '@/lib/queryClient';
import { getDummyClientReport, getDummyClientStrategiesReport } from '@/../../shared/dummy-data';

// Flag to control dummy data for development
const useDummyData = false;

export interface PatientReportData {
  patientDetails: PatientDetailsData;
  keyMetrics: KeyMetricsData;
  observations: ObservationsData;
  cancellations: CancellationsData;
  strategies: StrategiesData;
  goals: GoalsData;
  budgetStartDate?: string; // Start date of the active budget plan
}

export interface PatientDetailsData {
  id: number;
  name: string;
  age: number;
  fundsManagement: string;
  caregivers: Array<{
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
 * Get patient performance report
 * Uses dummy data if useDummyData flag is true
 */
export const getPatientPerformanceReport = ({ queryKey }: { queryKey: unknown[] }) => {
  const [_base, patientId, dateRange] = queryKey as [
    string, 
    number, 
    DateRangeParams | undefined
  ];

  // If using dummy data, return the dummy report directly
  if (useDummyData) {
    console.log("Using dummy patient report data for patient", patientId);
    return Promise.resolve(getDummyClientReport(patientId));
  }
  
  // Otherwise use the real API endpoint
  const url = `/api/patients/${patientId}/reports/performance`;
  
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
      if (!res.ok) throw new Error('Failed to fetch patient report data');
      return res.json();
    });
};

/**
 * Get patient strategies data for detailed visualization
 * Uses dummy data if useDummyData flag is true
 */
export const getPatientStrategiesReport = ({ queryKey }: { queryKey: unknown[] }) => {
  const [_base, patientId, dateRange] = queryKey as [
    string, 
    number, 
    DateRangeParams | undefined
  ];

  // If using dummy data, return the dummy strategies report directly
  if (useDummyData) {
    console.log("Using dummy patient strategies data for patient", patientId);
    return Promise.resolve(getDummyClientStrategiesReport(patientId));
  }
  
  // Otherwise use the real API endpoint
  const url = `/api/patients/${patientId}/reports/strategies`;
  
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
      if (!res.ok) throw new Error('Failed to fetch patient strategies data');
      return res.json();
    });
};
