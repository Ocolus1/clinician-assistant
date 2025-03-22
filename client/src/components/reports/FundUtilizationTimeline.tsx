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
import { getDummyFundUtilizationData } from "@shared/dummy-data";

interface FundUtilizationTimelineProps {
  clientId: number;
}

export function FundUtilizationTimeline({ clientId }: FundUtilizationTimelineProps) {
  // Fixed value for the underspending percentage that will be displayed
  // This should match the value used in the dummy data
  const underspendingPercentage = 79; // Fixed at 79% underspending for demo
  
  // Fetch budget settings and sessions
  const { data: budgetSettings, isLoading: isLoadingSettings } = useQuery<BudgetSettings>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    enabled: !!clientId,
  });

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/clients', clientId, 'sessions'],
    enabled: !!clientId,
  });

  // Define type for timeline data points with visualization scale
  type TimelineDataPoint = {
    date: string;
    displayDate: string;
    dayNumber: number;
    projectedSpent: number;
    actualSpent: number | null;
    extensionSpent: number | null;
    correctionSpent: number | null;
    isToday: boolean;
    isPastToday: boolean;
    percentOfTimeElapsed: number;
    percentOfBudgetSpent: number;
    visualizationScale?: number;
  };

  // Generate the enhanced spending data visualization with the four lines:
  // 1. Projected: Initial projection at client onboarding
  // 2. Actual: Actual spending to date
  // 3. Extension: Dotted line projecting future based on actual pattern
  // 4. Correction: Line showing ideal spending from today to use all funds
  const timelineData = React.useMemo<TimelineDataPoint[]>(() => {
    // If data is being loaded, return empty array
    if (isLoadingSettings || isLoadingSessions) {
      return [];
    }

    try {
      // Use the dummy data generator for consistent visualization
      // In a real app, this would use actual spending data from database
      // This percentage matches the -79% spending variance shown in the top card
      const data = getDummyFundUtilizationData(clientId, underspendingPercentage);
      
      // If we have budget settings, use real total budget value
      if (budgetSettings?.ndisFunds) {
        const totalBudget = Number(budgetSettings.ndisFunds);
        
        // Adjust the dummy data to use the real budget amount, but scale it to fit under 20,000 for visualization
        const visualizationScale = totalBudget > 20000 ? 20000 / totalBudget : 1;
        
        // Define a type for our enhanced data points with visualization scale
        type EnhancedDataPoint = typeof data[0] & { 
          visualizationScale: number 
        };
        
        return data.map(point => {
          // Create scaled version of data for better visualization while maintaining proportions
          const enhancedPoint: EnhancedDataPoint = {
            ...point,
            projectedSpent: point.projectedSpent / point.projectedSpent * totalBudget * (point.percentOfTimeElapsed / 100) * visualizationScale,
            actualSpent: point.actualSpent ? (point.actualSpent / point.projectedSpent * totalBudget * (point.percentOfTimeElapsed / 100) * visualizationScale) : null,
            extensionSpent: point.extensionSpent ? (point.extensionSpent / point.projectedSpent * totalBudget * (point.percentOfTimeElapsed / 100) * visualizationScale) : null,
            correctionSpent: point.correctionSpent ? (point.correctionSpent / point.projectedSpent * totalBudget * (point.percentOfTimeElapsed / 100) * visualizationScale) : null,
            // Add a property to track the scaling factor for tooltips
            visualizationScale: visualizationScale
          };
          return enhancedPoint;
        });
      }
      
      return data;
    } catch (error) {
      console.error("Error generating timeline data:", error);
      return [];
    }
  }, [budgetSettings, isLoadingSettings, isLoadingSessions, clientId]);

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
      
      // The utilizationRate should be around 0.21 (21%) for a -79% spending variance
      // because the spending variance is (actual - expected) / expected = (-0.79)
      // which means we're spending at 21% of the ideal rate
      // Fix: Set utilizationRate to exactly match the 79% underspending rate (0.21)
      const utilizationRate = todayPoint 
        ? (100 - underspendingPercentage) / 100  // If underspending is 79%, utilization is 21%
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
        {/* Removed subtitle as requested */}
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
                tickFormatter={(value) => {
                  // Format to show month and year (Jan 25, Feb 25, etc.)
                  const dateStr = String(value);
                  if (!dateStr.includes(' ')) return value;
                  
                  // Extract month from the date string (e.g., "Mar 22" -> "Mar")
                  const month = dateStr.split(' ')[0];
                  
                  // For consistency, use the current year for all date labels
                  // This ensures dates like "Mar 25" mean March 2025
                  return `${month} ${new Date().getFullYear().toString().substring(2)}`;
                }}
              />
              {/* Using hidden YAxis to maintain chart proportions while not showing it visually */}
              <YAxis 
                hide={true}
                domain={[0, 20000]} // Set maximum to 20,000 for better visual clarity
              />
              <RechartsTooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  
                  // Get the data point for this tooltip
                  const dataPoint = payload[0].payload;
                  const scale = dataPoint && 'visualizationScale' in dataPoint ? 
                    Number(dataPoint.visualizationScale) : 1;
                  
                  // Format the date to match axis labels (Apr 25 format)
                  let displayDate;
                  if (dataPoint.isToday) {
                    // For today's date, show current month + YY
                    const today = new Date();
                    const month = today.toLocaleDateString('en-US', { month: 'short' });
                    const year = today.getFullYear().toString().substring(2);
                    displayDate = `${month} ${year}`;
                  } else {
                    // For other dates, use the same format as x-axis
                    // The label already has the correct format from the x-axis formatter
                    displayDate = label;
                  }
                  
                  // Get all the values with scaling applied correctly
                  const values = {
                    projected: payload.find(p => p.dataKey === 'projectedSpent')?.value,
                    actual: payload.find(p => p.dataKey === 'actualSpent')?.value,
                    extension: payload.find(p => p.dataKey === 'extensionSpent')?.value,
                    correction: payload.find(p => p.dataKey === 'correctionSpent')?.value
                  };
                  
                  // Unscale the values
                  const unscaledValues = {
                    projected: values.projected !== null && values.projected !== undefined && scale !== 1 
                      ? (values.projected as number) / scale : values.projected,
                    actual: values.actual !== null && values.actual !== undefined && scale !== 1 
                      ? (values.actual as number) / scale : values.actual,
                    extension: values.extension !== null && values.extension !== undefined && scale !== 1 
                      ? (values.extension as number) / scale : values.extension,
                    correction: values.correction !== null && values.correction !== undefined && scale !== 1 
                      ? (values.correction as number) / scale : values.correction
                  };
                  
                  // Calculate deltas for comparison insights
                  const deltas = {
                    actualVsProjected: unscaledValues.actual && unscaledValues.projected 
                      ? ((unscaledValues.actual as number) / (unscaledValues.projected as number) - 1) * 100 
                      : null,
                    correctionNeeded: unscaledValues.actual && unscaledValues.correction 
                      ? ((unscaledValues.correction as number) / (unscaledValues.actual as number) - 1) * 100 
                      : null
                  };
                  
                  // Helper function to format currency
                  const formatValue = (value: any) => 
                    value !== null && value !== undefined 
                      ? `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}` 
                      : '-';
                  
                  return (
                    <div className="bg-white p-3 rounded-lg shadow-md border border-gray-100 max-w-[280px]">
                      {/* Date header with primary emphasis */}
                      <div className="font-medium text-gray-900 pb-1 border-b border-gray-100 mb-2">
                        {displayDate}
                      </div>
                      
                      {/* Data values with visual hierarchy */}
                      <div className="space-y-2 mb-2">
                        {/* Projected amount */}
                        {unscaledValues.projected !== null && (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-500 mr-2"></div>
                              <span className="text-sm text-gray-700">Projected</span>
                            </div>
                            <span className="text-sm font-medium text-right">{formatValue(unscaledValues.projected)}</span>
                          </div>
                        )}
                        
                        {/* Actual amount with comparison */}
                        {unscaledValues.actual !== null && (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2"></div>
                              <span className="text-sm text-gray-700">Actual</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-medium text-right">{formatValue(unscaledValues.actual)}</span>
                              {deltas.actualVsProjected !== null && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${deltas.actualVsProjected >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {deltas.actualVsProjected >= 0 ? '+' : ''}{Math.round(deltas.actualVsProjected)}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Extension amount */}
                        {unscaledValues.extension !== null && (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white mr-2"></div>
                              <span className="text-sm text-gray-700">Extension</span>
                            </div>
                            <span className="text-sm font-medium text-right">{formatValue(unscaledValues.extension)}</span>
                          </div>
                        )}
                        
                        {/* Correction amount with action needed */}
                        {unscaledValues.correction !== null && (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></div>
                              <span className="text-sm text-gray-700">Correction</span>
                            </div>
                            <span className="text-sm font-medium text-right">{formatValue(unscaledValues.correction)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Actionable insight if we have the correction needed delta */}
                      {deltas.correctionNeeded !== null && deltas.correctionNeeded > 5 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="text-xs bg-amber-50 text-amber-800 p-1.5 rounded">
                            <span className="font-medium">Action needed:</span> Increase spending by {Math.round(deltas.correctionNeeded)}% to use all funds
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <ReferenceLine 
                x={timelineData.find(point => point.isToday)?.displayDate} 
                stroke="#64748b" 
                strokeDasharray="3 3"
                label={{ 
                  value: `Today (${new Date().toLocaleDateString('en-US', { month: 'short' })} ${new Date().getFullYear().toString().substring(2)})`, 
                  position: 'insideTopRight', fontSize: 11, fill: '#64748b' 
                }}
              />
              
              {/* Line 1: Projected - Initial projection at client onboarding */}
              <Line
                type="monotone"
                dataKey="projectedSpent"
                stroke="#6b7280"
                strokeWidth={1.5}
                name="Projected"
                dot={false}
                activeDot={{ r: 5, fill: '#6b7280', stroke: '#fff', strokeWidth: 1 }}
                isAnimationActive={false}
              />
              
              {/* Line 2: Actual - Actual spending up to today - Primary focus */}
              <Line
                type="monotone"
                dataKey="actualSpent"
                stroke="#3b82f6"
                strokeWidth={4}
                name="Actual"
                dot={false}
                activeDot={{ r: 7, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              
              {/* Line 3: Extension - Dotted projection based on actual pattern */}
              <Line
                type="monotone"
                dataKey="extensionSpent"
                stroke="#3b82f6"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                name="Extension"
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1 }}
                isAnimationActive={false}
              />
              
              {/* Line 4: Correction - Path needed from today to use all funds - Secondary focus */}
              <Line
                type="monotone"
                dataKey="correctionSpent"
                stroke="#f59e0b"
                strokeWidth={3.5}
                name="Correction"
                dot={false}
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
                isAnimationActive={false}
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
            <div className="text-xs text-gray-500">Spending Variance</div>
            <div className="text-sm font-medium">
              {(() => {
                // Find today's point for calculation
                const todayPoint = timelineData.find(point => point.isToday);
                if (!todayPoint) return <span className="text-blue-700">-{underspendingPercentage}%</span>;
                
                // Get values for actual and projected spending at the today point
                const actual = todayPoint.actualSpent;
                const projected = todayPoint.projectedSpent;
                
                // Calculate the delta using the same formula as in tooltip
                const actualVsProjected = (actual !== null && projected !== null) 
                  ? ((actual as number) / (projected as number) - 1) * 100 
                  : null;
                  
                // Round the value to match tooltip display
                const roundedValue = actualVsProjected !== null ? Math.round(actualVsProjected) : null;
                
                return <span className="text-blue-700">{roundedValue !== null ? (roundedValue >= 0 ? '+' : '') + roundedValue : -underspendingPercentage}%</span>;
              })()}
            </div>
          </div>
          
          <div className="rounded-lg p-2.5 border border-gray-100 bg-gray-50">
            <div className="text-xs text-gray-500">Funds Remaining</div>
            <div className="text-sm font-medium">
              {formatCurrency(budgetSettings && typeof budgetSettings.ndisFunds === 'number' ? 
                (() => {
                  // Find today's point, with fallback
                  const todayPoint = timelineData.find(p => p.isToday) || null;
                  
                  // Safely check for visualizationScale property and use a default
                  const scale = todayPoint && 
                    typeof todayPoint === 'object' && 
                    'visualizationScale' in todayPoint && 
                    typeof todayPoint.visualizationScale === 'number' ? 
                    todayPoint.visualizationScale : 1;
                  
                  // Unscale the value if needed to show actual remaining funds
                  const actualSpent = todayPoint && todayPoint.actualSpent !== null && todayPoint.actualSpent !== undefined ? 
                    Number(todayPoint.actualSpent) / scale : 0;
                    
                  return Number(budgetSettings.ndisFunds) - actualSpent;
                })() :
                0)}
            </div>
          </div>
          
          <div className="rounded-lg p-2.5 border border-blue-50 bg-blue-50">
            <div className="text-xs text-blue-700">Plan Expiration</div>
            <div className="text-sm font-medium text-blue-800">
              {budgetSettings?.endOfPlan ? 
                `${differenceInDays(new Date(budgetSettings.endOfPlan), new Date())} days` : 
                '363 days'}
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