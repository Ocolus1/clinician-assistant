import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardData, AppointmentStats } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

// Import dummy data
import { 
  dummyDashboardData, 
  enhanceAppointmentStatsWithRevenue 
} from '@shared/dummy-data';

type TimeFrame = 'day' | 'week' | 'month' | 'year';
type DataLoadingState = 'idle' | 'loading' | 'success' | 'error';
type DataSource = 'real' | 'dummy';

interface DashboardContextType {
  dashboardData: DashboardData | null;
  loadingState: DataLoadingState;
  timeFrame: TimeFrame;
  setTimeFrame: (timeFrame: TimeFrame) => void;
  refreshData: () => void;
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
  error: Error | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

/**
 * Check if a URL parameter exists to enable dummy data
 * URL param: ?dummy=true
 */
function shouldUseDummyData(): boolean {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('dummy') === 'true';
  }
  return false;
}

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
  initialDataSource?: DataSource;
}

/**
 * Dashboard Provider Component
 * 
 * Manages the state and data fetching for the dashboard
 * Supports both real data from API and rich dummy data for development
 */
export function DashboardProvider({ 
  children, 
  months = 6, 
  initialDataSource = shouldUseDummyData() ? 'dummy' : 'real'
}: DashboardProviderProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
  const [dataSource, setDataSource] = useState<DataSource>(initialDataSource);
  
  // Initialize mock data for initial rendering to avoid loading states
  const initialMockAppointmentStats: AppointmentStats = {
    daily: [],
    weekly: [],
    monthly: [],
    yearly: []
  };

  // Initialize data source from URL parameter on first render
  useEffect(() => {
    const useDummy = shouldUseDummyData();
    if (useDummy) {
      console.log('URL parameter detected: using dummy data');
      setDataSource('dummy');
    }
  }, []);

  // Custom query function to directly call our storage methods
  const fetchDashboardData = async (): Promise<DashboardData> => {
    try {
      console.log('Fetching dashboard data directly from server...');
      
      // If using dummy data, return immediately without API call
      if (dataSource === 'dummy') {
        console.log('Using dummy dashboard data instead of API call');
        return JSON.parse(JSON.stringify(dummyDashboardData)); // Deep clone
      }
      
      // Directly access the server-side methods through a special endpoint
      const response = await fetch(`/dashboard-api?months=${months}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
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
      
      // If error occurred and we're not using dummy data, switch to dummy data
      if (dataSource !== 'dummy') {
        console.log('API error - switching to dummy data');
        setDataSource('dummy');
        return JSON.parse(JSON.stringify(dummyDashboardData));
      }
      
      // Return minimal placeholder data as last resort
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
      
      // If using dummy data, return filtered dummy data based on timeframe
      if (dataSource === 'dummy') {
        const dummyData = JSON.parse(JSON.stringify(dummyDashboardData.appointments));
        const enhancedData = enhanceAppointmentStatsWithRevenue(dummyData);
        console.log('Using dummy appointment data for timeframe:', timeFrame);
        return enhancedData;
      }
      
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
      
      // If error and not using dummy data, switch to dummy data for this call
      if (dataSource !== 'dummy') {
        const dummyData = JSON.parse(JSON.stringify(dummyDashboardData.appointments));
        return enhanceAppointmentStatsWithRevenue(dummyData);
      }
      
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
    queryKey: ['/api/dashboard', { months, dataSource }],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for when timeframe changes (only appointment data needs to change)
  const { data: appointmentData } = useQuery<AppointmentStats>({
    queryKey: ['/api/dashboard/appointments', { timeframe: timeFrame, dataSource }],
    queryFn: fetchAppointmentData,
    enabled: dataSource === 'dummy' || !!dashboardData,
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
  if (dataSource === 'dummy') {
    // Always consider dummy data as loaded successfully
    loadingState = 'success';
  } else {
    if (isLoading) loadingState = 'loading';
    else if (isError) loadingState = 'error';
    else if (dashboardData) loadingState = 'success';
  }

  // Function to refresh dashboard data
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/appointments'] });
    refetch();
  }, [refetch]);
  
  // Toggle data source between real and dummy
  const handleSetDataSource = useCallback((source: DataSource) => {
    console.log(`Switching data source from ${dataSource} to ${source}`);
    setDataSource(source);
    
    // Update URL parameter to reflect data source
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (source === 'dummy') {
        url.searchParams.set('dummy', 'true');
      } else {
        url.searchParams.delete('dummy');
      }
      window.history.replaceState({}, '', url.toString());
    }
    
    // Force refetch when switching sources
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/appointments'] });
    
    if (source === 'real') {
      refetch();
    }
  }, [dataSource, refetch]);

  return (
    <DashboardContext.Provider
      value={{
        dashboardData: combinedData || null,
        loadingState,
        timeFrame,
        setTimeFrame,
        refreshData,
        dataSource,
        setDataSource: handleSetDataSource,
        error: error as Error | null,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}