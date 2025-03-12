import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";

interface BudgetValidationProps {
  totalBudget: number;
  totalAllocated: number;
  remainingBudget: number;
  hasItems: boolean;
}

/**
 * Component that displays budget validation information and progress
 */
export function BudgetValidation({
  totalBudget,
  totalAllocated,
  remainingBudget,
  hasItems
}: BudgetValidationProps) {
  // Calculate percentage of budget used
  const percentageUsed = (totalAllocated / totalBudget) * 100;
  const percentageCapped = Math.min(percentageUsed, 100);
  
  // Determine alert variant based on budget status
  let alertVariant: "default" | "destructive" = "default";
  let alertIcon = <AlertCircle className="h-4 w-4" />;
  let alertTitle = "Budget Allocation";
  let alertDescription = `You have allocated ${formatCurrency(totalAllocated)} of your ${formatCurrency(totalBudget)} budget.`;
  
  if (remainingBudget < 0) {
    // Over budget
    alertVariant = "destructive";
    alertIcon = <AlertCircle className="h-4 w-4" />;
    alertTitle = "Budget Exceeded";
    alertDescription = `You have exceeded your budget by ${formatCurrency(Math.abs(remainingBudget))}.`;
  } else if (remainingBudget === 0) {
    // Budget fully allocated
    alertVariant = "default"; // Using default instead of success since the Alert component doesn't support success
    alertIcon = <CheckCircle className="h-4 w-4 text-success" />;
    alertTitle = "Budget Fully Allocated";
    alertDescription = `You have allocated all ${formatCurrency(totalBudget)} of your available budget.`;
  } else if (hasItems && remainingBudget > 0) {
    // Budget partially allocated
    alertVariant = "default";
    alertIcon = <AlertTriangle className="h-4 w-4" />;
    alertTitle = "Budget Partially Allocated";
    alertDescription = `You have ${formatCurrency(remainingBudget)} remaining from your ${formatCurrency(totalBudget)} budget.`;
  }
  
  // Determine progress color based on status
  let progressColor = "bg-primary";
  if (remainingBudget < 0) {
    progressColor = "bg-destructive";
  } else if (remainingBudget === 0) {
    progressColor = "bg-success";
  } else if (percentageUsed > 90) {
    progressColor = "bg-warning";
  }
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Budget Used: {formatCurrency(totalAllocated)}</span>
        <span>Total Budget: {formatCurrency(totalBudget)}</span>
      </div>
      
      <Progress 
        value={percentageCapped} 
        className={`h-2 ${progressColor}`} 
        aria-label="Budget progress"
      />
      
      <Alert variant={alertVariant}>
        <div className="flex items-center gap-2">
          {alertIcon}
          <AlertTitle>{alertTitle}</AlertTitle>
        </div>
        <AlertDescription className="mt-1">
          {alertDescription}
        </AlertDescription>
      </Alert>
    </div>
  );
}