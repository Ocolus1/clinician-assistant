import React, { useState } from "react";
import { useBudgetFeature } from "./BudgetFeatureContext";
import { Button } from "@/components/ui/button";
import { Plus, PlusCircle, DollarSign, PieChart, Calendar, Package, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EnhancedBudgetPlanCreateWizard } from "./EnhancedBudgetPlanCreateWizard";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EnhancedBudgetPlansViewProps {
  clientId: number;
  onViewPlan: (planId: number) => void;
}

/**
 * Enhanced budget plans overview component
 * Displays a grid of plan cards with key metrics and actions
 * This component is used in the ClientBudgetTab to show all plans
 */
export function EnhancedBudgetPlansView({ clientId, onViewPlan }: EnhancedBudgetPlansViewProps) {
  const { budgetPlans, isLoading, error, refreshData } = useBudgetFeature();
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  
  // Handle refresh button click
  const handleRefresh = () => {
    refreshData();
  };
  
  // No plans state - show creation prompt
  if (!isLoading && (!budgetPlans || budgetPlans.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold">Budget Plans</h2>
            <p className="text-muted-foreground">Create and manage budget plans</p>
          </div>
          <Button onClick={() => setShowCreatePlanForm(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
        
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Budget Plans</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first budget plan to start tracking funds allocation and expenses.
            </p>
            <Button onClick={() => setShowCreatePlanForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget Plan
            </Button>
          </CardContent>
        </Card>
        
        {/* Budget Plan Creation Wizard */}
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
  
  return (
    <div className="space-y-6">
      {/* Header with title and create button */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold">Budget Plans</h2>
          <p className="text-muted-foreground">Manage funding, allocations and expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreatePlanForm(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>
      
      {/* Plan cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgetPlans?.map((plan) => (
          <Card 
            key={plan.id} 
            className={cn(
              "overflow-hidden transition-all hover:shadow-md cursor-pointer",
              plan.isActive ? "border-primary/20" : "opacity-70"
            )}
            onClick={() => onViewPlan(plan.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{plan.planSerialNumber || plan.planCode || `Plan ${plan.id}`}</CardTitle>
                  <CardDescription>
                    {plan.isActive ? "Active Plan" : "Inactive Plan"}
                  </CardDescription>
                </div>
                {plan.isActive && (
                  <Badge variant="outline" className="bg-primary/10">Active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Funds</span>
                  <span className="font-medium">${plan.ndisFunds?.toLocaleString() || 0}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">${plan.totalUsed?.toLocaleString() || 0}</span>
                  </div>
                  <Progress value={plan.percentUsed || 0} className="h-2" />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{plan.percentUsed?.toFixed(0) || 0}% Used</span>
                    <span>${(plan.ndisFunds - (plan.totalUsed || 0)).toLocaleString()} Available</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">
                      {plan.endOfPlan ? format(new Date(plan.endOfPlan), 'MMM d, yyyy') : 'No end date'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Budget Items:</span>
                    <span className="font-medium">{plan.itemCount || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewPlan(plan.id);
                }}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Budget Plan Creation Wizard */}
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