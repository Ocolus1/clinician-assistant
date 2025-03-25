import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { SegmentedProgressBar } from './SegmentedProgressBar';

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
  originalAllocated 
}: BudgetValidationProps) {
  // Important: Enforce the budget limit as a hard constraint
  if (totalAllocated > totalBudget) {
    console.error(`Budget limit exceeded! Allocated ${totalAllocated} exceeds total budget ${totalBudget}`);
  }
  
  // Total used amount should be calculated from session data when available
  // For now, we use 0 as a starting point but this will be updated when session usage data is implemented
  const totalUsed = 0; // Starting at 0 for initial implementation
  
  // Calculate percentage of used amount vs total budget
  const percentUsed = totalUsed > 0 && totalBudget > 0
    ? Math.min(Math.round((totalUsed / totalBudget) * 100), 100) 
    : 0;
  
  // Determine the budget status
  // Convert string values to numbers to ensure comparison works correctly
  const allocatedAmount = typeof totalAllocated === 'string' ? parseFloat(totalAllocated) : totalAllocated;
  const usedAmount = typeof totalUsed === 'string' ? parseFloat(totalUsed) : totalUsed;
  const budgetAmount = typeof totalBudget === 'string' ? parseFloat(totalBudget) : totalBudget;
  
  // Check if over budget - comparing to total budget
  const isOverBudget = allocatedAmount > budgetAmount;
  
  // Check if fully allocated (with tolerance for floating point math)
  const isFullyAllocated = Math.abs(allocatedAmount - budgetAmount) < 0.01;
  
  // Calculate the allocation difference (allocation - budget)
  const allocationDifference = allocatedAmount - budgetAmount;
  
  // Status color based on allocation status
  const statusColor = isOverBudget 
    ? "text-red-600" 
    : isFullyAllocated 
      ? "text-amber-600" 
      : "text-green-600";
  
  // Progress color for usage indicator
  const progressColor = "bg-blue-600"; // Blue for usage
  
  // Calculate remaining budget as total budget - used (not allocated)
  const remainingAllocation = budgetAmount - usedAmount;
  
  // Calculate percentage of allocated vs total budget
  const percentAllocated = budgetAmount > 0
    ? Math.min(Math.round((allocatedAmount / budgetAmount) * 100), 100)
    : 0;
  
  // Segments for the progress bar - Used, Allocated, Available
  // Using gray background with blue for utilization as requested
  const segments = [
    { value: percentUsed, color: 'bg-blue-600', label: 'Used' },
    { value: percentAllocated - percentUsed, color: 'bg-gray-300', label: 'Allocated' },
    { value: 100 - percentAllocated, color: 'bg-gray-200', label: 'Available' }
  ];
  
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
      
      {/* Segmented progress bar showing Used, Allocated, and Available */}
      <SegmentedProgressBar segments={segments} />
      
      {/* Budget metrics - reformatted as per requirements */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Total Budget</div>
          <div className="font-medium">
            {formatCurrency(budgetAmount)}
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
      
      {/* Status alerts */}
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Budget Limit Exceeded:</strong> You are over budget by {formatCurrency(Math.abs(remainingAllocation))}.
            Please reduce quantities or remove items to stay within your available budget of {formatCurrency(budgetAmount)}.
          </AlertDescription>
        </Alert>
      )}
      
      {isFullyAllocated && !isOverBudget && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Budget Fully Allocated:</strong> You have allocated your entire available budget of {formatCurrency(budgetAmount)}.
            {totalUsed > 0 
              ? ` ${formatCurrency(totalUsed)} has been used so far.`
              : ''
            } Any additional items will require adjusting existing allocations.
          </AlertDescription>
        </Alert>
      )}
      
      {!isOverBudget && !isFullyAllocated && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Budget in Good Standing:</strong> Your total budget is {formatCurrency(budgetAmount)}. 
            {totalUsed > 0 
              ? `You've used ${formatCurrency(totalUsed)}, leaving ${formatCurrency(remainingAllocation)} remaining.`
              : `No items have been used yet, with ${formatCurrency(budgetAmount - allocatedAmount)} still available for allocation.`
            }
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}