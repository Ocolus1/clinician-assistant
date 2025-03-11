import React from "react";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { 
  Check, 
  FileBarChart, 
  Clock, 
  Calendar, 
  DollarSign, 
  Package, 
  CheckCircle2,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { useBudgetFeature } from "./BudgetFeatureContext";

// Define the Budget Plan interface
interface BudgetPlan {
  id: number;
  clientId: number;
  planName: string;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endDate: string | null;
  startDate: string | null;
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
}

// Props for the BudgetPlanCard component
interface BudgetPlanCardProps {
  plan: BudgetPlan;
  onView?: (planId: number) => void;
}

export function BudgetPlanCard({ plan, onView }: BudgetPlanCardProps) {
  const { activatePlan, activeBudgetPlan } = useBudgetFeature();
  const isActive = plan.isActive === true;
  const progress = Math.min(100, plan.percentUsed);
  
  // Format dates for display
  const startDate = plan.startDate ? format(new Date(plan.startDate), 'PPP') : 'Not set';
  const endDate = plan.endDate ? format(new Date(plan.endDate), 'PPP') : 'Not set';
  
  // Calculate remaining funds
  const remainingFunds = plan.availableFunds - plan.totalUsed;
  const isOverBudget = remainingFunds < 0;
  
  // Determine progress status
  const getProgressStatus = () => {
    if (progress >= 90) {
      return "danger";
    } else if (progress >= 75) {
      return "warning";
    } else {
      return "success";
    }
  };
  
  const progressStatus = getProgressStatus();
  
  // Handle view details click
  const handleViewClick = () => {
    if (onView) {
      onView(plan.id);
    }
  };
  
  // Handle activate click
  const handleActivateClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    try {
      await activatePlan(plan.id);
    } catch (error) {
      console.error("Failed to activate plan:", error);
      // You could show a toast error here
    }
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer",
        isActive && "border-primary/50 bg-primary/5"
      )}
      onClick={handleViewClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{plan.planName}</CardTitle>
            <CardDescription>
              {plan.planCode ? `Code: ${plan.planCode}` : "No plan code"}
            </CardDescription>
          </div>
          {isActive ? (
            <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
              <Check className="mr-1 h-3 w-3" /> Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted/50">Inactive</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-4">
          {/* Budget progress visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget usage</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress 
              value={progress} 
              className={cn(
                progressStatus === "success" && "bg-success/20 [&>div]:bg-success",
                progressStatus === "warning" && "bg-warning/20 [&>div]:bg-warning",
                progressStatus === "danger" && "bg-destructive/20 [&>div]:bg-destructive"
              )}
            />
          </div>
          
          {/* Financial stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-1">
              <div className="flex items-center text-muted-foreground">
                <DollarSign className="h-3 w-3 mr-1" />
                <span>Total funds</span>
              </div>
              <div className="font-medium">{formatCurrency(plan.availableFunds)}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-muted-foreground">
                <FileBarChart className="h-3 w-3 mr-1" />
                <span>Used</span>
              </div>
              <div className="font-medium">{formatCurrency(plan.totalUsed)}</div>
            </div>
          </div>
          
          {/* Items count */}
          <div className="flex items-center text-sm">
            <Package className="h-3 w-3 mr-1 text-muted-foreground" />
            <span className="text-muted-foreground mr-1">Items:</span>
            <span className="font-medium">{plan.itemCount}</span>
          </div>
          
          {/* Remaining funds status */}
          <div className="flex items-center text-sm">
            {isOverBudget ? (
              <>
                <AlertTriangle className="h-3 w-3 mr-1 text-destructive" />
                <span className="text-destructive font-medium">
                  Over budget by {formatCurrency(Math.abs(remainingFunds))}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                <span className="text-muted-foreground mr-1">Remaining:</span>
                <span className="font-medium">{formatCurrency(remainingFunds)}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2">
        {isActive ? (
          <Button variant="default" className="w-full" onClick={handleViewClick}>
            View Details <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleActivateClick}
            disabled={!!activeBudgetPlan && activeBudgetPlan.id === plan.id}
          >
            {activeBudgetPlan ? "Switch to this plan" : "Activate plan"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}