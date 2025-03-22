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
import { ServiceGapAnalysis } from './ServiceGapAnalysis';

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

  // Define types for our data
  type Goal = {
    id: number;
    clientId: number;
    title: string;
    description: string;
    priority: string;
  };
  
  type Subgoal = {
    id: number;
    goalId: number;
    title: string;
    description: string;
    status?: string;
  };
  
  type Session = any;
  
  // Get goals and subgoals for ServiceGapAnalysis
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: [`/api/clients/${clientId}/goals`],
  });
  
  const { data: sessions = [] } = useQuery<Session[]>({
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
  const { data: subgoals = [] } = useQuery<Subgoal[]>({
    queryKey: [`/api/clients/${clientId}/subgoals`],
    queryFn: async () => {
      // Fetch subgoals for each goal
      const allSubgoals: Subgoal[] = [];
      if (goals && Array.isArray(goals)) {
        for (const goal of goals) {
          if (goal && goal.id) {
            const response = await fetch(`/api/goals/${goal.id}/subgoals`);
            if (response.ok) {
              const goalSubgoals = await response.json();
              if (Array.isArray(goalSubgoals)) {
                allSubgoals.push(...goalSubgoals);
              }
            }
          }
        }
      }
      return allSubgoals;
    },
    enabled: goals.length > 0,
  });

  return (
    <div className="space-y-5">
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

      {/* Row 3: Budget Reallocation Suggestions */}
      <BudgetReallocationSuggestions 
        budgetItems={budgetItems} 
        sessions={sessions}
        budgetSettings={budgetSettings}
      />

      {/* Row 4: Service Gap Analysis */}
      <ServiceGapAnalysis
        clientId={clientId}
        budgetItems={budgetItems}
        sessions={sessions}
        goals={goals as any[]}
        subgoals={subgoals as any[]}
        budgetSettings={budgetSettings}
      />
      
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