import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, differenceInDays, isAfter, isWithinInterval } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import { BudgetSettings } from "@shared/schema";

interface FundUtilizationTimelineProps {
  clientId: number;
}

export function FundUtilizationTimeline({ clientId }: FundUtilizationTimelineProps) {
  // Fetch budget settings and sessions
  const { data: budgetSettings, isLoading: isLoadingSettings } = useQuery<BudgetSettings>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    enabled: !!clientId,
  });

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/clients', clientId, 'sessions'],
    enabled: !!clientId,
  });

  // Generate the enhanced spending data visualization with the four lines:
  // 1. Projected: Initial projection at client onboarding
  // 2. Actual: Actual spending to date
  // 3. Extension: Dotted line projecting future based on actual pattern
  // 4. Correction: Line showing ideal spending from today to use all funds
  const timelineData = React.useMemo(() => {
    if (!budgetSettings || isLoadingSettings || isLoadingSessions) {
      return [];
    }

    try {
      // Parse dates - use created date as start date (onboarding date)
      const startDate = budgetSettings.createdAt ? new Date(budgetSettings.createdAt) : new Date(new Date().setMonth(new Date().getMonth() - 3));
      // Use endOfPlan as end date (plan expiry date)
      const endDate = budgetSettings.endOfPlan ? new Date(budgetSettings.endOfPlan) : new Date(new Date().setMonth(new Date().getMonth() + 9));
      const today = new Date();
      
      // If dates are invalid, use fallback
      if (isNaN(startDate.getTime())) {
        const fallbackStartDate = new Date();
        fallbackStartDate.setMonth(fallbackStartDate.getMonth() - 3);
        startDate.setTime(fallbackStartDate.getTime());
      }
      
      if (isNaN(endDate.getTime())) {
        const fallbackEndDate = new Date();
        fallbackEndDate.setMonth(fallbackEndDate.getMonth() + 9);
        endDate.setTime(fallbackEndDate.getTime());
      }
      
      // Calculate total days in plan
      const totalDays = Math.max(differenceInDays(endDate, startDate), 30);
      
      // Calculate days elapsed
      const daysElapsed = Math.min(
        Math.max(differenceInDays(today, startDate), 0),
        totalDays
      );
      
      // Calculate days remaining from today to plan end
      const daysRemaining = Math.max(0, differenceInDays(endDate, today));
      
      // Total budget amount
      const totalBudget = budgetSettings.ndisFunds !== null ? Number(budgetSettings.ndisFunds) : 50000;
      
      // Generate spending curve using simulated data
      // In a real app, this would use actual spending data from sessions
      const dataPoints = [];
      const numPoints = Math.min(36, totalDays); // Use more points for smoother curves
      const interval = totalDays / numPoints;
      
      // Initial spending rate (for projected line)
      const projectedDailyRate = totalBudget / totalDays;
      
      // For actual spending pattern
      const patternSeed = clientId % 4;
      
      // Find actual spending today - this will be used to calculate correction line
      let actualSpentToday = 0;
      let actualFactorMultiplier;
      
      // Set the multiplier to create a realistic spending pattern based on client ID
      // Using this to simulate different spending patterns that might occur in real data
      if (patternSeed === 0) {
        // Slow start, accelerates later (underspending pattern)
        actualFactorMultiplier = 0.5; // Significantly underspending
      } else if (patternSeed === 1) {
        // Fast start, slows down (overspending pattern)
        actualFactorMultiplier = 1.2; // Slightly overspending
      } else if (patternSeed === 2) {
        // Fluctuating with seasonal pattern (variable spending)
        actualFactorMultiplier = 0.6; // Moderately underspending
      } else {
        // Mostly on track with small deviations (near ideal)
        actualFactorMultiplier = 0.9; // Slightly underspending
      }
      
      // Generate each data point
      for (let i = 0; i <= numPoints; i++) {
        const dayNumber = Math.round(i * interval);
        const pointDate = addDays(startDate, dayNumber);
        const percentOfTimeElapsed = dayNumber / totalDays;
        
        // 1. Projected line - how we expect to spend at onboarding (linear)
        const projectedSpent = totalBudget * percentOfTimeElapsed;
        
        // 2. Actual line - influenced by pattern and only up to today
        let actualFactor;
        
        if (patternSeed === 0) {
          // Slow start, accelerates later (underspending pattern)
          actualFactor = Math.pow(percentOfTimeElapsed, 1.3) * actualFactorMultiplier;
        } else if (patternSeed === 1) {
          // Fast start, slows down
          actualFactor = Math.pow(percentOfTimeElapsed, 0.9) * actualFactorMultiplier;
        } else if (patternSeed === 2) {
          // Fluctuating with seasonal pattern
          actualFactor = percentOfTimeElapsed * actualFactorMultiplier + 
            Math.sin(percentOfTimeElapsed * Math.PI * 2) * 0.1;
        } else {
          // Mostly on track with small deviations
          actualFactor = percentOfTimeElapsed * actualFactorMultiplier;
        }
        
        // Keep actual factor within reasonable bounds (0-1.2)
        actualFactor = Math.max(0, Math.min(1.2, actualFactor));
        
        // Calculate actual spent amount
        let actualSpent = totalBudget * actualFactor;
        
        // Check if this point is today
        const isPastToday = isAfter(pointDate, today);
        const isToday = !isPastToday && i > 0 && 
          isAfter(pointDate, addDays(today, -1)) && 
          !isAfter(pointDate, today);
        
        if (isToday) {
          actualSpentToday = actualSpent;
        }
        
        // 3. Extension line - projects future spending based on actual pattern
        let extensionSpent = null;
        if (isPastToday) {
          // Use the actual rate of spending for projection
          const daysFromToday = differenceInDays(pointDate, today);
          const actualRate = actualSpentToday / daysElapsed;
          extensionSpent = actualSpentToday + (actualRate * daysFromToday);
        }
        
        // 4. Correction line - from today to end date to use all funds
        let correctionSpent = null;
        
        if (!isPastToday) {
          // Before today, no correction line
          correctionSpent = null;
        } else {
          // For today's point, use actual spent
          if (i > 0 && differenceInDays(pointDate, today) <= 1) {
            correctionSpent = actualSpentToday;
          } else {
            // Calculate daily rate needed to use all funds from today to end
            const remainingFunds = totalBudget - actualSpentToday;
            const requiredDailyRate = remainingFunds / daysRemaining;
            const daysFromToday = differenceInDays(pointDate, today);
            
            // Calculate correction amount
            correctionSpent = actualSpentToday + (requiredDailyRate * daysFromToday);
          }
        }
        
        // Add data point with all four lines
        dataPoints.push({
          date: format(pointDate, 'yyyy-MM-dd'),
          dayNumber,
          displayDate: format(pointDate, 'MMM d'),
          projectedSpent, // Line 1: Projected (initial expectation)
          actualSpent:  isPastToday ? null : actualSpent, // Line 2: Actual (only up to today)
          extensionSpent, // Line 3: Extension (dotted projection)
          correctionSpent, // Line 4: Correction (path to use all funds)
          isPastToday,
          isToday,
          percentOfTimeElapsed: percentOfTimeElapsed * 100,
          percentOfBudgetSpent: (actualSpent / totalBudget) * 100
        });
      }
      
      return dataPoints;
    } catch (error) {
      console.error("Error generating timeline data:", error);
      return [];
    }
  }, [budgetSettings, isLoadingSettings, isLoadingSessions, clientId, sessions]);

  // Calculate depletion date and current status
  const {
    actualDepletionDate,
    idealDepletionDate,
    daysUntilDepletion,
    projectedRemainingAtEnd,
    utilizationRate,
    status
  } = React.useMemo(() => {
    if (!budgetSettings || !timelineData || timelineData.length === 0) {
      return {
        actualDepletionDate: null,
        idealDepletionDate: null,
        daysUntilDepletion: 0,
        projectedRemainingAtEnd: 0,
        utilizationRate: 0,
        status: 'balanced' as const
      };
    }

    try {
      const totalBudget = budgetSettings.ndisFunds !== null ? Number(budgetSettings.ndisFunds) : 50000;
      const endDate = budgetSettings.endOfPlan ? new Date(budgetSettings.endOfPlan) : new Date(new Date().setMonth(new Date().getMonth() + 9));
      const today = new Date();
      
      // Find the projected depletion date using extension line
      const depletionPoint = timelineData.find(point => {
        const extensionValue = point.extensionSpent || 0;
        return extensionValue >= totalBudget;
      });
      
      const actualDepletionDate = depletionPoint 
        ? new Date(depletionPoint.date)
        : null;
      
      // Ideal depletion should be the end date
      const idealDepletionDate = endDate;
      
      // Days until depletion
      const daysUntilDepletion = actualDepletionDate 
        ? Math.max(0, differenceInDays(actualDepletionDate, today))
        : differenceInDays(endDate, today);
      
      // Projected remaining at end of plan - calculated from extension line
      const lastPoint = timelineData[timelineData.length - 1];
      const lastExtensionValue = lastPoint.extensionSpent || 0;
      const projectedRemainingAtEnd = Math.max(0, totalBudget - lastExtensionValue);
      
      // Current utilization rate
      const todayPoint = timelineData.find(point => point.isToday);
      const utilizationRate = todayPoint 
        ? (todayPoint.percentOfBudgetSpent / Math.max(0.1, todayPoint.percentOfTimeElapsed))
        : 1;
      
      // Determine status - for underspending scenario (79%)
      let status: 'depleting-fast' | 'depleting-slow' | 'balanced' = 'balanced';
      if (utilizationRate > 1.1) status = 'depleting-fast';
      else if (utilizationRate < 0.85) status = 'depleting-slow';
      
      return {
        actualDepletionDate,
        idealDepletionDate,
        daysUntilDepletion,
        projectedRemainingAtEnd,
        utilizationRate,
        status
      };
    } catch (error) {
      console.error("Error calculating depletion metrics:", error);
      return {
        actualDepletionDate: null,
        idealDepletionDate: null,
        daysUntilDepletion: 0,
        projectedRemainingAtEnd: 0,
        utilizationRate: 0,
        status: 'balanced' as const
      };
    }
  }, [budgetSettings, timelineData]);

  // Loading state
  if (isLoadingSettings || isLoadingSessions || !timelineData || timelineData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fund Utilization Timeline</CardTitle>
          <CardDescription>Loading utilization data...</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine status badge color and text
  let statusBadge;
  if (status === 'depleting-fast') {
    statusBadge = (
      <Badge className="ml-2 bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
        Depleting Too Fast
      </Badge>
    );
  } else if (status === 'depleting-slow') {
    statusBadge = (
      <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
        Depleting Too Slow
      </Badge>
    );
  } else {
    statusBadge = (
      <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
        On Target
      </Badge>
    );
  }

  // Format the depletion date
  const formattedDepletionDate = actualDepletionDate 
    ? format(actualDepletionDate, 'MMM d, yyyy')
    : 'After plan end';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center">
          <CardTitle className="text-base">Fund Utilization Timeline</CardTitle>
          {statusBadge}
        </div>
        <CardDescription>Track and optimize spending to ensure full fund utilization</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timelineData}
              margin={{ top: 10, right: 5, left: 5, bottom: 20 }}
            >
              <defs>
                <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="extensionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="correctionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 11 }}
                tickMargin={10}
                interval={"preserveStartEnd"}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
              />
              <RechartsTooltip
                formatter={(value, name) => [
                  value ? `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '-',
                  name === 'projectedSpent' ? 'Projected' : 
                  name === 'actualSpent' ? 'Actual' : 
                  name === 'extensionSpent' ? 'Extension' : 
                  name === 'correctionSpent' ? 'Correction' : name
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <ReferenceLine 
                x={timelineData.find(point => point.isToday)?.displayDate} 
                stroke="#64748b" 
                strokeDasharray="3 3"
                label={{ value: 'Today', position: 'insideTopRight', fontSize: 11, fill: '#64748b' }}
              />
              
              {/* Line 1: Projected - Initial projection at client onboarding */}
              <Line
                type="monotone"
                dataKey="projectedSpent"
                stroke="#6b7280"
                strokeWidth={2}
                name="Projected"
                dot={false}
                activeDot={{ r: 5, fill: '#6b7280', stroke: '#fff', strokeWidth: 1 }}
              />
              
              {/* Line 2: Actual - Actual spending up to today */}
              <Line
                type="monotone"
                dataKey="actualSpent"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Actual"
                dot={false}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
              
              {/* Line 3: Extension - Dotted projection based on actual pattern */}
              <Line
                type="monotone"
                dataKey="extensionSpent"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Extension"
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1 }}
              />
              
              {/* Line 4: Correction - Path needed from today to use all funds */}
              <Line
                type="monotone"
                dataKey="correctionSpent"
                stroke="#f59e0b"
                strokeWidth={2.5}
                name="Correction"
                dot={false}
                activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1 }}
              />
              
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconSize={10}
                iconType="line"
                wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="rounded-lg p-2.5 border border-gray-100 bg-gray-50">
            <div className="text-xs text-gray-500">Current Pattern</div>
            <div className="text-sm font-medium">
              {utilizationRate < 0.80 ? 'Significant underspending' : 
               utilizationRate < 0.95 ? 'Moderate underspending' : 
               utilizationRate > 1.1 ? 'Overspending' : 
               'Near target'}
              <span className="ml-1 text-xs text-gray-500">
                ({(utilizationRate * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
          
          <div className="rounded-lg p-2.5 border border-gray-100 bg-gray-50">
            <div className="text-xs text-gray-500">Funds Remaining</div>
            <div className="text-sm font-medium">
              {formatCurrency(budgetSettings && typeof budgetSettings.ndisFunds === 'number' ? 
                budgetSettings.ndisFunds - (timelineData.find(p => p.isToday)?.actualSpent || 0) : 
                0)}
            </div>
          </div>
          
          <div className="rounded-lg p-2.5 border border-blue-50 bg-blue-50">
            <div className="text-xs text-blue-700">Extension Forecast</div>
            <div className="text-sm font-medium text-blue-800">
              {formatCurrency(projectedRemainingAtEnd)}
              <span className="ml-1 text-xs text-blue-600">
                {budgetSettings && typeof budgetSettings.ndisFunds === 'number' && budgetSettings.ndisFunds > 0 ? 
                  `(${Math.max(0, ((projectedRemainingAtEnd / (budgetSettings.ndisFunds || 1)) * 100).toFixed(0))}% unused)` : 
                  ''}
              </span>
            </div>
          </div>
          
          <div className="rounded-lg p-2.5 border border-amber-50 bg-amber-50">
            <div className="text-xs text-amber-700">Action Needed</div>
            <div className="text-sm font-medium text-amber-800">
              {utilizationRate < 0.80 ? 'Increase spending by ' + (((1/utilizationRate) - 1) * 100).toFixed(0) + '%' : 
               utilizationRate < 0.95 ? 'Increase spending by ' + (((1/utilizationRate) - 1) * 100).toFixed(0) + '%' : 
               utilizationRate > 1.05 ? 'Reduce spending by ' + ((1 - (1/utilizationRate)) * 100).toFixed(0) + '%' : 
               'Maintain current pace'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}