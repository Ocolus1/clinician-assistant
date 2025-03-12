import React, { useState } from "react";
import { BudgetFeatureProvider } from "./BudgetFeatureContext";
import { DirectBudgetPlanList } from "./DirectBudgetPlanList";
import { BudgetPlanDetails } from "./BudgetPlanDetailsIntegrated";
import { BudgetPlanForm } from "./BudgetPlanForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface BudgetManagerViewProps {
  clientId: number;
}

/**
 * Main budget management view container component
 * This handles overall state management and rendering of the appropriate subviews
 */
function BudgetManagerContent({ clientId }: BudgetManagerViewProps) {
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  
  return (
    <div>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Budget Management</h2>
          <Button 
            onClick={() => setShowCreatePlanForm(true)} 
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Plan
          </Button>
        </div>
        
        {/* Budget Plan Details with integrated budget item management */}
        <BudgetPlanDetails 
          clientId={clientId}
        />
      </div>
      
      {/* Create Plan Form Dialog */}
      <BudgetPlanForm 
        open={showCreatePlanForm}
        onOpenChange={setShowCreatePlanForm}
        clientId={clientId}
      />
    </div>
  );
}

/**
 * Exported budget manager component with simplified interface
 */
export function BudgetManagerView({ clientId }: BudgetManagerViewProps) {
  return (
    <BudgetFeatureProvider clientId={clientId}>
      <BudgetManagerContent clientId={clientId} />
    </BudgetFeatureProvider>
  );
}