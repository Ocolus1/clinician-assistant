import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from './DashboardProvider';
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { AppointmentStatsEntry } from '@shared/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
 * Helper function to format percent changes
 */
function formatPercentChange(percentChange?: number): string {
  if (percentChange === undefined || isNaN(percentChange)) return '0%';
  return `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
}

/**
 * Helper function to determine trend direction based on percent change
 */
function getTrendIcon(percentChange?: number) {
  if (!percentChange || isNaN(percentChange)) return null;
  if (percentChange > 0) {
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  } else if (percentChange < 0) {
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  }
  return <Activity className="h-4 w-4 text-gray-400" />;
}

/**
 * Helper function to get the appropriate color for percent change
 */
function getTrendColor(percentChange?: number): string {
  if (!percentChange || isNaN(percentChange)) return 'text-gray-500';
  if (percentChange > 0) return 'text-green-500';
  if (percentChange < 0) return 'text-red-500';
  return 'text-gray-500';
}

/**
 * Custom tooltip for the line chart
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 p-2 border rounded-lg shadow-md text-xs">
        <p className="font-medium">{label}</p>
        <p className="font-semibold text-primary">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Appointment Analytics Component
 * Redesigned to show a single chart with a timeframe selector
 */
export function AppointmentAnalytics() {
  const { dashboardData, loadingState, timeFrame, setTimeFrame } = useDashboard();
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('daily');
  
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
  
  // Get the last 6 periods for the chart
  const chartData = timeframeData ? timeframeData.slice(Math.max(0, timeframeData.length - 6)) : [];
  
  // Get the latest entry for the summary
  const latestEntry = timeframeData && timeframeData.length > 0 
    ? timeframeData[timeframeData.length - 1] 
    : undefined;

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 flex-shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle>Appointment Analytics</CardTitle>
          <Select 
            value={selectedTimeFrame} 
            onValueChange={handleTimeframeChange}
          >
            <SelectTrigger className="w-28 h-7 text-xs">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription className="mt-1">
          Total revenue from completed sessions
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-2 flex-grow overflow-hidden flex flex-col">
        {/* Revenue Summary */}
        <div className="flex items-center mb-2">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-primary mr-1" />
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                formatCurrency(latestEntry?.count || 0)
              )}
            </div>
          </div>
          
          {!isLoading && latestEntry?.percentChange !== undefined && (
            <div className="flex items-center ml-2">
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
                margin={{ top: 10, right: 0, bottom: 10, left: 0 }}
              >
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  height={20}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name={`${getTimeframeTitle(selectedTimeFrame)} Revenue`}
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