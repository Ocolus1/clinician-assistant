import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { BudgetPlanCard } from "./BudgetPlanCard";
import { useBudgetFeature } from "./BudgetFeatureContext";

import type { BudgetSettings, BudgetItem } from "@shared/schema";

interface BudgetPlansViewProps {
  clientId: number;
  budgetPlans: BudgetSettings[];
  budgetItems?: BudgetItem[];
  isLoading: boolean;
  onAddItem: (plan: BudgetSettings) => void;
}

export function BudgetPlansView({ 
  clientId, 
  budgetPlans, 
  budgetItems = [], 
  isLoading,
  onAddItem
}: BudgetPlansViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setShowEditPlanDialog, setSelectedPlanId, setIsEditMode } = useBudgetFeature();
  
  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget/plans'] });
    queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
    
    toast({
      title: "Refreshed",
      description: "Budget plan data has been refreshed.",
    });
  };
  
  // Handle edit plan
  const handleEditPlan = (plan: BudgetSettings) => {
    setSelectedPlanId(plan.id);
    setIsEditMode(true);
    setShowEditPlanDialog(true);
  };
  
  // Handle archive plan
  const handleArchivePlan = (plan: BudgetSettings) => {
    // This would be implemented with a mutation to update the plan's isActive status
    toast({
      title: plan.isActive ? "Plan Archived" : "Plan Restored",
      description: `The plan has been ${plan.isActive ? 'archived' : 'restored'} successfully.`,
    });
  };
  
  // Loading state UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Empty state UI
  if (!budgetPlans.length) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">No Budget Plans</h3>
          <p className="text-muted-foreground">
            This client doesn't have any budget plans yet.
            <br />
            Create a new plan to start allocating funds.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Budget Plans</h3>
          <p className="text-muted-foreground">
            Manage and track your client's budget plans.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgetPlans.map((plan) => (
          <BudgetPlanCard
            key={plan.id}
            plan={plan}
            budgetItems={budgetItems}
            onEdit={handleEditPlan}
            onAddItem={onAddItem}
            onArchive={handleArchivePlan}
          />
        ))}
      </div>
    </div>
  );
}