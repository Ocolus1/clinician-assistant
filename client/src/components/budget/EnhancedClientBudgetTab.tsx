import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { BudgetFeatureProvider, useBudgetFeature } from "./BudgetFeatureContext";
import { EnhancedBudgetCardGrid } from "./EnhancedBudgetCardGrid";
import { BudgetPlanFullView } from "./BudgetPlanFullView";

interface EnhancedClientBudgetTabProps {
  clientId: number;
  budgetSettings?: any;
  budgetItems?: any[];
}

/**
 * Budget tab contents that use the BudgetFeatureContext
 */
function BudgetTabContents({ clientId }: { clientId: number }) {
  const [activeTab, setActiveTab] = useState("plans");
  const { budgetPlans, isLoading, error } = useBudgetFeature();
  
  // Debug log when budget plans change
  useEffect(() => {
    console.log("[BudgetTabContents] Budget plans updated:", budgetPlans);
  }, [budgetPlans]);
  
  // Handler to switch tabs when a plan is selected or unselected
  const handlePlanSelection = (planId: number | null) => {
    // If a plan is selected, switch to details tab
    // If no plan is selected, switch to plans tab
    setActiveTab(planId ? "details" : "plans");
  };
  
  return (
    <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="plans" className="px-4">Plans</TabsTrigger>
          <TabsTrigger value="details" className="px-4">Plan Details</TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="plans" className="mt-0">
        <EnhancedBudgetCardGrid 
          clientId={clientId}
          onPlanSelected={(planId) => {
            handlePlanSelection(planId);
          }}
        />
      </TabsContent>
      
      <TabsContent value="details" className="mt-0">
        <BudgetPlanFullView 
          onBackToPlansList={() => handlePlanSelection(null)}
        />
      </TabsContent>
    </Tabs>
  );
}

/**
 * The main budget tab component for the client profile
 * Provides tab navigation between budget plans and plan details views
 */
export function EnhancedClientBudgetTab({ clientId, budgetSettings, budgetItems }: EnhancedClientBudgetTabProps) {
  console.log(`[EnhancedClientBudgetTab] Rendering for client ${clientId}`, { 
    budgetSettings, 
    budgetItemsCount: budgetItems?.length || 0 
  });
  
  // Our primary fix is to ensure we properly wrap all budget-related components
  // in the BudgetFeatureProvider context which handles the data flow
  return (
    <BudgetFeatureProvider clientId={clientId}>
      <BudgetTabContents clientId={clientId} />
    </BudgetFeatureProvider>
  );
}