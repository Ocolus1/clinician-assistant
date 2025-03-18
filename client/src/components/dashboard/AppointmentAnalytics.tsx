import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from './DashboardProvider';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
 * Summary card for appointment analytics
 */
function AppointmentSummaryCard({
  title,
  data,
  isLoading,
}: {
  title: string;
  data?: AppointmentStatsEntry[];
  isLoading: boolean;
}) {
  // Get the latest entry
  const latestEntry = data && data.length > 0 ? data[data.length - 1] : undefined;
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <div className="flex items-center">
            <CalendarClock className="h-5 w-5 text-primary mr-2" />
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : latestEntry?.count || 0}
            </div>
          </div>
          
          {!isLoading && latestEntry?.percentChange !== undefined && (
            <div className="flex items-center mt-2">
              {getTrendIcon(latestEntry.percentChange)}
              <span className={`text-sm ml-1 ${getTrendColor(latestEntry.percentChange)}`}>
                {formatPercentChange(latestEntry.percentChange)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">vs previous period</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Appointment Analytics Component 
 * 
 * Displays visualizations for appointment data over time
 * Allows switching between different time frames
 */
export function AppointmentAnalytics() {
  const { dashboardData, loadingState, timeFrame, setTimeFrame } = useDashboard();
  
  const isLoading = loadingState === 'loading' || loadingState === 'idle';
  
  // Extract the relevant data based on the current timeframe
  const currentData = dashboardData?.appointments ? (
    timeFrame === 'day' ? dashboardData.appointments.daily :
    timeFrame === 'week' ? dashboardData.appointments.weekly :
    timeFrame === 'month' ? dashboardData.appointments.monthly :
    dashboardData.appointments.yearly
  ) : [];

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Appointment Analytics</CardTitle>
            <CardDescription>
              Track appointment trends over time
            </CardDescription>
          </div>
          
          <div className="flex space-x-2">
            <Badge 
              variant={timeFrame === 'day' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setTimeFrame('day')}
            >
              Daily
            </Badge>
            <Badge 
              variant={timeFrame === 'week' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setTimeFrame('week')}
            >
              Weekly
            </Badge>
            <Badge 
              variant={timeFrame === 'month' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setTimeFrame('month')}
            >
              Monthly
            </Badge>
            <Badge 
              variant={timeFrame === 'year' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setTimeFrame('year')}
            >
              Yearly
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <AppointmentSummaryCard
            title="Daily Average"
            data={dashboardData?.appointments.daily}
            isLoading={isLoading}
          />
          <AppointmentSummaryCard
            title="Weekly Average"
            data={dashboardData?.appointments.weekly}
            isLoading={isLoading}
          />
          <AppointmentSummaryCard
            title="Monthly Average"
            data={dashboardData?.appointments.monthly}
            isLoading={isLoading}
          />
          <AppointmentSummaryCard
            title="Yearly Average"
            data={dashboardData?.appointments.yearly}
            isLoading={isLoading}
          />
        </div>
        
        <Tabs defaultValue="area">
          <TabsList className="mb-4">
            <TabsTrigger value="area">Area Chart</TabsTrigger>
            <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          </TabsList>
          
          <TabsContent value="area" className="w-full h-80">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="w-full h-64" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={currentData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Appointments"
                    stroke="#1E4E8C"
                    fill="#1E4E8C"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
          
          <TabsContent value="bar" className="w-full h-80">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="w-full h-64" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={currentData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Appointments"
                    fill="#1E4E8C"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}