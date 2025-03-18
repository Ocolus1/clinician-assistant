import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { RefreshCw, Users, ArrowRight } from "lucide-react";
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
 */
function DashboardContent() {
  const [, setLocation] = useLocation();
  
  // Fetch recent clients for the dashboard summary
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
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

      {/* Main dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left column - Appointment Analytics (spans 2 columns) */}
        <AppointmentAnalytics />
        
        {/* Right column - Budget Expiration */}
        <div className="col-span-1">
          <BudgetExpirationCard />
        </div>
      </div>
      
      {/* Bottom row - Tasks and AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="col-span-1 lg:col-span-2">
          <UpcomingTasksTimeline />
        </div>
        <div className="col-span-1">
          <DashboardAIChat />
        </div>
      </div>

      {/* Recent clients section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clientsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center p-2 border-b">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : clients.length > 0 ? (
            <div className="space-y-2">
              {clients.slice(0, 5).map((client) => (
                <div key={client.id} className="flex justify-between items-center p-2 border-b hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center bg-gray-100 rounded-full h-8 w-8 text-gray-700">
                      <Users className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{client.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {client.fundsManagement && (
                      <Badge variant="outline" className="mr-2">
                        {client.fundsManagement}
                      </Badge>
                    )}
                    <Button 
                      onClick={() => setLocation(`/client/${client.id}/summary`)} 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No clients found</p>
              <Button 
                onClick={() => setLocation("/clients")}
                variant="outline" 
                className="mt-2"
              >
                Go to Client Management
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export the wrapped Dashboard as default
export default DashboardWithProvider;