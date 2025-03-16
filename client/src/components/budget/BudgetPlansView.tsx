import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus } from "lucide-react";
import { BudgetFeatureProvider, useBudgetFeature, type BudgetPlan } from "./BudgetFeatureContext";
import { BudgetPlansGrid } from "./BudgetPlansGrid";
import { BudgetPlanForm } from "./BudgetPlanForm";
import { BudgetPlanFullView } from "./BudgetPlanFullView";
import type { BudgetItem } from "@shared/schema";
import { useNavigate, useLocation } from "wouter";

interface BudgetPlansViewProps {
  clientId: number;
  onViewPlan?: (planId: number) => void;
}

/**
 * Container component that wraps the BudgetPlansContent with the BudgetFeatureProvider
 */
export function BudgetPlansView({ clientId }: BudgetPlansViewProps) {
  return (
    <BudgetFeatureProvider clientId={clientId}>
      <BudgetPlansContent clientId={clientId} />
    </BudgetFeatureProvider>
  );
}

/**
 * Main content component for the budget plans view
 * Shows a grid of all budget plans and allows user to select one
 */
function BudgetPlansContent({ clientId }: BudgetPlansViewProps) {
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Use the budget feature context
  const { setActivePlan } = useBudgetFeature();

  // Fetch all budget plans for this client
  const { data: budgetPlans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-settings`, true],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
        if (!response.ok) {
          throw new Error(`Failed to fetch budget plans: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching budget plans:", error);
        setError("Failed to load budget plans. Please try again.");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Fetch budget items for this client
  const { data: budgetItems = [], isLoading: isLoadingItems } = useQuery<BudgetItem[]>({
    queryKey: [`/api/clients/${clientId}/budget-items`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/budget-items`);
        if (!response.ok) {
          throw new Error(`Failed to fetch budget items: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching budget items:", error);
        return [];
      }
    },
  });

  // Check if the API routes are working
  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/budget/plans`);
        if (!response.ok) {
          setError(`Failed to load budget data: ${response.statusText}`);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking budget API:", error);
        setError("Failed to connect to budget services. Please try again later.");
        setIsLoading(false);
      }
    };

    checkApi();
  }, [clientId]);

  // Handler for selecting a plan to view
  const handleViewPlan = (plan: BudgetPlan) => {
    // Set this as the active plan in context
    setActivePlan(plan);
    // Navigate to the budget details view
    navigate(`/clients/${clientId}/budget/${plan.id}`);
  };

  // Handler for creating a new plan
  const handleCreatePlan = () => {
    setShowCreatePlanForm(true);
  };

  // Loading state
  if (isLoading || isLoadingPlans || isLoadingItems) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Plans</CardTitle>
          <CardDescription>Loading budget information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Plans</CardTitle>
          <CardDescription>Error loading budget data</CardDescription>
        </CardHeader>
        <CardContent>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Budget Plans</h2>
        <Button 
          onClick={handleCreatePlan} 
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Plan
        </Button>
      </div>
      
      {/* Grid of budget plan cards */}
      <BudgetPlansGrid 
        plans={budgetPlans}
        budgetItems={budgetItems}
        onViewPlan={handleViewPlan}
      />
      
      {/* Create Plan Form Dialog */}
      <BudgetPlanForm 
        open={showCreatePlanForm}
        onOpenChange={setShowCreatePlanForm}
        clientId={clientId}
        onSuccess={() => {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ 
            queryKey: [`/api/clients/${clientId}/budget-settings`] 
          });
        }}
      />
    </div>
  );
}