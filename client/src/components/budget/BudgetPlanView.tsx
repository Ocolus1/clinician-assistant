import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BudgetFeatureProvider } from "./BudgetFeatureContext";
import { EnhancedBudgetCardGrid } from "./EnhancedBudgetCardGrid";
import { UnifiedBudgetManager } from "./UnifiedBudgetManager";
import { BudgetSettings, BudgetItem } from "@shared/schema";

interface BudgetPlanViewProps {
  clientId: number;
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
  allBudgetSettings: BudgetSettings[];
}

export function BudgetPlanView({
  clientId,
  budgetItems,
  budgetSettings,
  allBudgetSettings
}: BudgetPlanViewProps) {
  // State for showing budget plan details or grid view
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  
  // Handle plan selection to show details
  const handlePlanSelected = (planId: number) => {
    setSelectedPlanId(planId);
  };
  
  // Return to grid view
  const handleBackToGrid = () => {
    setSelectedPlanId(null);
  };

  return (
    <BudgetFeatureProvider 
      clientId={clientId}
      initialItems={budgetItems}
      initialPlan={budgetSettings ? {
        id: budgetSettings.id,
        clientId: budgetSettings.clientId,
        planSerialNumber: budgetSettings.planSerialNumber,
        planCode: budgetSettings.planCode,
        isActive: true,
        ndisFunds: budgetSettings.ndisFunds,
        endOfPlan: budgetSettings.endOfPlan,
        createdAt: budgetSettings.createdAt,
        active: true
      } : null}
    >
      {selectedPlanId ? (
        <div>
          <Button variant="ghost" onClick={handleBackToGrid} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Budget Plans
          </Button>
          <UnifiedBudgetManager 
            clientId={clientId} 
            budgetItems={budgetItems}
            budgetSettings={budgetSettings}
            allBudgetSettings={allBudgetSettings}
          />
        </div>
      ) : (
        <EnhancedBudgetCardGrid 
          clientId={clientId}
          onPlanSelected={handlePlanSelected}
        />
      )}
    </BudgetFeatureProvider>
  );
}