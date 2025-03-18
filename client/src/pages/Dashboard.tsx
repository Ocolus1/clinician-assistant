import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  DashboardProvider,
  AppointmentAnalytics,
  BudgetExpirationCard,
  UpcomingTasksTimeline,
  DashboardAIChat
} from "@/components/dashboard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

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
    <DashboardLayout onRefreshClick={handleRefresh}>
      <div className="grid grid-cols-2 gap-4 p-4 overflow-hidden h-screen">
        {/* Top Left - AI Chatbox */}
        <div className="h-full">
          <DashboardAIChat />
        </div>
        
        {/* Top Right - Appointment Analytics */}
        <div className="h-full">
          <AppointmentAnalytics />
        </div>
        
        {/* Bottom Left - Budget Expiration */}
        <div className="h-full">
          <BudgetExpirationCard />
        </div>
        
        {/* Bottom Right - Tasks Timeline */}
        <div className="h-full">
          <UpcomingTasksTimeline />
        </div>
      </div>
    </DashboardLayout>
  );
}

// Export the wrapped Dashboard as default
export default DashboardWithProvider;