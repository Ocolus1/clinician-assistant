import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { PlusCircle, AlertTriangle } from "lucide-react";
import { useBudgetFeature, BudgetPlan } from "./BudgetFeatureContext";
import { BudgetPlanCard } from "./BudgetPlanCard";
import { BudgetPlanCreateWizard } from "./BudgetPlanCreateWizard";

interface EnhancedBudgetCardGridProps {
  clientId: number;
  onPlanSelected?: (planId: number) => void;
}

export function EnhancedBudgetCardGrid({ clientId, onPlanSelected }: EnhancedBudgetCardGridProps) {
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const { budgetPlans, isLoading, error, viewPlanDetails } = useBudgetFeature();
  
  // Add effect to log budget plans data for debugging
  useEffect(() => {
    console.log(`[EnhancedBudgetCardGrid] Budget plans data updated for client ${clientId}:`, 
      budgetPlans ? (Array.isArray(budgetPlans) ? budgetPlans.length : "non-array") : "null"
    );
    if (budgetPlans && Array.isArray(budgetPlans)) {
      console.log(`[EnhancedBudgetCardGrid] First plan:`, budgetPlans[0]);
    }
  }, [budgetPlans, clientId]);
  
  // Enhanced view plan details function that also triggers tab switching
  const handleViewPlanDetails = (planId: number) => {
    // Update the context state
    viewPlanDetails(planId);
    
    // Notify parent component about plan selection if callback exists
    if (onPlanSelected) {
      onPlanSelected(planId);
    }
  };

  // Handle wizard open/close
  const handleOpenCreateWizard = () => setShowCreateWizard(true);
  const handleCloseCreateWizard = () => setShowCreateWizard(false);

  // Display loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="pb-2">
                <Skeleton className="h-16 w-full mb-2" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Budget Plans</AlertTitle>
          <AlertDescription>
            There was a problem loading the budget plans. You can try creating a new budget plan.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-end">
          <Button onClick={handleOpenCreateWizard}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Budget Plan
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

  // Empty state with create button
  if (!budgetPlans || !Array.isArray(budgetPlans) || budgetPlans.length === 0) {
    console.log("[EnhancedBudgetCardGrid] No budget plans to display, showing empty state");
    console.log("[EnhancedBudgetCardGrid] Budget plans data:", budgetPlans);
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">Budget Plans</h3>
            <p className="text-sm text-muted-foreground">
              No budget plans have been created yet.
            </p>
          </div>
          <Button onClick={handleOpenCreateWizard}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Budget Plan
          </Button>
        </div>
        
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-background p-3 mb-4">
              <PlusCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Budget Plans</h3>
            <p className="text-center text-muted-foreground mb-4 max-w-md">
              Create your first budget plan to start tracking therapy expenses and funding allocations.
            </p>
            <Button onClick={handleOpenCreateWizard}>
              Create New Budget Plan
            </Button>
          </CardContent>
        </Card>
        
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
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Budget Plans</h3>
          <p className="text-sm text-muted-foreground">
            {Array.isArray(budgetPlans) ? budgetPlans.length : 0} {Array.isArray(budgetPlans) && budgetPlans.length === 1 ? 'plan' : 'plans'} available
          </p>
        </div>
        <Button onClick={handleOpenCreateWizard}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Budget Plan
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(budgetPlans) && budgetPlans.map((plan) => (
          <BudgetPlanCard 
            key={plan.id} 
            plan={plan} 
            onView={(planId) => handleViewPlanDetails(planId)}
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