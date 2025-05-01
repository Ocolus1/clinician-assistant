import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Printer, Mail, Check } from "lucide-react";
import { AllySelector } from "../components/summary/AllySelector";
import { Client, Ally, Goal, BudgetItem, BudgetSettings } from "@shared/schema";

// Import toast for notifications
import { useToast } from "@/hooks/use-toast";

// Define the subgoal type to make TypeScript happy
interface Subgoal {
  id: number;
  title: string;
  description: string;
  status?: string;
  goalId: number;
}

// Define the enriched goal type with subgoals
interface EnrichedGoal extends Goal {
  subgoals?: Subgoal[];
}

export default function PrintSummary() {
  const { clientId } = useParams();
  const [, setLocation] = useLocation();
  const [showAllySelector, setShowAllySelector] = useState(false);
  
  // Toast for notifications
  const { toast } = useToast();

  console.log("PrintSummary component - clientId param:", clientId);
  const parsedClientId = clientId ? parseInt(clientId) : 0;
  console.log("PrintSummary component - parsedClientId:", parsedClientId);
  
  // Fetch client data with improved error handling
  const { 
    data: client, 
    isLoading: isClientLoading,
    isError: isClientError,
    error: clientError,
    refetch: refetchClient
  } = useQuery<Client>({
    queryKey: ["/api/clients", parsedClientId],
    queryFn: async () => {
      console.log(`Manually fetching client with ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}`);
      
      if (!response.ok) {
        console.error(`Error fetching client: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch client: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Client data retrieved:", data);
      return data;
    },
    enabled: parsedClientId > 0,
    retry: 3, // Increase retries to handle intermittent issues
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 30000 // Cache for 30 seconds
  });

  console.log("Client query result:", { isLoading: isClientLoading, isError: isClientError, data: client });

  // Only fetch related data if client data was successful
  const fetchRelatedData = Boolean(client?.id);

  const { data: allies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", parsedClientId, "allies"],
    queryFn: async () => {
      console.log(`Fetching allies for client ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}/allies`);
      
      if (!response.ok) {
        console.error(`Error fetching allies: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`Retrieved ${data.length} allies:`, data);
      return data;
    },
    enabled: parsedClientId > 0 && fetchRelatedData,
    retry: 1,
  });

  const { data: goals = [], isSuccess: goalsSuccess } = useQuery<Goal[]>({
    queryKey: ["/api/clients", parsedClientId, "goals"],
    queryFn: async () => {
      console.log(`Fetching goals for client ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}/goals`);
      
      if (!response.ok) {
        console.error(`Error fetching goals: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`Retrieved ${data.length} goals:`, data);
      return data;
    },
    enabled: parsedClientId > 0 && fetchRelatedData,
    retry: 1,
  });
  
  // Fetch subgoals for each goal
  const goalsWithSubgoals = useQuery<EnrichedGoal[]>({
    queryKey: ["/api/clients", parsedClientId, "goals-with-subgoals"],
    queryFn: async () => {
      console.log("Fetching subgoals for all goals");
      const enrichedGoals = await Promise.all(
        goals.map(async (goal) => {
          try {
            const response = await fetch(`/api/goals/${goal.id}/subgoals`);
            if (!response.ok) {
              console.error(`Error fetching subgoals for goal ${goal.id}: ${response.status}`);
              return { ...goal, subgoals: [] } as EnrichedGoal;
            }
            
            const subgoals = await response.json();
            console.log(`Retrieved ${subgoals.length} subgoals for goal ${goal.id}:`, subgoals);
            return { ...goal, subgoals } as EnrichedGoal;
          } catch (error) {
            console.error(`Error processing subgoals for goal ${goal.id}:`, error);
            return { ...goal, subgoals: [] } as EnrichedGoal;
          }
        })
      );
      
      return enrichedGoals;
    },
    enabled: parsedClientId > 0 && goalsSuccess && goals.length > 0,
    retry: 1,
  });

  const { data: budgetItems = [] } = useQuery<BudgetItem[]>({
    queryKey: ["/api/clients", parsedClientId, "budget-items"],
    queryFn: async () => {
      console.log(`Fetching budget items for client ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}/budget-items`);
      
      if (!response.ok) {
        console.error(`Error fetching budget items: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`Retrieved ${data.length} budget items:`, data);
      return data;
    },
    enabled: parsedClientId > 0 && fetchRelatedData,
    retry: 1,
  });

  const { data: budgetSettings } = useQuery<BudgetSettings>({
    queryKey: ["/api/clients", parsedClientId, "budget-settings"],
    queryFn: async () => {
      console.log(`Fetching budget settings for client ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}/budget-settings`);
      
      if (!response.ok) {
        console.error(`Error fetching budget settings: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.log("Retrieved budget settings:", data);
      return data;
    },
    enabled: parsedClientId > 0 && fetchRelatedData,
    retry: 1,
  });

  const totalBudget = budgetItems.reduce((acc: number, item: BudgetItem) => {
    return acc + (item.unitPrice * item.quantity);
  }, 0);
  
  // Show loading state
  if (isClientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading client data...</h1>
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show error state if there was an error loading the client
  if (isClientError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Error loading client</h1>
          <p className="text-muted-foreground mb-4">There was a problem loading client data.</p>
          
          {/* Display the error details */}
          <div className="text-sm text-red-500 mb-4 p-2 bg-red-50 rounded-md overflow-auto text-left">
            {clientError instanceof Error 
              ? clientError.message 
              : "Unknown error occurred"}
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button onClick={() => refetchClient()} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => setLocation("/")} variant="default">
              Return Home
            </Button>
            <Button onClick={() => setLocation(`/summary/${clientId}`)} variant="ghost">
              Return to Summary
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if client not found after loading
  if (!client && parsedClientId > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Client not found</h1>
          <p className="mb-4 text-muted-foreground">The client with ID {parsedClientId} could not be found.</p>
          <Button onClick={() => setLocation("/")}>Return Home</Button>
        </div>
      </div>
    );
  }
  
  // If client is null but we're not loading, that's an error (shouldn't happen with the enabled flag)
  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Client not found</h1>
          <Button onClick={() => setLocation("/")}>Return Home</Button>
        </div>
      </div>
    );
  }
  
  // Handle print functionality
  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleEmailClick = () => {
    setShowAllySelector(true);
  };

  const handleApproveClick = () => {
    // This will be implemented later
    alert("This feature will be implemented in the future");
  };

  return (
    <div className="min-h-screen bg-background print:bg-white print:p-0">
      <div className="container mx-auto py-8 print:p-0">
        {/* Header and action buttons */}
        <div className="print:hidden mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Onboarding Summary</h1>
            <p className="text-muted-foreground">Review and print client onboarding details</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setLocation(`/summary/${clientId}`)}
            >
              Back to Summary
            </Button>
            
            <Button 
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            
            <Button 
              onClick={handleEmailClick}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmailClick}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleApproveClick}>
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Document title - visible in print */}
        <div className="mb-8 print:mb-4 text-center">
          <h1 className="text-3xl font-bold">Onboarding Summary</h1>
          <p className="text-muted-foreground">Confidential Report</p>
        </div>

        {/* Personal Information */}
        <Card className="mb-8 border-none print:border print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                <p className="text-base">{client.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Date of Birth</h3>
                <p className="text-base">{client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Client ID</h3>
                <p className="text-base">{client.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Funds Management</h3>
                <p className="text-base">{client.fundsManagement || "Not specified"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Allies */}
        <Card className="mb-8 border-none print:border print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>Allies</CardTitle>
          </CardHeader>
          <CardContent>
            {allies.length > 0 ? (
              <div className="grid gap-4">
                {allies.map((ally: Ally) => (
                  <div key={ally.id} className="grid md:grid-cols-4 gap-2 border-b pb-3 last:border-0">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                      <p className="text-base">{ally.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Relationship</h3>
                      <p className="text-base">{ally.relationship}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Preferred Language</h3>
                      <p className="text-base">{ally.preferredLanguage || "Not specified"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                      <p className="text-base">{ally.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No allies have been added for this client.</p>
            )}
          </CardContent>
        </Card>

        {/* Goals and Subgoals */}
        <Card className="mb-8 border-none print:border print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>Goals and Subgoals</CardTitle>
          </CardHeader>
          <CardContent>
            {goalsWithSubgoals.data ? goalsWithSubgoals.data.map((goal: EnrichedGoal, index: number) => (
              <div key={goal.id} className={`mb-6 ${index !== goalsWithSubgoals.data!.length - 1 ? "border-b pb-6" : ""}`}>
                <h3 className="text-lg font-semibold mb-2">{goal.title}</h3>
                <p className="text-sm mb-4">{goal.description}</p>
                
                {goal.subgoals && goal.subgoals.length > 0 ? (
                  <div className="pl-4 border-l-2 border-muted">
                    {goal.subgoals.map((subgoal) => (
                      <div key={subgoal.id} className="mb-4 last:mb-0">
                        <div className="flex items-center mb-1">
                          <h4 className="text-base font-medium">{subgoal.title}</h4>
                          {subgoal.status && (
                            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              subgoal.status === "Completed" ? "bg-green-100 text-green-800" : 
                              subgoal.status === "In Progress" ? "bg-blue-100 text-blue-800" :
                              subgoal.status === "Not Started" ? "bg-gray-100 text-gray-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {subgoal.status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{subgoal.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No subgoals defined for this goal.</p>
                )}
              </div>
            )) : goals.map((goal: Goal, index: number) => (
              <div key={goal.id} className={`mb-6 ${index !== goals.length - 1 ? "border-b pb-6" : ""}`}>
                <h3 className="text-lg font-semibold mb-2">{goal.title}</h3>
                <p className="text-sm mb-4">{goal.description}</p>
                <p className="text-sm text-muted-foreground italic">Subgoals are being loaded...</p>
              </div>
            ))}
            
            {goals.length === 0 && (
              <p className="text-muted-foreground italic">No goals have been defined for this client.</p>
            )}
          </CardContent>
        </Card>

        {/* Budget Summary */}
        <Card className="mb-8 border-none print:border print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>Budget Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetSettings ? (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Therapeutics Access</h3>
                  <p className="text-base">{budgetSettings.therapeuticsAccess || "Not specified"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Financial Access</h3>
                  <p className="text-base">{budgetSettings.financialAccess || "Not specified"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Priority</h3>
                  <p className="text-base">{budgetSettings.priority || "Not specified"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Available Funds</h3>
                  <p className="text-base">${budgetSettings.availableFunds.toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">End of Plan</h3>
                  <p className="text-base">{budgetSettings.endOfPlan ? new Date(budgetSettings.endOfPlan).toLocaleDateString() : "Not specified"}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic mb-6">No budget settings have been defined for this client.</p>
            )}

            {/* Budget Items */}
            <h3 className="font-semibold mb-3">Budget Items</h3>
            {budgetItems.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="pb-2 font-medium text-muted-foreground">Item Code</th>
                        <th className="pb-2 font-medium text-muted-foreground">Description</th>
                        <th className="pb-2 font-medium text-muted-foreground text-right">Unit Price</th>
                        <th className="pb-2 font-medium text-muted-foreground text-right">Qty</th>
                        <th className="pb-2 font-medium text-muted-foreground text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetItems.map((item: BudgetItem) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-3">{item.itemCode}</td>
                          <td className="py-3">{item.description}</td>
                          <td className="py-3 text-right">${item.unitPrice.toFixed(2)}</td>
                          <td className="py-3 text-right">{item.quantity}</td>
                          <td className="py-3 text-right">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-medium">
                        <td colSpan={4} className="pt-3 text-right">Total Budget:</td>
                        <td className="pt-3 text-right">${totalBudget.toFixed(2)}</td>
                      </tr>
                      {budgetSettings && (
                        <tr className="font-medium">
                          <td colSpan={4} className="pt-1 text-right">Remaining Balance:</td>
                          <td className="pt-1 text-right">
                            ${(budgetSettings.availableFunds - totalBudget).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No budget items have been added for this client.</p>
            )}
          </CardContent>
        </Card>

        {/* Document footer - visible in print */}
        <div className="mt-8 print:mt-4 text-center text-sm text-muted-foreground border-t pt-4">
          <p>This document is confidential and contains information protected by law.</p>
          <p className="mt-1">© Speech Therapy Clinic - All rights reserved</p>
        </div>

        {/* Email Modal */}
        <AllySelector
          open={showAllySelector}
          onOpenChange={setShowAllySelector}
          allies={allies}
          onSelectAllies={(selectedAllies) => {
            setShowAllySelector(false);
            toast({
              title: "Email would be sent",
              description: `Email would be sent to: ${selectedAllies.map((a: Ally) => a.email).join(', ')}`,
            });
          }}
        />
      </div>
    </div>
  );
}