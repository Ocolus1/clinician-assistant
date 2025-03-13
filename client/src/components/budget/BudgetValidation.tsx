import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { FIXED_BUDGET_AMOUNT, AVAILABLE_FUNDS_AMOUNT } from "./BudgetFormSchema";

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
  // Calculate percentage of budget used
  const percentUsed = FIXED_BUDGET_AMOUNT > 0 
    ? Math.min(Math.round((totalAllocated / FIXED_BUDGET_AMOUNT) * 100), 100) 
    : 0;
  
  // Determine the budget status
  const isOverBudget = remainingBudget < 0;
  const isFullyAllocated = remainingBudget === 0;
  
  // Status color
  const statusColor = isOverBudget 
    ? "text-red-600" 
    : isFullyAllocated 
      ? "text-amber-600" 
      : "text-green-600";
  
  // Progress color
  const progressColor = isOverBudget 
    ? "bg-red-600" 
    : isFullyAllocated 
      ? "bg-amber-500" 
      : "bg-green-600";
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Budget Allocation Status
        </div>
        <div className={`text-sm font-bold ${statusColor}`}>
          {isOverBudget ? 'Over Budget!' : isFullyAllocated ? 'Fully Allocated' : 'Available Funds'}
        </div>
      </div>
      
      <Progress 
        value={percentUsed} 
        className="h-2" 
        indicatorClassName={progressColor}
      />
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Maximum Budget</div>
          <div className="font-medium">{formatCurrency(FIXED_BUDGET_AMOUNT)}</div>
        </div>
        <div>
          <div className="text-gray-500">Allocated</div>
          <div className="font-medium">{formatCurrency(totalAllocated)}</div>
        </div>
        <div>
          <div className="text-gray-500">Remaining</div>
          <div className={`font-medium ${statusColor}`}>
            {formatCurrency(remainingBudget)}
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
            You are over budget by {formatCurrency(Math.abs(remainingBudget))}.
            Please reduce quantities or remove items.
          </AlertDescription>
        </Alert>
      )}
      
      {isFullyAllocated && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Your budget is fully allocated. The maximum allocation limit is {formatCurrency(FIXED_BUDGET_AMOUNT)}.
          </AlertDescription>
        </Alert>
      )}
      
      {!isOverBudget && !isFullyAllocated && percentUsed > 80 && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You are approaching your budget limit. {formatCurrency(remainingBudget)} remaining out of {formatCurrency(FIXED_BUDGET_AMOUNT)}.
          </AlertDescription>
        </Alert>
      )}
      
      {!isOverBudget && !isFullyAllocated && percentUsed <= 80 && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your budget is being allocated efficiently. {formatCurrency(remainingBudget)} still available out of {formatCurrency(FIXED_BUDGET_AMOUNT)}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}