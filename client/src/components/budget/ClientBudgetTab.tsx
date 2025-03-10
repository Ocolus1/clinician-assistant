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
import BudgetCardGrid from "./BudgetCardGrid";

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
    mutationFn: (newPlan: any) => {
      return apiRequest('POST', `/api/clients/${clientId}/budget-settings`, {
        ...newPlan,
        clientId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      toast({
        title: "Success",
        description: "Budget plan created successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create budget plan: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation to update a budget plan
  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: number, data: any }) => {
      return apiRequest('PUT', `/api/budget-settings/${planId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      toast({
        title: "Success",
        description: "Budget plan updated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update budget plan: ${error.message}`,
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

  // Handle deactivating a budget plan - simplified to just set inactive
  const handleArchivePlan = (plan: BudgetPlan) => {
    updatePlanMutation.mutate({ 
      planId: plan.id, 
      data: { 
        isActive: false 
      } 
    });
  };

  // Handle setting a plan as active - simplified to prevent errors
  const handleSetActivePlan = (plan: BudgetPlan) => {
    // First, deactivate all plans including currently active ones
    const activeSettings = budgetSettings.filter((s: BudgetSettings) => Boolean(s.isActive));
    
    // If there are active plans, deactivate them first
    if (activeSettings.length > 0) {
      const deactivatePromises = activeSettings.map((s: BudgetSettings) => {
        return apiRequest('PUT', `/api/budget-settings/${s.id}`, { 
          isActive: false 
        });
      });
      
      // After all plans are deactivated, activate the selected one
      Promise.all(deactivatePromises)
        .then(() => {
          // Small delay to ensure deactivations are complete
          setTimeout(() => {
            updatePlanMutation.mutate({ 
              planId: plan.id, 
              data: { isActive: true } 
            });
          }, 300);
        })
        .catch(error => {
          toast({
            title: "Error",
            description: `Failed to deactivate current plans: ${error.message}`,
            variant: "destructive",
          });
        });
    } else {
      // No active plans, directly activate this one
      updatePlanMutation.mutate({ 
        planId: plan.id, 
        data: { isActive: true } 
      });
    }
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
      {/* Direct display of budget grid without tabs */}
      <BudgetCardGrid
        budgetSettings={budgetSettings}
        budgetItems={budgetItems}
        catalogItems={catalogItems}
        onCreatePlan={handleCreatePlan}
        onUpdatePlan={handleUpdatePlan}
        onUpdateItems={handleUpdateItems}
        onArchivePlan={handleArchivePlan}
        onSetActivePlan={handleSetActivePlan}
        clientSessions={clientSessions}
        isLoading={isLoading}
        hasActivePlan={hasActivePlan}
      />
    </div>
  );
}