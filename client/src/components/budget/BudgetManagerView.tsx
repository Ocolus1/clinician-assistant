import React, { useState, useEffect } from "react";
import { BudgetFeatureProvider } from "./BudgetFeatureContext";
import { BudgetPlanDetails } from "./BudgetPlanDetailsIntegrated";
import { BudgetPlanForm } from "./BudgetPlanForm";
import { BudgetApiDebugger } from "./BudgetApiDebugger";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { BudgetPlansView } from "./BudgetPlansView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BudgetManagerViewProps {
  clientId: number;
}

/**
 * Main budget management view container component
 * This handles overall state management and rendering of the appropriate subviews
 */
function BudgetManagerContent({ clientId }: BudgetManagerViewProps) {
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'details'>('overview');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // Check if the API routes are working
  useEffect(() => {
    const checkApi = async () => {
      try {
        // First try the dedicated plans endpoint
        let response = await fetch(`/api/clients/${clientId}/budget/plans`);
        
        // If that fails, fall back to the budget-settings endpoint which we know works
        if (!response.ok) {
          console.log("Primary budget plans endpoint failed, trying fallback...");
          response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
          
          if (!response.ok) {
            setError(`Failed to load budget data: ${response.statusText}`);
            setIsLoading(false);
            return;
          }
        }
        
        // If we got this far, we have data
        const data = await response.json();
        console.log("Budget data loaded successfully:", data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking budget API:", error);
        setError("Failed to connect to budget services. Please try again later.");
        setIsLoading(false);
      }
    };

    checkApi();
  }, [clientId]);

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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Error loading budget data</CardDescription>
        </CardHeader>
        <CardContent>
          {/* API Debugger to help diagnose the issue */}
          <div className="mb-6">
            <BudgetApiDebugger clientId={clientId} />
          </div>
          
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleViewPlanDetails = (planId: number) => {
    setSelectedPlanId(planId);
    setActiveView('details');
  };
  
  return (
    <div>
      <div className="space-y-6">
        {activeView === 'overview' ? (
          // Simple Plans Overview with cards layout
          <div className="w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Budget Plans</h2>
              <Button
                onClick={() => setShowCreatePlanForm(true)}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Plan
              </Button>
            </div>
            
            {/* Budget Plans View with cards */}
            <BudgetPlansView clientId={clientId} onViewPlan={handleViewPlanDetails} />
          </div>
        ) : (
          <>
            {/* Budget Plan Details View */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Budget Plan Details</h2>
              <Button 
                onClick={() => setActiveView('overview')} 
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