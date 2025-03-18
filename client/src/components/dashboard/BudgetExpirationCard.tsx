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
  
  // Prepare data for the funds chart
  const fundsChartData = budgetData?.remainingFunds || [];
  
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
          {expiringCount > 0 && (
            <Badge variant="destructive" className="flex items-center">
              <AlertCircle className="mr-1 h-3 w-3" />
              {expiringCount} Plan{expiringCount !== 1 ? 's' : ''} Expiring
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-2 flex-grow overflow-auto">
        <div className="grid grid-rows-2 gap-3 h-full">
          {/* Top row - Expiring plans and total funds visualization */}
          <Card className="flex flex-col">
            <CardHeader className="p-2 pb-1 flex-shrink-0">
              <CardTitle className="text-sm">Expiring Next Month</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 flex-grow overflow-auto">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : expiringCount > 0 ? (
                <div className="space-y-2 overflow-auto pr-1 max-h-24">
                  {expiringClients.map((client) => (
                    <div key={`${client.clientId}-${client.planId}`} 
                      className="flex justify-between items-center p-2 border rounded-md bg-red-50 border-red-200">
                      <div>
                        <p className="font-medium text-sm">{client.clientName}</p>
                        <p className="text-xs text-muted-foreground">Plan: {client.planName}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setLocation(`/client/${client.clientId}/budget`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-16 text-muted-foreground">
                  No plans expiring next month
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Bottom row - Funds visualization over time */}
          <Card className="flex flex-col">
            <CardHeader className="p-2 pb-1 flex-shrink-0">
              <CardTitle className="text-sm flex items-center">
                <DollarSign className="mr-1 h-4 w-4" />
                Remaining Funds (Next 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 flex-grow overflow-hidden">
              <div className="h-3/4">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={fundsChartData}
                      margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                    >
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value)}
                        tick={{ fontSize: 10 }}
                        width={60}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(Number(value))}
                        labelFormatter={(value) => `Month: ${value}`}
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
              <div className="h-1/4">
                {!isLoading && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={fundsChartData}
                      margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                    >
                      <XAxis 
                        dataKey="month"
                        tick={{ fontSize: 8 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        hide={true}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="planCount"
                        name="Active Plans"
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
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}