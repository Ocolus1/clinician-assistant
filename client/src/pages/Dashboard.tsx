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
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
 * Redesigned as a fixed-height grid with no scrolling required
 * Uses a floating menu instead of sidebar to maximize screen space
 */
function DashboardContent() {
  const [, setLocation] = useLocation();
  
  // Refresh data
  const handleRefresh = () => {
    window.location.reload();
  };
  
  return (
    <DashboardLayout>
      {/* Material Design inspired header with refresh button */}
      <div className="flex justify-between items-center p-4 pb-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh}
          className="h-9 w-9 rounded-full"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Two-column layout with 35%/65% split */}
      <div className="flex gap-6 p-4 pt-2 h-[calc(100vh-5rem)]">
        {/* Left Column (35%) - Communication and Scheduling */}
        <div className="w-[35%] flex flex-col gap-6">
          {/* AI Assistant - Magic Lamp */}
          <div className="flex-grow-0 h-1/3 rounded-xl overflow-hidden shadow-md border border-black/5 bg-card transition-all hover:shadow-lg">
            <MagicLampChat />
          </div>
          
          {/* Appointment Analytics */}
          <div className="flex-grow-0 h-1/3 rounded-xl overflow-hidden shadow-md border border-black/5 bg-card transition-all hover:shadow-lg">
            <AppointmentAnalytics />
          </div>
          
          {/* Tasks Timeline */}
          <div className="flex-grow h-1/3 rounded-xl overflow-hidden shadow-md border border-black/5 bg-card transition-all hover:shadow-lg">
            <UpcomingTasksTimeline />
          </div>
        </div>
        
        {/* Right Column (65%) - Financial Visualization */}
        <div className="w-[65%] rounded-xl overflow-hidden shadow-md border border-black/5 bg-card transition-all hover:shadow-lg">
          <BudgetBubbleChart />
        </div>
      </div>
    </DashboardLayout>
  );
}

// Export the wrapped Dashboard as default
export default DashboardWithProvider;