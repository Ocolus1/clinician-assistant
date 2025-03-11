import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { BudgetFeatureProvider, useBudgetFeature, BudgetPlan } from "./BudgetFeatureContext";
import { EnhancedBudgetCardGrid } from "./EnhancedBudgetCardGrid";
import { BudgetPlanFullView } from "./BudgetPlanFullView";

interface EnhancedClientBudgetTabProps {
  clientId: number;
  budgetSettings?: any[] | any; // Can be array or single object
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
    console.log("[BudgetTabContents] Budget plans updated:", 
      budgetPlans ? (Array.isArray(budgetPlans) ? budgetPlans.length : "non-array") : "null"
    );
    
    if (budgetPlans && Array.isArray(budgetPlans) && budgetPlans.length > 0) {
      console.log("[BudgetTabContents] First plan:", budgetPlans[0]);
    }
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
  // Log the budget settings to diagnose issues
  console.log(`[EnhancedClientBudgetTab] Rendering for client ${clientId}`, { 
    budgetSettingsType: budgetSettings ? (Array.isArray(budgetSettings) ? `Array[${budgetSettings.length}]` : typeof budgetSettings) : 'undefined',
    budgetItemsCount: budgetItems?.length || 0 
  });
  
  // If budget settings is an array with content, log the first item
  if (budgetSettings && Array.isArray(budgetSettings) && budgetSettings.length > 0) {
    console.log(`[EnhancedClientBudgetTab] First budget setting:`, budgetSettings[0]);
  }
  
  // Debug info for array processing
  if (budgetSettings && !Array.isArray(budgetSettings)) {
    console.log("[EnhancedClientBudgetTab] Converting single budget setting to array");
  }
  
  // Custom initial budget plans derived from the passed-in settings
  const initialBudgetPlans = budgetSettings && Array.isArray(budgetSettings) ? 
    budgetSettings.map((setting: any) => {
      // Create a meaningful plan name if one is not provided
      const planName = setting.planSerialNumber || `Plan ${setting.id}`;
      
      return {
        id: setting.id,
        clientId: setting.clientId,
        planName: planName,
        planCode: setting.planCode || null,
        isActive: setting.isActive === true, // Ensure boolean
        availableFunds: parseFloat(setting.availableFunds) || 0,
        endDate: setting.endOfPlan, // Field name in API is endOfPlan
        startDate: setting.createdAt,
        // These will be calculated from budget items later
        totalUsed: 0,
        itemCount: 0,
        percentUsed: 0,
      };
    }) : [];
  
  // Log the transformed budget plans
  console.log(`[EnhancedClientBudgetTab] Transformed ${initialBudgetPlans.length} settings into plans`);
  
  // Our primary fix is to ensure we properly wrap all budget-related components
  // in the BudgetFeatureProvider context which handles the data flow
  return (
    <BudgetFeatureProvider clientId={clientId}>
      <BudgetTabContents clientId={clientId} />
    </BudgetFeatureProvider>
  );
}