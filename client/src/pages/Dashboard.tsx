import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  DashboardProvider,
  AppointmentAnalytics,
  BudgetExpirationCard,
  BudgetBubbleChart,
  UpcomingTasksTimeline,
  MagicLampChat
} from "@/components/dashboard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RefreshCw, LayoutDashboard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
  
  // Refresh data
  const handleRefresh = () => {
    window.location.reload();
  };
  
  return (
    <DashboardLayout>
      {/* Material Design inspired header with subtle elevation effect */}
      <div className="flex justify-between items-center p-4 pb-2 bg-background backdrop-blur-sm bg-opacity-80 sticky top-0 z-10 border-b">
        <div className="flex items-center">
          <LayoutDashboard className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Badge variant="outline" className="ml-3 px-2 py-0 h-6">
            <span className="text-xs font-normal text-muted-foreground">March 2025</span>
          </Badge>
        </div>
        <div className="flex items-center gap-2">
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
          {/* Left Column (35%) - Communication and Scheduling */}
          <div className="w-full md:w-[35%] flex flex-col gap-4">
            {/* AI Assistant - Magic Lamp */}
            <Card className="flex-grow-0 h-1/3 shadow-sm transition-all hover:shadow-md overflow-hidden">
              <MagicLampChat />
            </Card>
            
            {/* Appointment Analytics */}
            <Card className="flex-grow-0 h-1/3 shadow-sm transition-all hover:shadow-md overflow-hidden">
              <AppointmentAnalytics />
            </Card>
            
            {/* Tasks Timeline */}
            <Card className="flex-grow h-1/3 shadow-sm transition-all hover:shadow-md overflow-hidden">
              <UpcomingTasksTimeline />
            </Card>
          </div>
          
          {/* Right Column (65%) - Financial Visualization */}
          <Card className="w-full md:w-[65%] shadow-sm transition-all hover:shadow-md overflow-hidden">
            <BudgetBubbleChart />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Export the wrapped Dashboard as default
export default DashboardWithProvider;