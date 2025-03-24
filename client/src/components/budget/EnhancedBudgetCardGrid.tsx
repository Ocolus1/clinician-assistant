import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { BudgetSettings } from "@shared/schema";
import { differenceInDays, parseISO, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Eye } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { useBudgetFeature } from "./BudgetFeatureContext";

interface EnhancedBudgetCardGridProps {
  clientId: number;
  onPlanSelected: (planId: number) => void;
}

export function EnhancedBudgetCardGrid({ clientId, onPlanSelected }: EnhancedBudgetCardGridProps) {
  const { data: budgetPlans, isLoading } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    queryFn: getQueryFn({
      on401: "throw",
      getFn: () => ({ url: `/api/clients/${clientId}/budget-settings?all=true` })
    })
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="w-full">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium">Budget Plans</h3>
          <p className="text-sm text-muted-foreground">
            Manage funding allocation and track spending across multiple plans
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgetPlans && Array.isArray(budgetPlans) && budgetPlans.length > 0 ? (
          budgetPlans.map((plan: BudgetSettings) => (
            <BudgetPlanCard 
              key={plan.id} 
              plan={plan} 
              onPreview={() => onPlanSelected(plan.id)}
            />
          ))
        ) : (
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>No Budget Plans Found</CardTitle>
              <CardDescription>Create your first budget plan to get started</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

interface BudgetPlanCardProps {
  plan: BudgetSettings;
  onPreview: () => void;
}

function BudgetPlanCard({ plan, onPreview }: BudgetPlanCardProps) {
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [formattedDate, setFormattedDate] = useState<string>("");
  
  useEffect(() => {
    if (plan.endOfPlan) {
      const endDate = parseISO(plan.endOfPlan);
      const today = new Date();
      setDaysLeft(differenceInDays(endDate, today));
      setFormattedDate(format(endDate, 'MMMM dd, yyyy'));
    }
  }, [plan.endOfPlan]);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{plan.planCode || 'Budget Plan'}</CardTitle>
            <CardDescription>Serial #: {plan.planSerialNumber || 'N/A'}</CardDescription>
          </div>
          <Badge variant={plan.isActive ? "default" : "outline"}>
            {plan.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Funds:</span>
            <span className="font-medium">{formatCurrency(Number(plan.ndisFunds) || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Expires:</span>
            <span className="font-medium">{formattedDate} ({daysLeft} days)</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={onPreview}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </CardFooter>
    </Card>
  );
}