import React, { useState, useEffect, useMemo } from "react";
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
  Award,
  PlusCircle,
  Mail,
  Phone
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RELATIONSHIP_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Client, Ally, Goal, Subgoal, BudgetSettings, BudgetItem } from "@shared/schema";

// Tab components
import ClientPersonalInfo from "@/components/profile/ClientPersonalInfo";
import ClientAllies from "@/components/profile/ClientAllies";
import ClientGoals from "@/components/profile/ClientGoals";
import ClientBudget from "@/components/profile/ClientBudget";
import ClientSessions from "@/components/profile/ClientSessions";
import ClientReports from "@/components/profile/ClientReports";
import AddAllyDialog from "@/components/profile/AddAllyDialog";
import EditGoalDialog from "@/components/profile/EditGoalDialog";
import EditSubgoalDialog from "@/components/profile/EditSubgoalDialog";

// Function to parse URL parameters for active tab
function getActiveTabFromURL(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tab') || 'personal';
}

export default function ClientProfile() {
  // Initialize toast hook
  const { toast } = useToast();
  
  // The route parameter is 'id' not 'clientId'
  const params = useParams();
  console.log("All URL params:", params); // Debug all params
  
  // Get the id parameter using destructuring
  const { id } = params;
  console.log("Raw ID from URL params:", id); // Add this for debugging
  
  // Parse the ID into a number, ensuring it's a valid number
  const clientId = id && !isNaN(parseInt(id)) ? parseInt(id) : NaN;
  console.log("Parsed client ID:", clientId); // Add this for debugging
  
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());
  // IMPORTANT: Define all state hooks at the top level, before any conditional returns
  const [subgoalsByGoal, setSubgoalsByGoal] = useState<Record<number, Subgoal[]>>({});
  const [isLoadingSubgoals, setIsLoadingSubgoals] = useState(false);
  const [showAddAllyDialog, setShowAddAllyDialog] = useState(false);

  // Fetch client data with enhanced logging
  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ['/api/clients', clientId],
    queryFn: async (context) => {
      console.log("Fetching client data for ID:", clientId);
      const url = `/api/clients/${clientId}`;
      console.log("Requesting URL:", url);
      
      const result = await fetch(url);
      if (!result.ok) {
        throw new Error(`Failed to fetch client: ${result.status}`);
      }
      
      const data = await result.json();
      console.log("Client data received:", JSON.stringify(data));
      return data;
    },
  });

  // Fetch allies
  const { data: allies = [], isLoading: isLoadingAllies } = useQuery<Ally[]>({
    queryKey: ['/api/clients', clientId, 'allies'],
    queryFn: async () => {
      console.log("Fetching allies for client ID:", clientId);
      const response = await fetch(`/api/clients/${clientId}/allies`);
      const data = await response.json();
      console.log("Allies data received:", JSON.stringify(data));
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch goals - using explicit fetch to debug
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/clients', clientId, 'goals'],
    queryFn: async () => {
      console.log("Explicitly fetching goals for client ID:", clientId);
      const response = await fetch(`/api/clients/${clientId}/goals`);
      const data = await response.json();
      console.log("Goals data received:", data);
      return data;
    },
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
  
  // Use useEffect to fetch subgoals when goals are loaded
  useEffect(() => {
    // Only run if goals are valid
    if (!goals || goals.length === 0) {
      console.log("No goals found, skipping subgoal fetch");
      return;
    }
    
    // Set loading state
    setIsLoadingSubgoals(true);
    console.log(`Found ${goals.length} goals, fetching subgoals for each goal`);
    
    // Create an array of promises to fetch subgoals for each goal
    const fetchSubgoals = async () => {
      try {
        const result: Record<number, Subgoal[]> = {};
        
        // Fetch subgoals for each goal
        for (const goal of goals) {
          if (goal && goal.id) {
            try {
              console.log(`Fetching subgoals for goal ID: ${goal.id}, Title: ${goal.title}`);
              const response = await fetch(`/api/goals/${goal.id}/subgoals`);
              if (response.ok) {
                const data = await response.json();
                console.log(`Received ${data.length} subgoals for goal ${goal.id}:`, data);
                result[goal.id] = data;
              } else {
                console.error(`Failed to fetch subgoals for goal ${goal.id}, status: ${response.status}`);
                result[goal.id] = [];
              }
            } catch (error) {
              console.error(`Error fetching subgoals for goal ${goal.id}:`, error);
              result[goal.id] = [];
            }
          }
        }
        
        // Update state with all fetched subgoals
        console.log("Final subgoals by goal:", result);
        setSubgoalsByGoal(result);
        setIsLoadingSubgoals(false);
      } catch (error) {
        console.error("Error fetching subgoals:", error);
        setIsLoadingSubgoals(false);
      }
    };
    
    fetchSubgoals();
  }, [goals]); // Only re-run when goals change

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
  const totalBudget = useMemo(() => {
    return budgetItems.reduce((acc: number, item: BudgetItem) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return acc + (unitPrice * quantity);
    }, 0);
  }, [budgetItems]);

  // Calculate budget percentage - safely handle nullish values
  const budgetPercentage = useMemo(() => {
    if (!budgetSettings || !budgetSettings.availableFunds) return 0;
    
    const availableFunds = typeof budgetSettings.availableFunds === 'string' 
      ? parseFloat(budgetSettings.availableFunds) 
      : budgetSettings.availableFunds;
    
    return availableFunds > 0 ? (totalBudget / availableFunds) * 100 : 0;
  }, [totalBudget, budgetSettings]);

  // Loading state
  const isLoading = isLoadingClient || isLoadingAllies || isLoadingGoals || 
    isLoadingBudgetItems || isLoadingBudgetSettings || isLoadingSubgoals;

  // Calculate age from date of birth - Define this BEFORE any conditional returns
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

  // Calculate client age - Safely handle this to avoid errors
  const clientAge = client && client.dateOfBirth ? calculateAge(client.dateOfBirth) : null;

  // Now we can have conditional returns after ALL hooks have been defined
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
      
      {/* Add Ally Dialog - using separate component to avoid React hooks issues */}
      {client && (
        <AddAllyDialog
          open={false}
          onOpenChange={() => {}}
          clientId={clientId}
          clientName={client.name}
        />
      )}
      
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
              {/* Use the ClientAllies component */}
              <ClientAllies
                allies={allies}
                clientId={clientId}
                onAddAlly={() => {
                }}
                onEditAlly={(ally) => {
                  // We've implemented this already in ClientAllies
                  // This is just a fallback in case something's wrong
                  console.log("Edit ally clicked from parent:", ally);
                }}
                onDeleteAlly={(ally) => {
                  // Note: We're using archive instead of delete now
                  console.log("Delete ally clicked from parent:", ally);
                }}
                onContactAlly={(ally) => {
                  // Direct email is already implemented in ClientAllies
                  // This is just a fallback
                  window.location.href = `mailto:${ally.email}`;
                }}
              />
            </TabsContent>
            
            <TabsContent value="goals" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Therapeutic Goals</h3>
              <p className="text-gray-500 mb-6">
                Track and manage the client's therapeutic goals and sub-goals.
              </p>
              
              {/* Create a subgoals map to pass to the ClientGoals component */}
              <ClientGoals 
                goals={goals || []}
                subgoals={subgoalsByGoal || {}}
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
