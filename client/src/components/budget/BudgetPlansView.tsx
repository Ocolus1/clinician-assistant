import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BudgetPlansGrid } from "./BudgetPlansGrid";
import { FullScreenBudgetPlanDialog } from "./FullScreenBudgetPlanDialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BudgetSettings } from "@shared/schema";
import { Plus, CreditCard, RefreshCw, AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface BudgetPlansViewProps {
  clientId: number;
  onViewPlan?: (planId: number) => void;
}

export function BudgetPlansView({ clientId, onViewPlan }: BudgetPlansViewProps) {
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
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
  
  // Check if any of the plans is active and get the active plan
  const activePlan = budgetPlans.find(plan => plan.isActive);
  const hasActivePlan = !!activePlan;
  
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
  
  // Mutation to deactivate the current active plan
  const deactivatePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      return apiRequest(
        "PUT",
        `/api/budget-settings/${planId}`, 
        { isActive: false }
      );
    },
    onSuccess: () => {
      // Refetch the plans to update the UI
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${clientId}/budget-settings`],
      });
      
      // After successful deactivation, open the creation dialog
      setCreateDialogOpen(true);
    },
    onError: (error) => {
      console.error("Error deactivating plan:", error);
    }
  });
  
  // Handle create new plan button click
  const handleCreateNewPlan = () => {
    if (hasActivePlan && activePlan) {
      // If an active plan exists, show confirmation dialog
      setConfirmDialogOpen(true);
    } else {
      // No active plan, open creation dialog directly
      setCreateDialogOpen(true);
    }
  };
  
  // Handle confirmation to proceed with creating a new plan
  const handleConfirmCreatePlan = () => {
    if (activePlan) {
      // Deactivate the current active plan
      deactivatePlanMutation.mutate(activePlan.id);
    }
    setConfirmDialogOpen(false);
  };
  
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
          onClick={handleCreateNewPlan}
          className="flex items-center gap-2"
          disabled={deactivatePlanMutation.isPending}
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
      
      {/* Full Screen Budget Plan Dialog */}
      <FullScreenBudgetPlanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clientId={clientId}
        onSuccess={refetch}
        hasActivePlan={hasActivePlan}
      />
      
      {/* Confirmation Dialog for Creating New Budget Plan */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Deactivate Current Budget Plan
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 pt-2">
              <p>
                Creating a new budget plan will deactivate the current active plan 
                <span className="font-medium"> {activePlan?.planSerialNumber}</span>.
              </p>
              <p className="mt-2">
                The deactivated plan will still be visible and accessible for reference, but it will 
                be set to read-only mode. No data will be lost.
              </p>
              <p className="mt-2">
                Do you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCreatePlan}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}