import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UnifiedBudgetManager } from "./UnifiedBudgetManager";
import { BudgetFeatureProvider, useBudgetFeature } from "./BudgetFeatureContext";

interface BudgetPlan {
  id: number;
  clientId: number;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endOfPlan: string | null;
  createdAt: Date | null;
}

interface BudgetItem {
  id: number;
  clientId: number;
  budgetSettingsId: number;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  name: string | null;
  category: string | null;
}

interface BudgetPlanDetailsProps {
  clientId: number;
  initialPlan?: BudgetPlan;
}

/**
 * Component that displays budget plan details with the unified budget management system
 */
export function BudgetPlanDetails({ clientId, initialPlan }: BudgetPlanDetailsProps) {
  // This wrapper component handles data fetching and provides context to children
  return (
    <BudgetFeatureProvider
      initialPlan={initialPlan || null}
      initialItems={[]}
    >
      <BudgetPlanContent clientId={clientId} />
    </BudgetFeatureProvider>
  );
}

/**
 * Inner component that uses budget feature context
 */
function BudgetPlanContent({ clientId }: { clientId: number }) {
  const { 
    setActivePlan, 
    setBudgetItems, 
    activePlan,
    refreshData 
  } = useBudgetFeature();
  
  // Query for active budget plan if not provided
  const {
    data: budgetPlan,
    isLoading: isLoadingPlan,
    error: planError
  } = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-settings`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings`);
      if (!response.ok) throw new Error("Failed to fetch budget plan");
      return response.json();
    },
    // Skip if we already have a plan
    enabled: !activePlan
  });
  
  // Query for budget items
  const {
    data: budgetItems = [],
    isLoading: isLoadingItems,
    error: itemsError
  } = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-items`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget-items`);
      if (!response.ok) throw new Error("Failed to fetch budget items");
      return response.json();
    }
  });
  
  // Set plan and items in context when data is loaded
  useEffect(() => {
    if (budgetPlan && !activePlan) {
      setActivePlan(budgetPlan);
    }
  }, [budgetPlan, activePlan, setActivePlan]);
  
  useEffect(() => {
    if (budgetItems && budgetItems.length > 0) {
      setBudgetItems(budgetItems);
    }
  }, [budgetItems, setBudgetItems]);
  
  // Handle loading state
  if (isLoadingPlan || (isLoadingItems && !budgetItems.length)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Budget Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Handle error state
  if (planError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load budget plan. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  // If no active plan exists yet
  if (!activePlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Budget Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No active budget plan found. Please create a budget plan first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <UnifiedBudgetManager
      plan={activePlan}
      budgetItems={budgetItems}
      onBudgetChange={refreshData}
    />
  );
}