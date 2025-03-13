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
  originalAllocated?: number; // The original allocated budget (fixed and shouldn't change)
}

/**
 * Component that displays budget validation information
 * Shows different alerts based on the current budget status
 */
export function BudgetValidation({ 
  totalBudget, 
  totalAllocated, 
  remainingBudget,
  originalAllocated = FIXED_BUDGET_AMOUNT // Default to the fixed budget amount if not provided
}: BudgetValidationProps) {
  // For this fixed budget plan, use initial amount (0) for the "used" value
  // In a real app, this would come from counting actual usage in sessions
  const totalUsed = INITIAL_USED_AMOUNT;
  
  // Calculate percentage of used amount vs original allocation
  const percentUsed = totalUsed > 0 
    ? Math.min(Math.round((totalUsed / originalAllocated) * 100), 100) 
    : 0;
  
  // Determine the budget status
  // Convert string values to numbers to ensure comparison works correctly
  const allocatedAmount = typeof totalAllocated === 'string' ? parseFloat(totalAllocated) : totalAllocated;
  const usedAmount = typeof totalUsed === 'string' ? parseFloat(totalUsed) : totalUsed;
  const originalAmount = typeof originalAllocated === 'string' ? parseFloat(originalAllocated) : originalAllocated;
  
  // Check if over budget - comparing to original allocation
  const isOverBudget = allocatedAmount > originalAmount;
  
  // Check if fully allocated (with tolerance for floating point math)
  const isFullyAllocated = Math.abs(allocatedAmount - originalAmount) < 0.01;
  
  // Calculate the allocation difference (reallocation - original allocation)
  const allocationDifference = allocatedAmount - originalAmount;
  
  // Status color based on allocation status
  const statusColor = isOverBudget 
    ? "text-red-600" 
    : isFullyAllocated 
      ? "text-amber-600" 
      : "text-green-600";
  
  // Progress color for usage indicator
  const progressColor = "bg-blue-600"; // Blue for usage
  
  // Calculate remaining budget as original amount - allocated
  const remainingAllocation = originalAmount - allocatedAmount;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Budget Usage Status
        </div>
        <div className={`text-sm font-bold ${statusColor}`}>
          {isOverBudget 
            ? 'Over Budget!' 
            : isFullyAllocated 
              ? `${percentUsed}% Used` 
              : `${percentUsed}% Used`}
        </div>
      </div>
      
      {/* Usage progress bar */}
      <Progress 
        value={percentUsed} 
        className="h-3" 
        indicatorClassName={progressColor}
      />
      
      {/* Budget metrics - reformatted as per requirements */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Total Allocated</div>
          <div className="font-medium">
            {formatCurrency(originalAmount)}
            {isOverBudget && (
              <span className="text-xs ml-1 text-red-500">
                ({formatCurrency(allocationDifference)})
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Total Used</div>
          <div className="font-medium">{formatCurrency(totalUsed)}</div>
        </div>
        <div>
          <div className="text-gray-500">Remaining Budget</div>
          <div className={`font-medium ${statusColor}`}>
            {formatCurrency(remainingAllocation)}
          </div>
        </div>
      </div>
      
      {/* Additional information about available funds */}
      <div className="grid grid-cols-1 gap-4 text-sm bg-gray-50 p-3 rounded-md border border-gray-100">
        <div>
          <div className="text-gray-500 mb-1">Total Available Funds</div>
          <div className="font-medium text-lg">{formatCurrency(AVAILABLE_FUNDS_AMOUNT)}</div>
          <div className="text-xs text-gray-500 mt-1">Total funds available for this client</div>
        </div>
      </div>
      
      {/* Status alerts */}
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Budget Limit Exceeded:</strong> You are over budget by {formatCurrency(Math.abs(remainingAllocation))}.
            Please reduce quantities or remove items to stay within your original allocation of {formatCurrency(originalAmount)}.
          </AlertDescription>
        </Alert>
      )}
      
      {isFullyAllocated && !isOverBudget && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Budget Fully Allocated:</strong> You have allocated your entire budget of {formatCurrency(originalAmount)}.
            Any additional items will require adjusting existing allocations.
          </AlertDescription>
        </Alert>
      )}
      
      {!isOverBudget && !isFullyAllocated && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Budget in Good Standing:</strong> Your budget allocation is under the limit with {formatCurrency(remainingAllocation)} 
            still available.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}