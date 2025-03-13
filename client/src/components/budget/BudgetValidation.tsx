import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { FIXED_BUDGET_AMOUNT, AVAILABLE_FUNDS_AMOUNT, INITIAL_USED_AMOUNT } from "./BudgetFormSchema";

interface BudgetValidationProps {
  totalBudget: number;
  totalAllocated: number;
  remainingBudget: number;
}

/**
 * Component that displays budget validation information
 * Shows different alerts based on the current budget status
 */
export function BudgetValidation({ 
  totalBudget, 
  totalAllocated, 
  remainingBudget 
}: BudgetValidationProps) {
  // For this fixed budget plan, use initial amount (0) for the "used" value
  // In a real app, this would come from counting actual usage in sessions
  const totalUsed = INITIAL_USED_AMOUNT;
  
  // Calculate percentage of allocated budget vs total allocation
  const percentAllocated = totalAllocated > 0 
    ? Math.min(Math.round((totalAllocated / FIXED_BUDGET_AMOUNT) * 100), 100) 
    : 0;
  
  // Calculate percentage of used amount vs total allocation
  const percentUsed = totalUsed > 0 
    ? Math.min(Math.round((totalUsed / FIXED_BUDGET_AMOUNT) * 100), 100) 
    : 0;
  
  // Determine the budget status
  // Convert string values to numbers to ensure comparison works correctly
  const allocatedAmount = typeof totalAllocated === 'string' ? parseFloat(totalAllocated) : totalAllocated;
  const usedAmount = typeof totalUsed === 'string' ? parseFloat(totalUsed) : totalUsed;
  const budgetAmount = typeof FIXED_BUDGET_AMOUNT === 'string' ? parseFloat(FIXED_BUDGET_AMOUNT) : FIXED_BUDGET_AMOUNT;
  
  // Check if over budget 
  const isOverBudget = allocatedAmount > budgetAmount;
  // Check if fully allocated (with tolerance for floating point math)
  const isFullyAllocated = Math.abs(allocatedAmount - budgetAmount) < 0.01;
  
  // Status color based on allocation status
  const statusColor = isOverBudget 
    ? "text-red-600" 
    : isFullyAllocated 
      ? "text-amber-600" 
      : "text-green-600";
  
  // Progress color based on allocation status
  const progressColor = isOverBudget 
    ? "bg-red-600" 
    : isFullyAllocated 
      ? "bg-amber-500" 
      : "bg-green-600";
  
  // Calculate remaining budget as fixed amount - allocated
  const remainingAllocation = FIXED_BUDGET_AMOUNT - totalAllocated;
  
  // Calculate percentage usage representation for better data visualization
  const percentAllocatedDisplay = percentAllocated.toFixed(0);
  const percentUsedDisplay = percentUsed > 0 ? percentUsed.toFixed(0) : '0';
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Budget Management Status
        </div>
        <div className={`text-sm font-bold ${statusColor}`}>
          {isOverBudget ? 'Over Budget!' : isFullyAllocated ? 'Fully Allocated' : `${percentAllocatedDisplay}% Allocated`}
        </div>
      </div>
      
      {/* Main progress bar */}
      <Progress 
        value={percentAllocated} 
        className="h-3" 
        indicatorClassName={progressColor}
      />
      
      {/* Budget allocation metrics */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Maximum Budget</div>
          <div className="font-medium">{formatCurrency(FIXED_BUDGET_AMOUNT)}</div>
        </div>
        <div>
          <div className="text-gray-500">Currently Allocated</div>
          <div className="font-medium">{formatCurrency(totalAllocated)}</div>
        </div>
        <div>
          <div className="text-gray-500">Remaining Budget</div>
          <div className={`font-medium ${statusColor}`}>
            {formatCurrency(remainingAllocation)}
          </div>
        </div>
      </div>
      
      {/* Additional information about available and used funds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-md border border-gray-100">
        <div>
          <div className="text-gray-500 mb-1">Total Available Funds</div>
          <div className="font-medium text-lg">{formatCurrency(AVAILABLE_FUNDS_AMOUNT)}</div>
          <div className="text-xs text-gray-500 mt-1">Total funds available for this client</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Used in Sessions</div>
          <div className="font-medium text-lg">{formatCurrency(totalUsed)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {percentUsedDisplay}% of allocated budget used so far
          </div>
        </div>
      </div>
      
      {/* Status alerts */}
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Budget Limit Exceeded:</strong> You are over budget by {formatCurrency(Math.abs(remainingAllocation))}.
            Please reduce quantities or remove items to comply with the maximum budget of {formatCurrency(FIXED_BUDGET_AMOUNT)}.
          </AlertDescription>
        </Alert>
      )}
      
      {isFullyAllocated && !isOverBudget && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Budget Fully Allocated:</strong> You have allocated your entire budget of {formatCurrency(FIXED_BUDGET_AMOUNT)}.
            Any additional items will require adjusting existing allocations.
          </AlertDescription>
        </Alert>
      )}
      
      {!isOverBudget && !isFullyAllocated && percentAllocated > 80 && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Approaching Limit:</strong> You are nearing your budget limit with {formatCurrency(remainingAllocation)} remaining 
            out of {formatCurrency(FIXED_BUDGET_AMOUNT)} ({(100 - percentAllocated).toFixed(0)}% left).
          </AlertDescription>
        </Alert>
      )}
      
      {!isOverBudget && !isFullyAllocated && percentAllocated <= 80 && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Budget in Good Standing:</strong> Your budget is being managed well with {formatCurrency(remainingAllocation)} 
            still available ({(100 - percentAllocated).toFixed(0)}% of your budget).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}