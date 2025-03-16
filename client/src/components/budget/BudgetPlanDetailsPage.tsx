import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute, useRouter } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BudgetPlanFullView } from "./BudgetPlanFullView";
import { BudgetFeatureProvider, useBudgetFeature } from "./BudgetFeatureContext";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { BudgetItem } from "@shared/schema";

interface BudgetPlanDetailsPageProps {
  params?: {
    clientId?: string;
    planId?: string;
  };
}

/**
 * Container component that wraps BudgetPlanDetailsContent with BudgetFeatureProvider
 * This component is used directly by the router
 */
export function BudgetPlanDetailsPage(props: BudgetPlanDetailsPageProps) {
  // Extract clientId and planId from route params
  const params = props.params || {};
  const clientId = params.clientId ? parseInt(params.clientId) : 0;
  const planId = params.planId ? parseInt(params.planId) : 0;
  
  if (!clientId || !planId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Invalid client or plan ID</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <BudgetFeatureProvider clientId={clientId}>
      <BudgetPlanDetailsContent clientId={clientId} planId={planId} />
    </BudgetFeatureProvider>
  );
}

interface BudgetPlanDetailsContentProps {
  clientId: number;
  planId: number;
}

/**
 * Budget plan details content component
 * Shows the full view of a single budget plan
 */
function BudgetPlanDetailsContent({ clientId, planId }: BudgetPlanDetailsContentProps) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  // No need to get planId from route as it's passed as prop
  
  // Use the budget feature context
  const { activePlan, setActivePlan } = useBudgetFeature();

  // Handle back button to return to plans view
  const handleBack = () => {
    navigate(`/clients/${clientId}/budget`);
  };

  // Fetch specific budget plan if not already in context
  const { data: plan = null, isLoading: isLoadingPlan } = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-settings/${planId}`],
    queryFn: async () => {
      if (!planId) return null;
      
      // If we already have the plan in context, use that
      if (activePlan && activePlan.id === planId) {
        return activePlan;
      }
      
      // Otherwise fetch it
      try {
        // First try to get it from all plans
        const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
        if (!response.ok) {
          throw new Error(`Failed to fetch budget plans: ${response.status}`);
        }
        
        const plans = await response.json();
        const foundPlan = Array.isArray(plans) ? plans.find(p => p.id === planId) : null;
        
        if (foundPlan) {
          // Update the context
          setActivePlan(foundPlan);
          return foundPlan;
        }
        
        // If not found, try direct fetch (this is a fallback approach)
        const directResponse = await fetch(`/api/clients/${clientId}/budget-settings/${planId}`);
        if (!directResponse.ok) {
          throw new Error(`Failed to fetch budget plan: ${directResponse.status}`);
        }
        
        const directPlan = await directResponse.json();
        // Update the context
        setActivePlan(directPlan);
        return directPlan;
      } catch (error) {
        console.error("Error fetching budget plan:", error);
        return null;
      }
    },
    enabled: !!planId,
  });

  // Fetch budget items for this client
  const { data: budgetItems = [], isLoading: isLoadingItems } = useQuery<BudgetItem[]>({
    queryKey: [`/api/clients/${clientId}/budget-items`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/budget-items`);
        if (!response.ok) {
          throw new Error(`Failed to fetch budget items: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching budget items:", error);
        return [];
      }
    },
  });

  // Filter budget items for this plan
  const planBudgetItems = budgetItems.filter(item => 
    item.budgetSettingsId === planId
  );

  // Handle toggling plan active status
  const handleToggleActive = async () => {
    // Don't do anything if plan is already active
    if (!plan || plan.isActive) return;

    try {
      // Make API call to update plan
      const response = await fetch(`/api/clients/${clientId}/budget-settings/${plan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...plan,
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update plan: ${response.status}`);
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${clientId}/budget-settings`] 
      });
      
      // Update the local state
      setActivePlan({...plan, isActive: true});
    } catch (error) {
      console.error("Error updating plan:", error);
    }
  };

  // Handle editing plan (placeholder for now)
  const handleEdit = () => {
    console.log("Edit plan", plan);
    // This would typically open an edit dialog
  };

  // Loading state
  if (isLoadingPlan || isLoadingItems) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (plan not found)
  if (!plan) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Plans
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Budget Plan Not Found</CardTitle>
            <CardDescription>The requested budget plan could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                The budget plan with ID {planId} does not exist or you don't have permission to view it.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleBack}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Plans
      </Button>
      
      {/* Use the existing BudgetPlanFullView component */}
      <BudgetPlanFullView
        plan={plan}
        budgetItems={planBudgetItems}
        onBack={handleBack}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
      />
    </div>
  );
}