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
  
  return (
    <BudgetFeatureProvider clientId={clientId}>
      <Tabs defaultValue="plans" className="w-full" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="plans" className="px-4">Plans</TabsTrigger>
            <TabsTrigger value="details" className="px-4">Plan Details</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="plans" className="mt-0">
          <EnhancedBudgetCardGrid clientId={clientId} />
        </TabsContent>
        
        <TabsContent value="details" className="mt-0">
          <BudgetPlanFullView />
        </TabsContent>
      </Tabs>
    </BudgetFeatureProvider>
  );
}