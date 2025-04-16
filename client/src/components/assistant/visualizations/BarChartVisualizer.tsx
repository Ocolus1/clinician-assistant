/**
 * Bar Chart Visualizer
 * 
 * This component renders SQL query results as a bar chart,
 * automatically identifying appropriate category and value columns.
 */

import React, { useMemo } from 'react';
import { QueryResult } from '@shared/assistantTypes';
import { ResponsiveBar } from '@nivo/bar';

interface BarChartVisualizerProps {
  data: QueryResult;
}

const BarChartVisualizer: React.FC<BarChartVisualizerProps> = ({ data }) => {
  // Always use light theme for visualizations
  const isDarkTheme = false;
  
  // Prepare data for the bar chart
  const chartData = useMemo(() => {
    // Debug the input data
    console.log('BarChartVisualizer input data:', {
      columnCount: data.columns.length,
      rowCount: data.rows.length,
      columns: data.columns,
      firstRow: data.rows[0] || {}
    });
    
    // Try to determine which columns should be categories (x-axis) and which should be values (y-axis)
    if (data.columns.length < 2) {
      console.log('Not enough columns for a bar chart');
      return [];
    }
    
    // Simple heuristic: 
    // - First column with text/strings is likely the category
    // - Columns with numbers are likely values
    const rows = data.rows;
    if (rows.length === 0) {
      console.log('No rows available for bar chart');
      return [];
    }
    
    let categoryColumn = data.columns[0]; // Default to first column
    const valueColumns: string[] = [];
    
    // Special handling for budget utilization data
    // Look for known patterns in column names
    const budgetColumns = {
      category: data.columns.find(col => 
        col.toLowerCase().includes('category') || 
        col.toLowerCase() === 'name' || 
        col.toLowerCase().includes('type')
      ),
      utilization: data.columns.find(col => 
        col.toLowerCase().includes('percentage') || 
        col.toLowerCase().includes('utilization') || 
        col.toLowerCase().includes('percent')
      ),
      total: data.columns.find(col => 
        col.toLowerCase().includes('total') && 
        (col.toLowerCase().includes('budgeted') || col.toLowerCase().includes('allocated'))
      ),
      used: data.columns.find(col => 
        col.toLowerCase().includes('utilized') || 
        col.toLowerCase().includes('used') || 
        col.toLowerCase().includes('spent')
      )
    };
    
    // Log detected budget columns
    console.log('Detected budget columns:', budgetColumns);
    
    // If we detected budget data pattern, use it
    if (budgetColumns.category && (budgetColumns.utilization || budgetColumns.used || budgetColumns.total)) {
      console.log('Using budget data pattern for bar chart');
      categoryColumn = budgetColumns.category;
      
      // Add numeric columns to valueColumns
      if (budgetColumns.utilization) valueColumns.push(budgetColumns.utilization);
      if (budgetColumns.used) valueColumns.push(budgetColumns.used);
      if (budgetColumns.total) valueColumns.push(budgetColumns.total);
      
      console.log('Budget visualization columns:', {
        categoryColumn,
        valueColumns
      });
      
      // For budget data specifically, make sure we have utilized and total
      // If we already detected them under other names (total_spent, etc)
      if (!budgetColumns.used && data.columns.some(col => col.toLowerCase().includes('spent'))) {
        const spentColumn = data.columns.find(col => col.toLowerCase().includes('spent'));
        if (spentColumn) valueColumns.push(spentColumn);
        console.log('Added spent column:', spentColumn);
      }
      
      if (!budgetColumns.total && data.columns.some(col => col.toLowerCase().includes('budgeted'))) {
        const budgetedColumn = data.columns.find(col => col.toLowerCase().includes('budgeted'));
        if (budgetedColumn) valueColumns.push(budgetedColumn);
        console.log('Added budgeted column:', budgetedColumn);
      }
      
      // Make sure we have at least one value column
      if (valueColumns.length === 0) {
        console.log('No value columns detected for budget data, searching for numeric columns');
        // Find other numeric columns
        for (const column of data.columns) {
          if (column !== categoryColumn) {
            const sampleSize = Math.min(5, rows.length);
            let numberCount = 0;
            
            for (let i = 0; i < sampleSize; i++) {
              const value = rows[i][column];
              if (typeof value === 'number' || !isNaN(Number(value))) {
                numberCount++;
              }
            }
            
            if (numberCount / sampleSize > 0.7) {
              valueColumns.push(column);
              console.log('Added numeric column as fallback:', column);
            }
          }
        }
      }
    } else {
      // Standard detection logic for non-budget data
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