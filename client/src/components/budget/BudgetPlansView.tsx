import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BudgetPlansGrid } from "./BudgetPlansGrid";
import { EnhancedBudgetPlanDialog } from "./EnhancedBudgetPlanDialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BudgetSettings } from "@shared/schema";
import { Plus, CreditCard, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface BudgetPlansViewProps {
  clientId: number;
  onViewPlan?: (planId: number) => void;
}

export function BudgetPlansView({ clientId, onViewPlan }: BudgetPlansViewProps) {
  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Fetch all budget plans for this client
  const { 
    data: budgetPlans = [], 
    isLoading, 
    isError, 
    refetch 
  } = useQuery<BudgetSettings[]>({
    queryKey: [`/api/clients/${clientId}/budget-settings`, { all: true }],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/clients/${clientId}/budget-settings?all=true`);
        return res.json();
      } catch (error) {
        console.error("Error fetching budget plans:", error);
        throw error;
      }
    },
  });
  
  // Check if any of the plans is active
  const hasActivePlan = budgetPlans.some(plan => plan.isActive);
  
  // Setup event listener for plan detail view
  useEffect(() => {
    const handleViewPlanDetails = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.planId && onViewPlan) {
        onViewPlan(customEvent.detail.planId);
      }
    };
    
    // Add event listener
    document.addEventListener('view-plan-details', handleViewPlanDetails);
    
    // Clean up
    return () => {
      document.removeEventListener('view-plan-details', handleViewPlanDetails);
    };
  }, [onViewPlan]);
  
  // The creation functionality is now handled directly in the EnhancedBudgetPlanDialog
  // using its own mutation and success callback
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between mb-6">
          <h2 className="text-2xl font-semibold">Budget Plans</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between mb-6">
          <h2 className="text-2xl font-semibold">Budget Plans</h2>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load budget plans. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with Title and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Budget Plans</h2>
          <p className="text-sm text-gray-500">
            Manage budget allocations for therapy and related services
          </p>
        </div>
        
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Plan
        </Button>
      </div>
      
      {/* Budget Plans Grid */}
      <BudgetPlansGrid 
        plans={budgetPlans} 
        clientId={clientId} 
        onViewPlan={onViewPlan}
      />
      
      {/* Enhanced Budget Plan Dialog */}
      <EnhancedBudgetPlanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clientId={clientId}
        onSuccess={refetch}
      />
    </div>
  );
}