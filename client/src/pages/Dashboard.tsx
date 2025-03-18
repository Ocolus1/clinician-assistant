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
    <DashboardLayout>
      <div className="grid grid-cols-2 grid-rows-2 gap-4 p-4 h-[calc(100vh-1rem)]">
        {/* Top Left - AI Chatbox */}
        <div className="overflow-auto rounded-lg border shadow-sm">
          <DashboardAIChat />
        </div>
        
        {/* Top Right - Appointment Analytics */}
        <div className="overflow-auto rounded-lg border shadow-sm">
          <AppointmentAnalytics />
        </div>
        
        {/* Bottom Left - Budget Expiration */}
        <div className="overflow-auto rounded-lg border shadow-sm">
          <BudgetExpirationCard />
        </div>
        
        {/* Bottom Right - Tasks Timeline */}
        <div className="overflow-auto rounded-lg border shadow-sm">
          <UpcomingTasksTimeline />
        </div>
      </div>
    </DashboardLayout>
  );
}

// Export the wrapped Dashboard as default
export default DashboardWithProvider;