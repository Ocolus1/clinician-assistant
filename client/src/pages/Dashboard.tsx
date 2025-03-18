import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { RefreshCw, Users } from "lucide-react";
import { Client } from "@shared/schema";
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
      {/* Dashboard header */}
      <div className="flex justify-between items-center px-6 py-4 border-b">
        <h1 className="text-2xl font-bold text-gray-900">
          Speech Therapy Dashboard
          <span className="text-sm text-muted-foreground ml-2 font-normal">
            Updated {new Date().toLocaleDateString()} 
          </span>
        </h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button 
            onClick={() => setLocation("/clients")}
            className="bg-primary hover:bg-primary/90"
          >
            <Users className="mr-2 h-4 w-4" />
            View All Clients
          </Button>
        </div>
      </div>

      {/* Main dashboard grid - fixed height, no scrolling */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden h-[calc(100vh-72px)]">
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