import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboard } from './DashboardProvider';
import { useLocation } from 'wouter';
import { BudgetExpirationTimeline } from './BudgetExpirationTimeline';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

/**
 * Helper function to format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Budget Expiration Card Component
 * Displays information about expiring budget plans and remaining funds
 * Redesigned to fit in the fixed dashboard layout
 */
export function BudgetExpirationCard() {
  const { dashboardData, loadingState } = useDashboard();
  const [, setLocation] = useLocation();
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  
  const isLoading = loadingState === 'loading' || loadingState === 'idle';
  const budgetData = dashboardData?.budgets;
  
  const expiringCount = budgetData?.expiringNextMonth.count || 0;
  const expiringClients = budgetData?.expiringNextMonth.byClient || [];
  
  // Prepare data for the funds chart, starting from current month (March 2025)
  let fundsChartData = budgetData?.remainingFunds || [];
  
  // Hard-code March 2025 as the starting month for this demo
  const startingYear = 2025;
  const startingMonth = 3; // March = 3 (1-indexed)
  
  // Transform the monthly data into daily data for more precise hovering
  let dailyFundsData: Array<{
    date: string;  // Format: YYYY-MM-DD
    amount: number;
    planCount: number;
    month: string;  // Keep the original month format for backward compatibility
  }> = [];
  
  // Ensure data starts from March 2025 (for this demo)
  if (fundsChartData.length > 0) {
    // Format the starting month as "2025-03"
    const startMonthFormat = `${startingYear}-${startingMonth.toString().padStart(2, '0')}`;
    
    // Original data is in YYYY-MM format, we need to find March 2025 or use all data
    const dataWithMarch = [...fundsChartData]; // Make a copy to avoid modifying original
    
    // Create daily data points for each month
    dataWithMarch.forEach(monthData => {
      const [year, month] = monthData.month.split('-');
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      // Only include months starting from March 2025
      if (yearNum > startingYear || (yearNum === startingYear && monthNum >= startingMonth)) {
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        
        // For each day in the month, create a data point
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
          dailyFundsData.push({
            date: dateStr,
            amount: monthData.amount,
            planCount: monthData.planCount,
            month: monthData.month
          });
        }
      }
    });
    
    // Filter the funds chart data to start from March 2025
    fundsChartData = fundsChartData.filter(item => {
      const [year, month] = item.month.split('-');
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      return yearNum > startingYear || (yearNum === startingYear && monthNum >= startingMonth);
    });
    
    // Limit to 6 months to avoid label crowding
    if (fundsChartData.length > 6) {
      fundsChartData = fundsChartData.slice(0, 6);
    }
  }
  
  // Colors for bar chart
  const COLORS = ['#16A34A', '#2563EB', '#EA580C', '#8B5CF6', '#EC4899', '#6B7280'];

  // Prepare summary statistics
  const totalFundsAtRisk = expiringClients.reduce((sum, client) => sum + (client.unutilizedAmount || 0), 0);
  
  // Group clients by urgency
  const criticalClients = expiringClients.filter(client => (client.daysLeft || 30) <= 7);
  const urgentClients = expiringClients.filter(client => (client.daysLeft || 30) > 7 && (client.daysLeft || 30) <= 14);
  const monitoringClients = expiringClients.filter(client => (client.daysLeft || 30) > 14);
  
  // Generate timeline data
  const timelineData = expiringClients.map(client => {
    const daysLeft = client.daysLeft || 30;
    const unutilizedAmount = client.unutilizedAmount || 0;
    const unutilizedPercentage = client.unutilizedPercentage || 0;
    
    // Calculate urgency category and color
    let urgencyCategory = 'monitoring';
    let colorIntensity = 0.2;
    
    if (daysLeft <= 7) {
      urgencyCategory = 'critical';
      colorIntensity = 1;
    } else if (daysLeft <= 14) {
      urgencyCategory = 'urgent';
      colorIntensity = 0.6;
    }
    
    return {
      ...client,
      daysLeft,
      unutilizedAmount,
      unutilizedPercentage,
      urgencyCategory,
      colorIntensity
    };
  });

  return (
    <Card className="h-full flex flex-col">
      {/* We keep the main card header */}
      <CardHeader className="pb-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Budget Expiration</CardTitle>
            <CardDescription>
              Track expiring plans and remaining funds
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-1 flex-grow overflow-auto">
        <div className={`grid ${isTimelineExpanded ? 'grid-rows-[auto_1fr]' : 'grid-rows-[1fr_auto]'} gap-2 h-full`}>
          {/* First section - Funds visualization over time */}
          <Card className={`flex flex-col ${isTimelineExpanded ? '' : 'flex-grow'}`}>
            <CardHeader className="p-1 pb-0 flex-shrink-0">
              <CardTitle className="text-sm flex items-center">
                <DollarSign className="mr-1 h-4 w-4" />
                Remaining Funds (Next 6 Months)
              </CardTitle>
            </CardHeader>
            
            {/* Show full or compact view based on isTimelineExpanded */}
            {!isTimelineExpanded ? (
              // Full view of the area chart when timeline is not expanded
              <CardContent className="p-1 pt-0 flex-grow overflow-hidden">
                <div className="grid grid-rows-[3fr_1fr] gap-1 h-full">
                  {/* Main area chart */}
                  <div className="w-full h-full">
                    {isLoading ? (
                      <Skeleton className="w-full h-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={fundsChartData} 
                          margin={{ top: 5, right: 10, left: 10, bottom: 20 }}
                          barCategoryGap={10}
                          barGap={3}
                        >
                          <XAxis 
                            dataKey="month"
                            tickFormatter={(value) => {
                              if (!value || typeof value !== 'string') return '';
                              
                              try {
                                // Just extract year and month from YYYY-MM format
                                const [year, month] = value.split('-');
                                
                                // Use short month names without year to save space
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return monthNames[parseInt(month) - 1];
                              } catch (e) {
                                return value;
                              }
                            }}
                            tick={{ fontSize: 10, fill: '#555555' }}
                            tickLine={false}
                            axisLine={false}
                            textAnchor="middle"
                            height={30}
                            interval={0} // Ensures all labels are displayed
                          />
                          <YAxis 
                            hide={true}
                          />
                          <Tooltip 
                            formatter={(value) => formatCurrency(Number(value))}
                            labelFormatter={(value) => {
                              // Check if we have a daily date (YYYY-MM-DD) or monthly (YYYY-MM)
                              const parts = value.split('-');
                              if (parts.length === 3) {
                                // Daily format
                                const [year, month, day] = parts;
                                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                return date.toLocaleDateString('en-US', { 
                                  month: 'long',
                                  day: 'numeric', 
                                  year: 'numeric' 
                                });
                              } else {
                                // Monthly format
                                const [year, month] = parts;
                                const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                                return date.toLocaleDateString('en-US', { 
                                  month: 'long',
                                  year: 'numeric' 
                                });
                              }
                            }}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '8px',
                              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                            }}
                            itemStyle={{ color: '#2563EB' }}
                            cursor={{ stroke: '#2563EB', strokeWidth: 1, strokeDasharray: '5 5' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            name="Remaining Funds"
                            stroke="#2563EB"
                            fill="#2563EB"
                            fillOpacity={0.2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  
                  {/* Plan counts as small bar chart */}
                  <div className="w-full">
                    {!isLoading && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={fundsChartData}
                          margin={{ top: 0, right: 10, left: 10, bottom: 15 }}
                          barCategoryGap={20}
                          barGap={5}
                        >
                          <XAxis 
                            dataKey="month"
                            tickFormatter={(value) => {
                              if (!value || typeof value !== 'string') return '';
                              
                              try {
                                // Just extract year and month from YYYY-MM format
                                const [year, month] = value.split('-');
                                
                                // Use short month names with year
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return monthNames[parseInt(month) - 1] + ' ' + year;
                              } catch (e) {
                                return value;
                              }
                            }}
                            tick={{ fontSize: 9, fill: '#555555' }}
                            tickLine={false}
                            axisLine={false}
                            height={25}
                            textAnchor="middle"
                            interval={0} // Ensures all labels are displayed
                          />
                          <YAxis 
                            hide={true}
                          />
                          <Tooltip 
                            labelFormatter={(value) => {
                              const [year, month] = value.split('-');
                              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                              return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                            }}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '8px',
                              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                            }}
                            cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '5 5' }}
                          />
                          <Bar
                            dataKey="planCount"
                            name="Expiring Plans"
                            radius={[2, 2, 0, 0]}
                          >
                            {fundsChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </CardContent>
            ) : (
              // Compact summary when timeline is expanded
              <CardContent className="p-1 pt-0">
                {isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Total remaining: {formatCurrency(fundsChartData.reduce((sum, item) => sum + item.amount, 0))}</p>
                      <p className="text-xs text-muted-foreground">Across {fundsChartData.reduce((sum, item) => sum + item.planCount, 0)} plans</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Expiring soon: {formatCurrency(totalFundsAtRisk)}</p>
                      <p className="text-xs text-muted-foreground">{expiringCount} plan{expiringCount !== 1 ? 's' : ''} expiring next month</p>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
          
          {/* Second section - Expiring plans visualization */}
          <Card className={`flex flex-col ${isTimelineExpanded ? 'flex-grow' : ''}`}>
            <CardHeader className="p-1 pb-0 flex-shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm flex items-center">
                  <span>Expiring Next Month</span>
                  {expiringCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {expiringCount} Plan{expiringCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                
                {/* Toggle button to expand/collapse */}
                {expiringCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                    className="h-6 w-6 p-0"
                  >
                    {isTimelineExpanded ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-1 pt-1">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : expiringCount > 0 ? (
                isTimelineExpanded ? (
                  // Full timeline when expanded
                  <BudgetExpirationTimeline 
                    clients={expiringClients}
                    maxDays={30}
                    showStatistics={true}
                    showHeader={true}
                    compact={false}
                  />
                ) : (
                  // Compact summary when not expanded
                  <div className="space-y-1">
                    {criticalClients.length > 0 && (
                      <div 
                        className="flex justify-between items-center p-1.5 bg-red-50 border border-red-200 rounded cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => setIsTimelineExpanded(true)}
                      >
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-red-600 mr-2"></div>
                          <span className="text-sm font-medium">{criticalClients.length} critical</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{formatCurrency(criticalClients.reduce((sum, c) => sum + (c.unutilizedAmount || 0), 0))}</span>
                        </div>
                      </div>
                    )}
                    
                    {urgentClients.length > 0 && (
                      <div 
                        className="flex justify-between items-center p-1.5 bg-amber-50 border border-amber-200 rounded cursor-pointer hover:bg-amber-100 transition-colors"
                        onClick={() => setIsTimelineExpanded(true)}
                      >
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-amber-500 mr-2"></div>
                          <span className="text-sm font-medium">{urgentClients.length} urgent</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{formatCurrency(urgentClients.reduce((sum, c) => sum + (c.unutilizedAmount || 0), 0))}</span>
                        </div>
                      </div>
                    )}
                    
                    {monitoringClients.length > 0 && (
                      <div 
                        className="flex justify-between items-center p-1.5 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setIsTimelineExpanded(true)}
                      >
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-blue-400 mr-2"></div>
                          <span className="text-sm font-medium">{monitoringClients.length} monitoring</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{formatCurrency(monitoringClients.reduce((sum, c) => sum + (c.unutilizedAmount || 0), 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-8 text-muted-foreground text-sm">
                  No plans expiring next month
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}