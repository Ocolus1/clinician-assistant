import { AlertCircle, CheckCircle2, InfoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface BudgetValidationProps {
  totalBudget: number;
  totalAllocated: number;
  remainingBudget: number;
}

export function BudgetValidation({ 
  totalBudget, 
  totalAllocated, 
  remainingBudget 
}: BudgetValidationProps) {
  // Calculate percentage for progress bar
  const percentAllocated = Math.min(Math.round((totalAllocated / totalBudget) * 100), 100);
  
  // Determine the budget status
  const isOverBudget = remainingBudget < 0;
  const isFullyAllocated = remainingBudget === 0;
  const isUnderBudget = remainingBudget > 0;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Budget Allocation</span>
          <span className="text-sm font-medium">{percentAllocated}%</span>
        </div>
        <Progress 
          value={percentAllocated} 
          className={`h-2 ${isOverBudget ? "bg-destructive/20" : ""}`}
          // Apply color based on status
          indicatorClassName={
            isOverBudget 
              ? "bg-destructive" 
              : isFullyAllocated 
                ? "bg-green-500" 
                : undefined
          }
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Total Budget</span>
          <span className="text-lg font-semibold">${totalBudget.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Total Allocated</span>
          <span className={`text-lg font-semibold ${isOverBudget ? "text-destructive" : ""}`}>
            ${totalAllocated.toFixed(2)}
          </span>
        </div>
      </div>
      
      {/* Status message based on budget state */}
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Over Budget</AlertTitle>
          <AlertDescription>
            You've exceeded the budget by ${Math.abs(remainingBudget).toFixed(2)}.
            Please adjust quantities or remove items.
          </AlertDescription>
        </Alert>
      )}
      
      {isFullyAllocated && (
        <Alert variant="default" className="border-green-500 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Perfect Allocation</AlertTitle>
          <AlertDescription>
            You've allocated exactly ${totalBudget.toFixed(2)}.
          </AlertDescription>
        </Alert>
      )}
      
      {isUnderBudget && (
        <Alert variant="default" className="border-blue-500 bg-blue-50 text-blue-900">
          <InfoIcon className="h-4 w-4 text-blue-500" />
          <AlertTitle>Available Budget</AlertTitle>
          <AlertDescription>
            You have ${remainingBudget.toFixed(2)} remaining to allocate.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}