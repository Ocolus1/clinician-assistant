import React, { useState, useEffect } from "react";
import { BudgetFeatureProvider, useBudgetFeature } from "./BudgetFeatureContext";
import { BudgetPlanDetails } from "./BudgetPlanDetailsIntegrated";
import { EnhancedBudgetPlanCreateWizard } from "./EnhancedBudgetPlanCreateWizard";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { EnhancedBudgetPlansView } from "./EnhancedBudgetPlansView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BudgetManagerViewProps {
  clientId: number;
}

/**
 * Main budget management view container component
 * This handles overall state management and rendering of the appropriate subviews
 * Uses the BudgetFeatureContext for state management
 */
function BudgetManagerContent({ clientId }: BudgetManagerViewProps) {
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  
  // Get budget state from context
  const { 
    isLoading, 
    error, 
    refreshData, 
    viewPlanDetails, 
    returnToOverview, 
    selectedPlanId,
    budgetPlans
  } = useBudgetFeature();

  // If plans are loading, show a loading indicator
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Loading budget information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // If there was an error, show an error message
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Error loading budget data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={() => refreshData()} 
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div>
      <div className="space-y-6">
        {!selectedPlanId ? (
          // Plans Overview - Show the enhanced budget plans view
          <EnhancedBudgetPlansView clientId={clientId} onViewPlan={viewPlanDetails} />
        ) : (
          // Plan Details - Show the plan details view
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Budget Plan Details</h2>
              <Button 
                onClick={returnToOverview} 
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Plans
              </Button>
            </div>
            
            {/* Budget Plan Details with integrated budget item management */}
            <BudgetPlanDetails 
              clientId={clientId}
              planId={selectedPlanId}
            />
          </>
        )}
      </div>
      
      {/* Enhanced Budget Plan Creation Wizard */}
      <EnhancedBudgetPlanCreateWizard 
        open={showCreatePlanForm}
        onOpenChange={setShowCreatePlanForm}
        clientId={clientId}
        onSuccess={() => {
          refreshData();
        }}
      />
    </div>
  );
}

/**
 * Exported budget manager component with BudgetFeatureProvider context
 */
export function BudgetManagerView({ clientId }: BudgetManagerViewProps) {
  return (
    <BudgetFeatureProvider clientId={clientId}>
      <BudgetManagerContent clientId={clientId} />
    </BudgetFeatureProvider>
  );
}