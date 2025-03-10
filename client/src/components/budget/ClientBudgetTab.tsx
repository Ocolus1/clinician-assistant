import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import { BudgetSettings, BudgetItem, BudgetItemCatalog, BudgetPlan } from "../../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { PlusCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import BudgetCardGrid from "./BudgetCardGrid";

interface ClientBudgetTabProps {
  clientId: number;
}

export default function ClientBudgetTab({ clientId }: ClientBudgetTabProps) {
  const queryClient = useQueryClient();

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>("plans");

  // Fetch budget settings for the client
  const { 
    data: budgetSettings = [], 
    isLoading: isLoadingSettings,
    error: settingsError
  } = useQuery<BudgetSettings[]>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    retry: 1,
  });

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
      toast.success("Budget plan created successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to create budget plan: ${error.message}`);
    }
  });

  // Mutation to update a budget plan
  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: number, data: any }) => {
      return apiRequest('PUT', `/api/budget-settings/${planId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      toast.success("Budget plan updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update budget plan: ${error.message}`);
    }
  });

  // Mutation to update budget items
  const updateItemsMutation = useMutation({
    mutationFn: ({ planId, items }: { planId: number, items: BudgetItem[] }) => {
      return apiRequest('PUT', `/api/budget-settings/${planId}/items`, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
      toast.success("Budget items updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update budget items: ${error.message}`);
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

  // Handle archiving a budget plan
  const handleArchivePlan = (plan: BudgetPlan) => {
    updatePlanMutation.mutate({ 
      planId: plan.id, 
      data: { 
        isActive: false,
        archived: true 
      } 
    });
  };

  // Handle setting a plan as active
  const handleSetActivePlan = (plan: BudgetPlan) => {
    // First, deactivate all plans
    const deactivatePromises = budgetSettings
      .filter(s => s.isActive && s.id !== plan.id)
      .map(s => {
        return apiRequest('PUT', `/api/budget-settings/${s.id}`, { 
          isActive: false 
        });
      });

    // After all plans are deactivated, activate the selected one
    Promise.all(deactivatePromises)
      .then(() => {
        return updatePlanMutation.mutate({ 
          planId: plan.id, 
          data: { isActive: true } 
        });
      })
      .catch(error => {
        toast.error(`Failed to update plans: ${error.message}`);
      });
  };

  // Check if there's an active plan
  const hasActivePlan = budgetSettings.some(plan => plan.isActive);

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
      {/* Tabs for different budget views */}
      <Tabs defaultValue="plans" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plans">Budget Plans</TabsTrigger>
          <TabsTrigger value="analysis">Budget Analysis</TabsTrigger>
        </TabsList>

        {/* Budget Plans Tab */}
        <TabsContent value="plans" className="space-y-6 pt-4">
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
          />
        </TabsContent>

        {/* Budget Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Analysis</CardTitle>
              <CardDescription>
                View detailed analysis of budget usage and trends
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center text-gray-500">
              Budget analysis visualizations will be displayed here.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}