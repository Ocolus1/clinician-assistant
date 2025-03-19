import React, { useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart, LineChart } from "lucide-react";

/**
 * ProgressChart component for visualizing goal progress over time
 * Features:
 * - Switchable between bar and line chart
 * - Custom styling and tooltip
 * - Responsive design
 */
interface ProgressChartProps {
  data: any[];
  keys: string[];
}

type ChartType = 'bar' | 'line';

export function ProgressChart({ data, keys }: ProgressChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  
  if (!data || !keys || keys.length === 0) return <ProgressChartSkeleton />;
  
  // Generate colors based on index
  const colors = keys.map((_, i) => {
    const baseColors = ['#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f', '#1abc9c'];
    return baseColors[i % baseColors.length];
  });
  
  // Convert data for line chart if needed
  const lineData = keys.map(key => ({
    id: key,
    data: data.map(d => ({
      x: d.date,
      y: d[key]
    }))
  }));
  
  return (
    <div className="w-full h-[400px]">
      <div className="flex justify-end mb-2">
        <div className="flex gap-1">
          <Button
            size="icon"
            variant={chartType === 'bar' ? 'default' : 'outline'}
            onClick={() => setChartType('bar')}
            className="h-8 w-8"
          >
            <BarChart size={16} />
          </Button>
          <Button
            size="icon"
            variant={chartType === 'line' ? 'default' : 'outline'}
            onClick={() => setChartType('line')}
            className="h-8 w-8"
          >
            <LineChart size={16} />
          </Button>
        </div>
      </div>
      
      {chartType === 'bar' && (
        <ResponsiveBar
          data={data}
          keys={keys}
          indexBy="date"
          margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
          padding={0.3}
          groupMode="grouped"
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={colors}
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Period',
            legendPosition: 'middle',
            legendOffset: 40
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Progress Score',
            legendPosition: 'middle',
            legendOffset: -50
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          legends={[
            {
              dataFrom: 'keys',
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 50,
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
                    itemOpacity: 1
                  }
                }
              ]
            }
          ]}
          animate={true}
        />
      )}
      
      {chartType === 'line' && (
        <ResponsiveLine
          data={lineData}
          margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
            stacked: false,
            reverse: false
          }}
          yFormat=" >-.2f"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Period',
            legendOffset: 36,
            legendPosition: 'middle'
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Progress Score',
            legendOffset: -40,
            legendPosition: 'middle'
          }}
          enableGridX={false}
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
        />
      )}
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