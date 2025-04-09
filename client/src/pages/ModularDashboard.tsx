import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  DashboardProvider
} from "@/components/dashboard";
import { AppointmentAnalytics } from "@/components/dashboard/AppointmentAnalytics";
import { BudgetExpirationCard } from "@/components/dashboard/BudgetExpirationCard";
import { UpcomingTasksTimeline } from "@/components/dashboard/UpcomingTasksTimeline";
import { DummyDataToggle } from "@/components/dashboard/DummyDataToggle";
import ClinicianAssistantTile from "@/components/dashboard/ClinicianAssistantTile";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  RefreshCw, 
  LayoutDashboard, 
  CalendarClock, 
  BarChart, 
  ListTodo, 
  Plus,
  Brain,
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/utils";
import { Client } from "@shared/schema";
import { cn } from "@/lib/utils";

/**
 * Dashboard wrapper with shared provider
 */
export default function ModularDashboard() {
  return (
    <DashboardProvider months={6}>
      <ModularDashboardContent />
    </DashboardProvider>
  );
}

/**
 * Main dashboard content with on-demand components
 * Displays a clean interface with four square tiles that open modals with detailed information
 */
function ModularDashboardContent() {
  const [, setLocation] = useLocation();
  const { refreshData } = useDashboard();
  
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [revenueModalOpen, setRevenueModalOpen] = useState(false);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);

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
      
      {/* Modular dashboard tiles */}
      <div className="p-8 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)]">
        <h2 className="text-xl font-medium text-center mb-8">
          Select a dashboard module to view detailed information
        </h2>
        
        <div className="flex flex-wrap gap-6 max-w-6xl mx-auto justify-center">
          {/* Budget Expiration Tile */}
          <DashboardTile 
            title="Budget Expiration" 
            description="View plans nearing expiry and remaining funds"
            icon={<CalendarClock />}
            color="#2563EB"
            onClick={() => setBudgetModalOpen(true)}
          />
          
          {/* Revenue Analytics Tile */}
          <DashboardTile 
            title="Revenue Analytics" 
            description="Track appointments and revenue trends"
            icon={<BarChart />}
            color="#10B981"
            onClick={() => setRevenueModalOpen(true)}
          />
          
          {/* Upcoming Tasks Tile */}
          <DashboardTile 
            title="Upcoming Tasks" 
            description="Manage reports, letters and assessments"
            icon={<ListTodo />}
            color="#F59E0B"
            onClick={() => setTasksModalOpen(true)}
          />
          
          {/* Clinician Assistant Tile */}
          <ClinicianAssistantTile
            title="Clinician Assistant"
            description="Query your database using natural language"
          />
        </div>
      </div>
      
      {/* Budget Expiration Modal */}
      <Dialog open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
        <DialogContent className="sm:max-w-[75%] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[#2563EB]" />
              Budget Expiration
            </DialogTitle>
            <DialogDescription>
              Track client budgets nearing expiry and manage remaining funds
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Card className="shadow-sm">
              <div className="h-[60vh]">
                {/* Render BudgetExpirationCard but hide its header */}
                <div className="h-full [&>div>div:first-child]:hidden">
                  <BudgetExpirationCard />
                </div>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Revenue Analytics Modal */}
      <Dialog open={revenueModalOpen} onOpenChange={setRevenueModalOpen}>
        <DialogContent className="sm:max-w-[75%] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-[#10B981]" />
              Revenue Analytics
            </DialogTitle>
            <DialogDescription>
              Track appointment patterns and revenue trends over time
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Card className="shadow-sm">
              <div className="h-[60vh]">
                <AppointmentAnalytics />
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Upcoming Tasks Modal */}
      <Dialog open={tasksModalOpen} onOpenChange={setTasksModalOpen}>
        <DialogContent className="sm:max-w-[75%] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-[#F59E0B]" />
              Upcoming Tasks
            </DialogTitle>
            <DialogDescription>
              Schedule and track upcoming reports, letters and assessments
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Card className="shadow-sm">
              <div className="h-[60vh]">
                <UpcomingTasksTimeline />
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

/**
 * Dashboard Tile Component
 * Individual clickable tile for the modular dashboard
 */
interface DashboardTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  disabled?: boolean;
}

function DashboardTile({ 
  title, 
  description, 
  icon, 
  color,
  onClick,
  disabled = false
}: DashboardTileProps) {
  return (
    <Card 
      className={cn(
        "p-6 flex flex-col items-center text-center aspect-square transition-all w-64",
        disabled 
          ? "opacity-70 cursor-not-allowed bg-muted" 
          : "hover:shadow-md cursor-pointer hover:translate-y-[-2px]"
      )}
      onClick={disabled ? undefined : onClick}
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div 
        className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}20` }} // 20% opacity version of the color
      >
        <div className="h-10 w-10" style={{ color }}>
          {icon}
        </div>
      </div>
      
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}