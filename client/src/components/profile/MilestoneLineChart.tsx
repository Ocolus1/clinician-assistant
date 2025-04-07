import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

export interface MilestoneDataPoint {
  date: Date;
  value: number;
}

interface MilestoneLineChartProps {
  title: string;
  data: MilestoneDataPoint[];
  maxValue?: number;
  minValue?: number;
  startDate: Date;
  endDate: Date;
}

export function MilestoneLineChart({
  title,
  data,
  maxValue = 10,
  minValue = 0,
  startDate,
  endDate
}: MilestoneLineChartProps) {
  // Format data for chart
  const chartData = data.map(point => ({
    date: format(point.date, 'MMM'),
    fullDate: point.date,
    value: point.value
  }));
  
  // Ensure we have at least two points for the chart
  if (chartData.length < 2) {
    const startPoint = {
      date: format(startDate, 'MMM'),
      fullDate: startDate,
      value: 0
    };
    
    const endPoint = {
      date: format(endDate, 'MMM'),
      fullDate: endDate,
      value: 0
    };
    
    if (chartData.length === 0) {
      chartData.push(startPoint, endPoint);
    } else if (chartData.length === 1) {
      // Add one more point to ensure we have a line
      chartData.push(endPoint);
    }
  }
  
  // Sort data by date
  chartData.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
  
  return (
    <div className="w-full">
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              domain={[minValue, maxValue]}
              tickCount={3}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={20}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              strokeWidth={2}
            />
            {/* Reference line for mid-point */}
            <ReferenceLine y={maxValue / 2} stroke="#e5e7eb" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}