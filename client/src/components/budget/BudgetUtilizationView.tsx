import React from "react";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PieChart, BarChart3, AlertTriangle, DollarSign, Calendar } from "lucide-react";
import { format, differenceInDays } from 'date-fns';
import { calculateSpentFromSessions, calculateRemainingFunds, calculateBudgetItemUtilization } from "@/lib/utils/budgetUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BudgetUtilizationViewProps {
  clientId: number;
}

/**
 * Comprehensive view for budget utilization tracking
 * Shows plans, items, and utilization rates with visualization
 */
export function BudgetUtilizationView({ clientId }: BudgetUtilizationViewProps) {
  // Fetch budget settings and items
  const { data: budgetSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-settings', 'all=true'],
    enabled: !!clientId,
  });

  // Fetch budget items
  const { data: budgetItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    enabled: !!clientId,
  });

  // Fetch sessions data for utilization calculations
  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/clients', clientId, 'sessions'],
    enabled: !!clientId,
  });

  const isLoading = isLoadingSettings || isLoadingItems || isLoadingSessions;

  if (isLoading) {
    return <LoadingState />;
  }

  if (!budgetSettings || budgetSettings.length === 0) {
    return <EmptyState message="No budget plans found" />;
  }

  // Process budget data with utilization calculations
  const processedPlans = processBudgetPlans(budgetSettings, budgetItems, sessions);

  return (
    <div className="space-y-6">
      <BudgetSummary plans={processedPlans} />
      <BudgetPlansTable plans={processedPlans} />
    </div>
  );
}

/**
 * Process budget plans with utilization data
 */
function processBudgetPlans(budgetSettings: any[], budgetItems: any[], sessions: any[]) {
  if (!budgetSettings || !Array.isArray(budgetSettings)) return [];
  
  return budgetSettings.map(plan => {
    // Get items for this plan
    const planItems = budgetItems?.filter(item => item.budgetSettingsId === plan.id) || [];
    
    // Calculate plan-level utilization
    const totalBudget = Number(plan.ndisFunds) || 0;
    const spentAmount = calculateSpentFromSessions(sessions);
    const remainingFunds = calculateRemainingFunds(plan, sessions);
    const utilizationRate = totalBudget > 0 ? (spentAmount / totalBudget) : 0;
    
    // Calculate days until expiration
    const endDate = plan.endDate ? new Date(plan.endDate) : null;
    const today = new Date();
    const daysUntilExpiration = endDate ? differenceInDays(endDate, today) : null;
    
    // Process budget items with utilization data
    const processedItems = calculateBudgetItemUtilization(planItems, sessions);
    
    // Determine overall plan status
    let planStatus: 'normal' | 'warning' | 'critical' = 'normal';
    
    // Critical if less than 30 days until expiration with significant funds remaining
    if (daysUntilExpiration !== null && daysUntilExpiration < 30 && utilizationRate < 0.7) {
      planStatus = 'critical';
    } 
    // Warning if less than 60 days until expiration with moderate funds remaining
    else if (daysUntilExpiration !== null && daysUntilExpiration < 60 && utilizationRate < 0.6) {
      planStatus = 'warning';
    }
    // Warning if utilization rate is too high or too low
    else if (utilizationRate > 0.9 || utilizationRate < 0.3) {
      planStatus = 'warning';
    }
    
    return {
      ...plan,
      totalBudget,
      spentAmount,
      remainingFunds,
      utilizationRate,
      daysUntilExpiration,
      planStatus,
      items: processedItems,
    };
  });
}

/**
 * High-level budget summary with visualization
 */
function BudgetSummary({ plans }: { plans: any[] }) {
  // Calculate aggregate metrics
  const totalBudget = plans.reduce((sum, plan) => sum + (plan.totalBudget || 0), 0);
  const totalSpent = plans.reduce((sum, plan) => sum + (plan.spentAmount || 0), 0);
  const totalRemaining = plans.reduce((sum, plan) => sum + (plan.remainingFunds || 0), 0);
  const overallUtilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) : 0;
  
  // Find the soonest expiring plan
  const soonestExpiringPlan = plans
    .filter(plan => plan.daysUntilExpiration !== null)
    .sort((a, b) => (a.daysUntilExpiration || Infinity) - (b.daysUntilExpiration || Infinity))[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Utilization Summary</CardTitle>
        <CardDescription>
          Overall fund utilization across all budget plans
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Overall fund utilization */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Fund Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Utilized</span>
                  <span className="font-semibold">{Math.round(overallUtilizationRate * 100)}%</span>
                </div>
                <Progress value={overallUtilizationRate * 100} className="h-2" />
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Budget:</span>
                    <p className="font-semibold">${totalBudget.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining:</span>
                    <p className="font-semibold">${totalRemaining.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next expiring plan */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Next Expiring Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {soonestExpiringPlan ? (
                <div className="space-y-1">
                  <p className="font-semibold">{soonestExpiringPlan.planName || 'Unnamed Plan'}</p>
                  <p className="text-sm text-muted-foreground">
                    Expires: {format(new Date(soonestExpiringPlan.endDate), 'MMM dd, yyyy')}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Days Left:</span>
                      <p className={cn(
                        "font-semibold",
                        soonestExpiringPlan.daysUntilExpiration < 30 ? "text-destructive" : 
                        soonestExpiringPlan.daysUntilExpiration < 60 ? "text-amber-500" : ""
                      )}>
                        {soonestExpiringPlan.daysUntilExpiration}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Utilization:</span>
                      <p className="font-semibold">
                        {Math.round(soonestExpiringPlan.utilizationRate * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active plans with expiration dates</p>
              )}
            </CardContent>
          </Card>

          {/* Utilization alerts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Utilization Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plans.some(plan => plan.planStatus !== 'normal') ? (
                <div className="space-y-2">
                  {plans
                    .filter(plan => plan.planStatus === 'critical')
                    .map(plan => (
                      <Alert variant="destructive" key={`critical-${plan.id}`} className="py-2">
                        <AlertDescription className="text-xs">
                          {plan.planName || 'Unnamed plan'}: {Math.round((1 - plan.utilizationRate) * 100)}% funds unused,
                          expires in {plan.daysUntilExpiration} days
                        </AlertDescription>
                      </Alert>
                    ))}
                  
                  {plans
                    .filter(plan => plan.planStatus === 'warning')
                    .map(plan => (
                      <Alert variant="warning" key={`warning-${plan.id}`} className="py-2 bg-amber-50">
                        <AlertDescription className="text-xs">
                          {plan.planName || 'Unnamed plan'}: {Math.round((1 - plan.utilizationRate) * 100)}% funds unused,
                          expires in {plan.daysUntilExpiration} days
                        </AlertDescription>
                      </Alert>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No utilization alerts at this time</p>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Detailed budget plan utilization table
 */
function BudgetPlansTable({ plans }: { plans: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Plans Utilization</CardTitle>
        <CardDescription>
          Detailed utilization breakdown by plan and budget item
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Plans Overview</TabsTrigger>
            <TabsTrigger value="items">Budget Items</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Plan Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Total Budget</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map(plan => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.planName || 'Unnamed Plan'}</TableCell>
                    <TableCell>{plan.startDate ? format(new Date(plan.startDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                    <TableCell>{plan.endDate ? format(new Date(plan.endDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                    <TableCell>${Number(plan.totalBudget).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={plan.utilizationRate * 100} className="h-2 w-24" />
                        <span className="text-sm">{Math.round(plan.utilizationRate * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={plan.planStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="items" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Item</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.flatMap(plan => 
                  plan.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName || item.description || 'Unnamed Item'}</TableCell>
                      <TableCell>{plan.planName || 'Unnamed Plan'}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1">
                                <span>{item.used}</span>
                                <span className="text-muted-foreground">/</span>
                                <span>{item.quantity}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{item.used} of {item.quantity} used</p>
                              <p className="text-xs">{item.remaining} remaining</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>${Number(item.unitPrice).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={item.utilizationRate * 100} className="h-2 w-24" />
                          <span className="text-sm">{Math.round(item.utilizationRate * 100)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: 'normal' | 'warning' | 'critical' }) {
  const getStatusProps = () => {
    switch (status) {
      case 'critical':
        return {
          variant: 'destructive' as const,
          label: 'Critical'
        };
      case 'warning':
        return {
          variant: 'outline' as const,
          className: 'border-amber-500 text-amber-500',
          label: 'Warning'
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'border-green-500 text-green-500',
          label: 'Normal'
        };
    }
  };

  const { variant, className, label } = getStatusProps();

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

/**
 * Loading state for the budget utilization view
 */
function LoadingState() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Empty state when no budget plans are found
 */
function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10">
        <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}