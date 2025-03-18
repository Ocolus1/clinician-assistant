import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  DashboardProvider,
  AppointmentAnalytics,
  BudgetExpirationCard,
  BudgetVisualization,
  UpcomingTasksTimeline
} from "@/components/dashboard";
import { DummyDataToggle } from "@/components/dashboard/DummyDataToggle";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RefreshCw, LayoutDashboard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { Separator } from "@/components/ui/separator";
import { useAgent } from "@/components/agent";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Client } from "@shared/schema";

/**
 * Dashboard wrapper with shared provider
 */
function DashboardWithProvider() {
  return (
    <DashboardProvider months={6}>
      <DashboardContent />
    </DashboardProvider>
  );
}

/**
 * Main dashboard content with analytics and visualization components
 * Implements Material Design principles with a modern, responsive two-column layout
 * Focus on data visualization and actionable insights
 */
function DashboardContent() {
  const [, setLocation] = useLocation();
  const { refreshData } = useDashboard();
  const { setActiveClient } = useAgent();
  
  // Fetch default client for agent context
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      return response as unknown as Client[];
    }
  });
  
  // Set active client when data is available
  useEffect(() => {
    if (clients && clients.length > 0) {
      setActiveClient(clients[0]);
    }
  }, [clients, setActiveClient]);
  
  // Refresh data
  const handleRefresh = () => {
    refreshData();
  };
  
  // Get current date for the header badge
  const currentDate = new Date();
  const currentMonthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long',
    year: 'numeric'
  });
  
  return (
    <DashboardLayout>
      {/* Material Design inspired header with subtle elevation effect */}
      <div className="flex justify-between items-center p-4 pb-2 bg-background backdrop-blur-sm bg-opacity-80 sticky top-0 z-10 border-b">
        <div className="flex items-center">
          <LayoutDashboard className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Badge variant="outline" className="ml-3 px-2 py-0 h-6">
            <span className="text-xs font-normal text-muted-foreground">{currentMonthYear}</span>
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Dummy data toggle */}
          <DummyDataToggle />
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            className="h-9 w-9 rounded-full focus:ring-2 ring-primary/25"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Dashboard content area with responsive two-column layout */}
      <div className="p-4 pt-2">
        <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-6rem)]">
          {/* Left Column (35%) - Analytics and Tasks */}
          <div className="w-full md:w-[35%] flex flex-col gap-4">
            {/* Appointment Analytics - Now with 50% height */}
            <Card className="flex-grow-0 h-1/2 shadow-sm transition-all hover:shadow-md overflow-hidden">
              <AppointmentAnalytics />
            </Card>
            
            {/* Tasks Timeline - Now with 50% height */}
            <Card className="flex-grow h-1/2 shadow-sm transition-all hover:shadow-md overflow-hidden">
              <UpcomingTasksTimeline />
            </Card>
          </div>
          
          {/* Right Column (65%) - Financial Visualization */}
          <BudgetVisualization className="w-full md:w-[65%] shadow-sm transition-all hover:shadow-md overflow-hidden" />
        </div>
      </div>
    </DashboardLayout>
  );
}

// Export the wrapped Dashboard as default
export default DashboardWithProvider;