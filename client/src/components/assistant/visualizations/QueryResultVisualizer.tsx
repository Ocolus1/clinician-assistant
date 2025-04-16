/**
 * Query Result Visualizer
 * 
 * This component manages and displays visualizations for SQL query results,
 * allowing users to choose between different visualization types.
 */

import React, { useState, useEffect } from 'react';
import { QueryResult, VisualizationType } from '@shared/assistantTypes';
import { resultAnalysisService } from '@/lib/services/resultAnalysisService';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, LineChart, PieChart, Table as TableIcon } from 'lucide-react';
import DataTable from './DataTable';
import BarChartVisualizer from './BarChartVisualizer';
import LineChartVisualizer from './LineChartVisualizer';
import PieChartVisualizer from './PieChartVisualizer';

interface QueryResultVisualizerProps {
  data: QueryResult;
}

const QueryResultVisualizer: React.FC<QueryResultVisualizerProps> = ({ data }) => {
  // Safely validate and ensure data has the expected structure
  const validData: QueryResult = React.useMemo(() => {
    try {
      console.log('Raw query result data:', JSON.stringify(data));
      
      if (!data) {
        console.log('Query result data is null or undefined');
        return { columns: [], rows: [] };
      }
      
      if (!data.columns || !Array.isArray(data.columns)) {
        console.log('Query result columns is invalid:', data.columns);
        return { columns: [], rows: Array.isArray(data.rows) ? data.rows : [] };
      }
      
      if (!data.rows || !Array.isArray(data.rows)) {
        console.log('Query result rows is invalid:', data.rows);
        return { columns: data.columns, rows: [] };
      }
      
      // Log structure for debugging
      console.log('Valid data structure:', {
        columns: data.columns,
        rowCount: data.rows.length,
        metadata: data.metadata
      });
      
      return data;
    } catch (e) {
      console.error('Error validating query result data:', e);
      return { columns: [], rows: [] };
    }
  }, [data]);
  
  // Determine possible visualization types based on the validated data
  const possibleVisualizations = resultAnalysisService.analyzeVisualization(validData);
  const defaultVisualization = resultAnalysisService.getDefaultVisualization(validData);
  
  // Log visualization detection for debugging
  console.log('Possible visualizations detected:', possibleVisualizations);
  console.log('Default visualization selected:', defaultVisualization);
  
  // Debug the structure of the data for visualizations
  const isBudgetData = validData.columns.some(col => 
    col.toLowerCase().includes('budget') || 
    col.toLowerCase().includes('spent') || 
    col.toLowerCase().includes('utilization')
  );
  
  console.log('Dataset for visualization:', {
    isBudgetData,
    sampleRow: validData.rows[0] || {},
    validColumns: validData.columns
  });
  
  // Additional debugging for pie chart data
  if (possibleVisualizations.includes('pie')) {
    console.log('This data is suitable for pie chart');
  } else {
    console.log('This data is NOT suitable for pie chart');
  }
  
  // State for the currently active visualization
  const [activeVisualization, setActiveVisualization] = useState<VisualizationType>(defaultVisualization);
  
  // Update active visualization if the data changes
  useEffect(() => {
    if (!possibleVisualizations.includes(activeVisualization)) {
      setActiveVisualization(defaultVisualization);
    }
  }, [data, activeVisualization, possibleVisualizations, defaultVisualization]);
  
  // Icon mapping for visualization types
  const visualizationIcons: Record<VisualizationType, React.ReactNode> = {
    'table': <TableIcon className="h-4 w-4" />,
    'bar': <BarChart2 className="h-4 w-4" />,
    'line': <LineChart className="h-4 w-4" />,
    'pie': <PieChart className="h-4 w-4" />,
    'none': null
  };
  
  // Label mapping for visualization types
  const visualizationLabels: Record<VisualizationType, string> = {
    'table': 'Table',
    'bar': 'Bar',
    'line': 'Line',
    'pie': 'Pie',
    'none': 'None'
  };
  
  // Function to handle CSV download
  const handleCsvDownload = () => {
    try {
      const headers = validData.columns.join(',');
      const rows = validData.rows.map(row => 
        validData.columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(',')
      );
      const csv = [headers, ...rows].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `query_result_${new Date().toISOString().slice(0, 10)}.csv`);
      a.click();
    } catch (error) {
      console.error('Error generating CSV download:', error);
    }
  };
  
  return (
    <div className="mt-4 space-y-4">
      {/* Visualization Type Selector */}
      {possibleVisualizations.length > 1 && (
        <Tabs
          value={activeVisualization}
          onValueChange={(value) => setActiveVisualization(value as VisualizationType)}
          className="w-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Visualization:
            </span>
            <TabsList>
              {possibleVisualizations.map((type) => (
                <TabsTrigger key={type} value={type} className="flex items-center space-x-1">
                  {visualizationIcons[type]}
                  <span>{visualizationLabels[type]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      )}
      
      {/* Visualization Display */}
      <div className="w-full">
        {activeVisualization === 'table' && <DataTable data={validData} />}
        {activeVisualization === 'bar' && <BarChartVisualizer data={validData} />}
        {activeVisualization === 'line' && <LineChartVisualizer data={validData} />}
        {activeVisualization === 'pie' && <PieChartVisualizer data={validData} />}
        
        {/* Download Options */}
        {validData.rows.length > 0 && (
          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCsvDownload}
              className="text-xs"
            >
              Download CSV
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryResultVisualizer;