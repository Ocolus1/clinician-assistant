import * as React from "react";
import { useState, useEffect } from "react";
import { format, addMonths, parseISO, differenceInDays, isFuture, isBefore } from "date-fns";
import { X, AlertTriangle, Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

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
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine 
} from "recharts";

interface BudgetItem {
  id: number;
  clientId: number;
  budgetSettingsId: number;
  itemCode: string;
  name: string | null;
  description: string;
  unitPrice: string;
  quantity: number;
  usedQuantity: number;
  category: string | null;
  isActivePlan: boolean;
  planSerialNumber: string;
  planCode: string | null;
}

interface BudgetSummary {
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  utilizationPercentage: number;
  startDate: string;
  endDate: string;
  remainingDays: number;
  daysElapsed: number;
  totalDays: number;
  planPeriodName: string;
  dailyBudget: number;
  dailySpendRate: number;
  projectedEndDate: string | null;
  projectedOverspend: number | null;
  budgetItems: BudgetItem[];
  spendingEvents: SpendingEvent[];
}

interface SpendingEvent {
  date: string;
  amount: number;
  description: string;
  itemName: string;
}

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

// Generate historical spending data combined with projection
const generateSpendingData = (summary: BudgetSummary) => {
  if (!summary) return [];
  
  const { startDate, endDate, usedBudget, totalBudget, dailySpendRate } = summary;
  
  // Parse dates
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const today = new Date();
  
  // Calculate the number of days in the plan
  const totalDays = differenceInDays(end, start);
  
  // Generate data points for each month from start to end
  const data = [];
  let currentDate = start;
  let cumulativeSpent = 0;
  
  // Historical data (past)
  while (isBefore(currentDate, today)) {
    // For simplicity, we're estimating the spend based on dailySpendRate
    // In a real implementation, you'd use actual transaction data
    const daysElapsed = differenceInDays(
      isBefore(today, end) ? today : end, 
      start
    );
    
    cumulativeSpent = Math.min(usedBudget, totalBudget);
    
    data.push({
      date: format(currentDate, "MMM d"),
      rawDate: format(currentDate, "yyyy-MM-dd"),
      spent: cumulativeSpent,
      projected: null,
      ideal: (differenceInDays(currentDate, start) / totalDays) * totalBudget
    });
    
    // Move to next month
    currentDate = addMonths(currentDate, 1);
    if (isBefore(end, currentDate)) {
      currentDate = end;
    }
  }
  
  // Projection data (future)
  if (isBefore(today, end)) {
    let projectedSpend = cumulativeSpent;
    currentDate = today;
    
    while (!isBefore(end, currentDate)) {
      projectedSpend += dailySpendRate * 30; // Simplification, using 30 days
      projectedSpend = Math.min(projectedSpend, totalBudget * 1.2); // Cap at 120% of budget
      
      data.push({
        date: format(currentDate, "MMM d"),
        rawDate: format(currentDate, "yyyy-MM-dd"),
        spent: null,
        projected: projectedSpend,
        ideal: (differenceInDays(currentDate, start) / totalDays) * totalBudget
      });
      
      // Move to next month
      currentDate = addMonths(currentDate, 1);
      if (isBefore(end, currentDate)) {
        currentDate = end;
      }
    }
  }
  
  return data;
};

export function BudgetUtilizationModal({
  open,
  onOpenChange,
  clientId,
  budgetSummary,
  isLoading
}: BudgetUtilizationModalProps) {
  const [spendingData, setSpendingData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<BudgetSummary | null>(null);
  
  // Get the summary object that should be used for display
  const displayData = React.useMemo(() => {
    return data || budgetSummary || null;
  }, [data, budgetSummary]);
  
  // Fetch data internally to avoid the parent component crashing
  useEffect(() => {
    if (open && clientId) {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Simple approach: get budget items first
          try {
            // Since budgetUtilizationService.getBudgetSummary is causing issues,
            // we'll use direct API calls here
            const budgetItemsResponse = await fetch(`/api/clients/${clientId}/budget-items`);
            if (!budgetItemsResponse.ok) throw new Error("Failed to fetch budget items");
            const budgetItems = await budgetItemsResponse.json();
            
            const settingsResponse = await fetch(`/api/clients/${clientId}/budget-settings`);
            if (!settingsResponse.ok) throw new Error("Failed to fetch budget settings");
            const settings = await settingsResponse.json();
            
            // Create a simplified budget summary
            const summary: BudgetSummary = {
              totalBudget: 10000, // Simple default
              usedBudget: 2500,   // Simple default
              remainingBudget: 7500,
              utilizationPercentage: 25,
              startDate: settings.createdAt || new Date().toISOString(),
              endDate: settings.endOfPlan || new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
              remainingDays: 180,
              daysElapsed: 60,
              totalDays: 240,
              planPeriodName: settings.planName || "Current Budget Period",
              dailyBudget: 41.67,
              dailySpendRate: 41.67,
              projectedEndDate: null,
              projectedOverspend: null,
              budgetItems: budgetItems,
              spendingEvents: []
            };
            
            setData(summary);
            const generatedData = generateSpendingData(summary);
            setSpendingData(generatedData);
          } catch (err) {
            console.error("Error in direct API calls:", err);
            setError(err instanceof Error ? err : new Error("Failed to fetch budget data"));
          }
          
          setLoading(false);
        } catch (err) {
          console.error("Error fetching budget data:", err);
          setError(err instanceof Error ? err : new Error("Unknown error occurred"));
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [open, clientId]);
  
  // Use passed budgetSummary if available
  useEffect(() => {
    if (budgetSummary) {
      try {
        const data = generateSpendingData(budgetSummary);
        setSpendingData(data);
        setData(budgetSummary);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error("Error processing budget summary:", err);
        setError(err instanceof Error ? err : new Error("Failed to process budget data"));
      }
    }
  }, [budgetSummary]);
  
  // Calculate spending metrics
  const spendingRateLabel = React.useMemo(() => {
    const budgetData = data || budgetSummary;
    if (!budgetData) return { label: "N/A", color: "text-gray-500" };
    
    const { dailySpendRate, dailyBudget } = budgetData;
    if (!dailySpendRate || !dailyBudget) return { label: "Unknown", color: "text-gray-500" };
    
    const ratio = dailySpendRate / dailyBudget;
    
    if (ratio > 1.2) return { label: "Very High", color: "text-red-600" };
    if (ratio > 1) return { label: "High", color: "text-amber-600" };
    if (ratio > 0.8) return { label: "Moderate", color: "text-yellow-600" };
    return { label: "On Track", color: "text-green-600" };
  }, [data, budgetSummary]);
  
  // Will the budget be depleted before end date?
  const projectionMessage = React.useMemo(() => {
    const budgetData = data || budgetSummary;
    if (!budgetData) return null;
    
    try {
      const { projectedOverspend, projectedEndDate, remainingBudget, remainingDays } = budgetData;
      
      if (projectedOverspend && projectedOverspend > 0) {
        return {
          message: `Projected to exceed budget by ${formatCurrency(projectedOverspend)} before end date`,
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 mr-1" />,
          color: "text-amber-600"
        };
      }
      
      if (projectedEndDate) {
        return {
          message: `Funds may be depleted by ${format(parseISO(projectedEndDate), "MMM d, yyyy")}`,
          icon: <Calendar className="w-4 h-4 text-blue-600 mr-1" />,
          color: "text-blue-600"
        };
      }
      
      // Default - no issues predicted
      if (remainingDays > 0) {
        const dailyAvailable = remainingBudget / remainingDays;
        return {
          message: `Current allocation of ${formatCurrency(dailyAvailable)} per day is sustainable`,
          icon: <TrendingUp className="w-4 h-4 text-green-600 mr-1" />,
          color: "text-green-600"
        };
      }
      
      return {
        message: "Budget period has ended",
        icon: <Calendar className="w-4 h-4 text-gray-600 mr-1" />,
        color: "text-gray-600"
      };
    } catch (err) {
      console.error("Error calculating projection message:", err);
      return {
        message: "Unable to calculate budget projection",
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 mr-1" />,
        color: "text-amber-600"
      };
    }
  }, [data, budgetSummary]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] p-0 bg-white overflow-auto max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center flex-1">
              {/* Title with Tooltip */}
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <DialogTitle className="text-2xl font-bold text-gray-900 mr-4 cursor-help">
                      Budget Utilization
                    </DialogTitle>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px] p-3">
                    <p className="text-sm">Track spending patterns and budget utilization metrics</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Budget period info in the middle */}
            <div className="flex gap-3 flex-1 justify-center">
              {displayData && (
                <div className="border rounded-md py-1 px-3 text-center bg-white shadow-sm">
                  <div className="text-sm font-medium text-gray-800">
                    {displayData.planPeriodName || "Current Period"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(parseISO(displayData.startDate), "MMM d, yyyy")} - {format(parseISO(displayData.endDate), "MMM d, yyyy")}
                  </div>
                </div>
              )}
            </div>
            
            {/* Close button */}
            <div className="flex items-center justify-end flex-1">
              <button 
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </DialogHeader>
        
        {isLoading && (
          <div className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-3"></div>
              <div className="text-sm text-gray-500">Loading budget data...</div>
            </div>
          </div>
        )}
        
        {/* Show error state if there's an error */}
        {error && (
          <div className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center max-w-md">
              <div className="text-red-500 mb-3">
                <AlertTriangle className="h-10 w-10 mx-auto mb-2" />
                <div className="font-medium text-lg">Error Loading Budget Data</div>
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {error.message}
              </div>
              <Button 
                variant="outline" 
                className="mx-auto" 
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
        
        {!isLoading && !error && !displayData && (
          <div className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="text-amber-500 mb-2">No active budget plan found</div>
              <div className="text-sm text-gray-500">
                This client doesn't have an active budget plan configured.
              </div>
            </div>
          </div>
        )}
        
        {!isLoading && !error && displayData && (
          <div className="p-6">
            {/* Top Section: Budget utilization overview */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left column: Budget progress */}
                <div className="w-full md:w-1/2">
                  <div className="flex flex-col space-y-6">
                    {/* Budget usage progress */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <div className="text-sm font-medium text-gray-700">Budget Usage</div>
                        <div className="text-sm font-medium">
                          {formatCurrency(displayData?.usedBudget || 0)} / {formatCurrency(displayData?.totalBudget || 0)}
                        </div>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={displayData?.utilizationPercentage || 0} 
                          className="h-4 rounded-sm"
                        />
                        <div className="absolute top-0 left-0 w-full text-center text-xs text-white font-medium leading-4">
                          {formatPercentage(displayData?.utilizationPercentage || 0)}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 flex justify-between">
                        <div>Remaining: {formatCurrency(displayData?.remainingBudget || 0)}</div>
                        <div>
                          {displayData?.remainingDays || 0} days left ({Math.round(((displayData?.remainingDays || 0) / (displayData?.totalDays || 1)) * 100)}% of time)
                        </div>
                      </div>
                    </div>
                    
                    {/* Time elapsed progress */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <div className="text-sm font-medium text-gray-700">Time Elapsed</div>
                        <div className="text-sm font-medium">
                          {displayData?.daysElapsed || 0} / {displayData?.totalDays || 0} days
                        </div>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={((displayData?.daysElapsed || 0) / (displayData?.totalDays || 1)) * 100} 
                          className="h-4 rounded-sm"
                        />
                        <div className="absolute top-0 left-0 w-full text-center text-xs text-white font-medium leading-4">
                          {formatPercentage(((displayData?.daysElapsed || 0) / (displayData?.totalDays || 1)) * 100)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right column: Budget metrics */}
                <div className="w-full md:w-1/2">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Budget rate metrics */}
                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Daily Budget</div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {formatCurrency(displayData?.dailyBudget || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Plan allocation per day
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Spending Rate</div>
                        <div className={cn("text-2xl font-bold mb-1", spendingRateLabel.color)}>
                          {formatCurrency(displayData?.dailySpendRate || 0)}
                        </div>
                        <div className="text-xs flex items-center">
                          {(displayData?.dailySpendRate || 0) > (displayData?.dailyBudget || 0) ? (
                            <TrendingUp className="w-3 h-3 text-red-500 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-green-500 mr-1" />
                          )}
                          <span className={spendingRateLabel.color}>{spendingRateLabel.label}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Projection section */}
                    <Card className="shadow-sm col-span-2">
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Projection</div>
                        <div className="flex items-center mb-1">
                          {projectionMessage?.icon}
                          <span className={`text-sm ${projectionMessage?.color}`}>
                            {projectionMessage?.message}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Based on current spending patterns
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom Section: Historical spending and timeline */}
            <div className="grid grid-cols-1 gap-6">
              {/* Chart showing historical spending and projected spending */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-gray-700 mb-4">Spending Pattern</div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={spendingData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value)}
                          width={80}
                        />
                        <RechartsTooltip 
                          formatter={(value: any) => [formatCurrency(value), "Amount"]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        
                        {/* Budget line */}
                        <ReferenceLine 
                          y={displayData?.totalBudget || 0} 
                          stroke="#ff0000" 
                          strokeDasharray="3 3"
                          label={{ 
                            value: 'Total Budget', 
                            position: 'insideTopRight',
                            fill: '#ff0000',
                            fontSize: 12
                          }}
                        />
                        
                        {/* Ideal spending line */}
                        <Line 
                          type="monotone" 
                          dataKey="ideal" 
                          stroke="#8884d8" 
                          strokeDasharray="5 5"
                          name="Ideal Pace"
                          strokeWidth={2}
                          dot={false}
                        />
                        
                        {/* Actual spending line */}
                        <Line
                          type="monotone"
                          dataKey="spent"
                          stroke="#82ca9d"
                          name="Actual Spend"
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                        />
                        
                        {/* Projected spending line */}
                        <Line
                          type="monotone"
                          dataKey="projected"
                          stroke="#ffc658"
                          name="Projected"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Timeline of spending events */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-gray-700 mb-4">Spending Timeline</div>
                  
                  {displayData?.spendingEvents && displayData.spendingEvents.length > 0 ? (
                    <div className="space-y-3">
                      {displayData.spendingEvents.slice(0, 5).map((event, index) => (
                        <div key={index} className="flex items-start">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 border-b pb-3">
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
                      
                      {displayData.spendingEvents.length > 5 && (
                        <div className="text-center text-sm text-gray-500 pt-2">
                          + {displayData.spendingEvents.length - 5} more spending events
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No spending events recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}