import React from 'react';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export interface PerformanceDataPoint {
  date: Date;
  value: number;
  isCurrentMonth?: boolean;
}

interface PerformanceBarChartProps {
  data: PerformanceDataPoint[];
  maxValue?: number;
  minValue?: number;
}

export function PerformanceBarChart({
  data,
  maxValue = 10,
  minValue = 0
}: PerformanceBarChartProps) {
  // Format data for the chart
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), 'MMM yyyy'),
    value: item.value,
    isCurrentMonth: item.isCurrentMonth,
    formattedDate: format(new Date(item.date), 'MMMM d, yyyy')
  }));

  // Get the average value to display as a reference line
  const averageValue = data.length 
    ? data.reduce((sum, item) => sum + item.value, 0) / data.length 
    : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium">{payload[0].payload.formattedDate}</p>
          <p className="text-sm">
            Score: <span className="font-medium">{payload[0].value.toFixed(1)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (value: number) => {
    if (value < 4) return '#ef4444'; // red-500
    if (value < 7) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ 
            fontSize: 12, 
            fontWeight: 500,
            dy: 10
          }}
          angle={-45}
          textAnchor="end"
        />
        <YAxis 
          domain={[minValue, maxValue]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
          tickCount={6}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine 
          y={averageValue} 
          stroke="#6b7280" 
          strokeDasharray="3 3"
          label={{ 
            value: `Avg: ${averageValue.toFixed(1)}`,
            position: 'right',
            fill: '#6b7280',
            fontSize: 12
          }}
        />
        <Bar 
          dataKey="value" 
          radius={[4, 4, 0, 0]}
          barSize={30}
          isAnimationActive={true}
          animationDuration={500}
        >
          {chartData.map((entry, index) => (
            <rect 
              key={`rect-${index}`} 
              fill={getBarColor(entry.value)}
              x={0}
              y={0}
              width={0}
              height={0}
              className={entry.isCurrentMonth ? 'stroke-2 stroke-gray-800' : ''}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}