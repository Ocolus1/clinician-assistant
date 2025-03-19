import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ProgressChart component for visualizing goal progress over time
 * Uses Nivo's line chart with custom styling
 */
interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface ProgressChartProps {
  data: ChartDataPoint[];
  keys: string[];
}

export function ProgressChart({ data, keys }: ProgressChartProps) {
  if (!data || !keys || keys.length === 0) return <ProgressChartSkeleton />;
  
  // Transform data for Nivo line chart
  const lineData = keys.map(key => ({
    id: key,
    data: data.map(d => ({
      x: d.date,
      y: d[key]
    }))
  }));
  
  // Get an array of colors for each line
  const colors = [
    '#3498db', // Blue
    '#2ecc71', // Green
    '#f1c40f', // Yellow
    '#e74c3c', // Red
    '#9b59b6', // Purple
  ];
  
  return (
    <div className="w-full h-[400px]">
      <ResponsiveLine
        data={lineData}
        margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
        xScale={{ type: 'point' }}
        yScale={{ 
          type: 'linear', 
          min: 0, 
          max: 100 
        }}
        curve="monotoneX"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Months',
          legendOffset: 36,
          legendPosition: 'middle'
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Progress (%)',
          legendOffset: -40,
          legendPosition: 'middle'
        }}
        colors={colors}
        pointSize={10}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={true}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 50,
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
        animate={true}
        motionConfig={{
          mass: 1,
          tension: 120,
          friction: 26,
          clamp: false,
          precision: 0.01,
          velocity: 0
        }}
        theme={{
          tooltip: {
            container: {
              background: 'white',
              fontSize: 12,
              borderRadius: 4,
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
              padding: 8
            }
          }
        }}
      />
    </div>
  );
}

/**
 * Skeleton for loading state
 */
export function ProgressChartSkeleton() {
  return (
    <div className="w-full h-[400px] p-4 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-full w-full rounded-md" />
    </div>
  );
}