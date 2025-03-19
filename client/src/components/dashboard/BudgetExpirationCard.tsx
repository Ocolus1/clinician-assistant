import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, ArrowRight } from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Budget Expiration</CardTitle>
            <CardDescription>
              Track expiring plans and remaining funds
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 flex-grow overflow-auto">
        <div className="grid grid-rows-[auto_1fr] gap-3 h-full">
          {/* Top row - Expiring plans visualization - compact height */}
          <Card className="flex flex-col">
            <CardHeader className="p-2 pb-1 flex-shrink-0">
              <CardTitle className="text-sm flex justify-between items-center">
                <span>Expiring Next Month</span>
                {expiringCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {expiringCount} Plan{expiringCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : expiringCount > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {expiringClients.map((client) => {
                    // Get values from the client data
                    const daysLeft = client.daysLeft || 30; // Use 30 days as fallback
                    const unutilizedAmount = client.unutilizedAmount || 0; 
                    const unutilizedPercentage = client.unutilizedPercentage || 0;
                    
                    return (
                      <div key={`${client.clientId}-${client.planId}`} 
                        className="flex-1 min-w-[220px] flex justify-between items-center p-2 border rounded-md bg-red-50 border-red-200">
                        <div className="overflow-hidden flex-grow">
                          <p className="font-medium text-sm truncate">
                            {client.clientName} - <span className="text-red-600">{daysLeft} days left</span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center justify-between pr-2">
                            <span className="font-medium">{formatCurrency(unutilizedAmount)}</span>
                            <span>-</span>
                            <span className="font-medium">{unutilizedPercentage}% Unutilized</span>
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setLocation(`/client/${client.clientId}/budget`)}
                          className="ml-1 flex-shrink-0"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-8 text-muted-foreground text-sm">
                  No plans expiring next month
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Bottom row - Funds visualization over time - expanded height */}
          <Card className="flex flex-col flex-grow">
            <CardHeader className="p-2 pb-1 flex-shrink-0">
              <CardTitle className="text-sm flex items-center">
                <DollarSign className="mr-1 h-4 w-4" />
                Remaining Funds (Next 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 flex-grow overflow-hidden">
              <div className="grid grid-rows-[3fr_1fr] h-full">
                {/* Main area chart */}
                <div className="w-full h-full">
                  {isLoading ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={fundsChartData} 
                        margin={{ top: 10, right: 15, left: 15, bottom: 30 }}
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
                          tick={{ fontSize: 11, fill: '#555555' }}
                          tickLine={false}
                          axisLine={false}
                          textAnchor="middle"
                          height={35}
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
                            padding: '10px',
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
                        margin={{ top: 5, right: 15, left: 15, bottom: 15 }}
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
                          height={30}
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
                            padding: '10px',
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
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}