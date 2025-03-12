import React from "react";
import { format } from "date-fns";
import { 
  Activity, 
  Check, 
  Clock, 
  DollarSign, 
  Edit2, 
  ExternalLink,
  ShieldAlert, 
  AlertTriangle
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

// Import BudgetPlan interface from BudgetFeatureContext
import { BudgetPlan } from "@/components/budget/BudgetFeatureContext";

interface BudgetPlanCardProps {
  plan: BudgetPlan;
  onView: () => void;
}

/**
 * A card component to display a budget plan with usage statistics and status
 */
export function BudgetPlanCard({ plan, onView }: BudgetPlanCardProps) {
  const today = new Date();
  const isExpired = plan.endDate ? new Date(plan.endDate) < today : false;
  const isExpiringSoon = plan.endDate && !isExpired ? 
    new Date(plan.endDate) < new Date(today.setDate(today.getDate() + 30)) : 
    false;
  // Will update this logic when we have actual session consumption data
  const isLowFunds = false; // Currently no funds are consumed
  
  // Calculate display values
  // Available funds is the total budget allocated to the client
  const availableFunds = plan.totalUsed; // totalUsed is actually the sum of all allocated items
  
  // Used budget is what's been consumed in sessions (placeholder for now - will be implemented later)
  const usedBudget = 0; // This should later be calculated from session records
  
  // Calculate the balance
  const balanceAmount = availableFunds - usedBudget;
  
  const formattedBalance = formatCurrency(balanceAmount);
  const formattedTotal = formatCurrency(availableFunds);
  
  // Calculate percentage used
  const percentageUsed = availableFunds > 0 
    ? Math.min(Math.round((usedBudget / availableFunds) * 100), 100) 
    : 0;
  
  const progressColor = 
    percentageUsed >= 90 ? "bg-red-500" :
    percentageUsed >= 75 ? "bg-amber-500" :
    "bg-emerald-500";
  
  // Format dates if available
  const formattedStartDate = plan.startDate ? format(new Date(plan.startDate), "MMM d, yyyy") : null;
  const formattedEndDate = plan.endDate ? format(new Date(plan.endDate), "MMM d, yyyy") : null;
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200",
      plan.isActive && "border-primary/70 shadow-md",
      isExpired && "opacity-75 border-gray-200"
    )}>
      <CardHeader className={cn(
        "pb-2",
        plan.isActive && "bg-primary/5"
      )}>
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
              <ShieldAlert className="h-3 w-3" />
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
                {percentageUsed}%
              </div>
            </div>
            <Progress value={percentageUsed} className="h-2" indicatorClassName={progressColor} />
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
            <div className={cn(
              "rounded-md p-2 text-sm flex items-start gap-2",
              isExpiringSoon ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"
            )}>
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                {isExpiringSoon && !isExpired && (
                  <span>Expires soon: {formattedEndDate}</span>
                )}
                {isLowFunds && (
                  <span>{isExpiringSoon && !isExpired ? "• " : ""}
                    {percentageUsed >= 90 ? "Critical" : "Low"} funds available
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Plan Details */}
          <div className="grid grid-cols-2 gap-2 text-sm py-1">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
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
          onClick={onView}
        >
          View Details
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}