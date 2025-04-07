import * as React from "react";
import { useState, useEffect } from "react";
import { format, parseISO, isBefore } from "date-fns";
import { 
  X, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CalendarClock,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  BarChart3,
  CheckCircle
} from "lucide-react";
import { BudgetSpendingChart } from "./BudgetSpendingChart";
import { BudgetSpeedometer } from "./BudgetSpeedometer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/custom-dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import the service directly
import { BudgetItem, BudgetSummary, SpendingEvent, budgetUtilizationService } from "@/lib/services/budgetUtilizationService";

interface BudgetUtilizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  budgetSummary?: BudgetSummary | null;
  isLoading: boolean;
}

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper to format percentage
const formatPercentage = (value: number) => {
  return `${Math.round(value)}%`;
};

export function EnhancedBudgetUtilizationModal({
  open,
  onOpenChange,
  clientId,
  budgetSummary,
  isLoading: externalLoading,
}: BudgetUtilizationModalProps) {
  // Local state
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(externalLoading);
  const [summary, setSummary] = useState<BudgetSummary | null>(budgetSummary || null);
  
  // Fetch budget data when the modal opens
  useEffect(() => {
    if (open && clientId && !budgetSummary) {
      setLoading(true);
      setError(null);

      // Fetch the budget data
      budgetUtilizationService.getBudgetSummary(clientId)
        .then(data => {
          setSummary(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching budget data:", err);
          setError(new Error("Failed to load budget data. Please try again."));
          setLoading(false);
        });
    } else if (budgetSummary) {
      // Use the externally provided data
      setSummary(budgetSummary);
    }
  }, [open, clientId, budgetSummary]);

  // When the modal closes, reset state
  useEffect(() => {
    if (!open) {
      setError(null);
      if (!budgetSummary) {
        setSummary(null);
      }
    }
  }, [open, budgetSummary]);

  // Update from external props if they change
  useEffect(() => {
    if (budgetSummary) {
      setSummary(budgetSummary);
    }
  }, [budgetSummary]);

  // Determine spending rate status
  const getSpendingRateStatus = () => {
    if (!summary) return { label: "Not available", color: "text-gray-500", bgColor: "bg-gray-100", badgeColor: "bg-gray-200" };
    
    const { dailySpendRate, dailyBudget } = summary;
    
    if (dailySpendRate > dailyBudget * 1.2) {
      return { 
        label: "Above target", 
        color: "text-red-600", 
        bgColor: "bg-red-100", 
        badgeColor: "bg-red-200 text-red-800",
        icon: <AlertCircle className="w-4 h-4 mr-1" />
      };
    } else if (dailySpendRate < dailyBudget * 0.8) {
      return { 
        label: "Below target", 
        color: "text-amber-600", 
        bgColor: "bg-amber-100",
        badgeColor: "bg-amber-200 text-amber-800",
        icon: <Clock className="w-4 h-4 mr-1" />
      };
    } else {
      return { 
        label: "On target", 
        color: "text-green-600", 
        bgColor: "bg-green-100",
        badgeColor: "bg-green-200 text-green-800",
        icon: <Check className="w-4 h-4 mr-1" />
      };
    }
  };
  
  const spendingRateStatus = getSpendingRateStatus();

  // Get financial health indicator
  const getFinancialHealthStatus = () => {
    if (!summary) return { status: "Unknown", color: "text-gray-500", icon: <AlertCircle className="w-5 h-5" /> };
    
    const { utilizationPercentage, daysElapsed, totalDays } = summary;
    const timePercentage = (daysElapsed / Math.max(1, totalDays)) * 100;
    
    // If utilizationPercentage is significantly higher than timePercentage
    if (utilizationPercentage > timePercentage * 1.2) {
      return { 
        status: "Caution", 
        description: "Spending faster than expected", 
        color: "text-red-600",
        icon: <AlertCircle className="w-5 h-5" />
      };
    } 
    // If utilizationPercentage is significantly lower than timePercentage
    else if (utilizationPercentage < timePercentage * 0.7) {
      return { 
        status: "Review", 
        description: "Significant underspending", 
        color: "text-amber-600",
        icon: <Clock className="w-5 h-5" />
      };
    } 
    // If utilization is roughly aligned with time elapsed
    else {
      return { 
        status: "On Track", 
        description: "Spending aligned with timeline", 
        color: "text-green-600",
        icon: <Check className="w-5 h-5" />
      };
    }
  };
  
  const healthStatus = getFinancialHealthStatus();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] p-0 bg-white overflow-auto max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold text-gray-900">Budget Utilization</DialogTitle>
            
            {/* Plan period in the middle */}
            {summary && (
              <div className="flex-1 text-center">
                <div className="inline-block border rounded-md py-1 px-3 bg-white shadow-sm">
                  <div className="text-sm font-medium text-gray-800">
                    {summary.planPeriodName || "Current Period"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(parseISO(summary.startDate), "MMM d, yyyy")} - {format(parseISO(summary.endDate), "MMM d, yyyy")}
                  </div>
                </div>
              </div>
            )}
            
            {/* Close button */}
            <button 
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </DialogHeader>
        
        {/* Loading state */}
        {loading && (
          <div className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-3"></div>
              <div className="text-sm text-gray-500">Loading budget data...</div>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center max-w-md">
              <div className="text-red-500 mb-3">
                <AlertTriangle className="h-10 w-10 mx-auto mb-2" />
                <div className="font-medium text-lg">Error Loading Budget Data</div>
              </div>
              <div className="text-sm text-gray-600 mb-4">{error.message}</div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        )}
        
        {/* No active budget plan state */}
        {!loading && !error && !summary && (
          <div className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="text-amber-500 mb-2">No active budget plan found</div>
              <div className="text-sm text-gray-500">
                This client doesn't have an active budget plan configured.
              </div>
            </div>
          </div>
        )}
        
        {/* Budget data display - TWO SECTION LAYOUT */}
        {!loading && !error && summary && (
          <>
            {/* TOP SECTION: Budget Overview */}
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium mb-4">Budget Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column - Budget utilization circle */}
                <div className="flex flex-col items-center justify-center">
                  <div className="h-48 w-48 flex items-center justify-center">
                    {/* Budget utilization speedometer */}
                    <BudgetSpeedometer 
                      actualPercentage={summary.utilizationPercentage}
                      projectedPercentage={summary.utilizationPercentage * (summary.totalDays / summary.daysElapsed)}
                      timeElapsedPercentage={(summary.daysElapsed / Math.max(1, summary.totalDays)) * 100}
                      size={200}
                    />
                  </div>
                  
                  <div className="mt-4 text-center">
                    <div className="text-sm font-medium">Current Active Budget Plan</div>
                    <div className="text-xs text-gray-500">
                      {format(parseISO(summary.startDate), "MMM d, yyyy")} - {format(parseISO(summary.endDate), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                
                {/* Right column - Budget metrics */}
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between mb-1">
                      <div className="text-sm text-gray-500">Total Budget</div>
                      <div className="text-xl font-bold">{formatCurrency(summary.totalBudget)}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500">Remaining</div>
                      <div className="text-xl font-bold">{formatCurrency(summary.remainingBudget)}</div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full"
                          style={{ width: `${summary.utilizationPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <div>Used: {formatCurrency(summary.usedBudget)}</div>
                        <div>{formatPercentage(summary.utilizationPercentage)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between mb-1">
                      <div className="text-sm text-gray-500">Days Elapsed</div>
                      <div className="text-xl font-bold">{summary.daysElapsed} / {summary.totalDays}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500">Remaining</div>
                      <div className="text-xl font-bold">{summary.remainingDays} days</div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full"
                          style={{ width: `${(summary.daysElapsed / Math.max(1, summary.totalDays)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <div>Elapsed: {summary.daysElapsed} days</div>
                        <div>{formatPercentage((summary.daysElapsed / Math.max(1, summary.totalDays)) * 100)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* BOTTOM SECTION: Detailed Analysis */}
            <div className="p-6">
              <Tabs defaultValue="projection">
                <TabsList className="mb-4">
                  <TabsTrigger value="projection">Spending Projection</TabsTrigger>
                  <TabsTrigger value="history">Spending History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="projection">
                  <div className="grid grid-cols-1 gap-6">
                    <Card className="shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-base font-medium text-gray-800">Budget Spending Trajectory</h4>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-primary text-white">Current Active Plan: {formatCurrency(summary.totalBudget)}</Badge>
                          </div>
                        </div>
                        
                        {/* Enhanced Monthly Spending Chart */}
                        <div className="border rounded-lg p-4 bg-white">
                          {summary.monthlySpending?.length > 0 ? (
                            <>
                              <BudgetSpendingChart 
                                monthlySpending={summary.monthlySpending}
                                totalBudget={summary.totalBudget}
                              />
                              
                              {/* Projection summary */}
                              <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
                                <div className="flex items-start">
                                  <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center mr-3",
                                    summary.projectedOverspend ? "bg-red-100" : "bg-green-100"
                                  )}>
                                    {summary.projectedOverspend ? (
                                      <AlertTriangle className="h-4 w-4 text-red-600" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-medium mb-1">
                                      {summary.projectedOverspend ? 
                                        "Projected Deficit" : 
                                        "Projected Surplus"}
                                    </h5>
                                    <p className="text-xs text-gray-600">
                                      {summary.projectedOverspend ? 
                                        `At the current spending rate, funds will be depleted before the plan end date, with a projected deficit of ${formatCurrency(summary.projectedOverspend)}.` : 
                                        `At the current spending rate, there will be approximately ${formatCurrency(summary.projectedRemainingBudget)} remaining at the end of the plan period.`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="h-60 flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                <p>Not enough spending data to generate a chart</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Spending recommendations */}
                        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-3">
                              <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center",
                                spendingRateStatus.bgColor
                              )}>
                                <Sparkles className={cn("h-4 w-4", spendingRateStatus.color)} />
                              </div>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium mb-1">Spending Recommendation</h5>
                              <p className="text-xs text-gray-600">
                                {summary.dailySpendRate > summary.dailyBudget * 1.2 ? 
                                  "Consider reviewing and adjusting service frequency to extend budget life." : 
                                  summary.dailySpendRate < summary.dailyBudget * 0.8 ?
                                  "Consider increasing service utilization to maximize therapeutic benefits." :
                                  "Current spending rate is well aligned with the budget plan."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="history">
                  <Card className="shadow-sm">
                    <CardContent className="p-6">
                      <h4 className="text-base font-medium text-gray-800 mb-4">Spending Activity</h4>
                      
                      {summary.spendingEvents && summary.spendingEvents.length > 0 ? (
                        <div className="space-y-4">
                          {summary.spendingEvents.map((event, index) => (
                            <div key={index} className="flex items-start p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                <DollarSign className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{event.description}</p>
                                    <p className="text-xs text-gray-500">{event.itemName}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-800">{formatCurrency(event.amount)}</p>
                                    <p className="text-xs text-gray-500">{format(parseISO(event.date), "MMM d, yyyy")}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <CalendarClock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No spending activity recorded yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}