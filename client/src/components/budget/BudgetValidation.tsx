import React from 'react';
import { useBudgetFeature } from './BudgetFeatureContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, CheckCircle, InfoIcon } from 'lucide-react';

/**
 * Component to display budget validation information and progress
 */
export function BudgetValidation() {
  const { totalAllocated, totalBudget, remainingBudget } = useBudgetFeature();
  
  // Calculate percentage of budget used
  const percentUsed = Math.min((totalAllocated / totalBudget) * 100, 100);
  
  // Determine alert status based on budget utilization
  const isOverBudget = totalAllocated > totalBudget;
  const isNearLimit = percentUsed >= 90 && percentUsed < 100;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Budget Utilization</span>
          <span className="text-sm font-medium">
            {formatCurrency(totalAllocated)} / {formatCurrency(totalBudget)}
          </span>
        </div>
        
        <Progress 
          value={percentUsed} 
          className={`h-2 ${isOverBudget ? 'bg-red-200' : isNearLimit ? 'bg-amber-200' : 'bg-gray-200'}`}
          indicatorClassName={isOverBudget ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : undefined}
        />
      </div>
      
      {isOverBudget ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Budget Exceeded</AlertTitle>
          <AlertDescription>
            You have exceeded the maximum budget by {formatCurrency(Math.abs(remainingBudget))}.
            Please reduce quantities or remove items.
          </AlertDescription>
        </Alert>
      ) : isNearLimit ? (
        <Alert className="bg-amber-50 border-amber-300">
          <InfoIcon className="h-4 w-4 text-amber-500" />
          <AlertTitle>Approaching Budget Limit</AlertTitle>
          <AlertDescription>
            You have {formatCurrency(remainingBudget)} remaining in your budget.
          </AlertDescription>
        </Alert>
      ) : remainingBudget > 0 ? (
        <Alert variant="default" className="bg-green-50 border-green-300">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Budget Available</AlertTitle>
          <AlertDescription>
            You have {formatCurrency(remainingBudget)} remaining in your budget.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="default" className="bg-blue-50 border-blue-300">
          <CheckCircle className="h-4 w-4 text-blue-500" />
          <AlertTitle>Budget Perfectly Allocated</AlertTitle>
          <AlertDescription>
            You have allocated the entire budget.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}