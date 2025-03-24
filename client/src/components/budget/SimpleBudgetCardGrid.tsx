import React from "react";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { useBudgetFeature } from "./BudgetFeatureContext";
import { BudgetPlanCard } from "./BudgetPlanCard";
import { BudgetPlanCreateWizard } from "./BudgetPlanCreateWizard";

interface SimpleBudgetCardGridProps {
  clientId: number;
}

/**
 * A simple grid of budget plan cards that uses the BudgetFeatureContext for state
 * This layout is designed to replace the tabbed interface with a more direct card-based approach
 */
export function SimpleBudgetCardGrid({ clientId }: SimpleBudgetCardGridProps) {
  const [showCreateWizard, setShowCreateWizard] = React.useState(false);
  const { budgetPlans, isLoading, error, viewPlanDetails } = useBudgetFeature();
  
  // Handle wizard open/close
  const handleOpenCreateWizard = () => setShowCreateWizard(true);
  const handleCloseCreateWizard = () => setShowCreateWizard(false);
  
  // Display empty state with create button
  if (!budgetPlans || !Array.isArray(budgetPlans) || budgetPlans.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            No budget plans have been created yet.
          </p>
          <Button onClick={handleOpenCreateWizard}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Budget Plan
          </Button>
        </div>
        
        <div className="text-center p-12 border-2 border-dashed rounded-lg bg-muted/40">
          <PlusCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Budget Plans</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Create your first budget plan to start tracking therapy expenses and funding allocations.
          </p>
          <Button onClick={handleOpenCreateWizard}>
            Create New Budget Plan
          </Button>
        </div>
        
        {/* Budget Plan Create Wizard */}
        <BudgetPlanCreateWizard
          open={showCreateWizard}
          onOpenChange={setShowCreateWizard}
          clientId={clientId}
        />
      </div>
    );
  }
  
  // Display grid of budget plans
  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center mb-4">
        <Button onClick={handleOpenCreateWizard}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Budget Plan
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgetPlans.map((plan) => (
          <BudgetPlanCard 
            key={plan.id} 
            plan={plan} 
            clientId={clientId}
            onView={viewPlanDetails}
          />
        ))}
      </div>
      
      {/* Budget Plan Create Wizard */}
      <BudgetPlanCreateWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
        clientId={clientId}
      />
    </div>
  );
}