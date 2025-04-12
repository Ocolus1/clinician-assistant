/**
 * Bar Chart Visualizer
 * 
 * This component renders SQL query results as a bar chart,
 * automatically identifying appropriate category and value columns.
 */

import React, { useMemo } from 'react';
import { QueryResult } from '@shared/assistantTypes';
import { ResponsiveBar } from '@nivo/bar';
import { useTheme } from '@/components/ui/theme-provider';

interface BarChartVisualizerProps {
  data: QueryResult;
}

const BarChartVisualizer: React.FC<BarChartVisualizerProps> = ({ data }) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  
  // Prepare data for the bar chart
  const chartData = useMemo(() => {
    // Try to determine which columns should be categories (x-axis) and which should be values (y-axis)
    if (data.columns.length < 2) return [];
    
    // Simple heuristic: 
    // - First column with text/strings is likely the category
    // - Columns with numbers are likely values
    const rows = data.rows;
    if (rows.length === 0) return [];
    
    let categoryColumn = data.columns[0]; // Default to first column
    const valueColumns: string[] = [];
    
    // Find appropriate category and value columns
    for (const column of data.columns) {
      // Sample the first few values to determine column type
      const sampleSize = Math.min(5, rows.length);
      let numberCount = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const value = rows[i][column];
        if (typeof value === 'number' || !isNaN(Number(value))) {
          numberCount++;
        }
      }
      
      // If most values are numbers, it's likely a value column
      if (numberCount / sampleSize > 0.7) {
        valueColumns.push(column);
      } 
      // First non-numeric column becomes the category
      else if (valueColumns.length === 0) {
        categoryColumn = column;
      }
    }
    
    // If no appropriate value columns found, use all columns except the category
    if (valueColumns.length === 0) {
      data.columns.forEach(column => {
        if (column !== categoryColumn) {
          valueColumns.push(column);
        }
      });
    }
    
    // Limit to the first 15 rows for readability
    const limitedRows = rows.slice(0, 15);
    
    // Transform the data for the bar chart
    return limitedRows.map(row => {
      const chartRow: Record<string, any> = {
        [categoryColumn]: String(row[categoryColumn] || 'Unknown')
      };
      
      // Add each value column
      valueColumns.forEach(column => {
        chartRow[column] = typeof row[column] === 'number' ? 
          row[column] : 
          !isNaN(Number(row[column])) ? 
            Number(row[column]) : 
            0;
      });
      
      return chartRow;
    });
  }, [data]);
  
  // If we couldn't prepare valid chart data, show a fallback message
  if (chartData.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">
      This data doesn't appear suitable for a bar chart visualization.
    </div>;
  }
  
  // Determine the category column (first column with text data)
  const categoryColumn = Object.keys(chartData[0])[0];
  
  // Determine the value columns (all except the category)
  const valueColumns = Object.keys(chartData[0]).filter(key => key !== categoryColumn);
  
  return (
    <div className="h-[400px] w-full">
      <ResponsiveBar
        data={chartData}
        keys={valueColumns}
        indexBy={categoryColumn}
        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={{ scheme: 'nivo' }}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: valueColumns.length > 3 ? -45 : 0,
          legend: categoryColumn,
          legendPosition: 'middle',
          legendOffset: 40,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: valueColumns.length === 1 ? valueColumns[0] : 'Value',
          legendPosition: 'middle',
          legendOffset: -50,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{
          from: 'color',
          modifiers: [['darker', 1.6]],
        }}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.85,
            symbolSize: 20,
            effects: [
              {
                on: 'hover',
                style: {
                  itemOpacity: 1,
                },
              },
            ],
          },
        ]}
        theme={{
          text: {
            fill: isDarkTheme ? '#e0e0e0' : '#333333',
          },
          axis: {
            ticks: {
              line: {
                stroke: isDarkTheme ? '#555555' : '#dddddd',
              },
              text: {
                fill: isDarkTheme ? '#e0e0e0' : '#333333',
              },
            },
            legend: {
              text: {
                fill: isDarkTheme ? '#e0e0e0' : '#333333',
              },
            },
          },
          grid: {
            line: {
              stroke: isDarkTheme ? '#444444' : '#e0e0e0',
            },
          },
          tooltip: {
            container: {
              background: isDarkTheme ? '#333333' : '#ffffff',
              color: isDarkTheme ? '#e0e0e0' : '#333333',
            },
          },
        }}
        role="application"
        ariaLabel="Bar chart visualization of query results"
      />
    </div>
  );
};

export default BarChartVisualizer;