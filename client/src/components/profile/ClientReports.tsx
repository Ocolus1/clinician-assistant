import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Loader2, Info, BarChart4, Calendar, CheckCircle, AlertCircle, ArrowUpRight } from "lucide-react";

// UI Components
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// API and Utils
import { getClientPerformanceReport, getClientStrategiesReport, type ClientReportData } from "@/lib/api/clientReports";
import { cn, formatCurrency } from "@/lib/utils";

// Define color constants
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

const OBSERVATION_COLORS = {
  physicalActivity: COLORS.blue,
  cooperation: COLORS.green,
  focus: COLORS.purple,
  mood: COLORS.amber,
};

interface ClientReportsProps {
  clientId: number;
}

export function ClientReports({ clientId }: ClientReportsProps) {
  // State for date range filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Convert date range to string format for the API
  const dateRangeParams = dateRange ? {
    startDate: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    endDate: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  } : undefined;
  
  // Fetch client report data
  const reportQuery = useQuery({
    queryKey: ['/api/clients/reports/performance', clientId, dateRangeParams],
    queryFn: getClientPerformanceReport,
    refetchOnWindowFocus: false,
  });
  
  // Format report data when available
  const reportData = reportQuery.data;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Client Performance</h2>
          <p className="text-muted-foreground">
            Comprehensive overview of client progress and performance metrics
          </p>
        </div>
        <div className="flex items-center">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            showCompactDropdown={true}
            className="w-full sm:w-auto"
          />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        
        {reportQuery.isLoading ? (
          <div className="py-10 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading client performance data...</span>
          </div>
        ) : reportQuery.isError ? (
          <div className="py-10 flex justify-center items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div className="ml-3">
              <p className="font-semibold">Failed to load report data</p>
              <p className="text-sm text-muted-foreground">
                {reportQuery.error instanceof Error 
                  ? reportQuery.error.message 
                  : "An unknown error occurred"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <TabsContent value="overview" className="mt-6">
              <OverviewTab data={reportData} clientId={clientId} />
            </TabsContent>
            
            <TabsContent value="observations" className="mt-6">
              <ObservationsTab data={reportData} />
            </TabsContent>
            
            <TabsContent value="strategies" className="mt-6">
              <StrategiesTab data={reportData} clientId={clientId} dateRange={dateRangeParams} />
            </TabsContent>
            
            <TabsContent value="goals" className="mt-6">
              <GoalsTab data={reportData} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data, clientId }: { data?: ClientReportData, clientId: number }) {
  if (!data) return null;
  
  const { clientDetails, keyMetrics, observations, cancellations } = data;
  
  // Format spending deviation as percentage
  const spendingDeviation = (keyMetrics.spendingDeviation * 100).toFixed(1);
  const isOverAllocated = keyMetrics.spendingDeviation > 0;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client Details Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Client Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{clientDetails.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Age:</span>
                <span className="font-medium">{clientDetails.age} years</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Funds Management:</span>
                <span className="font-medium">{clientDetails.fundsManagement}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Allied Health Team:</span>
                <span className="font-medium">{clientDetails.allies.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Budget Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Spending Variance:</span>
                <div className="flex items-center">
                  <span className={cn(
                    "font-medium",
                    isOverAllocated ? "text-destructive" : "text-green-600"
                  )}>
                    {isOverAllocated ? "+" : ""}{spendingDeviation}%
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-2 text-muted-foreground" />
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
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan Expiration:</span>
                <div className="flex items-center">
                  <span className={cn(
                    "font-medium",
                    keyMetrics.planExpiration < 30 ? "text-destructive" : "text-green-600"
                  )}>
                    {keyMetrics.planExpiration} days
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cancellation Rate:</span>
                <div className="flex items-center">
                  <span className={cn(
                    "font-medium",
                    cancellations.waived > 20 ? "text-destructive" : "text-green-600"
                  )}>
                    {cancellations.waived}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full">
              <BarChart4 className="h-4 w-4 mr-2" />
              View Budget Details
            </Button>
          </CardFooter>
        </Card>

        {/* Observation Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Observation Summary</CardTitle>
            <CardDescription>Average scores from all sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Physical Activity:</span>
                <span className="font-medium">{observations.physicalActivity.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cooperation:</span>
                <span className="font-medium">{observations.cooperation.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Focus:</span>
                <span className="font-medium">{observations.focus.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mood:</span>
                <span className="font-medium">{observations.mood.toFixed(1)}/10</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" onClick={() => document.getElementById('observations-tab')?.click()}>
              <Calendar className="h-4 w-4 mr-2" />
              View Timeline
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Observations Tab Component
function ObservationsTab({ data }: { data?: ClientReportData }) {
  if (!data) return null;
  
  const { observations } = data;
  
  // Prepare data for radar chart
  const observationData = [
    { name: 'Physical Activity', value: observations.physicalActivity, color: OBSERVATION_COLORS.physicalActivity },
    { name: 'Cooperation', value: observations.cooperation, color: OBSERVATION_COLORS.cooperation },
    { name: 'Focus', value: observations.focus, color: OBSERVATION_COLORS.focus },
    { name: 'Mood', value: observations.mood, color: OBSERVATION_COLORS.mood },
  ];
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Observations Radar Chart */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Observation Scores</CardTitle>
            <CardDescription>Average scores across all sessions</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={observationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RechartsTooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}/10`, 'Score']}
                    labelFormatter={() => ''}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {observationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Session Breakdown */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Session Attendance</CardTitle>
            <CardDescription>Breakdown of session attendance</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: data.cancellations.completed, color: COLORS.green },
                      { name: 'Waived', value: data.cancellations.waived, color: COLORS.red },
                      { name: 'Rescheduled', value: data.cancellations.changed, color: COLORS.amber },
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
                      { name: 'Completed', value: data.cancellations.completed, color: COLORS.green },
                      { name: 'Waived', value: data.cancellations.waived, color: COLORS.red },
                      { name: 'Rescheduled', value: data.cancellations.changed, color: COLORS.amber },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => [`${value}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center text-sm text-muted-foreground">
              Total sessions: {data.cancellations.total}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Observations Detailed Analysis</CardTitle>
          <CardDescription>Complete analysis of observation patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Detailed longitudinal analysis will be available once more sessions have been recorded.
            </p>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              View All Sessions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Strategies Tab Component
function StrategiesTab({ data, clientId, dateRange }: { 
  data?: ClientReportData, 
  clientId: number,
  dateRange?: { startDate?: string, endDate?: string }
}) {
  // Fetch detailed strategies data
  const strategiesQuery = useQuery({
    queryKey: ['/api/clients/reports/strategies', clientId, dateRange],
    queryFn: getClientStrategiesReport,
    refetchOnWindowFocus: false,
  });
  
  const strategies = strategiesQuery.data?.strategies || data?.strategies.strategies || [];
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Therapy Strategies</CardTitle>
          <CardDescription>Effectiveness of applied strategies</CardDescription>
        </CardHeader>
        <CardContent>
          {!strategies.length ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No strategy data available for this period.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Strategy</th>
                      <th className="text-center py-3 px-4">Times Used</th>
                      <th className="text-center py-3 px-4">Avg. Score</th>
                      <th className="text-center py-3 px-4">Effectiveness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategies.map((strategy) => (
                      <tr key={strategy.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{strategy.name}</td>
                        <td className="py-3 px-4 text-center">{strategy.timesUsed}</td>
                        <td className="py-3 px-4 text-center">{strategy.averageScore.toFixed(1)}/10</td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center">
                            <div className="relative w-full max-w-[120px] h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "absolute left-0 top-0 bottom-0",
                                  strategy.averageScore >= 8 ? "bg-green-500" :
                                  strategy.averageScore >= 6 ? "bg-amber-500" :
                                  "bg-red-500"
                                )}
                                style={{ width: `${strategy.averageScore * 10}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Strategy Categories</CardTitle>
            <CardDescription>Distribution by therapy category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Category analysis will be available once more strategies have been applied.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Strategy Recommendations</CardTitle>
            <CardDescription>Based on current performance data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                AI-powered strategy recommendations coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Goals Tab Component
function GoalsTab({ data }: { data?: ClientReportData }) {
  if (!data) return null;
  
  const { goals } = data;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Goal Achievement Progress</CardTitle>
          <CardDescription>Performance scores across all therapy goals</CardDescription>
        </CardHeader>
        <CardContent>
          {!goals.goals.length ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No goal data available for this period.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Goal</th>
                      <th className="text-center py-3 px-4">Score</th>
                      <th className="text-left py-3 px-4">Progress</th>
                      <th className="text-center py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goals.goals.map((goal) => {
                      const progressPercentage = (goal.score / 10) * 100;
                      let status;
                      
                      if (progressPercentage >= 90) {
                        status = { label: "Achieved", color: "bg-green-100 text-green-800", icon: CheckCircle };
                      } else if (progressPercentage >= 50) {
                        status = { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: ArrowUpRight };
                      } else {
                        status = { label: "Started", color: "bg-amber-100 text-amber-800", icon: Calendar };
                      }
                      
                      return (
                        <tr key={goal.id} className="border-b">
                          <td className="py-3 px-4 font-medium">{goal.title}</td>
                          <td className="py-3 px-4 text-center">{goal.score.toFixed(1)}/10</td>
                          <td className="py-3 px-4">
                            <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "absolute left-0 top-0 bottom-0",
                                  progressPercentage >= 70 ? "bg-green-500" :
                                  progressPercentage >= 30 ? "bg-amber-500" :
                                  "bg-red-500"
                                )}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center">
                              <Badge variant="outline" className={cn("flex items-center gap-1", status.color)}>
                                <status.icon className="h-3 w-3" />
                                <span>{status.label}</span>
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Goal Milestones</CardTitle>
            <CardDescription>Progress on individual milestone achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Milestone analysis will be available soon.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Goal Recommendations</CardTitle>
            <CardDescription>Suggested adjustments based on progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                AI-powered goal recommendations coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}