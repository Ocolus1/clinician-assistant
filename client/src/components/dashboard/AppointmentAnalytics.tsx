import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from './DashboardProvider';
import { CalendarClock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { AppointmentStatsEntry } from '@shared/schema';

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
 * Summary card for appointment analytics with mini sparkline
 */
function AppointmentSummaryCard({
  title,
  data,
  isLoading,
  color,
}: {
  title: string;
  data?: AppointmentStatsEntry[];
  isLoading: boolean;
  color: string;
}) {
  // Get the latest entry
  const latestEntry = data && data.length > 0 ? data[data.length - 1] : undefined;
  // Get the last 6 entries for the sparkline
  const sparklineData = data ? data.slice(Math.max(0, data.length - 6)) : [];
  
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-col">
          <div className="flex items-center">
            <CalendarClock className="h-5 w-5 text-primary mr-2" />
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : latestEntry?.count || 0}
            </div>
          </div>
          
          {!isLoading && latestEntry?.percentChange !== undefined && (
            <div className="flex items-center mt-1">
              {getTrendIcon(latestEntry.percentChange)}
              <span className={`text-sm ml-1 ${getTrendColor(latestEntry.percentChange)}`}>
                {formatPercentChange(latestEntry.percentChange)}
              </span>
            </div>
          )}
        </div>
        
        {/* Mini sparkline */}
        {!isLoading && sparklineData.length > 0 && (
          <div className="h-16 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke={color} 
                  strokeWidth={2}
                  dot={false}
                />
                {/* No axes or grid for cleaner sparkline look */}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Appointment Analytics Component
 * Redesigned to show all timeframes at once in a quadrant-based layout
 */
export function AppointmentAnalytics() {
  const { dashboardData, loadingState } = useDashboard();
  
  const isLoading = loadingState === 'loading' || loadingState === 'idle';

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>Appointment Analytics</CardTitle>
        <CardDescription>
          Last 6 periods overview by timeframe
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Four-quadrant view for all time periods */}
        <div className="grid grid-cols-2 gap-4 h-full">
          <AppointmentSummaryCard
            title="Daily Average"
            data={dashboardData?.appointments.daily}
            isLoading={isLoading}
            color="#2563EB" // Blue
          />
          <AppointmentSummaryCard
            title="Weekly Average"
            data={dashboardData?.appointments.weekly}
            isLoading={isLoading}
            color="#16A34A" // Green
          />
          <AppointmentSummaryCard
            title="Monthly Average"
            data={dashboardData?.appointments.monthly}
            isLoading={isLoading}
            color="#EA580C" // Orange
          />
          <AppointmentSummaryCard
            title="Yearly Average"
            data={dashboardData?.appointments.yearly}
            isLoading={isLoading}
            color="#8B5CF6" // Purple
          />
        </div>
      </CardContent>
    </Card>
  );
}