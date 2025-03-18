import React from 'react';

interface ProgressChartProps {
  data: {
    name: string;
    value: number;
  }[];
}

/**
 * Progress chart component for visualizing client goal progress
 */
export function ProgressChart({ data }: ProgressChartProps) {
  // If no data, render placeholder
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background/30 rounded-lg">
        <p className="text-muted-foreground">No progress data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="w-full h-full flex flex-col justify-center p-4 bg-background/30 rounded-lg">
        <div className="text-center max-w-md mx-auto mb-6">
          <h3 className="font-medium mb-1">Goal Progress Tracking</h3>
          <p className="text-sm text-muted-foreground">
            Tracking progress across {data.length} goals
          </p>
        </div>
        
        <div className="space-y-6 w-full max-w-2xl mx-auto">
          {data.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{item.name}</span>
                <span className="text-sm">{item.value}%</span>
              </div>
              <div className="h-3 w-full bg-background rounded-full overflow-hidden border border-border">
                <div 
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Not Started</span>
                <span>In Progress</span>
                <span>Complete</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}