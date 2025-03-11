import React from "react";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { 
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileBarChart,
  Package,
  RefreshCw,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { useBudgetFeature } from "./BudgetFeatureContext";
import type { BudgetPlan } from "./BudgetFeatureContext";
import type { BudgetItem } from "@shared/schema";

interface BudgetPlanFullViewProps {
  planId: number;
  onClose: () => void;
}

// Enhanced budget item type for the table
interface EnhancedBudgetItem extends BudgetItem {
  name: string;
  category: string | null;
  balanceQuantity: number;
  totalPrice: number;
}

export function BudgetPlanFullView({ planId, onClose }: BudgetPlanFullViewProps) {
  const { 
    budgetPlans, 
    budgetItems, 
    activatePlan, 
    archivePlan,
    activeBudgetPlan,
    isLoading,
    error
  } = useBudgetFeature();
  
  // Find the plan
  const plan = budgetPlans.find(p => p.id === planId);
  
  // Calculate the remaining funds
  const remainingFunds = plan ? plan.availableFunds - plan.totalUsed : 0;
  const isOverBudget = remainingFunds < 0;
  
  // Get budget items for this plan
  const planItems = plan ? (budgetItems[plan.id] || []) : [];
  
  // Enhanced budget items for display
  const enhancedItems: EnhancedBudgetItem[] = planItems.map(item => {
    // You would typically get name and category from a catalog lookup
    // For now, we'll use placeholders
    return {
      ...item,
      name: item.description || `Item #${item.id}`,
      category: "Therapy",
      balanceQuantity: item.quantity, // In a real app, this would be calculated based on used quantity
      totalPrice: item.unitPrice * item.quantity
    };
  });
  
  // Helpers for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return format(new Date(dateString), "PPP");
  };
  
  // Handle plan activation
  const handleActivate = async () => {
    if (!plan) return;
    try {
      await activatePlan(plan.id);
    } catch (error) {
      console.error("Failed to activate plan:", error);
    }
  };
  
  // Handle plan archiving
  const handleArchive = async () => {
    if (!plan) return;
    try {
      await archivePlan(plan.id);
    } catch (error) {
      console.error("Failed to archive plan:", error);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Budget Plan...</CardTitle>
          <CardDescription>Please wait while we fetch the plan details</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Budget Plan</AlertTitle>
        <AlertDescription>
          There was a problem loading the budget plan. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Plan not found state
  if (!plan) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Budget Plan Not Found</AlertTitle>
        <AlertDescription>
          The requested budget plan could not be found.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Determine if this is the active plan
  const isActive = plan.isActive === true;
  
  // Progress values
  const progress = Math.min(100, plan.percentUsed);
  
  // Determine progress status color
  const progressStatus = progress >= 90 ? "danger" : progress >= 75 ? "warning" : "success";
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{plan.planName}</h2>
          <p className="text-gray-500">
            {plan.planCode ? `Code: ${plan.planCode}` : "No plan code"}
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Back to Plans
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan overview */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Plan Overview</CardTitle>
              {isActive ? (
                <Badge className="bg-primary text-primary-foreground">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
            </div>
            <CardDescription>
              Created on {formatDate(plan.startDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Budget Usage</span>
                  <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={progress} 
                  className={cn(
                    progressStatus === "success" && "bg-success/20 [&>div]:bg-success",
                    progressStatus === "warning" && "bg-warning/20 [&>div]:bg-warning",
                    progressStatus === "danger" && "bg-destructive/20 [&>div]:bg-destructive"
                  )}
                />
              </div>
              
              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span>Total Budget</span>
                  </div>
                  <div className="text-lg font-medium">
                    {formatCurrency(plan.availableFunds)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileBarChart className="h-4 w-4 mr-1" />
                    <span>Used</span>
                  </div>
                  <div className="text-lg font-medium">
                    {formatCurrency(plan.totalUsed)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    {isOverBudget ? (
                      <AlertTriangle className="h-4 w-4 mr-1 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1 text-success" />
                    )}
                    <span>Remaining</span>
                  </div>
                  <div className={cn(
                    "text-lg font-medium",
                    isOverBudget ? "text-destructive" : ""
                  )}>
                    {isOverBudget 
                      ? `-${formatCurrency(Math.abs(remainingFunds))}` 
                      : formatCurrency(remainingFunds)}
                  </div>
                </div>
              </div>
              
              {/* Dates info */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Start Date</span>
                  </div>
                  <div className="text-sm font-medium">
                    {formatDate(plan.startDate)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>End Date</span>
                  </div>
                  <div className="text-sm font-medium">
                    {formatDate(plan.endDate)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-3 flex justify-between">
            {isActive ? (
              <Button variant="outline" className="text-destructive border-destructive" onClick={handleArchive}>
                <Trash2 className="h-4 w-4 mr-2" />
                Archive Plan
              </Button>
            ) : (
              <Button variant="outline" onClick={handleActivate} disabled={!!activeBudgetPlan && activeBudgetPlan.id === plan.id}>
                <Check className="h-4 w-4 mr-2" />
                {activeBudgetPlan ? "Switch to this plan" : "Activate plan"}
              </Button>
            )}
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Plan
            </Button>
          </CardFooter>
        </Card>
        
        {/* Plan summary card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Plan Summary</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Plan Information</h4>
                <Separator className="mb-2" />
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Plan ID:</dt>
                    <dd className="font-medium">{plan.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd className="font-medium">{isActive ? "Active" : "Inactive"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Items:</dt>
                    <dd className="font-medium">{plan.itemCount}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Budget Analytics</h4>
                <Separator className="mb-2" />
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Usage:</dt>
                    <dd className="font-medium">{progress.toFixed(1)}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Budget Status:</dt>
                    <dd className="font-medium flex items-center">
                      {isOverBudget ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1 text-destructive" />
                          <span className="text-destructive">Over Budget</span>
                        </>
                      ) : progress >= 90 ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1 text-warning" />
                          <span className="text-warning">Critical</span>
                        </>
                      ) : progress >= 75 ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1 text-warning" />
                          <span className="text-warning">Warning</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                          <span className="text-success">Healthy</span>
                        </>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-3">
            <Button variant="outline" className="w-full" onClick={() => {}}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Budget items table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Budget Items</CardTitle>
          <CardDescription>
            Items and services allocated in this budget plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enhancedItems.length > 0 ? (
            <Table>
              <TableCaption>All budget items for {plan.planName}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enhancedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category || "Uncategorized"}</TableCell>
                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Budget Items</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                This plan doesn't have any budget items yet. Add items to start tracking expenses.
              </p>
              <Button>Add Budget Item</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}