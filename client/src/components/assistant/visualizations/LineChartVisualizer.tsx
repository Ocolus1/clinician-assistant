/**
 * Line Chart Visualizer
 * 
 * This component renders SQL query results as a line chart using recharts.
 * It's ideal for time series data or trend visualization.
 */

import React, { useMemo } from 'react';
import { QueryResult } from '@shared/assistantTypes';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LineChartVisualizerProps {
  data: QueryResult;
}

// Color palette for lines
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#8DD1E1', '#A4DE6C', '#D0ED57', '#FFC658'
];

const LineChartVisualizer: React.FC<LineChartVisualizerProps> = ({ data }) => {
  // Determine which columns to use for the chart
  const { xAxisKey, valueKeys } = useMemo(() => {
    // Check if any column names suggest time or date
    const dateColumns = data.columns.filter(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') ||
      col.toLowerCase().includes('day') ||
      col.toLowerCase().includes('month') ||
      col.toLowerCase().includes('year')
    );
    
    // If we found date/time columns, use the first one as X-axis
    if (dateColumns.length > 0) {
      const nonDateColumns = data.columns.filter(col => !dateColumns.includes(col));
      return {
        xAxisKey: dateColumns[0],
        valueKeys: nonDateColumns.filter(col => {
          // Check if values are numeric
          return data.rows.length > 0 && typeof data.rows[0][col] === 'number';
        })
      };
    }
    
    // If there are only two columns, use them as X and Y
    if (data.columns.length === 2) {
      return {
        xAxisKey: data.columns[0],
        valueKeys: [data.columns[1]]
      };
    }
    
    // For more complex data, try to identify numeric columns
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
    // Sort data by X-axis if it might be a date
    const sortedData = [...data.rows];
    
    // Try to detect if x-axis is a date
    const isDateColumn = xAxisKey.toLowerCase().includes('date') || 
                          xAxisKey.toLowerCase().includes('time');
    
    if (isDateColumn) {
      sortedData.sort((a, b) => {
        // Try parsing as Date
        const dateA = new Date(a[xAxisKey]);
        const dateB = new Date(b[xAxisKey]);
        
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // Fallback to string comparison
        return String(a[xAxisKey]).localeCompare(String(b[xAxisKey]));
      });
    }
    
    return sortedData.map(row => ({
      ...row,
      // Ensure the x-axis value is formatted appropriately
      [xAxisKey]: isDateColumn && new Date(row[xAxisKey]).toLocaleDateString()
    }));
  }, [data.rows, xAxisKey]);
  
  // Generate a meaningful chart title
  const chartTitle = useMemo(() => {
    if (valueKeys.length === 1) {
      return `${valueKeys[0]} over ${xAxisKey}`;
    }
    return `Trends by ${xAxisKey}`;
  }, [xAxisKey, valueKeys]);
  
  // Only display the chart if we have appropriate data
  if (valueKeys.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Cannot Visualize Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The data structure doesn't contain appropriate numeric values for a line chart.
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
            <LineChart
              data={formattedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
                tickFormatter={value => {
                  if (typeof value === 'string' && value.length > 15) {
                    return `${value.substring(0, 15)}...`;
                  }
                  return value;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              
              {valueKeys.map((valueKey, index) => (
                <Line 
                  key={valueKey}
                  type="monotone"
                  dataKey={valueKey}
                  name={valueKey}
                  stroke={COLORS[index % COLORS.length]}
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default LineChartVisualizer;