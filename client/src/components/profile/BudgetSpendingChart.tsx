import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, Area, ComposedChart, ReferenceArea
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { MonthlySpending } from '@/lib/services/budgetUtilizationService';

// Define types for the tooltip props
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    [key: string]: any;
  }>;
  label?: string;
  totalBudget: number;
}

// Define custom tooltip for the chart
const CustomTooltip = ({ active, payload, label, totalBudget }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    // Find which payload items are available
    const actualData = payload.find((p: {dataKey: string}) => p.dataKey === 'displayActual');
    const targetData = payload.find((p: {dataKey: string}) => p.dataKey === 'cumulativeTarget');
    const projectedData = payload.find((p: {dataKey: string}) => p.dataKey === 'displayProjected');
    
    // Calculate variance from target (if both exist)
    const variance = actualData && targetData 
      ? actualData.value - targetData.value
      : null;
    
    // Format currency values
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };
    
    // Calculate percentage of total budget
    const getPercentage = (value: number) => {
      return `${Math.round((value / totalBudget) * 100)}%`;
    };
    
    return (
      <div className="bg-white p-3 border rounded-md shadow-md">
        <p className="font-bold text-gray-700">{label}</p>
        <div className="mt-2 space-y-1">
          {actualData && (
            <p className="text-blue-600">
              <span className="font-medium">Actual:</span> {formatCurrency(actualData.value)} ({getPercentage(actualData.value)})
            </p>
          )}
          {targetData && (
            <p className="text-green-600">
              <span className="font-medium">Target:</span> {formatCurrency(targetData.value)} ({getPercentage(targetData.value)})
            </p>
          )}
          {projectedData && (
            <p className="text-blue-600">
              <span className="font-medium">Projected:</span> {formatCurrency(projectedData.value)} ({getPercentage(projectedData.value)})
            </p>
          )}
          {variance !== null && (
            <p className={variance > 0 ? "text-red-600" : "text-green-600"}>
              <span className="font-medium">Variance:</span> {variance > 0 ? "+" : ""}{formatCurrency(variance)}
              ({variance > 0 ? "over budget" : "under budget"})
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

interface BudgetSpendingChartProps {
  monthlySpending: MonthlySpending[];
  totalBudget: number;
}

export function BudgetSpendingChart({ monthlySpending, totalBudget }: BudgetSpendingChartProps) {
  // Process the data to group by month for x-axis display
  // First, format all data points with month labels
  const allDataPoints = monthlySpending.map(item => ({
    ...item,
    // Create a formatted month label for the x-axis
    monthLabel: format(item.date, 'MMM yy')
  }));
  
  // Then create a version that only has one entry per month for the chart to use as ticks
  // (We'll still plot all data points, but only show month labels)
  const seenMonths = new Set();
  const uniqueMonthData = allDataPoints.filter(item => {
    const month = format(item.date, 'yyyy-MM');
    if (!seenMonths.has(month)) {
      seenMonths.add(month);
      return true;
    }
    return false;
  });
  
  // Use all data for plotting, but uniqueMonthData will help us determine tick intervals
  const formattedData = allDataPoints;
  
  // Calculate max value for y-axis (with 10% padding)
  const maxValue = Math.max(
    ...formattedData.map(d => 
      Math.max(
        d.cumulativeTarget || 0, 
        d.cumulativeActual || 0, 
        d.cumulativeProjected || 0
      )
    )
  );
  const yDomain = [0, maxValue * 1.1]; // Add 10% padding to the top
  
  // Find today's index (the first projected day)
  const todayIndex = formattedData.findIndex(item => item.isProjected);
  
  // Get the exact today's date for reference
  const today = new Date();
  const todayDateString = format(today, 'yyyy-MM-dd');
  
  // Process data for display
  const chartData = formattedData.map((item, index) => {
    // For actual spending line - only show up to today
    const displayActual = !item.isProjected ? item.cumulativeActual : null;
    
    // For projected spending line - only show from today onward
    const displayProjected = item.isProjected ? item.cumulativeProjected : null;
    
    // For the actual today's data point (transition point), show both actual and projected
    // to make a continuous line
    if (item.exactDate === todayDateString) {
      return {
        ...item,
        displayActual: item.cumulativeActual,
        displayProjected: item.cumulativeActual // Start projection from actual value
      };
    }
    
    return {
      ...item,
      displayActual,
      displayProjected
    };
  });
  
  // Find the current month label for the reference line - use the exact date
  // This gives us precise positioning based on today's actual date
  const todayDataPoint = formattedData.find(item => item.exactDate === todayDateString);
  const currentMonth = todayDataPoint?.monthLabel || 
                      (todayIndex >= 0 ? formattedData[todayIndex]?.monthLabel : null);
  
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="monthLabel" 
            tick={{ fontSize: 12 }}
            height={50}
            // Display only month names without days to reduce clutter
            tickFormatter={(value) => {
              // Extract just the month from the value (e.g., "Jan 25" becomes "Jan")
              const month = value.split(' ')[0];
              return month;
            }}
            // Use only one label per month to avoid crowding
            ticks={uniqueMonthData.map(item => item.monthLabel)}
            interval={0}
          />
          <YAxis 
            domain={yDomain}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
            width={60}
          />
          <Tooltip 
            content={<CustomTooltip totalBudget={totalBudget} />}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
          />
          
          {/* Simple and effective area based approach */}
          <defs>
            <linearGradient id="colorGap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.15}/>
            </linearGradient>
          </defs>
          
          {/* Area filling under target line */}
          <Area
            type="monotone"
            dataKey="cumulativeTarget"
            stroke="none"
            fill="url(#colorGap)"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive={false}
          />
          
          {/* Area filling under actual/projected line to cut out the red area below */}
          <Area
            type="monotone"
            dataKey={(item) => {
              // If actual is available use it, otherwise use projected
              return item.displayActual !== null 
                ? item.displayActual 
                : (item.displayProjected !== null ? item.displayProjected : 0);
            }}
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive={false}
          />
          
          {/* Target budget line (goes on top of area) */}
          <Line
            type="monotone"
            dataKey="cumulativeTarget"
            name="Target Budget"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          
          {/* Actual spending line - only up to current month */}
          <Line
            type="monotone"
            name="Actual Spending"
            dataKey="displayActual"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />
          
          {/* Projected spending line (dashed) - future only */}
          <Line
            type="monotone"
            name="Projected Spending"
            dataKey="displayProjected"
            stroke="#3b82f6"  // Same color as actual spending
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />
          
          {/* Today's reference line using exact date and month-based approach */}
          {currentMonth && (
            <ReferenceLine
              x={currentMonth}
              stroke="#888"
              strokeDasharray="3 3"
              label={{ value: "Today", position: "insideBottomLeft", fill: "#888", fontSize: 12 }}
            />
          )}
          
          {/* Total budget reference line */}
          <ReferenceLine
            y={totalBudget}
            label={{ value: "Budget Limit", position: "left", fill: "#e11d48", fontSize: 12 }}
            stroke="#e11d48"
            strokeDasharray="3 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}