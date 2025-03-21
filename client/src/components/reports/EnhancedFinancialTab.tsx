/**
 * Enhanced Financial Tab
 * 
 * Comprehensive financial visualization component focusing on fund utilization.
 * This component ties together BudgetItemUtilization and FundUtilizationTimeline
 * to provide a complete picture of client fund allocation and spending.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from "recharts";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Import our specialized components
import { BudgetItemUtilization } from './BudgetItemUtilization';
import { FundUtilizationTimeline } from './FundUtilizationTimeline';
import { BudgetReallocationSuggestions } from './BudgetReallocationSuggestions';
import { UsageHistoryTimeline } from './UsageHistoryTimeline';
import { ServiceGapAnalysis } from './ServiceGapAnalysis';
import { ClientServiceComparison } from './ClientServiceComparison';

// Import types
import { ClientReportData } from '@/lib/api/clientReports';

// Define consistent colors
const COLORS = {
  green: "#10b981",
  blue: "#0284c7",
  indigo: "#4f46e5",
  purple: "#8b5cf6",
  pink: "#ec4899",
  red: "#f43f5e",
  orange: "#f97316",
  amber: "#f59e0b",
};

interface EnhancedFinancialTabProps {
  clientId: number;
  reportData?: ClientReportData;
}

export function EnhancedFinancialTab({ clientId, reportData }: EnhancedFinancialTabProps) {
  if (!reportData) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { keyMetrics, cancellations } = reportData;
  
  // Format spending deviation as percentage
  const spendingDeviation = (keyMetrics.spendingDeviation * 100).toFixed(1);
  const isOverAllocated = keyMetrics.spendingDeviation > 0;

  // Get goals and subgoals for ServiceGapAnalysis
  const { data: goals = [] } = useQuery({
    queryKey: [`/api/clients/${clientId}/goals`],
  });
  
  const { data: sessions = [] } = useQuery({
    queryKey: [`/api/clients/${clientId}/sessions`],
  });
  
  // Get budget items
  const { data: budgetItems = [] } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/budget-items`],
  });
  
  // Get budget settings
  const { data: budgetSettings } = useQuery<any>({
    queryKey: [`/api/clients/${clientId}/budget-settings`],
  });
  
  // Get all subgoals from all goals
  const { data: subgoals = [] } = useQuery({
    queryKey: [`/api/clients/${clientId}/subgoals`],
    queryFn: async () => {
      // Fetch subgoals for each goal
      const allSubgoals = [];
      for (const goal of goals) {
        const response = await fetch(`/api/goals/${goal.id}/subgoals`);
        if (response.ok) {
          const subgoals = await response.json();
          allSubgoals.push(...subgoals);
        }
      }
      return allSubgoals;
    },
    enabled: goals.length > 0,
  });

  return (
    <div className="space-y-5">
      {/* Financial summary card - shows key metrics */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Financial Summary</CardTitle>
          <CardDescription>Key financial health indicators</CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          <div className="h-[170px] grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">Spending Variance</div>
              <div className="flex items-center">
                <span className={cn(
                  "text-lg font-bold",
                  isOverAllocated ? "text-destructive" : "text-green-600"
                )}>
                  {isOverAllocated ? "+" : ""}{spendingDeviation}%
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px]">
                      {isOverAllocated 
                        ? `Budget over-allocated by ${spendingDeviation}%` 
                        : `Budget under-allocated by ${Math.abs(Number(spendingDeviation))}%`}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">Plan Expiration</div>
              <div className="flex items-center">
                <span className={cn(
                  "text-lg font-bold",
                  keyMetrics.planExpiration < 30 ? "text-destructive" : "text-green-600"
                )}>
                  {keyMetrics.planExpiration} days
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">Cancellation Rate</div>
              <div className="flex items-center">
                <span className={cn(
                  "text-lg font-bold",
                  cancellations.waived > 20 ? "text-destructive" : "text-green-600"
                )}>
                  {cancellations.waived}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Row 1: Fund utilization timeline */}
      <FundUtilizationTimeline clientId={clientId} />
      
      {/* Row 2: Budget item utilization grid and Session attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Budget item utilization */}
        <div className="lg:col-span-1">
          <BudgetItemUtilization clientId={clientId} />
        </div>
        
        {/* Session attendance */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Session Attendance</CardTitle>
              <CardDescription className="text-xs">Breakdown of session attendance</CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-[170px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: reportData?.cancellations.completed, color: COLORS.green },
                        { name: 'Waived', value: reportData?.cancellations.waived, color: COLORS.red },
                        { name: 'Rescheduled', value: reportData?.cancellations.changed, color: COLORS.amber },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Completed', value: reportData?.cancellations.completed, color: COLORS.green },
                        { name: 'Waived', value: reportData?.cancellations.waived, color: COLORS.red },
                        { name: 'Rescheduled', value: reportData?.cancellations.changed, color: COLORS.amber },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => [`${value}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                Total sessions: {reportData?.cancellations.total}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Budget Reallocation and Usage History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Budget Reallocation Suggestions */}
        <div className="lg:col-span-1">
          <BudgetReallocationSuggestions 
            clientId={clientId} 
            budgetItems={[]} 
            sessions={sessions} 
          />
        </div>
        
        {/* Usage History Timeline */}
        <div className="lg:col-span-1">
          <UsageHistoryTimeline 
            clientId={clientId} 
            budgetItems={[]} 
            sessions={sessions} 
          />
        </div>
      </div>

      {/* Row 4: Service Gap Analysis and Client Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Service Gap Analysis */}
        <div className="lg:col-span-1">
          <ServiceGapAnalysis
            clientId={clientId}
            budgetItems={[]}
            sessions={sessions}
            goals={goals}
            subgoals={subgoals}
          />
        </div>
        
        {/* Client Service Comparison */}
        <div className="lg:col-span-1">
          <ClientServiceComparison
            clientId={clientId}
            budgetItems={[]}
          />
        </div>
      </div>
      
      {/* Additional information or explanatory text */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Understanding Fund Utilization</p>
          <p className="mb-2">
            This enhanced financial tab focuses on tracking fund utilization rates to prevent unused fund loss. 
            Government allocated funds don't roll over when plans expire, making fund management critical.
          </p>
          <p>
            The visualizations help clinicians proactively manage therapy resources by showing spending patterns, 
            projected depletion rates, and item-by-item utilization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}