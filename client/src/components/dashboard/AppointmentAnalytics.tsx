import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from './DashboardProvider';
import { DollarSign, TrendingUp, TrendingDown, Activity, BarChart4 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { AppointmentStatsEntry } from '@shared/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

/**
 * Helper function to format currency
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format date strings based on timeframe
 */
function formatDateByTimeframe(dateStr: string, timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  try {
    const date = new Date(dateStr);
    switch (timeframe) {
      case 'daily':
        return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      case 'weekly':
        // Extract week number (simple calculation, may need refinement)
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `W${weekNum}-${date.getFullYear()}`;
      case 'monthly':
        return `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      case 'yearly':
        return date.getFullYear().toString();
      default:
        return dateStr;
    }
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format numbers with commas
 */
function formatNumberWithCommas(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Helper function to format percent changes
 * Note: We invert the sign since the trend calculation in our API is inverted (negative when it should be positive)
 */
function formatPercentChange(percentChange?: number): string {
  if (percentChange === undefined || isNaN(percentChange)) return '0%';
  
  // Invert the sign to fix the percentage calculation bug
  const correctedPercentChange = percentChange * -1;
  
  return `${correctedPercentChange > 0 ? '+' : ''}${correctedPercentChange.toFixed(1)}%`;
}

/**
 * Helper function to determine trend direction based on percent change
 * Note: Also inverting the sign for this function to match the fix in formatPercentChange
 */
function getTrendIcon(percentChange?: number) {
  if (!percentChange || isNaN(percentChange)) return null;
  
  // Invert the sign to fix the percentage calculation bug
  const correctedPercentChange = percentChange * -1;
  
  if (correctedPercentChange > 0) {
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  } else if (correctedPercentChange < 0) {
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  }
  return <Activity className="h-4 w-4 text-gray-400" />;
}

/**
 * Helper function to get the appropriate color for percent change
 * Note: Also inverting the sign for this function to match the fix in formatPercentChange
 */
function getTrendColor(percentChange?: number): string {
  if (!percentChange || isNaN(percentChange)) return 'text-gray-500';
  
  // Invert the sign to fix the percentage calculation bug
  const correctedPercentChange = percentChange * -1;
  
  if (correctedPercentChange > 0) return 'text-green-500';
  if (correctedPercentChange < 0) return 'text-red-500';
  return 'text-gray-500';
}

/**
 * Custom tooltip for the line chart
 */
const CustomTooltip = ({ active, payload, label, labelFormatter, selectedTimeFrame }: any) => {
  if (active && payload && payload.length) {
    // Format date using our custom formatter
    const formattedDate = labelFormatter ? labelFormatter(label) : formatDateByTimeframe(label, selectedTimeFrame);
    
    return (
      <div className="bg-background/95 p-2 border rounded-lg shadow-md text-xs">
        <p className="font-medium">{formattedDate}</p>
        <p className="font-semibold text-primary">
          {formatCurrency(payload[0].value)}
        </p>
        {payload[0].payload.count !== undefined && (
          <p className="text-xs text-muted-foreground">
            {formatNumberWithCommas(payload[0].payload.count)} session{payload[0].payload.count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    );
  }
  return null;
};

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';
type DisplayType = 'revenue' | 'count';

/**
 * Appointment Analytics Component
 * Redesigned to show a single chart with timeframe and display type selectors
 */
export function AppointmentAnalytics() {
  const { dashboardData, loadingState, timeFrame, setTimeFrame, dataSource } = useDashboard();
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('daily');
  const [displayType, setDisplayType] = useState<DisplayType>('revenue');
  
  const isLoading = loadingState === 'loading' || loadingState === 'idle';

  // Get the appropriate data for the selected timeframe
  const getTimeframeData = () => {
    if (!dashboardData?.appointments) return [];
    
    switch (selectedTimeFrame) {
      case 'daily':
        return dashboardData.appointments.daily;
      case 'weekly':
        return dashboardData.appointments.weekly;
      case 'monthly':
        return dashboardData.appointments.monthly;
      case 'yearly':
        return dashboardData.appointments.yearly;
      default:
        return dashboardData.appointments.daily;
    }
  };

  const timeframeData = getTimeframeData();
  
  // Get exactly the last 7 days for the chart, and enrich with revenue if available
  const chartData = timeframeData ? timeframeData.slice(Math.max(0, timeframeData.length - 7)).map(item => {
    // Look for revenue property which might be available in dummy data
    const revenue = (item as any).revenue !== undefined ? (item as any).revenue : (item.count * 120); // Fallback to simple calculation
    return {
      ...item,
      revenue,
    };
  }) : [];
  
  // Get the latest entry for the summary
  const latestEntry = timeframeData && timeframeData.length > 0 
    ? timeframeData[timeframeData.length - 1] 
    : undefined;
  
  // Calculate the total revenue for the current timeframe
  const totalRevenue = latestEntry 
    ? ((latestEntry as any).revenue !== undefined ? (latestEntry as any).revenue : (latestEntry.count * 120))
    : 0;

  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    setSelectedTimeFrame(value as TimeFrame);
    
    // Map our UI timeframe to the API timeframe
    const apiTimeFrame: 'day' | 'week' | 'month' | 'year' = 
      value === 'daily' ? 'day' : 
      value === 'weekly' ? 'week' : 
      value === 'monthly' ? 'month' : 'year';
    
    setTimeFrame(apiTimeFrame);
  };

  // Handle display type change
  const handleDisplayTypeChange = (value: DisplayType) => {
    setDisplayType(value);
  };

  // Map timeframe to display value
  const getTimeframeTitle = (timeframe: TimeFrame): string => {
    switch (timeframe) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return 'Daily';
    }
  };
  
  // Get data key based on display type
  const dataKey = displayType === 'revenue' ? 'revenue' : 'count';
  
  // Format Y-axis label based on display type
  // Format Y-axis label with correct signature matching what recharts expects
  const formatYAxis = (value: any, index: number): string => {
    const numValue = Number(value);
    if (displayType === 'revenue') {
      return numValue > 1000 ? `$${Math.round(numValue/1000)}k` : `$${numValue}`;
    }
    return String(value);
  };
  
  // Get title based on display type
  const getTitle = () => {
    return displayType === 'revenue' ? 'Revenue Analytics' : 'Appointment Analytics';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 flex-shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-1">
            {displayType === 'revenue' ? (
              <DollarSign className="h-5 w-5 text-primary mr-0.5" />
            ) : (
              <BarChart4 className="h-5 w-5 text-primary mr-0.5" />
            )}
            {getTitle()}
          </CardTitle>
          <div className="flex gap-1">
            <Select 
              value={displayType} 
              onValueChange={(v) => handleDisplayTypeChange(v as DisplayType)}
            >
              <SelectTrigger className="w-24 h-7 text-xs">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="count">Sessions</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={selectedTimeFrame} 
              onValueChange={handleTimeframeChange}
            >
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription className="mt-1">
          {displayType === 'revenue' 
            ? 'Total revenue from completed sessions' 
            : 'Total number of completed sessions'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-2 flex-grow overflow-hidden flex flex-col">
        {/* Revenue/Count Summary */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            {displayType === 'revenue' ? (
              <>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    formatCurrency(totalRevenue)
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    formatNumberWithCommas(latestEntry?.count || 0)
                  )}
                </div>
                <span className="ml-1 text-sm text-muted-foreground">sessions</span>
              </>
            )}
          </div>
          
          {!isLoading && latestEntry?.percentChange !== undefined && (
            <div className="flex items-center">
              {getTrendIcon(latestEntry.percentChange)}
              <span className={`text-sm ml-1 ${getTrendColor(latestEntry.percentChange)}`}>
                {formatPercentChange(latestEntry.percentChange)}
              </span>
            </div>
          )}
        </div>
        
        {/* Line Chart */}
        <div className="flex-grow overflow-hidden">
          {isLoading ? (
            <div className="h-full w-full flex justify-center items-center">
              <Skeleton className="h-4/5 w-full rounded-lg" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 25, bottom: 10, left: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 9, dy: 2 }} // Adjust font size and vertical position
                  tickLine={false}
                  axisLine={false}
                  height={30} // Increase height to accommodate all labels
                  interval={0} // Force display of all ticks
                  tickFormatter={(value) => formatDateByTimeframe(value, selectedTimeFrame)}
                />
                {/* YAxis removed as requested */}
                <Tooltip 
                  content={<CustomTooltip selectedTimeFrame={selectedTimeFrame} />} 
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => formatDateByTimeframe(String(label), selectedTimeFrame)}
                />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  name={`${getTimeframeTitle(selectedTimeFrame)} ${displayType === 'revenue' ? 'Revenue' : 'Sessions'}`}
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}