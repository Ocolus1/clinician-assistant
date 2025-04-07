import * as React from "react";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { X, AlertTriangle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
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

// Import the service directly - will be used inside the component
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

export function SimpleBudgetUtilizationModal({
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
    if (!summary) return { label: "Not available", color: "text-gray-500" };
    
    const { dailySpendRate, dailyBudget } = summary;
    
    if (dailySpendRate > dailyBudget * 1.2) {
      return { label: "Above target", color: "text-red-600" };
    } else if (dailySpendRate < dailyBudget * 0.8) {
      return { label: "Below target", color: "text-green-600" };
    } else {
      return { label: "On target", color: "text-blue-600" };
    }
  };
  
  const spendingRateStatus = getSpendingRateStatus();
  
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
        
        {/* Budget data display */}
        {!loading && !error && summary && (
          <div className="p-6">
            {/* Budget overview section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Left column - Progress bars */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Budget Progress</h3>
                  
                  {/* Budget usage */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Budget Usage</div>
                      <div className="text-sm font-medium">
                        {formatCurrency(summary.usedBudget)} / {formatCurrency(summary.totalBudget)}
                      </div>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={summary.utilizationPercentage} 
                        className="h-4 rounded-sm"
                      />
                      <div className="absolute top-0 left-0 w-full text-center text-xs text-white font-medium leading-4">
                        {formatPercentage(summary.utilizationPercentage)}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Remaining: {formatCurrency(summary.remainingBudget)}
                    </div>
                  </div>
                  
                  {/* Time elapsed */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Time Elapsed</div>
                      <div className="text-sm font-medium">
                        {summary.daysElapsed} / {summary.totalDays} days
                      </div>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={(summary.daysElapsed / Math.max(1, summary.totalDays)) * 100} 
                        className="h-4 rounded-sm"
                      />
                      <div className="absolute top-0 left-0 w-full text-center text-xs text-white font-medium leading-4">
                        {formatPercentage((summary.daysElapsed / Math.max(1, summary.totalDays)) * 100)}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {summary.remainingDays} days remaining 
                      ({Math.round((summary.remainingDays / Math.max(1, summary.totalDays)) * 100)}% of plan period)
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Right column - Budget metrics */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Budget Metrics</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Daily budget */}
                    <div className="border rounded-md p-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Daily Budget</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(summary.dailyBudget)}
                      </div>
                      <div className="text-xs text-gray-500">Planned daily amount</div>
                    </div>
                    
                    {/* Spending rate */}
                    <div className="border rounded-md p-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Daily Spending</div>
                      <div className={cn("text-xl font-bold", spendingRateStatus.color)}>
                        {formatCurrency(summary.dailySpendRate)}
                      </div>
                      <div className="text-xs flex items-center">
                        {summary.dailySpendRate > summary.dailyBudget ? (
                          <TrendingUp className="w-3 h-3 text-red-500 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-green-500 mr-1" />
                        )}
                        <span className={spendingRateStatus.color}>{spendingRateStatus.label}</span>
                      </div>
                    </div>
                    
                    {/* Total allocated */}
                    <div className="border rounded-md p-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Total Budget</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(summary.totalBudget)}
                      </div>
                      <div className="text-xs text-gray-500">Allocated funds</div>
                    </div>
                    
                    {/* Remaining budget */}
                    <div className="border rounded-md p-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Remaining</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(summary.remainingBudget)}
                      </div>
                      <div className="text-xs text-gray-500">Available funds</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Budget items section */}
            <Card className="shadow-sm mb-6">
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-4">Budget Items</h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium text-gray-700">Item</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-700">Quantity</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-700">Used</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-700">Remaining</th>
                        <th className="text-right p-2 text-sm font-medium text-gray-700">Unit Price</th>
                        <th className="text-right p-2 text-sm font-medium text-gray-700">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.budgetItems.map((item) => {
                        const unitPrice = parseFloat(item.unitPrice);
                        const totalValue = unitPrice * item.quantity;
                        const usedValue = unitPrice * item.usedQuantity;
                        const remainingQty = item.quantity - item.usedQuantity;
                        
                        return (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 text-sm">
                              <div className="font-medium">{item.itemCode}</div>
                              <div className="text-gray-500 text-xs">{item.description}</div>
                            </td>
                            <td className="p-2 text-sm text-center">{item.quantity}</td>
                            <td className="p-2 text-sm text-center">{item.usedQuantity}</td>
                            <td className="p-2 text-sm text-center">{remainingQty}</td>
                            <td className="p-2 text-sm text-right">{formatCurrency(unitPrice)}</td>
                            <td className="p-2 text-sm text-right">{formatCurrency(totalValue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="p-2 text-sm font-medium">Total</td>
                        <td className="p-2 text-sm text-right"></td>
                        <td className="p-2 text-sm text-right font-medium">
                          {formatCurrency(summary.totalBudget)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* Spending history */}
            {summary.spendingEvents && summary.spendingEvents.length > 0 && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Recent Spending</h3>
                  
                  <div className="space-y-3">
                    {summary.spendingEvents.slice(0, 5).map((event, index) => (
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
                    
                    {summary.spendingEvents.length > 5 && (
                      <div className="text-center text-sm text-gray-500 pt-2">
                        + {summary.spendingEvents.length - 5} more spending events
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}