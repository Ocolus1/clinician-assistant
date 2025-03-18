import React from 'react';
import { BubbleChartData } from '@/lib/agent/types';

interface BubbleChartProps {
  data: BubbleChartData[];
}

/**
 * Bubble chart component for visualizing budget items
 * Uses Nivo's circle packing visualization
 */
export function BubbleChart({ data }: BubbleChartProps) {
  // If no data, render placeholder
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background/30 rounded-lg">
        <p className="text-muted-foreground">No budget data available</p>
      </div>
    );
  }

  // Transform data to hierarchical structure for circle packing
  const hierarchicalData = {
    name: 'budget',
    children: data.map(item => ({
      name: item.label,
      value: item.value,
      id: item.id,
      color: item.color,
      category: item.category,
      percentUsed: item.percentUsed || 0
    }))
  };

  return (
    <div className="w-full h-full min-h-[400px]">
      {/* For now, we'll use a placeholder to avoid importing Nivo */}
      <div className="w-full h-full flex items-center justify-center bg-background/30 rounded-lg">
        <div className="flex flex-col items-center">
          <div className="text-center max-w-md mb-4">
            <h3 className="font-medium mb-1">Budget Allocation Visualization</h3>
            <p className="text-sm text-muted-foreground">
              {data.length} items found across {new Set(data.map(item => item.category)).size} categories
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {data.map(item => (
              <div 
                key={item.id}
                className="relative p-4 rounded-lg border border-border"
                style={{ 
                  backgroundColor: `${item.color}20`,
                  borderColor: item.color 
                }}
              >
                <h4 className="font-medium mb-1">{item.label}</h4>
                <p className="text-sm text-muted-foreground">
                  Category: {item.category}
                </p>
                <p className="text-sm">
                  Value: ${item.value.toLocaleString()}
                </p>
                <div className="mt-2 bg-background/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ 
                      width: `${item.percentUsed}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
                <p className="text-xs mt-1 text-right">{item.percentUsed}% used</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}