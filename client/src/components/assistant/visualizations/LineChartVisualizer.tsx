/**
 * Line Chart Visualizer
 * 
 * This component renders SQL query results as a line chart,
 * automatically identifying time series data or appropriate x/y columns.
 */

import React, { useMemo } from 'react';
import { QueryResult } from '@shared/assistantTypes';
import { ResponsiveLine } from '@nivo/line';

interface LineChartVisualizerProps {
  data: QueryResult;
}

const LineChartVisualizer: React.FC<LineChartVisualizerProps> = ({ data }) => {
  // Always use light theme for visualizations
  const isDarkTheme = false;
  
  // Prepare data for the line chart
  const { chartData, xAxisLabel, dateAxis } = useMemo(() => {
    // Check if we have enough data
    if (data.columns.length < 2 || data.rows.length === 0) {
      return { chartData: [], xAxisLabel: '', dateAxis: false };
    }
    
    // Try to identify date/time column for x-axis
    let xColumn = '';
    let dateAxis = false;
    
    // Look for column names that suggest dates or time
    const dateColumnHints = ['date', 'time', 'day', 'month', 'year', 'period'];
    for (const column of data.columns) {
      const columnLower = column.toLowerCase();
      
      // Check if column name suggests a date
      if (dateColumnHints.some(hint => columnLower.includes(hint))) {
        xColumn = column;
        
        // Test if values look like dates
        const sampleRow = data.rows[0][column];
        if (typeof sampleRow === 'string') {
          // Try to parse as date
          try {
            const dateTest = new Date(sampleRow);
            if (!isNaN(dateTest.getTime())) {
              dateAxis = true;
            }
          } catch (e) {
            // Not a valid date format, continue
          }
        }
        
        break;
      }
    }
    
    // If no date column identified, use first column as x-axis
    if (!xColumn) {
      xColumn = data.columns[0];
    }
    
    // Identify all numeric columns for y-axis (except the x column)
    const yColumns: string[] = [];
    for (const column of data.columns) {
      if (column !== xColumn) {
        // Check if most values in this column are numeric
        const sampleSize = Math.min(5, data.rows.length);
        let numericCount = 0;
        
        for (let i = 0; i < sampleSize; i++) {
          const val = data.rows[i][column];
          if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
            numericCount++;
          }
        }
        
        if (numericCount / sampleSize > 0.5) {
          yColumns.push(column);
        }
      }
    }
    
    // If no numeric columns found, use all non-x columns
    if (yColumns.length === 0) {
      data.columns.forEach(column => {
        if (column !== xColumn) {
          yColumns.push(column);
        }
      });
    }
    
    // Limit to the first 50 rows for performance
    const limitedRows = data.rows.slice(0, 50);
    
    // Format the data for the line chart (per series)
    const chartData = yColumns.map(yColumn => {
      return {
        id: yColumn,
        data: limitedRows.map(row => {
          const xValue = row[xColumn];
          const yValue = typeof row[yColumn] === 'number' ? 
            row[yColumn] : 
            !isNaN(Number(row[yColumn])) ? 
              Number(row[yColumn]) : 
              0;
          
          // If using a date axis, format dates properly
          if (dateAxis) {
            try {
              const date = new Date(xValue);
              return {
                x: date,
                y: yValue
              };
            } catch (e) {
              return {
                x: String(xValue || ''),
                y: yValue
              };
            }
          }
          
          return {
            x: String(xValue || ''),
            y: yValue
          };
        })
      };
    });
    
    return { chartData, xAxisLabel: xColumn, dateAxis };
  }, [data]);
  
  // If we couldn't prepare valid chart data, show a fallback message
  if (chartData.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">
      This data doesn't appear suitable for a line chart visualization.
    </div>;
  }
  
  return (
    <div className="h-[400px] w-full">
      <ResponsiveLine
        data={chartData}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={dateAxis ? 
          { type: 'time', format: 'native', precision: 'day' } : 
          { type: 'point' }
        }
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
          stacked: false,
          reverse: false
        }}
        curve="monotoneX"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          format: dateAxis ? '%b %d' : undefined,
          tickSize: 5,
          tickPadding: 5,
          tickRotation: chartData[0].data.length > 10 ? -45 : 0,
          legend: xAxisLabel,
          legendOffset: 40,
          legendPosition: 'middle'
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Value',
          legendOffset: -40,
          legendPosition: 'middle'
        }}
        pointSize={10}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={true}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1
                }
              }
            ]
          }
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
      />
    </div>
  );
};

export default LineChartVisualizer;