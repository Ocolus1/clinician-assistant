import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from './DashboardProvider';
import { FileText, MailOpen, ClipboardCheck, MoreHorizontal, CalendarDays } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

/**
 * Helper component for task category icon
 */
function TaskIcon({ type }: { type: 'reports' | 'letters' | 'assessments' | 'other' }) {
  switch (type) {
    case 'reports':
      return <FileText className="h-4 w-4" />;
    case 'letters':
      return <MailOpen className="h-4 w-4" />;
    case 'assessments':
      return <ClipboardCheck className="h-4 w-4" />;
    case 'other':
      return <MoreHorizontal className="h-4 w-4" />;
  }
}

/**
 * Colors for task categories in charts
 */
const COLORS = {
  reports: '#2563EB', // Blue
  letters: '#EC4899', // Pink
  assessments: '#16A34A', // Green
  other: '#6B7280', // Gray
};

/**
 * Upcoming Tasks Timeline Component
 * 
 * Displays a timeline of upcoming tasks categorized by type
 */
export function UpcomingTasksTimeline() {
  const { dashboardData, loadingState } = useDashboard();
  
  const isLoading = loadingState === 'loading' || loadingState === 'idle';
  const tasksData = dashboardData?.tasks;
  
  // Transform data for the stacked bar chart
  const stackedData = tasksData?.byMonth || [];

  // Calculate total tasks for the next month
  const nextMonth = stackedData[0];
  const nextMonthTotal = nextMonth 
    ? nextMonth.reports + nextMonth.letters + nextMonth.assessments + nextMonth.other
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Tasks</CardTitle>
        <CardDescription>
          Timeline of scheduled reports, letters, and assessments
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Next month summary */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center">
            <CalendarDays className="mr-1 h-4 w-4" />
            Next Month at a Glance
          </h3>
          
          {isLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : nextMonthTotal > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-lg font-bold text-blue-700">{nextMonth?.reports || 0}</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">Reports</p>
                </CardContent>
              </Card>
              
              <Card className="bg-pink-50 border-pink-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <MailOpen className="h-5 w-5 text-pink-600" />
                    <span className="text-lg font-bold text-pink-700">{nextMonth?.letters || 0}</span>
                  </div>
                  <p className="text-xs text-pink-700 mt-1">Letters</p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <ClipboardCheck className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-bold text-green-700">{nextMonth?.assessments || 0}</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">Assessments</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <MoreHorizontal className="h-5 w-5 text-gray-600" />
                    <span className="text-lg font-bold text-gray-700">{nextMonth?.other || 0}</span>
                  </div>
                  <p className="text-xs text-gray-700 mt-1">Other</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-3 text-muted-foreground">
              No tasks scheduled for next month
            </div>
          )}
        </div>
        
        {/* Tasks timeline chart */}
        <div className="h-64">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            6-Month Task Forecast
          </h3>
          
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stackedData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month"
                  angle={-45} 
                  textAnchor="end"
                  height={40}
                  minTickGap={10}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="reports" 
                  name="Reports" 
                  stackId="tasks" 
                  fill={COLORS.reports} 
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="letters" 
                  name="Letters" 
                  stackId="tasks" 
                  fill={COLORS.letters} 
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="assessments" 
                  name="Assessments" 
                  stackId="tasks" 
                  fill={COLORS.assessments} 
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="other" 
                  name="Other" 
                  stackId="tasks" 
                  fill={COLORS.other} 
                  radius={[0, 0, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}