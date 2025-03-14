import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft } from "lucide-react";
import { EnhancedBudgetCardGrid } from "./EnhancedBudgetCardGrid";
import { BudgetFeatureProvider, useBudgetFeature, BudgetPlan } from "./BudgetFeatureContext";
import { UnifiedBudgetManager } from "./UnifiedBudgetManager";
import { BudgetPlanForm } from "./BudgetPlanForm";

interface BudgetPlanViewProps {
  clientId: number;
}

/**
 * Main budget plan management view for client profiles
 * Uses the same form as onboarding process for consistency
 */
export function BudgetPlanView({ clientId }: BudgetPlanViewProps) {
  const [activeTab, setActiveTab] = useState("plans");
  const [createMode, setCreateMode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get budget plans data
  const plansQuery = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-settings`, "all"],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget plans');
      }
      const data = await response.json();
      // Handle both array and single object responses
      return Array.isArray(data) ? data : [data];
    }
  });

  // Handle plan selection for viewing details
  const handlePlanSelected = (planId: number) => {
    setActiveTab("details");
  };

  // Handle create button click
  const handleCreatePlan = () => {
    setShowCreateDialog(true);
  };

  // Handle dialog close
  const handleCreateDialogClose = () => {
    setShowCreateDialog(false);
  };

  // Handle successful creation
  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    
    // Refresh plans data
    queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/budget-settings`] });
    
    toast({
      title: "Budget Plan Created",
      description: "The new budget plan has been created successfully.",
    });
  };

  // Create UI based on the active tab
  return (
    <BudgetFeatureProvider clientId={clientId}>
      <div className="space-y-4">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="plans">Budget Plans</TabsTrigger>
              <TabsTrigger value="details" disabled={activeTab !== "details"}>Plan Details</TabsTrigger>
            </TabsList>
            
            {activeTab === "plans" && (
              <Button onClick={handleCreatePlan}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Budget Plan
              </Button>
            )}
            
            {activeTab === "details" && (
              <Button variant="outline" onClick={() => setActiveTab("plans")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Plans
              </Button>
            )}
          </div>
          
          <TabsContent value="plans" className="space-y-4">
            <EnhancedBudgetCardGrid 
              clientId={clientId} 
              onPlanSelected={handlePlanSelected}
            />
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <UnifiedBudgetManager clientId={clientId} />
          </TabsContent>
        </Tabs>
        
        {/* Use the existing BudgetPlanForm for now */}
        <BudgetPlanForm
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          clientId={clientId}
        />
      </div>
    </BudgetFeatureProvider>
  );
}