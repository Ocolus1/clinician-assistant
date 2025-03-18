import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
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
 * 
 * Displays information about expiring budget plans and remaining funds
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

  return (
    <Card>
      <CardHeader>
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
      
      <CardContent>
        {/* Expiring plans section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center">
            <Calendar className="mr-1 h-4 w-4" />
            Expiring Next Month
          </h3>
          
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : expiringCount > 0 ? (
            <div className="space-y-2">
              {expiringClients.map((client) => (
                <div key={`${client.clientId}-${client.planId}`} className="flex justify-between items-center p-2 border rounded-md">
                  <div>
                    <p className="font-medium">{client.clientName}</p>
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
            <div className="text-center py-4 text-muted-foreground">
              No plans expiring next month
            </div>
          )}
        </div>
        
        {/* Remaining funds chart */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center">
            <DollarSign className="mr-1 h-4 w-4" />
            Remaining Funds Forecast
          </h3>
          
          <div className="h-64">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={fundsChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end"
                    height={40}
                    minTickGap={10}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                    labelFormatter={(value) => `Month: ${value}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Remaining Funds"
                    stroke="#2563EB"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Active plans bar chart */}
          <div className="h-40 mt-4">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
              Active Plans by Month
            </h3>
            
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={fundsChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
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
                  <Bar
                    dataKey="planCount"
                    name="Active Plans"
                    fill="#4ADE80"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}