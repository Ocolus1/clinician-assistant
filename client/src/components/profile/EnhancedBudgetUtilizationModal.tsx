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
  Clock
} from "lucide-react";
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
                  <div className="relative h-48 w-48">
                    {/* Budget utilization donut chart */}
                    <div className="absolute inset-0 rounded-full bg-gray-100"></div>
                    <div 
                      className="absolute inset-0 rounded-full bg-primary"
                      style={{ 
                        clipPath: `polygon(0 0, 100% 0, 100% ${summary.utilizationPercentage}%, 0 ${summary.utilizationPercentage}%)`,
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'center' 
                      }}
                    ></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold">{formatPercentage(summary.utilizationPercentage)}</div>
                      <div className="text-sm text-gray-500">of budget used</div>
                      
                      {/* Health status badge */}
                      <div className={cn(
                        "flex items-center mt-2 px-2 py-1 rounded-full text-xs",
                        healthStatus.color, 
                        "bg-opacity-20"
                      )}>
                        {healthStatus.icon}
                        <span>{healthStatus.status}</span>
                      </div>
                    </div>
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
                        
                        {/* Simplified Spending Trajectory Visualization */}
                        <div className="h-60 border rounded-lg p-4 relative bg-gray-50">
                          {/* Time axis - horizontal line */}
                          <div className="absolute bottom-8 left-0 right-0 h-0.5 bg-gray-300"></div>
                          
                          {/* Budget limit - horizontal dashed line */}
                          <div className="absolute top-8 left-0 right-0 h-0.5 border-t-2 border-dashed border-gray-400"></div>
                          <div className="absolute top-4 right-4 text-xs text-gray-600">Total Budget: {formatCurrency(summary.totalBudget)}</div>
                          
                          {/* Spending line - solid */}
                          <div className="absolute bottom-8 left-8 h-32 w-0.5 bg-blue-500"></div>
                          <div className="absolute bottom-8 left-8 w-32 h-0.5 bg-blue-500"></div>
                          <div className="absolute bottom-[calc(2rem+8rem)] left-[calc(2rem+8rem)] w-3 h-3 rounded-full bg-blue-500"></div>
                          <div className="absolute bottom-[calc(2rem+8rem+0.75rem)] left-[calc(2rem+8rem+1rem)] text-xs text-blue-600">Current spending</div>
                          
                          {/* Projection line - dashed, trending up or down */}
                          <div 
                            className={cn(
                              "absolute h-0.5 border-t-2 border-dashed",
                              summary.projectedOverspend ? "border-red-400" : "border-green-400"
                            )}
                            style={{
                              bottom: summary.projectedOverspend ? "8rem" : "calc(2rem + 8rem)",
                              left: "calc(2rem + 8rem)",
                              width: "12rem",
                              transform: summary.projectedOverspend ? "rotate(-15deg)" : "rotate(15deg)",
                              transformOrigin: "left bottom"
                            }}
                          ></div>
                          
                          {/* Projection endpoint */}
                          <div 
                            className={cn(
                              "absolute w-3 h-3 rounded-full",
                              summary.projectedOverspend ? "bg-red-400" : "bg-green-400"
                            )}
                            style={{
                              bottom: summary.projectedOverspend ? "10rem" : "calc(2rem + 11rem)",
                              left: "calc(2rem + 20rem)",
                            }}
                          ></div>
                          
                          {/* Time markers */}
                          <div className="absolute bottom-4 left-8 text-xs text-gray-600">Start</div>
                          <div className="absolute bottom-4 left-[calc(2rem+8rem)] text-xs text-gray-600">Now</div>
                          <div className="absolute bottom-4 right-8 text-xs text-gray-600">End</div>
                          
                          {/* Text explanation of the projection */}
                          <div className="absolute top-24 right-8 max-w-[200px] p-3 bg-white border rounded-lg shadow-sm">
                            <div className="text-sm font-medium mb-1">
                              {summary.projectedOverspend ? 
                                "Projected Deficit" : 
                                "Projected Surplus"}
                            </div>
                            <div className="text-xs text-gray-600">
                              {summary.projectedOverspend ? 
                                `At the current rate, funds will be depleted before the plan end date, with a projected deficit of ${formatCurrency(summary.projectedOverspend)}.` : 
                                `At the current rate, there will be ${formatCurrency(summary.remainingBudget)} remaining at the end of the plan period.`}
                            </div>
                          </div>
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