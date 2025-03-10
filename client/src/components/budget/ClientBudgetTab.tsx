import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";
import { BudgetPlan, BudgetItemDetail } from "./BudgetPlanFullView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { PlusCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BudgetPlansView from "../profile/BudgetPlansView";

interface ClientBudgetTabProps {
  clientId: number;
  budgetSettings?: BudgetSettings;
  budgetItems?: BudgetItem[];
}

export default function ClientBudgetTab({ 
  clientId,
  budgetSettings: initialBudgetSettings,
  budgetItems: initialBudgetItems 
}: ClientBudgetTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // We no longer need tab state as we're displaying plans directly

  // Fetch budget settings for the client
  const { 
    data: budgetSettingsData, 
    isLoading: isLoadingSettings,
    error: settingsError
  } = useQuery<BudgetSettings | BudgetSettings[]>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    queryFn: async () => {
      console.log(`Fetching budget settings for client ID: ${clientId} with ALL=true`);
      try {
        // Explicitly request all budget settings
        const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
        
        if (!response.ok) {
          console.error(`Error fetching budget settings: ${response.status} ${response.statusText}`);
          return [];
        }
        
        const data = await response.json();
        console.log(`Retrieved ${Array.isArray(data) ? data.length : 1} budget settings:`, data);
        return data;
      } catch (error) {
        console.error("Error in budget settings fetch:", error);
        return [];
      }
    },
    retry: 1,
  });
  
  // Convert budgetSettings to array format for consistent handling
  const budgetSettings = useMemo(() => {
    if (!budgetSettingsData) return [];
    return Array.isArray(budgetSettingsData) ? budgetSettingsData : [budgetSettingsData];
  }, [budgetSettingsData]);

  // Fetch budget items for the client
  const { 
    data: budgetItems = [], 
    isLoading: isLoadingItems,
    error: itemsError
  } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    retry: 1,
  });

  // Fetch budget item catalog for reference data 
  const { 
    data: catalogItems = [], 
    isLoading: isLoadingCatalog
  } = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-catalog'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch sessions for the client to calculate actual used funds
  const { 
    data: clientSessions = [], 
    isLoading: isLoadingSessions
  } = useQuery<any[]>({
    queryKey: ['/api/clients', clientId, 'sessions'],
  });

  // Mutation to create a new budget plan
  const createPlanMutation = useMutation({
    mutationFn: async (newPlan: any) => {
      console.log("Creating new budget plan with data:", JSON.stringify(newPlan, null, 2));
      
      try {
        // Extract budget items from the plan data
        const { budgetItems: newItems, ...planData } = newPlan;
        
        // Critical: Include only required and valid fields for the budget settings schema
        const validPlanData = {
          planSerialNumber: planData.planSerialNumber || "",
          planCode: planData.planCode || "",
          availableFunds: Number(planData.availableFunds),
          isActive: Boolean(planData.isActive),
          endOfPlan: planData.endOfPlan || null,
          clientId
        };
        
        // First handle active plan status changes if needed
        if (validPlanData.isActive === true) {
          console.log("New plan will be active, checking for existing active plans...");
          
          // Get all budget settings for this client that are active
          const activeSettings = budgetSettings.filter((s: BudgetSettings) => Boolean(s.isActive));
          console.log(`Found ${activeSettings.length} existing active plans to deactivate`);
          
          // Deactivate existing active plans BEFORE creating the new plan
          for (const activePlan of activeSettings) {
            console.log(`Deactivating existing active plan ${activePlan.id}...`);
            
            // Use only the required field for update to avoid validation errors
            const deactivateResult = await fetch(`/api/budget-settings/${activePlan.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                isActive: false,
                planSerialNumber: activePlan.planSerialNumber || "",
                planCode: activePlan.planCode || "",
                availableFunds: Number(activePlan.availableFunds),
                endOfPlan: activePlan.endOfPlan || null,
                clientId: activePlan.clientId
              })
            });
            
            if (!deactivateResult.ok) {
              const errorText = await deactivateResult.text();
              console.error(`Failed to deactivate plan ${activePlan.id}:`, errorText);
              throw new Error(`Failed to deactivate existing active plan. Error: ${errorText}`);
            } else {
              console.log(`Successfully deactivated plan ${activePlan.id}`);
            }
          }
          
          // Allow a small delay to ensure deactivation is complete before creating new plan
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Step 1: Create the budget plan
        console.log("Creating new budget plan with processed data:", JSON.stringify(validPlanData, null, 2));
        const response = await apiRequest('POST', `/api/clients/${clientId}/budget-settings`, validPlanData);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response from create budget plan:", errorText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const createdPlan = await response.json();
        console.log("Successfully created budget plan:", createdPlan);
        
        // Step 2: Create budget items if they exist
        if (newItems && newItems.length > 0) {
          console.log(`Creating ${newItems.length} budget items for plan ${createdPlan.id}`);
          
          // Create budget items for the new plan
          const itemsWithIds = newItems.map((item: any) => ({
            itemCode: item.itemCode,
            description: item.description,
            unitPrice: Number(item.unitPrice || item.defaultUnitPrice),
            quantity: Number(item.quantity || 1),
            category: item.category || null,
            clientId,
            budgetSettingsId: createdPlan.id
          }));
          
          // Create budget items one by one to ensure they are associated with the correct plan
          for (const item of itemsWithIds) {
            const itemResponse = await apiRequest('POST', `/api/clients/${clientId}/budget-items`, item);
            if (!itemResponse.ok) {
              const errorText = await itemResponse.text();
              console.error(`Error creating budget item for plan ${createdPlan.id}:`, errorText);
            } else {
              console.log(`Successfully created budget item for plan ${createdPlan.id}`);
            }
          }
          
          // Invalidate budget items query to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
        }
        
        return createdPlan;
      } catch (error) {
        console.error("Error in createPlanMutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Budget plan creation succeeded with result:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      toast({
        title: "Success",
        description: "Budget plan created successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("Budget plan creation failed:", error);
      toast({
        title: "Error",
        description: `Failed to create budget plan: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  });

  // Mutation to update a budget plan
  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, data }: { planId: number, data: any }) => {
      console.log(`Updating budget plan ${planId} with data:`, JSON.stringify(data, null, 2));
      
      try {
        // Process data to ensure consistent format
        const processedData = { ...data };
        
        // Handle numeric fields
        if ('availableFunds' in processedData) {
          processedData.availableFunds = Number(parseFloat(processedData.availableFunds.toString()).toFixed(2));
        }
        
        // Handle boolean fields
        if ('isActive' in processedData) {
          processedData.isActive = Boolean(processedData.isActive);
        }
        
        // Handle date fields
        if ('endOfPlan' in processedData) {
          processedData.endOfPlan = processedData.endOfPlan ? String(processedData.endOfPlan) : null;
        }
        
        // Handle string fields
        if ('planCode' in processedData) {
          processedData.planCode = String(processedData.planCode).trim();
        }
        
        if ('planSerialNumber' in processedData) {
          processedData.planSerialNumber = String(processedData.planSerialNumber).trim();
        }
        
        console.log(`Sending processed update data:`, JSON.stringify(processedData, null, 2));
        const response = await apiRequest('PUT', `/api/budget-settings/${planId}`, processedData);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error updating budget plan ${planId}:`, errorText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const updatedPlan = await response.json();
        console.log(`Successfully updated budget plan ${planId}:`, updatedPlan);
        return updatedPlan;
      } catch (error) {
        console.error(`Error in updatePlanMutation for plan ${planId}:`, error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Budget plan update succeeded with result:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      toast({
        title: "Success",
        description: "Budget plan updated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("Budget plan update failed:", error);
      toast({
        title: "Error",
        description: `Failed to update budget plan: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  });

  // Mutation to update budget items
  const updateItemsMutation = useMutation({
    mutationFn: ({ planId, items }: { planId: number, items: BudgetItem[] }) => {
      return apiRequest('PUT', `/api/budget-settings/${planId}/items`, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
      toast({
        title: "Success",
        description: "Budget items updated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update budget items: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle creating a new budget plan
  const handleCreatePlan = (data: any) => {
    createPlanMutation.mutate(data);
  };

  // Handle updating a budget plan
  const handleUpdatePlan = (data: any) => {
    const { id, ...planData } = data;
    updatePlanMutation.mutate({ planId: id, data: planData });
  };

  // Handle updating budget items
  const handleUpdateItems = (planId: number, items: BudgetItem[]) => {
    updateItemsMutation.mutate({ planId, items });
  };

  // Status change mutation - uses our new API endpoint specifically for status changes
  const changePlanStatusMutation = useMutation({
    mutationFn: async ({ planId, isActive }: { planId: number, isActive: boolean }) => {
      console.log(`Changing plan ${planId} status to ${isActive ? 'active' : 'inactive'}`);
      
      try {
        const response = await fetch(`/api/budget-settings/${planId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error changing plan ${planId} status:`, errorText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error changing plan ${planId} status:`, error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      toast({
        title: "Success",
        description: "Budget plan status updated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update plan status: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  });

  // Handle deactivating a budget plan - uses the new dedicated endpoint
  const handleArchivePlan = (plan: BudgetPlan) => {
    changePlanStatusMutation.mutate({ planId: plan.id, isActive: false });
  };

  // Handle setting a plan as active - uses the new dedicated endpoint
  const handleSetActivePlan = (plan: BudgetPlan) => {
    changePlanStatusMutation.mutate({ planId: plan.id, isActive: true });
  };

  // Check if there's an active plan
  const hasActivePlan = budgetSettings.some((plan: BudgetSettings) => Boolean(plan.isActive));

  // Loading state
  const isLoading = isLoadingSettings || isLoadingItems || isLoadingCatalog || isLoadingSessions;

  // Error handling
  const error = settingsError || itemsError;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load budget data: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Use the BudgetPlansView which now has the toggle component */}
      <BudgetPlansView
        budgetSettings={budgetSettings.length > 0 ? budgetSettings[0] : undefined}
        budgetItems={budgetItems}
        onCreatePlan={handleCreatePlan}
        onEditPlan={handleUpdatePlan}
        onArchivePlan={handleArchivePlan}
        onSetActivePlan={handleSetActivePlan}
      />
    </div>
  );
}