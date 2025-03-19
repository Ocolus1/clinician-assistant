import React, { useMemo } from 'react';
import { BubbleChartData } from '@/lib/agent/types';
import { prepareBubbleHierarchy } from '@/lib/utils/chartDataUtils';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { Skeleton } from '@/components/ui/skeleton';

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
  const hierarchicalData = useMemo(() => {
    return prepareBubbleHierarchy(data);
  }, [data]);

  return (
    <div className="h-full w-full min-h-[400px]">
      <ResponsiveCirclePacking
        data={hierarchicalData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        id="name"
        value="value"
        colors={(node: any) => node.data.color || '#A1A1AA'}
        colorBy="id"
        childColor={(parent: any) => parent.data.color || '#A1A1AA'}
        padding={4}
        enableLabels={true}
        labelsSkipRadius={16}
        labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
        animate={true}
        motionStiffness={90}
        motionDamping={12}
        tooltip={(node: any) => {
          // Don't show tooltip for the root node
          if (node.id === 'budget') return null;
          
          // For category nodes, show simple tooltip
          if (!node.data.value && node.children?.length) {
            return (
              <div className="bg-background p-2 rounded shadow-md border">
                <strong>{node.id}</strong>
              </div>
            );
          }
          
          // For leaf nodes, show detailed tooltip
          return (
            <div className="bg-background p-2 rounded shadow-md border">
              <div className="font-medium">{node.id}</div>
              <div className="text-sm text-muted-foreground">
                Amount: ${node.value.toLocaleString()}
              </div>
              {node.data.percentUsed !== undefined && (
                <div className="text-sm">
                  Used: {node.data.percentUsed}%
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}

/**
 * Skeleton for loading state
 */
export function BubbleChartSkeleton() {
  return (
    <div className="w-full h-[400px] p-4 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-full w-full rounded-md" />
    </div>
  );
}