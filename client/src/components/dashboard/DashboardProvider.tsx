import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardData, AppointmentStats } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

type TimeFrame = 'day' | 'week' | 'month' | 'year';
type DataLoadingState = 'idle' | 'loading' | 'success' | 'error';

interface DashboardContextType {
  dashboardData: DashboardData | null;
  loadingState: DataLoadingState;
  timeFrame: TimeFrame;
  setTimeFrame: (timeFrame: TimeFrame) => void;
  refreshData: () => void;
  error: Error | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

/**
 * Custom hook for using the dashboard context
 */
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

interface DashboardProviderProps {
  children: React.ReactNode;
  /**
   * Number of months to fetch data for (primarily for budget and task planning)
   */
  months?: number;
}

/**
 * Dashboard Provider Component
 * 
 * Manages the state and data fetching for the dashboard
 * Consolidates API requests to reduce network overhead
 */
export function DashboardProvider({ children, months = 6 }: DashboardProviderProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
  
  // Initialize mock data for initial rendering to avoid loading states
  const initialMockAppointmentStats: AppointmentStats = {
    daily: [],
    weekly: [],
    monthly: [],
    yearly: []
  };

  // Custom query function to directly call our storage methods
  const fetchDashboardData = async (): Promise<DashboardData> => {
    try {
      console.log('Fetching dashboard data directly from server...');
      
      // Directly access the server-side methods through a special endpoint
      // that bypasses the catch-all route
      const response = await fetch(`/dashboard-api?months=${months}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // This helps some servers identify AJAX requests
        }
      });
      
      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const result = await response.json();
      
      // If we get data, use it
      if (result && result.data) {
        console.log('Dashboard data fetched successfully:', result.data);
        return result.data as DashboardData;
      }
      
      // If we don't get data, throw an error
      throw new Error('No dashboard data returned from server');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // For debugging purposes only, return initial placeholder data
      // In production, this would throw the error
      return {
        appointments: initialMockAppointmentStats,
        budgets: {
          expiringNextMonth: { count: 0, byClient: [] },
          remainingFunds: []
        },
        tasks: { byMonth: [] },
        lastUpdated: new Date().toISOString()
      };
    }
  };
  
  // Custom query function for appointment data
  const fetchAppointmentData = async (): Promise<AppointmentStats> => {
    try {
      console.log(`Fetching appointment data for timeframe: ${timeFrame}`);
      
      const response = await fetch(`/dashboard-api/appointments?timeframe=${timeFrame}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Appointment API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result && result.data) {
        console.log('Appointment data fetched successfully:', result.data);
        return result.data as AppointmentStats;
      }
      
      throw new Error('No appointment data returned from server');
    } catch (error) {
      console.error('Error fetching appointment data:', error);
      return initialMockAppointmentStats;
    }
  };

  // Main dashboard data query
  const { 
    data: dashboardData,
    isLoading, 
    isError,
    error,
    refetch
  } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard', { months }],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for when timeframe changes (only appointment data needs to change)
  const { data: appointmentData } = useQuery<AppointmentStats>({
    queryKey: ['/api/dashboard/appointments', { timeframe: timeFrame }],
    queryFn: fetchAppointmentData,
    enabled: !!dashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Merge the appointment data with the rest of the dashboard data
  const combinedData: DashboardData | null = dashboardData 
    ? {
        ...dashboardData,
        appointments: appointmentData || dashboardData.appointments,
      }
    : null;

  // Determine loading state
  let loadingState: DataLoadingState = 'idle';
  if (isLoading) loadingState = 'loading';
  else if (isError) loadingState = 'error';
  else if (dashboardData) loadingState = 'success';

  // Function to refresh dashboard data
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/appointments'] });
    refetch();
  }, [refetch]);

  return (
    <DashboardContext.Provider
      value={{
        dashboardData: combinedData || null,
        loadingState,
        timeFrame,
        setTimeFrame,
        refreshData,
        error: error as Error | null,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}