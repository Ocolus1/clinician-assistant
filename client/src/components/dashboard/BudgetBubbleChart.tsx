import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, Banknote, Hourglass, CalendarRange, Filter, CircleDollarSign } from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
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
  Cell,
  ReferenceLine,
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

// Priorities for plans with time-based coloring
type BudgetPriority = 'critical' | 'urgent' | 'upcoming' | 'future';

// Define color constants for consistent usage
const PRIORITY_COLORS = {
  critical: '#EF4444', // Red - expiring this month
  urgent: '#F97316',   // Orange - expiring in 2-3 months
  upcoming: '#3B82F6', // Blue - expiring in 4-6 months
  future: '#14B8A6',   // Teal - expiring beyond 6 months
};

// Function to determine the priority based on months until expiration
function getPriorityFromMonths(months: number): BudgetPriority {
  if (months <= 1) return 'critical';
  if (months <= 3) return 'urgent';
  if (months <= 6) return 'upcoming';
  return 'future';
}

/**
 * Custom tooltip component for the bubble chart
 * Enhanced to show more detailed information about budget plans
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const priorityLabel = data.priority === 'critical' ? 'Critical' :
                         data.priority === 'urgent' ? 'Urgent' :
                         data.priority === 'upcoming' ? 'Upcoming' : 'Future';
    
    return (
      <div className="bg-background/95 p-3 border rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{data.clientName}</p>
          <Badge 
            style={{ backgroundColor: data.color, color: '#fff' }}
            className="text-[10px] h-5 ml-2"
          >
            {priorityLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Plan: {data.planName}</p>
        <p className="text-xs font-medium mt-1">
          <span className="text-primary">Balance: {formatCurrency(data.amount)}</span>
        </p>
        {data.dayOfMonth && (
          <p className="text-xs">Day: {data.dayOfMonth}</p>
        )}
        <p className="text-xs">Expires: {data.expiryMonth}</p>
        <p className="text-xs mt-2 text-muted-foreground">
          <span className="inline-flex items-center">
            <CalendarRange className="h-3 w-3 mr-1 opacity-70" />
            {data.expiryDate}
          </span>
        </p>
        {data.x !== undefined && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Position: {data.x.toFixed(2)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Types of view modes for the chart
type ViewMode = 'all' | 'critical' | 'urgent' | 'future';

// Data visualization methods
type VisualizationMethod = 'bubble' | 'scatter';

/**
 * Budget Bubble Chart Component
 * 
 * ENHANCED VISUALIZATION:
 * - X-axis: Calendar months (Mar 2025, Apr 2025, etc.)
 * - Bubble size: Represents budget amount ($1000 as base unit)
 * - Y-axis: Vertical jitter to prevent overlap
 * - Color coding: Maintains existing priority colors
 */
export function BudgetBubbleChart() {
  const { dashboardData, loadingState, dataSource } = useDashboard();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [visualization, setVisualization] = useState<VisualizationMethod>('bubble');
  
  const isLoading = loadingState === 'loading' || loadingState === 'idle';
  const budgetData = dashboardData?.budgets;
  
  const expiringCount = budgetData?.expiringNextMonth.count || 0;
  const expiringClients = budgetData?.expiringNextMonth.byClient || [];
  
  // Constants for chart visualization
  const BUBBLE_SIZE_UNIT = 1000; // $1000 maps to 1 size unit
  const BASE_SIZE = 30; // Base size for $1000 (in pixels) - doubled from 15px to 30px
  const MIN_BUBBLE_SIZE = BASE_SIZE; // Minimum size (for budgets under $1000)
  const MAX_BUBBLE_SIZE = BASE_SIZE * 10; // Maximum size (for budgets over $10,000)
  const JITTER_RANGE = 300; // Range for vertical jitter to prevent overlap
  
  // Day positioning constants (using a continuous day-based timeline)
  const DAY_UNIT = 1; // 1 day = 1 unit on x-axis
  const DAYS_PER_MONTH = 30; // Average days per month for visualization
  
  // Generate month labels for X-axis (next 6 months)
  const monthLabels = useMemo(() => {
    const labels = [];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(now);
      date.setMonth(now.getMonth() + i);
      labels.push({
        value: i,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }
    
    return labels;
  }, []);
  
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
        const estimatedAmount = firstMonthData 
          ? firstMonthData.amount / Math.max(firstMonthData.planCount, 1) 
          : 10000; // Fallback value if no data
        
        const priority: BudgetPriority = 'critical';
        
        // Calculate bubble size based on amount with min/max constraints
        // $1000 = 1 size unit (BASE_SIZE)
        // Sizes are directly proportional to dollar amounts
        // Under $1000 = min size, Over $10,000 = max size
        const sizeUnits = Math.min(10, Math.max(1, Math.floor(estimatedAmount / BUBBLE_SIZE_UNIT)));
        const bubbleSize = BASE_SIZE * sizeUnits;
        
        // Apply vertical jitter to prevent overlap
        const jitter = Math.random() * JITTER_RANGE;
        
        // Current month's formatted name
        const now = new Date();
        const monthName = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        allPlans.push({
          x: 0, // Position on the x-axis (first month)
          y: jitter, // Random vertical position for jitter
          z: bubbleSize, // Size of the bubble (represents budget value)
          amount: estimatedAmount, // The actual budget amount
          clientName: client.clientName,
          planName: client.planName || 'Default Plan',
          clientId: client.clientId,
          planId: client.planId,
          expiryMonth: monthName,
          expiryDate: 'This month',
          priority,
          color: PRIORITY_COLORS[priority],
        });
      });
    }
    
    // Then add projected funds from the remaining funds data
    if (budgetData.remainingFunds && budgetData.remainingFunds.length > 0) {
      // Use server-provided data about plans expiring in future months
      budgetData.remainingFunds.forEach((item, index) => {
        // Skip if beyond our 6-month display window
        if (index >= 6) return;
        
        // Get month name for this data point
        const date = new Date();
        date.setMonth(date.getMonth() + index);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const formattedDate = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        // If this is month 0 and we've already processed expiring clients, skip
        // Otherwise we'd double-count the first month
        if (index === 0 && expiringClients.length > 0) return;
        
        // Determine priority based on timeline
        const priority = getPriorityFromMonths(index + 1);
        
        // Calculate average amount per plan for this month
        const avgAmount = item.amount / Math.max(item.planCount, 1);
        
        // Create bubbles representing plans for this month
        // If we have multiple plans in a month, create separate bubbles
        if (item.planCount > 1) {
          // Create individual bubbles for each plan
          for (let i = 0; i < item.planCount; i++) {
            // Vary bubble sizes slightly around the average to create visual interest
            // Uses a variance of ±20% around the average
            const variance = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
            const planAmount = avgAmount * variance;
            
            // Calculate bubble size based on amount
            // $1000 = 1 size unit (BASE_SIZE)
            // Sizes are directly proportional to dollar amounts
            const sizeUnits = Math.min(10, Math.max(1, Math.floor(planAmount / BUBBLE_SIZE_UNIT)));
            const bubbleSize = BASE_SIZE * sizeUnits;
            
            // Apply vertical jitter to prevent overlap
            const jitter = Math.random() * JITTER_RANGE;
            
            // For dummy data mode, generate some actual client names
            const clientName = dataSource === 'dummy' 
              ? ['Smith Family', 'Johnson Care', 'Rodriguez Therapy', 'Williams Support', 'Brown Plan'][i % 5]
              : `Plan ${i+1} of ${item.planCount}`;
              
            // Mix up plan types for dummy data mode
            const planType = dataSource === 'dummy'
              ? ['NDIS Plan', 'Private Care', 'Medicare Plus', 'Family Support', 'Early Intervention'][Math.floor(Math.random() * 5)]
              : `Expiring ${formattedDate}`;
            
            allPlans.push({
              x: index, // Month index (x-axis position)
              y: jitter, // Vertical jitter position
              z: bubbleSize, // Bubble size (proportional to budget amount)
              amount: planAmount, 
              clientName: clientName, 
              planName: planType,
              clientId: null, // We don't have specific client IDs here
              planId: null, // We don't have specific plan IDs here
              expiryMonth: monthName,
              expiryDate: index === 0 ? 'This month' : `In ${index + 1} month${index > 0 ? 's' : ''}`,
              priority,
              color: PRIORITY_COLORS[priority],
            });
          }
        } else if (item.planCount === 1) {
          // Just one plan this month, create a single bubble
          const clientName = dataSource === 'dummy'
            ? ['Edwards Family', 'Garcia Support', 'Miller Care', 'Davis Plan', 'Wilson Therapy'][index % 5]
            : `${item.planCount} Plan`;
            
          const planType = dataSource === 'dummy'
            ? ['Annual Care Plan', 'Quarterly Support', 'Family Package', 'Standard Plan', 'Premium Care'][Math.floor(Math.random() * 5)]
            : `Expiring ${formattedDate}`;
          
          // Calculate bubble size based on amount
          // $1000 = 1 size unit (BASE_SIZE)
          // Sizes are directly proportional to dollar amounts
          const sizeUnits = Math.min(10, Math.max(1, Math.floor(item.amount / BUBBLE_SIZE_UNIT)));
          const bubbleSize = BASE_SIZE * sizeUnits;
          
          // Apply vertical jitter to prevent overlap
          const jitter = Math.random() * JITTER_RANGE;
            
          allPlans.push({
            x: index,
            y: jitter,
            z: bubbleSize,
            amount: item.amount,
            clientName,
            planName: planType,
            clientId: null,
            planId: null,
            expiryMonth: monthName,
            expiryDate: index === 0 ? 'This month' : `In ${index + 1} month${index > 0 ? 's' : ''}`,
            priority,
            color: PRIORITY_COLORS[priority],
          });
        }
      });
    }
    
    // If we're in dummy data mode, create exactly 15 plans distributed across months
    if (dataSource === 'dummy') {
      // First clear existing plans if we're in dummy mode to maintain control over the total count
      allPlans = [];
      
      // Define a controlled distribution of plans across the 6 months
      // Create 2-3 bubbles per month (15 total) with varying sizes
      const planDistribution = [2, 3, 3, 3, 2, 2]; // Total: 15 plans
      
      // Create plans for each month according to the distribution
      for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
        const planCount = planDistribution[monthIndex];
        
        for (let i = 0; i < planCount; i++) {
          // Vary amounts to create different sized bubbles: small, medium, large
          let amount;
          if (i === 0) {
            amount = 2000 + Math.random() * 3000; // Small: $2-5K
          } else if (i === 1) {
            amount = 6000 + Math.random() * 4000; // Medium: $6-10K
          } else {
            amount = 12000 + Math.random() * 8000; // Large: $12-20K
          }
          
          // Calculate bubble size based on amount
          // $1000 = 1 size unit (BASE_SIZE)
          // Sizes are directly proportional to dollar amounts
          // Under $1000 = min size, Over $10,000 = max size
          const sizeUnits = Math.min(10, Math.max(1, Math.floor(amount / BUBBLE_SIZE_UNIT)));
          const bubbleSize = BASE_SIZE * sizeUnits;
          
          // Create evenly distributed jitter positions within the range
          // Use the plan index to assign positions that don't overlap
          const jitterStep = JITTER_RANGE / (planCount + 1);
          const jitter = jitterStep * (i + 1);
          
          // Calculate day-based position for X-axis
          // Randomly position the bubble somewhere in this month
          // Each month has DAYS_PER_MONTH days, so position within that range
          const dayPosition = monthIndex * DAYS_PER_MONTH + Math.floor(Math.random() * DAYS_PER_MONTH);
          
          // Get the actual date (just for display purposes)
          const date = new Date();
          date.setMonth(date.getMonth() + monthIndex);
          
          // For more realistic distribution, set the day of month
          const dayOfMonth = 1 + Math.floor(Math.random() * 28); // Random day between 1-28
          date.setDate(dayOfMonth);
          
          const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
          
          // Determine priority based on timeline
          const priority = getPriorityFromMonths(monthIndex + 1);
          
          // Client and plan names
          const clientNames = ['Thompson Family', 'Lee Support', 'Walker Plan', 'Hall Care', 'Young Family', 
                              'Smith Family', 'Johnson Care', 'Rodriguez Therapy', 'Williams Support', 'Brown Plan',
                              'Edwards Family', 'Garcia Support', 'Miller Care', 'Davis Plan', 'Wilson Therapy'];
          
          const planTypes = ['Basic Package', 'Enhanced Care', 'Standard Support', 'Premium Plan', 'Child Development',
                            'NDIS Plan', 'Private Care', 'Medicare Plus', 'Family Support', 'Early Intervention',
                            'Annual Care Plan', 'Quarterly Support', 'Family Package', 'Standard Plan', 'Premium Care'];
          
          // Calculate a unique index for each bubble across all months
          const globalIndex = monthIndex * 3 + i;
          
          allPlans.push({
            x: dayPosition / DAYS_PER_MONTH, // Convert day position to month scale (0-5 range)
            y: jitter,
            z: bubbleSize,
            amount,
            clientName: clientNames[globalIndex % clientNames.length],
            planName: planTypes[globalIndex % planTypes.length],
            clientId: null,
            planId: null,
            expiryMonth: monthName,
            expiryDate: `Expires on ${formattedDate}`,
            priority,
            color: PRIORITY_COLORS[priority],
            dayOfMonth: dayOfMonth, // Include for debugging
          });
        }
      }
    }
    
    // Filter plans based on view mode
    if (viewMode !== 'all') {
      return allPlans.filter(plan => {
        if (viewMode === 'critical') return plan.priority === 'critical';
        if (viewMode === 'urgent') return plan.priority === 'urgent' || plan.priority === 'critical';
        if (viewMode === 'future') return plan.priority === 'upcoming' || plan.priority === 'future';
        return true;
      });
    }
    
    return allPlans;
  }, [budgetData, expiringClients, viewMode, dataSource]);
  
  // Group data by priority for the display
  const priorityCounts = useMemo(() => {
    const counts = {
      critical: 0,
      urgent: 0,
      upcoming: 0,
      future: 0,
    };
    
    bubbleChartData.forEach(plan => {
      counts[plan.priority as BudgetPriority]++;
    });
    
    return counts;
  }, [bubbleChartData]);
  
  // Split data by priority for separate scatter plots (for better legend support)
  const prioritizedData = useMemo(() => {
    return {
      critical: bubbleChartData.filter(item => item.priority === 'critical'),
      urgent: bubbleChartData.filter(item => item.priority === 'urgent'),
      upcoming: bubbleChartData.filter(item => item.priority === 'upcoming'),
      future: bubbleChartData.filter(item => item.priority === 'future'),
    };
  }, [bubbleChartData]);
  
  // Calculate total funds by priority
  const fundsByPriority = useMemo(() => {
    const totals = {
      critical: 0,
      urgent: 0,
      upcoming: 0,
      future: 0,
      all: 0,
    };
    
    bubbleChartData.forEach(plan => {
      totals[plan.priority as BudgetPriority] += plan.amount;
      totals.all += plan.amount;
    });
    
    return totals;
  }, [bubbleChartData]);
  
  // Handle view mode change
  const handleViewModeChange = (value: string) => {
    setViewMode(value as ViewMode);
  };
  
  // Handle visualization method change
  const handleVisualizationChange = (value: string) => {
    setVisualization(value as VisualizationMethod);
  };
  
  // Calculate bubble size range based on visualization method
  const zAxisRange = visualization === 'bubble' 
    ? [MIN_BUBBLE_SIZE, MAX_BUBBLE_SIZE] 
    : [5, 5];
  
  // Customize the legend
  const CustomLegendItem = (props: any) => {
    const { payload } = props;
    
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs justify-center">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center">
            <div 
              style={{ backgroundColor: entry.color }}
              className="w-3 h-3 mr-1 rounded-full"
            />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };
  
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
          
          <div className="flex gap-1.5">
            {expiringCount > 0 && (
              <Badge variant="destructive" className="flex items-center">
                <AlertCircle className="mr-1 h-3 w-3" />
                {expiringCount} Plan{expiringCount !== 1 ? 's' : ''} Expiring Soon
              </Badge>
            )}
            
            <Select 
              value={viewMode} 
              onValueChange={handleViewModeChange}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1 opacity-70" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
                <SelectItem value="urgent">Urgent & Critical</SelectItem>
                <SelectItem value="future">Future Plans</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <div className="h-full flex flex-col">
            {/* Size legend removed as requested */}
            <div className="flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 10, right: 20, bottom: 50, left: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.1} />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Timeline" 
                    domain={[0, 5.99]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tickFormatter={(value) => {
                      // We're using integer values for month markers
                      // The actual data points may be positioned anywhere along the continuum
                      return monthLabels[Math.floor(value)]?.label || '';
                    }}
                    label={{ 
                      value: 'Expiration Timeline (Day Precision)', 
                      position: 'insideBottom', 
                      offset: -10,
                      fontSize: 12
                    }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Position" 
                    domain={[0, JITTER_RANGE]}
                    hide={true} // Hide the Y-axis as it's just for jitter positioning
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="z" 
                    range={visualization === 'bubble' ? [MIN_BUBBLE_SIZE, MAX_BUBBLE_SIZE] : [5, 5]} 
                    name="Budget Size" 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {/* Using simpler legend approach */}
                  <Legend 
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                    wrapperStyle={{ bottom: 0, fontSize: 12 }}
                  />
                  
                  {/* Critical Budget Plans */}
                  {prioritizedData.critical.length > 0 && (
                    <Scatter 
                      name={`Critical (${priorityCounts.critical})`}
                      data={prioritizedData.critical}
                      fill={PRIORITY_COLORS.critical}
                      shape="circle"
                      onClick={(data) => {
                        if (data && data.clientId) setLocation(`/client/${data.clientId}/budget`);
                      }}
                    />
                  )}
                  
                  {/* Urgent Budget Plans */}
                  {prioritizedData.urgent.length > 0 && (
                    <Scatter 
                      name={`Urgent (${priorityCounts.urgent})`}
                      data={prioritizedData.urgent}
                      fill={PRIORITY_COLORS.urgent}
                      shape="circle"
                      onClick={(data) => {
                        if (data && data.clientId) setLocation(`/client/${data.clientId}/budget`);
                      }}
                    />
                  )}
                  
                  {/* Upcoming Budget Plans */}
                  {prioritizedData.upcoming.length > 0 && (
                    <Scatter 
                      name={`Upcoming (${priorityCounts.upcoming})`}
                      data={prioritizedData.upcoming}
                      fill={PRIORITY_COLORS.upcoming}
                      shape="circle"
                      onClick={(data) => {
                        if (data && data.clientId) setLocation(`/client/${data.clientId}/budget`);
                      }}
                    />
                  )}
                  
                  {/* Future Budget Plans */}
                  {prioritizedData.future.length > 0 && (
                    <Scatter 
                      name={`Future (${priorityCounts.future})`}
                      data={prioritizedData.future}
                      fill={PRIORITY_COLORS.future}
                      shape="circle"
                      onClick={(data) => {
                        if (data && data.clientId) setLocation(`/client/${data.clientId}/budget`);
                      }}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary footer */}
            <div className="mt-1 flex justify-between items-center">
              <div className="flex gap-1.5 items-center text-xs">
                <span className="text-muted-foreground">Total Funds:</span> 
                <span className="font-medium">{formatCurrency(fundsByPriority.all)}</span>
                
                <Tabs
                  defaultValue="bubble"
                  className="w-[160px] h-7"
                  onValueChange={handleVisualizationChange}
                >
                  <TabsList className="h-7 grid w-full grid-cols-2">
                    <TabsTrigger value="bubble" className="text-[10px] py-0.5">Bubble</TabsTrigger>
                    <TabsTrigger value="scatter" className="text-[10px] py-0.5">Scatter</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div className="flex gap-3 text-xs">
                {viewMode === 'all' || viewMode === 'critical' || viewMode === 'urgent' ? (
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5"></div>
                    <span className="text-muted-foreground mr-0.5">Critical:</span>
                    <span className="font-medium">{formatCurrency(fundsByPriority.critical)}</span>
                  </div>
                ) : null}
                
                {viewMode === 'all' || viewMode === 'urgent' ? (
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-1.5"></div>
                    <span className="text-muted-foreground mr-0.5">Urgent:</span>
                    <span className="font-medium">{formatCurrency(fundsByPriority.urgent)}</span>
                  </div>
                ) : null}
                
                {viewMode === 'all' || viewMode === 'future' ? (
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5"></div>
                    <span className="text-muted-foreground mr-0.5">Future:</span>
                    <span className="font-medium">
                      {formatCurrency(fundsByPriority.upcoming + fundsByPriority.future)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}