import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, DownloadIcon, LineChartIcon, PieChartIcon } from "lucide-react";
import { useParams } from "wouter";
import { format, formatDistanceToNow, subMonths } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DateRange } from "react-day-picker";

import { ClientReportData, getClientPerformanceReport, getClientStrategiesReport } from "@/lib/api/clientReports";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";

/**
 * Client Reports Component
 * 
 * Displays detailed client performance reports with visualizations of:
 * - Client demographic information and metrics
 * - Therapy session observations over time
 * - Strategy usage and effectiveness
 * - Goal achievement scores
 * - Budget deviation and expiration info
 */
export default function ClientReports() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id);
  
  // Date range state for filtering report data
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Current view tab
  const [currentTab, setCurrentTab] = useState<string>("overview");
  
  // Fetch client report data
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['/api/clients', clientId, 'reports/performance', dateRange?.from, dateRange?.to],
    queryFn: () => getClientPerformanceReport(`/api/clients/${clientId}/reports/performance`, {
      startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
    }),
    enabled: !!clientId
  });
  
  // Helper function to clear date range
  const clearDateRange = () => setDateRange(undefined);
  
  // Helper function to set date range to last 3 months
  const setLastThreeMonths = () => {
    const today = new Date();
    setDateRange({
      from: subMonths(today, 3),
      to: today
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Client Reports</h2>
          <div className="animate-pulse w-64 h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-40 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col p-4 space-y-4">
        <h2 className="text-2xl font-bold">Client Reports</h2>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-500">Error Loading Report Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading the report data. Please try again later.</p>
            <p className="text-sm text-gray-500 mt-2">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!report) {
    return (
      <div className="flex flex-col p-4 space-y-4">
        <h2 className="text-2xl font-bold">Client Reports</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>No Report Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There is no report data available for this client yet. Add session data to generate reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Prepare data for charts
  const observationData = [
    { name: 'Physical Activity', value: report.observations.physicalActivity * 10 },
    { name: 'Cooperation', value: report.observations.cooperation * 10 },
    { name: 'Focus', value: report.observations.focus * 10 },
    { name: 'Mood', value: report.observations.mood * 10 },
  ];
  
  const strategyData = report.strategies.strategies
    .slice(0, 5) // Take top 5 strategies
    .map(strategy => ({
      name: strategy.name,
      count: strategy.timesUsed,
      score: strategy.averageScore * 2 // Convert to 10-point scale
    }));
  
  const goalData = report.goals.goals
    .slice(0, 5) // Take top 5 goals
    .map(goal => ({
      name: goal.title.length > 20 ? goal.title.substring(0, 20) + '...' : goal.title,
      score: goal.score
    }));
  
  const sessionData = [
    { name: 'Completed', value: report.cancellations.completed },
    { name: 'Waived', value: report.cancellations.waived },
    { name: 'Changed', value: report.cancellations.changed },
  ];
  
  const CHART_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#facc15', '#14b8a6'];
  
  return (
    <div className="flex flex-col space-y-4 p-4">
      {/* Header with date filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <h2 className="text-2xl font-bold">Client Performance Report</h2>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <DatePickerWithRange value={dateRange} onChange={setDateRange} />
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={clearDateRange}>
              All Time
            </Button>
            <Button size="sm" variant="outline" onClick={setLastThreeMonths}>
              Last 3 Months
            </Button>
            <Button size="sm" variant="outline">
              <DownloadIcon className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>
      
      {/* Report content tabs */}
      <Tabs defaultValue="overview" value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Client Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between">
                <span>{report.clientDetails.name}</span>
                <span className="text-gray-500 text-sm">
                  {dateRange ? 
                    `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}` : 
                    'Lifetime Data'}
                </span>
              </CardTitle>
              <CardDescription>
                Age: {report.clientDetails.age} | Funds Management: {report.clientDetails.fundsManagement}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Budget Status</h3>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Plan Expires:</span>
                    <span className={report.keyMetrics.planExpiration < 30 ? "text-red-500 font-bold" : ""}>
                      {report.keyMetrics.planExpiration} days
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Budget Deviation:</span>
                    <span className={report.keyMetrics.spendingDeviation > 0 ? "text-red-500" : "text-green-500"}>
                      {formatCurrency(report.keyMetrics.spendingDeviation)}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Session Stats</h3>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Sessions:</span>
                    <span>{report.cancellations.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completion Rate:</span>
                    <span>{Math.round(report.cancellations.completed)}%</span>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="text-sm font-medium mb-2">Allies</h3>
                <div className="space-y-2">
                  {report.clientDetails.allies.map((ally, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{ally.name} ({ally.relationship})</span>
                      <span>{ally.preferredLanguage}</span>
                    </div>
                  ))}
                  {report.clientDetails.allies.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No allies recorded</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Physical & Cooperation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Physical Activity</CardTitle>
                <CardDescription>Average rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{report.observations.physicalActivity.toFixed(1)}</div>
                <Progress value={report.observations.physicalActivity * 20} className="h-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cooperation</CardTitle>
                <CardDescription>Average rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{report.observations.cooperation.toFixed(1)}</div>
                <Progress value={report.observations.cooperation * 20} className="h-2" />
              </CardContent>
            </Card>
            
            {/* Focus & Mood */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Focus</CardTitle>
                <CardDescription>Average rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{report.observations.focus.toFixed(1)}</div>
                <Progress value={report.observations.focus * 20} className="h-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mood</CardTitle>
                <CardDescription>Average rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{report.observations.mood.toFixed(1)}</div>
                <Progress value={report.observations.mood * 20} className="h-2" />
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strategies Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between">
                  <span>Strategy Usage</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCurrentTab("strategies")}
                    className="h-6 px-2 text-xs"
                  >
                    View Details
                  </Button>
                </CardTitle>
                <CardDescription>Top strategies by usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={strategyData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value, name) => [`${value} uses`, name]}
                        labelFormatter={() => ''}
                      />
                      <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Goals Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between">
                  <span>Goal Progress</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCurrentTab("goals")}
                    className="h-6 px-2 text-xs"
                  >
                    View Details
                  </Button>
                </CardTitle>
                <CardDescription>Goal achievement scores (0-10)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={goalData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 10]} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value, name) => [`Score: ${value}/10`, name]}
                        labelFormatter={() => ''}
                      />
                      <Bar dataKey="score" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Observations Tab */}
        <TabsContent value="observations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Observations</CardTitle>
              <CardDescription>
                Average ratings from session notes {dateRange ? `(${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')})` : '(All Time)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {observationData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm">{(item.value / 10).toFixed(1)}/5</span>
                      </div>
                      <Progress value={item.value} className="h-2" />
                      <p className="text-sm text-gray-500 italic">
                        {getObservationDescription(item.name, item.value / 10)}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Radar or Spider Chart */}
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={observationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${(value / 10).toFixed(1)}`}
                      >
                        {observationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [(value / 10).toFixed(1)]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Session Status Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-base text-center">Completed</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 text-center">
                      <div className="text-3xl font-bold">{Math.round(report.cancellations.completed)}%</div>
                      <p className="text-sm text-gray-500">
                        {Math.round(report.cancellations.completed * report.cancellations.total / 100)} sessions
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-base text-center">Waived</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 text-center">
                      <div className="text-3xl font-bold">{Math.round(report.cancellations.waived)}%</div>
                      <p className="text-sm text-gray-500">
                        {Math.round(report.cancellations.waived * report.cancellations.total / 100)} sessions
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-base text-center">Changed</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 text-center">
                      <div className="text-3xl font-bold">{Math.round(report.cancellations.changed)}%</div>
                      <p className="text-sm text-gray-500">
                        {Math.round(report.cancellations.changed * report.cancellations.total / 100)} sessions
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sessionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${Math.round(value)}%`}
                      >
                        {sessionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#22c55e', '#f97316', '#64748b'][index]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${Math.round(value)}%`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Effectiveness</CardTitle>
              <CardDescription>
                Strategy usage and effectiveness scores {dateRange ? `(${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')})` : '(All Time)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Strategy</th>
                      <th className="text-center py-2 px-4">Times Used</th>
                      <th className="text-center py-2 px-4">Effectiveness</th>
                      <th className="text-center py-2 px-4">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.strategies.strategies.map((strategy, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium">{strategy.name}</td>
                        <td className="py-2 px-4 text-center">{strategy.timesUsed}</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-center">
                            <Progress 
                              value={strategy.averageScore * 20} 
                              className="h-2 w-32"
                              style={{ backgroundColor: "#e5e7eb" }}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4 text-center font-medium">
                          {strategy.averageScore.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                    {report.strategies.strategies.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500 italic">
                          No strategy data available for this time period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {report.strategies.strategies.length > 0 && (
                <>
                  <Separator className="my-6" />
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Strategy Visualization</h3>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={report.strategies.strategies.map(s => ({
                            name: s.name.length > 25 ? s.name.substring(0, 25) + '...' : s.name,
                            count: s.timesUsed,
                            score: s.averageScore
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis yAxisId="left" orientation="left" stroke="#2563eb" />
                          <YAxis yAxisId="right" orientation="right" stroke="#7c3aed" domain={[0, 5]} />
                          <RechartsTooltip
                            formatter={(value, name) => {
                              if (name === 'count') return [`${value} uses`, 'Frequency'];
                              if (name === 'score') return [`${value.toFixed(1)}/5`, 'Effectiveness'];
                              return [value, name];
                            }}
                          />
                          <Bar yAxisId="left" dataKey="count" name="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          <Bar yAxisId="right" dataKey="score" name="score" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Goal Achievement</CardTitle>
              <CardDescription>
                Goal progress scores {dateRange ? `(${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')})` : '(All Time)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Goal</th>
                      <th className="text-center py-2 px-4">Progress</th>
                      <th className="text-center py-2 px-4">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.goals.goals.map((goal, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium">{goal.title}</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-center">
                            <Progress 
                              value={goal.score * 10} 
                              className="h-2 w-48"
                              style={{ backgroundColor: "#e5e7eb" }}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4 text-center font-medium">
                          {goal.score.toFixed(1)}/10
                        </td>
                      </tr>
                    ))}
                    {report.goals.goals.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-500 italic">
                          No goal data available for this time period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {report.goals.goals.length > 0 && (
                <>
                  <Separator className="my-6" />
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Goal Progress Visualization</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={report.goals.goals.map(g => ({
                            name: g.title.length > 30 ? g.title.substring(0, 30) + '...' : g.title,
                            score: g.score
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" domain={[0, 10]} />
                          <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                          <RechartsTooltip
                            formatter={(value) => [`${value.toFixed(1)}/10`, 'Progress Score']}
                            labelFormatter={(value) => value}
                          />
                          <Bar dataKey="score" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to get observation descriptions based on score
function getObservationDescription(type: string, score: number): string {
  if (score <= 1) {
    switch(type) {
      case 'Physical Activity': return 'Very limited movement and engagement with activities';
      case 'Cooperation': return 'Significant resistance to participation in therapy activities';
      case 'Focus': return 'Extremely difficult to maintain attention on tasks';
      case 'Mood': return 'Consistently negative mood affecting participation';
      default: return 'Significant challenges observed';
    }
  } else if (score <= 2.5) {
    switch(type) {
      case 'Physical Activity': return 'Some engagement but limited sustained activity';
      case 'Cooperation': return 'Occasional participation with prompting';
      case 'Focus': return 'Frequently distracted, needs redirection';
      case 'Mood': return 'Variable mood, mostly neutral to negative';
      default: return 'Some challenges observed';
    }
  } else if (score <= 3.5) {
    switch(type) {
      case 'Physical Activity': return 'Generally participates in activities with prompting';
      case 'Cooperation': return 'Usually follows instructions with occasional redirection';
      case 'Focus': return 'Average attention span for age, occasional redirection needed';
      case 'Mood': return 'Generally neutral to positive mood during sessions';
      default: return 'Average performance observed';
    }
  } else if (score <= 4.5) {
    switch(type) {
      case 'Physical Activity': return 'Good participation and engagement in physical activities';
      case 'Cooperation': return 'Consistently follows instructions with minimal prompting';
      case 'Focus': return 'Maintains attention well with minimal redirection';
      case 'Mood': return 'Consistently positive mood during sessions';
      default: return 'Good performance observed';
    }
  } else {
    switch(type) {
      case 'Physical Activity': return 'Excellent engagement and participation in all activities';
      case 'Cooperation': return 'Exceptional cooperation without prompting';
      case 'Focus': return 'Superior attention span and task focus';
      case 'Mood': return 'Extremely positive and engaged throughout sessions';
      default: return 'Excellent performance observed';
    }
  }
}