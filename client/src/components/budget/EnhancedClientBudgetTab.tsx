import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { BudgetFeatureProvider } from "./BudgetFeatureContext";
import { EnhancedBudgetCardGrid } from "./EnhancedBudgetCardGrid";
import { BudgetPlanFullView } from "./BudgetPlanFullView";

interface EnhancedClientBudgetTabProps {
  clientId: number;
  budgetSettings?: any;
  budgetItems?: any[];
}

/**
 * The main budget tab component for the client profile
 * Provides tab navigation between budget plans and plan details views
 */
export function EnhancedClientBudgetTab({ clientId, budgetSettings, budgetItems }: EnhancedClientBudgetTabProps) {
  const [activeTab, setActiveTab] = useState("plans");
  
  // Handler to switch tabs when a plan is selected or unselected
  const handlePlanSelection = (planId: number | null) => {
    // If a plan is selected, switch to details tab
    // If no plan is selected, switch to plans tab
    setActiveTab(planId ? "details" : "plans");
  };
  
  return (
    <BudgetFeatureProvider clientId={clientId}>
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
    </BudgetFeatureProvider>
  );
}