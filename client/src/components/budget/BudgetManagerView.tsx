import React, { useState, useEffect } from "react";
import { 
  BudgetFeatureProvider, 
  BudgetPlan, 
  BudgetItem,
  useBudgetFeature
} from "./BudgetFeatureContext";
import { DirectBudgetPlanList } from "./DirectBudgetPlanList";
import { BudgetPlanDetails } from "./BudgetPlanDetails";
import { BudgetPlanForm } from "./BudgetPlanForm";
import { BudgetItemForm } from "./BudgetItemForm";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BudgetManagerViewProps {
  clientId: number;
}

/**
 * Main budget management view container component
 * This handles overall state management and rendering of the appropriate subviews
 */
function BudgetManagerContent({ clientId }: BudgetManagerViewProps) {
  const { 
    budgetPlans, 
    budgetItems, 
    isLoading, 
    error,
    selectedPlanId,
    viewPlanDetails,
    setActivePlan,
    getBudgetPlanById,
    deleteBudgetItem
  } = useBudgetFeature();
  
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  const [showEditPlanForm, setShowEditPlanForm] = useState(false);
  const [showDetailsView, setShowDetailsView] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<BudgetPlan | null>(null);
  const { toast } = useToast();
  
  // Watch for changes in selected plan ID
  useEffect(() => {
    if (selectedPlanId) {
      const plan = getBudgetPlanById(selectedPlanId);
      if (plan) {
        setCurrentPlan(plan);
        setShowDetailsView(true);
      }
    } else {
      setShowDetailsView(false);
    }
  }, [selectedPlanId, getBudgetPlanById]);
  
  // Handle view details for a budget plan
  const handleViewDetails = (plan: BudgetPlan) => {
    setCurrentPlan(plan);
    viewPlanDetails(plan.id);
    setShowDetailsView(true);
  };
  
  // Handle clicking add new plan button
  const handleAddPlanClick = () => {
    setShowCreatePlanForm(true);
  };
  
  // Handle clicking edit plan button
  const handleEditPlanClick = (plan: BudgetPlan) => {
    setCurrentPlan(plan);
    setShowEditPlanForm(true);
  };
  
  // Handle making a plan active
  const handleMakeActiveClick = async (plan: BudgetPlan) => {
    try {
      await setActivePlan(plan.id);
      toast({
        title: "Plan Activated",
        description: `${plan.planName} is now the active budget plan.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to activate plan. Please try again.",
      });
    }
  };
  
  // Back to plans list view
  const handleBackToList = () => {
    setShowDetailsView(false);
    viewPlanDetails(0); // Clear selected plan ID
    setCurrentPlan(null);
  };
  
  // Filter budget items for the current plan
  const currentPlanItems = currentPlan 
    ? budgetItems.filter(item => item.budgetSettingsId === currentPlan.id) 
    : [];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3">Loading budget data...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 border border-red-200">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading budget data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error instanceof Error ? error.message : "Unknown error"}</p>
            </div>
            <div className="mt-4">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="text-red-800 bg-red-50 hover:bg-red-100 border-red-300"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      {/* Show the appropriate view based on state */}
      {showDetailsView && currentPlan ? (
        <BudgetPlanDetails 
          plan={currentPlan}
          items={currentPlanItems}
          onBack={handleBackToList}
          onMakeActive={handleMakeActiveClick}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Budget Management</h2>
          </div>
          
          <DirectBudgetPlanList 
            clientId={clientId} 
          />
        </div>
      )}
      
      {/* Create Plan Form Dialog */}
      <BudgetPlanForm 
        open={showCreatePlanForm}
        onOpenChange={setShowCreatePlanForm}
        clientId={clientId}
      />
      
      {/* Edit Plan Form Dialog */}
      {currentPlan && showEditPlanForm && (
        <BudgetPlanForm 
          open={showEditPlanForm}
          onOpenChange={setShowEditPlanForm}
          clientId={clientId}
          initialData={currentPlan}
        />
      )}
    </div>
  );
}

/**
 * Exported budget manager component that wraps content with provider
 */
export function BudgetManagerView({ clientId }: BudgetManagerViewProps) {
  return (
    <BudgetFeatureProvider clientId={clientId}>
      <BudgetManagerContent clientId={clientId} />
    </BudgetFeatureProvider>
  );
}