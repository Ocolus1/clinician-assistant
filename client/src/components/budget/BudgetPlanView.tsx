import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BudgetFeatureProvider } from "./BudgetFeatureContext";
import { EnhancedBudgetCardGrid } from "./EnhancedBudgetCardGrid";
import { UnifiedBudgetManager } from "./UnifiedBudgetManager";
import { BudgetSettings, BudgetItem } from "@shared/schema";

interface BudgetPlanViewProps {
  patientId: number;
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
  allBudgetSettings: BudgetSettings[];
}

export function BudgetPlanView({
  patientId,
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
      patientId={patientId}
      initialItems={budgetItems}
      initialPlan={budgetSettings ? {
        id: budgetSettings.id,
        patientId: budgetSettings.patientId,
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
            patientId={patientId} 
            budgetItems={budgetItems}
            budgetSettings={budgetSettings}
            allBudgetSettings={allBudgetSettings}
            onBackToGrid={handleBackToGrid}
          />
        </div>
      ) : (
        <EnhancedBudgetCardGrid 
          patientId={patientId}
          onPlanSelected={handlePlanSelected}
        />
      )}
    </BudgetFeatureProvider>
  );
}