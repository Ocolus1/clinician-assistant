import React, { useState, useEffect } from "react";
import { useParams, useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Users, 
  Target, 
  DollarSign, 
  Calendar, 
  FileText,
  ArrowLeft,
  Edit,
  Clock,
  ChevronRight,
  MessageSquare,
  Award
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Client, Ally, Goal, Subgoal, BudgetSettings, BudgetItem } from "@shared/schema";

// Tab components
import ClientPersonalInfo from "@/components/profile/ClientPersonalInfo";
import ClientAllies from "@/components/profile/ClientAllies";
import ClientGoals from "@/components/profile/ClientGoals";
import ClientBudget from "@/components/profile/ClientBudget";
import ClientSessions from "@/components/profile/ClientSessions";
import ClientReports from "@/components/profile/ClientReports";

// Function to parse URL parameters for active tab
function getActiveTabFromURL(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tab') || 'personal';
}

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());

  // Fetch client data
  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ['/api/clients', clientId],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch allies
  const { data: allies = [], isLoading: isLoadingAllies } = useQuery<Ally[]>({
    queryKey: ['/api/clients', clientId, 'allies'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch goals
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/clients', clientId, 'goals'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch budget items
  const { data: budgetItems = [], isLoading: isLoadingBudgetItems } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch budget settings
  const { data: budgetSettings, isLoading: isLoadingBudgetSettings } = useQuery<BudgetSettings>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch subgoals for each goal
  const subgoalQueries = goals.map((goal: Goal) => {
    return useQuery<Subgoal[]>({
      queryKey: ['/api/goals', goal.id, 'subgoals'],
      queryFn: getQueryFn({ on401: "throw" }),
      enabled: !!goal.id,
    });
  });

  const isLoadingSubgoals = subgoalQueries.some((query: any) => query.isLoading);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL with tab parameter without navigating
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url.toString());
  };

  // Go back to client list
  const handleBack = () => {
    setLocation("/clients");
  };

  // Calculate total budget
  const totalBudget = React.useMemo(() => {
    return budgetItems.reduce((acc: number, item: BudgetItem) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return acc + (unitPrice * quantity);
    }, 0);
  }, [budgetItems]);

  // Calculate budget percentage
  const budgetPercentage = React.useMemo(() => {
    if (!budgetSettings) return 0;
    const availableFunds = typeof budgetSettings.availableFunds === 'string' 
      ? parseFloat(budgetSettings.availableFunds) 
      : budgetSettings.availableFunds;
    
    return availableFunds > 0 ? (totalBudget / availableFunds) * 100 : 0;
  }, [totalBudget, budgetSettings]);

  // Loading state
  const isLoading = isLoadingClient || isLoadingAllies || isLoadingGoals || 
    isLoadingBudgetItems || isLoadingBudgetSettings || isLoadingSubgoals;

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-4" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-8" />
            <div className="space-y-8">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-4" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Client Not Found</h1>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-medium mb-2">Client not found</h2>
            <p className="text-gray-500 mb-4">The client you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={handleBack}>Return to Client List</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const clientAge = client.dateOfBirth ? calculateAge(client.dateOfBirth) : null;

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4" 
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Client Profile</h1>
      </div>
      
      {/* Client info card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{client.name}</h2>
                <div className="flex items-center text-gray-500">
                  {clientAge && (
                    <span className="mr-3">{clientAge} years old</span>
                  )}
                  {client.dateOfBirth && (
                    <span>Born: {format(new Date(client.dateOfBirth), 'PP')}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {client.fundsManagement}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-500">Allies</div>
                <div className="font-medium">{allies.length} supporters</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Target className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-500">Progress</div>
                <div className="font-medium">{goals.length} active goals</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-500">Budget</div>
                <div className="flex items-center">
                  <div className="font-medium mr-2">
                    ${totalBudget.toFixed(2)} / ${budgetSettings ? budgetSettings.availableFunds.toFixed(2) : '0.00'}
                  </div>
                  <Progress value={budgetPercentage} className="h-2 w-16" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs section */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-6 mb-6">
          <TabsTrigger value="personal" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Personal Info</span>
            <span className="inline md:hidden">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="allies" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            <span>Allies</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            <span>Goals</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>Budget</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            <span>Reports</span>
          </TabsTrigger>
        </TabsList>
        
        <Card>
          <CardContent className="p-6">
            <TabsContent value="personal" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Personal Information</h3>
              <p className="text-gray-500 mb-6">
                View and edit the client's personal details, contact information, and preferences.
              </p>
              
              {/* Use the ClientPersonalInfo component */}
              {client && (
                <>
                  {console.log("Client data from parent component:", JSON.stringify(client))}
                  {/* Force date conversion and data passing */}
                  <ClientPersonalInfo 
                    client={{
                      ...client
                      // No type casting needed - we'll handle this in the component
                    }}
                    onEdit={() => console.log("Edit personal info clicked")} 
                  />
                </>
              )}
            </TabsContent>
            
            <TabsContent value="allies" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Support Network</h3>
              <p className="text-gray-500 mb-6">
                Manage the client's support network including family members, caregivers, and therapists.
              </p>
              
              {/* Use the ClientAllies component */}
              <ClientAllies
                allies={allies}
                onAddAlly={() => console.log("Add ally clicked")}
                onEditAlly={(ally) => console.log("Edit ally clicked", ally)}
                onDeleteAlly={(ally) => console.log("Delete ally clicked", ally)}
                onContactAlly={(ally) => console.log("Contact ally clicked", ally)}
              />
            </TabsContent>
            
            <TabsContent value="goals" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Therapeutic Goals</h3>
              <p className="text-gray-500 mb-6">
                Track and manage the client's therapeutic goals and sub-goals.
              </p>
              
              {/* Create a subgoals map to pass to the ClientGoals component */}
              <ClientGoals 
                goals={goals}
                subgoals={subgoalQueries.reduce((acc, query, index) => {
                  if (goals[index] && query.data) {
                    acc[goals[index].id] = query.data;
                  }
                  return acc;
                }, {} as Record<number, Subgoal[]>)}
                onAddGoal={() => console.log("Add goal clicked")}
                onEditGoal={(goal) => console.log("Edit goal clicked", goal)}
                onArchiveGoal={(goal) => console.log("Archive goal clicked", goal)}
                onAddSubgoal={(goalId) => console.log("Add subgoal clicked for goal", goalId)}
                onEditSubgoal={(subgoal) => console.log("Edit subgoal clicked", subgoal)}
                onToggleSubgoalStatus={(subgoal) => console.log("Toggle subgoal status clicked", subgoal)}
              />
            </TabsContent>
            
            <TabsContent value="budget" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Budget Management</h3>
              <p className="text-gray-500 mb-6">
                Track and manage the client's budget, funding sources, and expenditures.
              </p>
              
              {/* Use the ClientBudget component */}
              <ClientBudget 
                budgetSettings={budgetSettings}
                budgetItems={budgetItems}
                onEditSettings={() => console.log("Edit budget settings clicked")}
                onAddItem={() => console.log("Add budget item clicked")}
                onEditItem={(item) => console.log("Edit budget item clicked", item)}
                onDeleteItem={(item) => console.log("Delete budget item clicked", item)}
              />
            </TabsContent>
            
            <TabsContent value="sessions" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Therapy Sessions</h3>
              <p className="text-gray-500 mb-6">
                Schedule and track therapy sessions, view session history and notes.
              </p>
              
              {/* Use the ClientSessions component */}
              <ClientSessions />
            </TabsContent>
            
            <TabsContent value="reports" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Progress Reports</h3>
              <p className="text-gray-500 mb-6">
                Generate, view, and share progress reports and assessments.
              </p>
              
              {/* Use the ClientReports component */}
              <ClientReports />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}