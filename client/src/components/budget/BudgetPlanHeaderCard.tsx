import React from "react";
import { 
  Card, 
  CardHeader, 
  CardContent 
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { BudgetPlan } from "./BudgetPlanFullView";
import { DollarSign, Calendar, Clock } from "lucide-react";

interface BudgetPlanHeaderCardProps {
  plan: BudgetPlan;
  status: { label: string; color: string };
  totalUsed: number;
  totalAllocated: number;
  remainingFunds: number;
  usagePercentage: number;
  daysRemaining: number | null;
  startDate: string | null;
  endDate: string | null;
  formatDate: (dateString: string | null) => string;
}

export function BudgetPlanHeaderCard({
  plan,
  status,
  totalUsed,
  totalAllocated,
  remainingFunds,
  usagePercentage,
  daysRemaining,
  startDate,
  endDate,
  formatDate
}: BudgetPlanHeaderCardProps) {
  
  // Get badge color class
  const getBadgeColorClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'amber':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'red':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };
  
  return (
    <Card className="border-2 border-primary/10">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{plan.planName}</h2>
              <Badge className={getBadgeColorClass(status.color)}>
                {status.label}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{plan.planCode || "No Code"}</span>
              {plan.planSerialNumber && (
                <span className="ml-2">• Serial: {plan.planSerialNumber}</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{plan.fundingSource}</span>
              {(startDate || endDate) && (
                <>
                  <span className="mx-1">•</span>
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  <span>
                    {formatDate(startDate)} to {formatDate(endDate)}
                  </span>
                </>
              )}
              {daysRemaining !== null && (
                <>
                  <span className="mx-1">•</span>
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  <span className={daysRemaining < 30 ? "text-amber-600 font-medium" : ""}>
                    {daysRemaining} days remaining
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-3xl font-bold">
              ${remainingFunds.toFixed(2)}
              <span className="text-sm text-muted-foreground ml-1">remaining</span>
            </div>
            <div className="text-sm text-muted-foreground">
              ${totalUsed.toFixed(2)} used of ${totalAllocated.toFixed(2)} total
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="pt-1">
          <div className="flex justify-between text-xs mb-1">
            <span>Budget Usage: {usagePercentage.toFixed(1)}%</span>
            <span>
              ${totalUsed.toFixed(2)} / ${totalAllocated.toFixed(2)}
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            max={100} 
            className={`h-2 ${
              usagePercentage >= 90 ? 'bg-red-200' : 
              usagePercentage >= 70 ? 'bg-amber-200' : 
              'bg-green-200'
            }`}
            indicatorClassName={`${
              usagePercentage >= 90 ? 'bg-red-500' : 
              usagePercentage >= 70 ? 'bg-amber-500' : 
              'bg-green-500'
            }`}
          />
        </div>
      </CardContent>
    </Card>
  );
}