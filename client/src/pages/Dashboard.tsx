import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { RefreshCw, Users } from "lucide-react";
import {
  DashboardProvider,
  AppointmentAnalytics,
  BudgetExpirationCard,
  UpcomingTasksTimeline,
  DashboardAIChat
} from "@/components/dashboard";

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
 */
function DashboardContent() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main dashboard grid - fixed height, no scrolling */}
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
    </div>
  );
}

// Export the wrapped Dashboard as default
export default DashboardWithProvider;