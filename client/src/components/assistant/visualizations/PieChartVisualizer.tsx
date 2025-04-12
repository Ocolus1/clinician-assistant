/**
 * Pie Chart Visualizer
 * 
 * This component renders SQL query results as a pie chart using recharts.
 * It's ideal for proportional data visualization.
 */

import React, { useMemo } from 'react';
import { QueryResult } from '@shared/assistantTypes';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PieChartVisualizerProps {
  data: QueryResult;
}

// Color palette for pie segments
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#8DD1E1', '#A4DE6C', '#D0ED57', '#FFC658'
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if the segment is large enough
  if (percent < 0.05) return null;
  
  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const PieChartVisualizer: React.FC<PieChartVisualizerProps> = ({ data }) => {
  // Determine which columns to use for the chart
  const { labelKey, valueKey } = useMemo(() => {
    // If there are only two columns, use them as label and value
    if (data.columns.length === 2) {
      const firstColNumeric = data.rows.length > 0 && typeof data.rows[0][data.columns[0]] === 'number';
      const secondColNumeric = data.rows.length > 0 && typeof data.rows[0][data.columns[1]] === 'number';
      
      // The numeric column should be the value, the other the label
      if (firstColNumeric && !secondColNumeric) {
        return {
          valueKey: data.columns[0],
          labelKey: data.columns[1]
        };
      } else {
        return {
          labelKey: data.columns[0],
          valueKey: data.columns[1]
        };
      }
    }
    
    // For more columns, try to find a suitable numeric column for values
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
    
    // If we have numeric and non-numeric columns, use the first of each
    if (numericColumns.length > 0 && nonNumericColumns.length > 0) {
      return {
        labelKey: nonNumericColumns[0],
        valueKey: numericColumns[0]
      };
    }
    
    // Default
    return {
      labelKey: data.columns[0],
      valueKey: data.columns[1] || data.columns[0]
    };
  }, [data]);
  
  // Format data for the chart
  const chartData = useMemo(() => {
    return data.rows
      .filter(row => row[valueKey] !== null && row[valueKey] !== undefined)
      .map(row => ({
        name: String(row[labelKey]),
        value: Number(row[valueKey])
      }))
      .filter(item => !isNaN(item.value));
  }, [data.rows, labelKey, valueKey]);
  
  // Generate a meaningful chart title
  const chartTitle = `Distribution of ${valueKey} by ${labelKey}`;
  
  // Only display the chart if we have appropriate data
  if (chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Cannot Visualize Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The data structure doesn't contain appropriate values for a pie chart.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, valueKey]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PieChartVisualizer;