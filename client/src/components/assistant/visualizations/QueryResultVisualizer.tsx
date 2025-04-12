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
  // Determine possible visualization types based on the data
  const possibleVisualizations = resultAnalysisService.analyzeVisualization(data);
  const defaultVisualization = resultAnalysisService.getDefaultVisualization(data);
  
  // State for the currently active visualization
  const [activeVisualization, setActiveVisualization] = useState<VisualizationType>(defaultVisualization);
  
  // Update active visualization if the data changes
  useEffect(() => {
    // If the current visualization is no longer possible with the new data,
    // or if the data has changed substantially, update to the default
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
        {activeVisualization === 'table' && <DataTable data={data} />}
        {activeVisualization === 'bar' && <BarChartVisualizer data={data} />}
        {activeVisualization === 'line' && <LineChartVisualizer data={data} />}
        {activeVisualization === 'pie' && <PieChartVisualizer data={data} />}
        
        {/* Download Options */}
        {data.rows.length > 0 && (
          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Create CSV from data
                const headers = data.columns.join(',');
                const rows = data.rows.map(row => 
                  data.columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(',')
                );
                const csv = [headers, ...rows].join('\n');
                
                // Create and trigger download
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('href', url);
                a.setAttribute('download', `query_result_${new Date().toISOString().slice(0, 10)}.csv`);
                a.click();
              }}
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