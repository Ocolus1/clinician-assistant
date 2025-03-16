import { useQuery } from "@tanstack/react-query";
import { BudgetSettings, BudgetItem } from "@shared/schema";
import { BudgetPlansGrid } from "./BudgetPlansGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBudgetFeature } from "./BudgetFeatureContext";

interface BudgetPlansViewProps {
  clientId: number;
}

/**
 * Top-level component that shows all budget plans for a client
 * This is used in the client profile budget tab
 */
export function BudgetPlansView({ clientId }: BudgetPlansViewProps) {
  const { refreshBudgetSettings } = useBudgetFeature();

  // Fetch all budget plans for this client
  const {
    data: budgetPlans = [],
    isLoading: isLoadingPlans,
    isError: isErrorPlans,
    refetch: refetchPlans
  } = useQuery<BudgetSettings[]>({
    queryKey: [`/api/clients/${clientId}/budget-settings`, 'all'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
      if (!response.ok) {
        throw new Error(`Error fetching budget plans: ${response.status}`);
      }
      return response.json();
    }
  });

  // Fetch budget items for this client
  const {
    data: budgetItems = [],
    isLoading: isLoadingItems,
    isError: isErrorItems
  } = useQuery<BudgetItem[]>({
    queryKey: [`/api/clients/${clientId}/budget-items`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget-items`);
      if (!response.ok) {
        throw new Error(`Error fetching budget items: ${response.status}`);
      }
      return response.json();
    }
  });

  // Handle refreshing data after adding a new plan
  const handlePlanSuccess = () => {
    refetchPlans();
    refreshBudgetSettings();
  };

  // Loading state
  if (isLoadingPlans || isLoadingItems) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isErrorPlans || isErrorItems) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          There was an error loading budget information. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  // Sort plans with active ones first
  const sortedPlans = [...budgetPlans].sort((a, b) => {
    // Sort by active status first (active plans first)
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    
    // Then sort by created date (newest first)
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    
    // If no dates, sort by ID (newer plans have higher IDs)
    return b.id - a.id;
  });

  return (
    <BudgetPlansGrid
      plans={sortedPlans}
      budgetItems={budgetItems}
      clientId={clientId}
      onAddPlanSuccess={handlePlanSuccess}
    />
  );
}