import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from './DashboardProvider';
import { FileText, MailOpen, ClipboardCheck, MoreHorizontal } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

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
 * Task category summary component
 */
function TaskCategorySummary({ 
  type, 
  count, 
  isLoading 
}: { 
  type: 'reports' | 'letters' | 'assessments' | 'other'; 
  count: number;
  isLoading: boolean;
}) {
  const icons = {
    reports: <FileText className="h-4 w-4" />,
    letters: <MailOpen className="h-4 w-4" />,
    assessments: <ClipboardCheck className="h-4 w-4" />,
    other: <MoreHorizontal className="h-4 w-4" />
  };
  
  const colors = {
    reports: 'bg-blue-50 border-blue-200 text-blue-700',
    letters: 'bg-pink-50 border-pink-200 text-pink-700',
    assessments: 'bg-green-50 border-green-200 text-green-700',
    other: 'bg-gray-50 border-gray-200 text-gray-700'
  };
  
  const iconColors = {
    reports: 'text-blue-600',
    letters: 'text-pink-600',
    assessments: 'text-green-600',
    other: 'text-gray-600'
  };
  
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  
  return (
    <Card className={colors[type]}>
      <CardContent className="p-2">
        <div className="flex justify-between items-center">
          <div className={iconColors[type]}>
            {icons[type]}
          </div>
          <div className="text-lg font-bold">
            {isLoading ? <Skeleton className="h-5 w-6" /> : count}
          </div>
        </div>
        <div className="text-xs mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

/**
 * Upcoming Tasks Timeline Component
 * Redesigned to fit in the fixed dashboard grid layout
 */
export function UpcomingTasksTimeline() {
  const { dashboardData, loadingState } = useDashboard();
  
  const isLoading = loadingState === 'loading' || loadingState === 'idle';
  const tasksData = dashboardData?.tasks;
  
  // Get data for the stacked bar chart
  const stackedData = tasksData?.byMonth || [];
  
  // Calculate totals across all months for each category
  const getTotalTasks = (key: string) => {
    if (!stackedData.length) return 0;
    return stackedData.reduce((sum, month) => sum + (month[key as keyof typeof month] as number || 0), 0);
  };
  
  const totalReports = getTotalTasks('reports');
  const totalLetters = getTotalTasks('letters');
  const totalAssessments = getTotalTasks('assessments');
  const totalOther = getTotalTasks('other');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle>Upcoming Tasks</CardTitle>
        <CardDescription>
          6-month forecast of scheduled tasks
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-2 flex-grow overflow-auto">
        <div className="flex flex-col h-full gap-2">
          {/* Task categories summary */}
          <div className="grid grid-cols-4 gap-1 flex-shrink-0">
            <TaskCategorySummary 
              type="reports"
              count={totalReports}
              isLoading={isLoading}
            />
            <TaskCategorySummary 
              type="letters"
              count={totalLetters}
              isLoading={isLoading}
            />
            <TaskCategorySummary 
              type="assessments"
              count={totalAssessments}
              isLoading={isLoading}
            />
            <TaskCategorySummary 
              type="other"
              count={totalOther}
              isLoading={isLoading}
            />
          </div>
          
          {/* Tasks timeline chart */}
          <Card className="flex-grow flex flex-col">
            <CardContent className="p-1 flex-grow overflow-hidden">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stackedData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 10 }}
                    barSize={10}
                  >
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9 }}
                      width={20}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip />
                    <Legend 
                      iconSize={6}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '9px', marginTop: '2px' }}
                    />
                    <Bar 
                      dataKey="reports" 
                      name="Reports" 
                      stackId="tasks" 
                      fill={COLORS.reports}
                    />
                    <Bar 
                      dataKey="letters" 
                      name="Letters" 
                      stackId="tasks" 
                      fill={COLORS.letters}
                    />
                    <Bar 
                      dataKey="assessments" 
                      name="Assessments" 
                      stackId="tasks" 
                      fill={COLORS.assessments}
                    />
                    <Bar 
                      dataKey="other" 
                      name="Other" 
                      stackId="tasks" 
                      fill={COLORS.other}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}