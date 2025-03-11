import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "../ui/card";
import { Button } from "../ui/button";
import { 
  Loader2, 
  AlertCircle, 
  DollarSign, 
  PlusCircle, 
  CalendarRange,
  Check,
  Clock,
  ExternalLink 
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";

interface DirectBudgetPlanProps {
  clientId: number;
}

/**
 * A component that directly fetches and displays budget plans
 * This is a fallback solution for when the context provider approach fails
 */
export function DirectBudgetPlanList({ clientId }: DirectBudgetPlanProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Direct fetch from the API
  useEffect(() => {
    const fetchBudgetPlans = async () => {
      try {
        console.log(`[DirectBudgetPlanList] Fetching budget plans for client ${clientId}`);
        
        // Make the API request
        const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
        
        if (!response.ok) {
          throw new Error(`Error fetching budget plans: ${response.status} ${response.statusText}`);
        }
        
        let data = await response.json();
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
          data = [data];
        }
        
        console.log(`[DirectBudgetPlanList] Received ${data.length} budget plans:`, data);
        
        // Transform the data to include UI-specific properties
        const transformedPlans = data.map((plan) => ({
          id: plan.id,
          clientId: plan.clientId,
          planName: plan.planSerialNumber || `Plan ${plan.id}`,
          planCode: plan.planCode || null,
          isActive: plan.isActive === true, // Ensure boolean
          availableFunds: parseFloat(plan.availableFunds) || 0,
          endDate: plan.endOfPlan, // Field name in API is endOfPlan
          startDate: plan.createdAt,
          // These will be calculated from budget items later, but for now we'll use placeholder values
          totalUsed: 0,
          itemCount: 0,
          percentUsed: 0,
        }));
        
        console.log(`[DirectBudgetPlanList] Transformed ${transformedPlans.length} budget plans`);
        setPlans(transformedPlans);
        
        // If we have budget plans, fetch the budget items to calculate usage
        if (transformedPlans.length > 0) {
          fetchBudgetItems(transformedPlans);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[DirectBudgetPlanList] Error fetching budget plans:", error);
        setError(error instanceof Error ? error.message : "Unknown error fetching budget plans");
        setIsLoading(false);
      }
    };
    
    // Fetch budget items and calculate plan usage
    const fetchBudgetItems = async (budgetPlans: any[]) => {
      try {
        const response = await fetch(`/api/clients/${clientId}/budget-items`);
        
        if (!response.ok) {
          throw new Error(`Error fetching budget items: ${response.status} ${response.statusText}`);
        }
        
        let items = await response.json();
        
        // Ensure items is an array
        if (!Array.isArray(items)) {
          items = items ? [items] : [];
        }
        
        console.log(`[DirectBudgetPlanList] Received ${items.length} budget items`);
        
        // Group items by budget settings ID
        const itemsByPlanId = items.reduce((acc: Record<number, any[]>, item: any) => {
          const planId = item.budgetSettingsId;
          if (!acc[planId]) {
            acc[planId] = [];
          }
          acc[planId].push(item);
          return acc;
        }, {} as Record<number, any[]>);
        
        // Calculate usage for each plan
        const plansWithUsage = budgetPlans.map(plan => {
          const planItems = itemsByPlanId[plan.id] || [];
          
          // Calculate item count
          const itemCount = planItems.length;
          
          // Calculate total used based on unit price * used quantity
          const totalUsed = planItems.reduce(
            (sum: number, item: any) => sum + (item.unitPrice * (item.usedQuantity || 0)), 0
          );
          
          // Calculate percent used
          const percentUsed = plan.availableFunds > 0
            ? Math.min(Math.round((totalUsed / plan.availableFunds) * 100), 100)
            : 0;
          
          return {
            ...plan,
            itemCount,
            totalUsed,
            percentUsed
          };
        });
        
        console.log(`[DirectBudgetPlanList] Plans with usage calculated:`, plansWithUsage);
        setPlans(plansWithUsage);
        setIsLoading(false);
      } catch (error) {
        console.error("[DirectBudgetPlanList] Error fetching budget items:", error);
        // Don't set an error, just use the plans without usage info
        setIsLoading(false);
      }
    };
    
    fetchBudgetPlans();
  }, [clientId]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3">Loading budget plans...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
            <div>
              <h3 className="text-base font-medium text-red-800">Error Loading Budget Plans</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (plans.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-background p-3 mb-4">
            <PlusCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Budget Plans</h3>
          <p className="text-center text-muted-foreground mb-4 max-w-md">
            Create your first budget plan to start tracking therapy expenses and funding allocations.
          </p>
          <Button>
            Create New Budget Plan
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Budget Plans</h3>
          <p className="text-sm text-muted-foreground">
            {plans.length} {plans.length === 1 ? 'plan' : 'plans'} available
          </p>
        </div>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Budget Plan
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <BudgetPlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

// Budget Plan Card component
function BudgetPlanCard({ plan }: { plan: any }) {
  const today = new Date();
  const isExpired = plan.endDate ? new Date(plan.endDate) < today : false;
  const isExpiringSoon = plan.endDate && !isExpired ? 
    new Date(plan.endDate) < new Date(today.setDate(today.getDate() + 30)) : 
    false;
  const isLowFunds = plan.percentUsed > 80;
  
  // Calculate display values
  const balanceAmount = plan.availableFunds - plan.totalUsed;
  const formattedBalance = formatCurrency(balanceAmount);
  const formattedTotal = formatCurrency(plan.availableFunds);
  const progressColor = 
    plan.percentUsed >= 90 ? "bg-red-500" :
    plan.percentUsed >= 75 ? "bg-amber-500" :
    "bg-emerald-500";
  
  // Format dates if available
  const formattedStartDate = plan.startDate ? format(new Date(plan.startDate), "MMM d, yyyy") : null;
  const formattedEndDate = plan.endDate ? format(new Date(plan.endDate), "MMM d, yyyy") : null;
  
  return (
    <Card className={`overflow-hidden transition-all duration-200 ${
      plan.isActive ? "border-primary/70 shadow-md" : ""
    } ${isExpired ? "opacity-75 border-gray-200" : ""}`}>
      <CardHeader className={`pb-2 ${plan.isActive ? "bg-primary/5" : ""}`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg line-clamp-1">{plan.planName}</CardTitle>
            <CardDescription>{plan.planCode}</CardDescription>
          </div>
          
          {plan.isActive && (
            <Badge variant="outline" className="border-primary text-primary flex items-center gap-1">
              <Check className="h-3 w-3" />
              Active
            </Badge>
          )}
          
          {isExpired && (
            <Badge variant="outline" className="border-red-500 text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Expired
            </Badge>
          )}
          
          {!plan.isActive && !isExpired && (
            <Badge variant="outline" className="border-gray-500 text-gray-600">
              Inactive
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 pb-2">
        <div className="space-y-4">
          {/* Budget Progress */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <div className="text-sm font-medium">Budget Usage</div>
              <div className="text-sm text-muted-foreground">
                {plan.percentUsed}%
              </div>
            </div>
            <Progress value={plan.percentUsed} className="h-2" indicatorClassName={progressColor} />
            <div className="flex justify-between mt-1.5 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formattedBalance}</span>
              </div>
              <span className="text-muted-foreground">of {formattedTotal}</span>
            </div>
          </div>
          
          {/* Warning Indicators */}
          {(isExpiringSoon || isLowFunds) && (
            <div className={`rounded-md p-2 text-sm flex items-start gap-2 ${
              isExpiringSoon ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"
            }`}>
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                {isExpiringSoon && !isExpired && (
                  <span>Expires soon: {formattedEndDate}</span>
                )}
                {isLowFunds && (
                  <span>{isExpiringSoon && !isExpired ? "• " : ""}
                    {plan.percentUsed >= 90 ? "Critical" : "Low"} funds available
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Plan Details */}
          <div className="grid grid-cols-2 gap-2 text-sm py-1">
            <div className="flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{plan.itemCount} items</span>
            </div>
            {formattedStartDate && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">Created {formattedStartDate}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2">
        <Button 
          variant="default" 
          className="w-full"
        >
          View Details
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}