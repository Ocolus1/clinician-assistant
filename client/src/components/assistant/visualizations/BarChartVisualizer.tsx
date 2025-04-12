/**
 * Bar Chart Visualizer
 * 
 * This component renders SQL query results as a bar chart using recharts.
 * It's ideal for categorical data with numeric values.
 */

import React, { useMemo } from 'react';
import { QueryResult } from '@shared/assistantTypes';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BarChartVisualizerProps {
  data: QueryResult;
}

// Color palette for bars
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#8DD1E1', '#A4DE6C', '#D0ED57', '#FFC658'
];

const BarChartVisualizer: React.FC<BarChartVisualizerProps> = ({ data }) => {
  // Determine which columns to use for the chart
  const { xAxisKey, valueKeys } = useMemo(() => {
    // If there are only two columns, use them as category and value
    if (data.columns.length === 2) {
      return {
        xAxisKey: data.columns[0],
        valueKeys: [data.columns[1]]
      };
    }
    
    // For more complex data, try to identify numeric columns for values
    const numericColumns: string[] = [];
    const nonNumericColumns: string[] = [];
    
    // Check first row to determine data types
    if (data.rows.length > 0) {
      data.columns.forEach(col => {
        const val = data.rows[0][col];
        if (typeof val === 'number') {
          numericColumns.push(col);
        } else {
          nonNumericColumns.push(col);
        }
      });
    }
    
    // If we have numeric and non-numeric columns, use the first non-numeric as X-axis
    // and the numeric ones as values
    if (numericColumns.length > 0 && nonNumericColumns.length > 0) {
      return {
        xAxisKey: nonNumericColumns[0],
        valueKeys: numericColumns
      };
    }
    
    // Default: use first column as X-axis and second as value
    return {
      xAxisKey: data.columns[0],
      valueKeys: data.columns.slice(1, 2)
    };
  }, [data]);
  
  // Format data for the chart if needed
  const formattedData = useMemo(() => {
    // If the data is already in a good format, return it as is
    return data.rows.map(row => ({
      ...row,
      // Ensure the x-axis value is a string
      [xAxisKey]: String(row[xAxisKey])
    }));
  }, [data.rows, xAxisKey]);
  
  // Generate a meaningful chart title
  const chartTitle = useMemo(() => {
    if (valueKeys.length === 1) {
      return `${valueKeys[0]} by ${xAxisKey}`;
    }
    return `Data by ${xAxisKey}`;
  }, [xAxisKey, valueKeys]);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
                interval={0}
                tickFormatter={value => value.length > 15 ? `${value.substring(0, 15)}...` : value}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              {valueKeys.length > 1 && <Legend />}
              
              {valueKeys.map((valueKey, index) => (
                <Bar 
                  key={valueKey}
                  dataKey={valueKey} 
                  name={valueKey}
                  fill={COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                >
                  {valueKeys.length === 1 && formattedData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarChartVisualizer;