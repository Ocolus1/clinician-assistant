import { useLocation } from "wouter";
import type { BudgetSettings, BudgetItem } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { BudgetPlanForm } from "./BudgetPlanForm";
import { useState } from "react";
import { useBudgetFeature } from "./BudgetFeatureContext";
import { format } from "date-fns";

interface BudgetPlanCardProps {
  plan: BudgetSettings;
  items: BudgetItem[];
  clientId: number;
  onViewPlan: (planId: number) => void;
}

/**
 * Displays a single budget plan as a card
 */
function BudgetPlanCard({ plan, items, clientId, onViewPlan }: BudgetPlanCardProps) {
  // Calculate total allocated from budget items
  const totalAllocated = items
    .filter(item => item.budgetSettingsId === plan.id)
    .reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  // Calculate remaining funds
  const remainingFunds = plan.ndisFunds - totalAllocated;
  
  // Format dates for display
  const planDate = plan.endOfPlan 
    ? format(new Date(plan.endOfPlan), 'MMM d, yyyy')
    : 'No end date';
  
  // Format creation date if available
  const creationDate = plan.createdAt 
    ? format(new Date(plan.createdAt), 'MMM d, yyyy')
    : 'Unknown date';

  return (
    <Card className={`h-full transition-all duration-200 ${plan.isActive ? 'border-primary' : 'hover:border-muted-foreground'}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium">
            {plan.planCode || 'Untitled Plan'}
          </CardTitle>
          {plan.isActive && (
            <Badge variant="outline" className="border-primary bg-primary/10 text-primary">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
        <CardDescription>
          {plan.planSerialNumber && `Plan #${plan.planSerialNumber}`}
          {!plan.planSerialNumber && `Created ${creationDate}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Budget:</span>
            <span className="font-medium">{formatCurrency(plan.ndisFunds)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Allocated:</span>
            <span className="font-medium">{formatCurrency(totalAllocated)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining:</span>
            <span className={`font-medium ${remainingFunds < 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(remainingFunds)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">End Date:</span>
            <span className="font-medium">{planDate}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onViewPlan(plan.id)}
        >
          View Details
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}

interface BudgetPlansGridProps {
  plans: BudgetSettings[];
  budgetItems: BudgetItem[];
  clientId: number;
  onAddPlanSuccess?: () => void;
}

/**
 * Displays a grid of budget plans with the ability to add new plans
 */
export function BudgetPlansGrid({ plans, budgetItems, clientId, onAddPlanSuccess }: BudgetPlansGridProps) {
  const [, navigate] = useLocation();
  const [newPlanDialogOpen, setNewPlanDialogOpen] = useState(false);
  const { setActivePlan } = useBudgetFeature();
  
  // Handle viewing a specific plan
  const handleViewPlan = (planId: number) => {
    // Find the plan to set in context
    const planToView = plans.find(p => p.id === planId);
    if (planToView) {
      setActivePlan(planToView);
    }
    navigate(`/clients/${clientId}/budget/${planId}`);
  };
  
  // Handle adding a new plan
  const handleAddPlan = () => {
    setNewPlanDialogOpen(true);
  };
  
  // Handle successful plan creation
  const handlePlanSuccess = () => {
    setNewPlanDialogOpen(false);
    if (onAddPlanSuccess) {
      onAddPlanSuccess();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Budget Plans</h2>
        <Button onClick={handleAddPlan}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </div>
      
      {plans.length === 0 ? (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">No budget plans available</p>
            <Button onClick={handleAddPlan} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Plan
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <BudgetPlanCard
              key={plan.id}
              plan={plan}
              items={budgetItems}
              clientId={clientId}
              onViewPlan={handleViewPlan}
            />
          ))}
        </div>
      )}
      
      <BudgetPlanForm
        open={newPlanDialogOpen}
        onOpenChange={setNewPlanDialogOpen}
        clientId={clientId}
        onSuccess={handlePlanSuccess}
      />
    </div>
  );
}