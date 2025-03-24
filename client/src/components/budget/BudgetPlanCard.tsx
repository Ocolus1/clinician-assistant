import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  ExternalLink, 
  Check, 
  ClipboardList, 
  Banknote 
} from "lucide-react";
import { BudgetSettings } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BudgetPlanCardProps {
  plan: BudgetSettings;
  clientId?: number; // Make clientId optional since we just pass it through
  onView?: (planId: number) => void;
  onViewPlan?: (planId: number) => void; // Support both naming conventions
}

/**
 * Budget Plan Card component for displaying budget plan data in a visual card format
 */
export function BudgetPlanCard({ plan, clientId, onView, onViewPlan }: BudgetPlanCardProps) {
  // Format dates
  const startDate = plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : "N/A";
  const endDate = plan.endOfPlan ? new Date(plan.endOfPlan).toLocaleDateString() : "N/A";
  
  // Calculate percentage used (if data is available)
  const totalBudget = typeof plan.ndisFunds === 'string' ? parseFloat(plan.ndisFunds) : plan.ndisFunds || 0;
  // We don't have usedFunds in our schema yet - this would come from sessions data
  // We're setting a default to 0 for now, but should calculate from actual sessions in a real implementation
  const usedFunds = 0; // This should be calculated based on sessions or another field
  const percentUsed = usedFunds ? Math.min(100, Math.round((usedFunds / totalBudget) * 100)) : 0;
  
  // Format currency values
  const formattedTotal = formatCurrency(totalBudget);
  const formattedUsed = formatCurrency(usedFunds);
  const formattedRemaining = formatCurrency(Math.max(0, totalBudget - usedFunds));
  
  // Days remaining calculation
  const daysRemaining = plan.endOfPlan ? 
    Math.max(0, Math.ceil((new Date(plan.endOfPlan).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 
    null;
  
  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${plan.isActive ? 'border-blue-300' : 'border-gray-200'}`}>
      <div className={`h-2 w-full ${plan.isActive ? 'bg-blue-500' : 'bg-gray-300'}`} />
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {plan.planCode || "Untitled Plan"}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              {plan.planSerialNumber || "No Reference Number"}
            </CardDescription>
          </div>
          
          {plan.isActive && (
            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
              <Check className="h-3.5 w-3.5 mr-1" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700">{startDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">→</span>
            <span className="text-gray-700">{endDate}</span>
          </div>
          
          {/* Budget Stats */}
          <div className="flex items-center gap-2 col-span-2 mt-1">
            <Banknote className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700 font-medium">{formattedTotal}</span>
            <span className="text-xs text-gray-500">total</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="pt-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Used: {formattedUsed}</span>
            <span className="text-gray-500">Remaining: {formattedRemaining}</span>
          </div>
          <Progress value={percentUsed} className="h-2" />
          <div className="flex justify-between text-xs mt-1">
            <span>{percentUsed}%</span>
            {daysRemaining !== null && (
              <span className={`${daysRemaining < 30 ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                {daysRemaining} days remaining
              </span>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-end gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-sm"
                onClick={() => {
                  // Use the onView prop if provided, otherwise fall back to onViewPlan
                  if (onView) {
                    onView(plan.id);
                  } else if (onViewPlan) {
                    onViewPlan(plan.id);
                  }
                }}
              >
                <ClipboardList className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View plan details and manage budget items</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}