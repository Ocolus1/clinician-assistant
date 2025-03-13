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
  
  // Calculate percentage of allocated budget used vs total allocation
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
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Budget Usage Status
        </div>
        <div className={`text-sm font-bold ${statusColor}`}>
          {isOverBudget ? 'Over Budget!' : isFullyAllocated ? 'Fully Allocated' : 'Available Budget'}
        </div>
      </div>
      
      <Progress 
        value={percentUsed} 
        className="h-2" 
        indicatorClassName={progressColor}
      />
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Total Allocated</div>
          <div className="font-medium">{formatCurrency(FIXED_BUDGET_AMOUNT)}</div>
        </div>
        <div>
          <div className="text-gray-500">Total Used</div>
          <div className="font-medium">{formatCurrency(totalUsed)}</div>
        </div>
        <div>
          <div className="text-gray-500">Remaining</div>
          <div className={`font-medium ${statusColor}`}>
            {formatCurrency(remainingAllocation)}
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 p-2 bg-blue-50 border border-blue-100 rounded-md">
        <div className="flex justify-between">
          <span>Total Available Funds:</span>
          <span className="font-medium">{formatCurrency(AVAILABLE_FUNDS_AMOUNT)}</span>
        </div>
      </div>
      
      {/* Status alerts */}
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are over budget by {formatCurrency(Math.abs(remainingAllocation))}.
            Please reduce quantities or remove items.
          </AlertDescription>
        </Alert>
      )}
      
      {isFullyUsed && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You have used your entire allocated budget of {formatCurrency(FIXED_BUDGET_AMOUNT)}.
          </AlertDescription>
        </Alert>
      )}
      
      {!isOverBudget && !isFullyUsed && percentUsed > 80 && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You are approaching your budget limit. {formatCurrency(remainingAllocation)} remaining out of {formatCurrency(FIXED_BUDGET_AMOUNT)}.
          </AlertDescription>
        </Alert>
      )}
      
      {!isOverBudget && !isFullyUsed && percentUsed <= 80 && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your budget is being used efficiently. {formatCurrency(remainingAllocation)} still available out of {formatCurrency(FIXED_BUDGET_AMOUNT)}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}