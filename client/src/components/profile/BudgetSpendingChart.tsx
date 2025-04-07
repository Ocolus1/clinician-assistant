import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';
import { format } from 'date-fns';
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
    const actualData = payload.find((p: {dataKey: string}) => p.dataKey === 'cumulativeActual');
    const targetData = payload.find((p: {dataKey: string}) => p.dataKey === 'cumulativeTarget');
    const projectedData = payload.find((p: {dataKey: string}) => p.dataKey === 'cumulativeProjected');
    
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
            <p className="text-purple-600">
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
  // Format the date for x-axis labels
  const formattedData = monthlySpending.map(item => ({
    ...item,
    // Create a formatted month label for the x-axis
    monthLabel: format(item.date, 'MMM yy')
  }));
  
  // Find the current month index
  const currentMonthIndex = monthlySpending.findIndex(
    month => !month.isProjected && month.projectedSpending === null
  );
  
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
  
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={formattedData}
          margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="monthLabel" 
            tick={{ fontSize: 12 }}
            height={50}
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
          
          {/* Target budget line */}
          <Line
            type="monotone"
            dataKey="cumulativeTarget"
            name="Target Budget"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
          
          {/* Actual spending line */}
          <Line
            type="monotone"
            dataKey="cumulativeActual"
            name="Actual Spending"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
          
          {/* Projected spending line (dashed) */}
          <Line
            type="monotone"
            dataKey="cumulativeProjected"
            name="Projected Spending"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
          
          {/* Spending gap area */}
          <Area
            type="monotone"
            dataKey="cumulativeActual"
            fill="#3b82f6"
            stroke="none"
            fillOpacity={0.1}
          />
          
          {/* Current month reference line */}
          {currentMonthIndex > 0 && (
            <ReferenceLine
              x={formattedData[currentMonthIndex]?.monthLabel}
              stroke="#888"
              strokeDasharray="3 3"
              label={{ value: "Now", position: "insideBottomLeft", fill: "#888", fontSize: 12 }}
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