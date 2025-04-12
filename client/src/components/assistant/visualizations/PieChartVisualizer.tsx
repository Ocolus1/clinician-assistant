/**
 * Pie Chart Visualizer
 * 
 * This component renders SQL query results as a pie chart,
 * automatically identifying categorical data for visualization.
 */

import React, { useMemo } from 'react';
import { QueryResult } from '@shared/assistantTypes';
import { ResponsivePie } from '@nivo/pie';

interface PieChartVisualizerProps {
  data: QueryResult;
}

const PieChartVisualizer: React.FC<PieChartVisualizerProps> = ({ data }) => {
  // Always use light theme for visualizations
  const isDarkTheme = false;
  
  // Prepare data for the pie chart
  const chartData = useMemo(() => {
    // Check if we have appropriate data
    if (data.columns.length < 2 || data.rows.length === 0) {
      return [];
    }
    
    // For pie charts, we need a label column and a value column
    let labelColumn = data.columns[0];
    let valueColumn = data.columns[1];
    
    // Try to identify the best columns for the chart
    // Value column should be numeric
    for (let i = 0; i < data.columns.length; i++) {
      const col = data.columns[i];
      const sampleSize = Math.min(5, data.rows.length);
      let numericCount = 0;
      
      for (let j = 0; j < sampleSize; j++) {
        const val = data.rows[j][col];
        if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
          numericCount++;
        }
      }
      
      // If this is mostly numeric, use it as value column
      if (numericCount / sampleSize > 0.5) {
        valueColumn = col;
        // Use the first non-value column as label
        for (const column of data.columns) {
          if (column !== valueColumn) {
            labelColumn = column;
            break;
          }
        }
        break;
      }
    }
    
    // Limit to the first 15 rows for readability
    const limitedRows = data.rows.slice(0, 15);
    
    // Transform the data into pie chart format
    return limitedRows.map(row => {
      const label = String(row[labelColumn] || 'Unknown');
      const rawValue = row[valueColumn];
      const value = typeof rawValue === 'number' ? 
        rawValue : 
        !isNaN(Number(rawValue)) ? 
          Number(rawValue) : 
          0;
      
      return {
        id: label,
        label,
        value: Math.abs(value), // Pie charts can't handle negative values
      };
    });
  }, [data]);
  
  // If we couldn't prepare valid chart data, show a fallback message
  if (chartData.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">
      This data doesn't appear suitable for a pie chart visualization.
    </div>;
  }
  
  return (
    <div className="h-[400px] w-full">
      <ResponsivePie
        data={chartData}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.2}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        borderWidth={1}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 0.2]]
        }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor={{ from: 'color', modifiers: [] }}
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{
          from: 'color',
          modifiers: [['darker', 2]]
        }}
        defs={[
          {
            id: 'dots',
            type: 'patternDots',
            background: 'inherit',
            color: 'rgba(255, 255, 255, 0.3)',
            size: 4,
            padding: 1,
            stagger: true
          },
          {
            id: 'lines',
            type: 'patternLines',
            background: 'inherit',
            color: 'rgba(255, 255, 255, 0.3)',
            rotation: -45,
            lineWidth: 6,
            spacing: 10
          }
        ]}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 56,
            itemsSpacing: 0,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: '#999',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 18,
            symbolShape: 'circle',
            effects: [
              {
                on: 'hover',
                style: {
                  itemTextColor: '#000'
                }
              }
            ]
          }
        ]}
        theme={{
          text: {
            fill: isDarkTheme ? '#e0e0e0' : '#333333',
          },
          legends: {
            text: {
              fill: isDarkTheme ? '#e0e0e0' : '#333333',
            }
          },
          tooltip: {
            container: {
              background: isDarkTheme ? '#333333' : '#ffffff',
              color: isDarkTheme ? '#e0e0e0' : '#333333',
            }
          }
        }}
      />
    </div>
  );
};

export default PieChartVisualizer;