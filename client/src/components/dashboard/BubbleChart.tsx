import React from 'react';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { Skeleton } from "@/components/ui/skeleton";

/**
 * BubbleChart component for visualizing hierarchical budget data
 * Uses Nivo's circle packing chart with custom styling
 */
interface BubbleChartProps {
  data: any;
}

export function BubbleChart({ data }: BubbleChartProps) {
  if (!data) return <BubbleChartSkeleton />;
  
  const getChildColor = (parent: any) => {
    return parent.color || '#3498db';
  };
  
  return (
    <div className="w-full h-[400px]">
      <ResponsiveCirclePacking
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        id="name"
        value="value"
        colors={(node: any) => node.color || '#3498db'}
        colorBy="id"
        childColor={getChildColor}
        padding={4}
        enableLabels={true}
        labelsFilter={n => n.node.height === 0}
        labelsSkipRadius={16}
        labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
        animate={true}
        tooltip={({ id, value, color, data }: any) => {
          // Don't show tooltip for the root node
          if (id === 'budget') return <></>;
          
          // For category nodes, show simple tooltip
          if (!data.value && data.children?.length) {
            return (
              <div className="bg-background p-2 rounded shadow-md border">
                <strong>{id}</strong>
              </div>
            );
          }
          
          // For leaf nodes, show detailed tooltip
          return (
            <div className="bg-background p-2 rounded shadow-md border">
              <div className="font-medium">{id}</div>
              <div className="text-sm text-muted-foreground">
                Amount: ${value.toLocaleString()}
              </div>
              {data.percentUsed !== undefined && (
                <div className="text-sm">
                  Used: {data.percentUsed}%
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