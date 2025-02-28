import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Users, FileText, CalendarClock, PieChart, ArrowRight } from "lucide-react";
import { Client } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  // Fetch recent clients for the dashboard summary
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Speech Therapy Dashboard</h1>
        <Button 
          onClick={() => setLocation("/clients")}
          className="bg-primary hover:bg-primary/90"
        >
          <Users className="mr-2 h-4 w-4" />
          View All Clients
        </Button>
      </div>

      {/* Dashboard stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-primary mr-2" />
              <div className="text-2xl font-bold">
                {clientsLoading ? <Skeleton className="h-8 w-12" /> : clients.length}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-primary mr-2" />
              <div className="text-2xl font-bold">
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CalendarClock className="h-5 w-5 text-primary mr-2" />
              <div className="text-2xl font-bold">
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <PieChart className="h-5 w-5 text-primary mr-2" />
              <div className="text-2xl font-bold">
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Placeholder for upcoming features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>Session scheduling and calendar integration</li>
              <li>Progress tracking and reporting tools</li>
              <li>Therapy exercise library</li>
              <li>Client communication portal</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => setLocation("/clients")}
              variant="outline" 
              className="w-full justify-start"
            >
              <Users className="mr-2 h-4 w-4" />
              Manage Clients
            </Button>
            <Button 
              disabled
              variant="outline" 
              className="w-full justify-start"
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Schedule Session
            </Button>
            <Button 
              disabled
              variant="outline" 
              className="w-full justify-start"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}