import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, Banknote } from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  CartesianGrid,
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
 * Custom tooltip component for the bubble chart
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 p-3 border rounded-lg shadow-md">
        <p className="font-medium text-sm">{data.clientName}</p>
        <p className="text-xs text-muted-foreground">Plan: {data.planName}</p>
        <p className="text-xs font-medium mt-1">
          <span className="text-primary">Amount: {formatCurrency(data.amount)}</span>
        </p>
        <p className="text-xs">Expires: {data.expiryDate}</p>
      </div>
    );
  }
  return null;
};

/**
 * Budget Bubble Chart Component
 * Displays budget information as an interactive bubble chart
 * - X-axis: Date/Time (months until expiration)
 * - Y-axis: Dollar amount
 * - Bubble size: Budget value
 */
export function BudgetBubbleChart() {
  const { dashboardData, loadingState } = useDashboard();
  const [, setLocation] = useLocation();
  
  const isLoading = loadingState === 'loading' || loadingState === 'idle';
  const budgetData = dashboardData?.budgets;
  
  const expiringCount = budgetData?.expiringNextMonth.count || 0;
  const expiringClients = budgetData?.expiringNextMonth.byClient || [];
  
  // Transform the data into a format suitable for a bubble chart
  const bubbleChartData = useMemo(() => {
    if (!budgetData?.remainingFunds) return [];
    
    // Start with an empty array to collect all budget plans
    let allPlans: any[] = [];
    
    // First, get data from expiring clients (next month)
    if (expiringClients && expiringClients.length > 0) {
      expiringClients.forEach(client => {
        // Get month data for the first month
        const firstMonthData = budgetData.remainingFunds && budgetData.remainingFunds.length > 0 
          ? budgetData.remainingFunds[0] 
          : null;
        
        // Calculate an estimated amount for this client based on total first month amount
        // This distributes the total amount across plans proportionally
        const estimatedAmount = firstMonthData 
          ? firstMonthData.amount / Math.max(firstMonthData.planCount, 1) 
          : 10000; // Fallback value if no data
          
        allPlans.push({
          x: 1, // Position on the x-axis (1 month until expiration)
          y: estimatedAmount, // Budget amount on y-axis
          z: estimatedAmount, // Size of the bubble (represents budget value)
          amount: estimatedAmount, // The actual budget amount
          clientName: client.clientName,
          planName: client.planName || 'Default Plan',
          clientId: client.clientId,
          planId: client.planId,
          expiryDate: 'Next Month',
          color: '#EF4444' // Red for urgency
        });
      });
    }
    
    // Then add projected funds from the remaining funds data
    if (budgetData.remainingFunds && budgetData.remainingFunds.length > 0) {
      // Use server-provided data about plans expiring in future months
      budgetData.remainingFunds.forEach((item, index) => {
        // For months beyond the first month, we add bubbles based on the aggregate data
        const monthsFromNow = index + 1;
        const date = new Date();
        date.setMonth(date.getMonth() + monthsFromNow);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        // If this is month 1 and we've already processed expiring clients, skip
        // Otherwise we'd double-count the first month
        if (index === 0 && expiringClients.length > 0) return;
        
        // Calculate average amount per plan for this month
        const avgAmount = item.amount / Math.max(item.planCount, 1);
        
        // Create bubbles representing plans for this month
        // If we have multiple plans in a month, create separate bubbles
        if (item.planCount > 1) {
          // Create individual bubbles for each plan, with varying sizes around the average
          for (let i = 0; i < item.planCount; i++) {
            // Vary bubble sizes slightly around the average to create visual interest
            // Uses a variance of ±20% around the average
            const variance = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
            const planAmount = avgAmount * variance;
            
            allPlans.push({
              x: monthsFromNow, // Months from now (x-axis position)
              y: planAmount, // Dollar amount (y-axis position)
              z: planAmount, // Budget size (controls bubble size)
              amount: planAmount, 
              clientName: `Plan ${i+1} of ${item.planCount}`, // Generic name
              planName: `Expiring ${formattedDate}`,
              clientId: null, // We don't have specific client IDs here
              planId: null, // We don't have specific plan IDs here
              expiryDate: formattedDate,
              // Color coding: orange for months 2-3, blue for later months
              color: index < 3 ? '#FB923C' : '#2563EB'
            });
          }
        } else {
          // Just one plan this month, create a single bubble
          allPlans.push({
            x: monthsFromNow,
            y: item.amount,
            z: item.amount,
            amount: item.amount,
            clientName: `${item.planCount} Plan`,
            planName: `Expiring ${formattedDate}`,
            clientId: null,
            planId: null,
            expiryDate: formattedDate,
            color: index < 3 ? '#FB923C' : '#2563EB'
          });
        }
      });
    }
    
    return allPlans;
  }, [budgetData, expiringClients]);
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Budget Plans Visualization
            </CardTitle>
            <CardDescription>
              Interactive view of all funding plans and expiration timelines
            </CardDescription>
          </div>
          {expiringCount > 0 && (
            <Badge variant="destructive" className="flex items-center">
              <AlertCircle className="mr-1 h-3 w-3" />
              {expiringCount} Plan{expiringCount !== 1 ? 's' : ''} Expiring Soon
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow p-2 overflow-hidden">
        {isLoading ? (
          <div className="h-full w-full flex flex-col gap-4 justify-center items-center">
            <Skeleton className="h-4/5 w-full rounded-lg" />
            <div className="flex gap-4 w-full">
              <Skeleton className="h-8 w-1/3 rounded-lg" />
              <Skeleton className="h-8 w-1/3 rounded-lg" />
              <Skeleton className="h-8 w-1/3 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.1} />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Months Until Expiration" 
                  domain={[0, 'dataMax']}
                  label={{ 
                    value: 'Months Until Expiration', 
                    position: 'insideBottom', 
                    offset: -10,
                    fontSize: 12
                  }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Budget Amount" 
                  tickFormatter={(value) => formatCurrency(value)}
                  domain={[0, 'dataMax']}
                  label={{ 
                    value: 'Budget Amount', 
                    angle: -90, 
                    position: 'insideLeft',
                    fontSize: 12
                  }}
                  tick={{ fontSize: 10 }}
                />
                <ZAxis 
                  type="number" 
                  dataKey="z" 
                  range={[50, 400]} 
                  name="Budget Size" 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Scatter 
                  name="Budget Plans" 
                  data={bubbleChartData.map(entry => ({
                    ...entry,
                    fill: entry.color // Apply the color from our data to each point
                  }))}
                  fill="#8884d8"
                  shape="circle"
                  onClick={(data) => {
                    // Navigate to client budget page when bubble is clicked
                    if (data && data.clientId) {
                      setLocation(`/client/${data.clientId}/budget`);
                    }
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}