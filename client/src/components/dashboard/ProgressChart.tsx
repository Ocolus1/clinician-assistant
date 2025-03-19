import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';

interface ProgressDataPoint {
  date: string;
  value: number;
  goal: string;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  type?: 'bar' | 'line';
  height?: number;
}

/**
 * Chart component for visualizing client progress over time
 */
export function ProgressChart({ 
  data, 
  type = 'line',
  height = 400 
}: ProgressChartProps) {
  // If no data, render placeholder
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background/30 rounded-lg">
        <p className="text-muted-foreground">No progress data available</p>
      </div>
    );
  }

  // Group data by goal
  const groupedData = data.reduce((acc, item) => {
    const { goal, date, value } = item;
    
    if (!acc[goal]) {
      acc[goal] = [];
    }
    
    acc[goal].push({
      x: date,
      y: value
    });
    
    return acc;
  }, {} as Record<string, { x: string, y: number }[]>);

  // Transform for line chart
  const lineData = Object.keys(groupedData).map(goal => ({
    id: goal,
    data: groupedData[goal].sort((a, b) => a.x.localeCompare(b.x))
  }));

  // Transform for bar chart
  const barData = data.map(item => ({
    date: item.date,
    [item.goal]: item.value
  }));

  // Colors for different goals
  const colors = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899'];

  if (type === 'line') {
    return (
      <div style={{ height }} className="w-full">
        <ResponsiveLine
          data={lineData}
          margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: 0,
            max: 100,
            stacked: false,
            reverse: false
          }}
          yFormat=" >-.1f"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Date',
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
        />
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveBar
        data={barData}
        keys={Object.keys(groupedData)}
        indexBy="date"
        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
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
          legend: 'Date',
          legendPosition: 'middle',
          legendOffset: 32
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Progress (%)',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
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
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        animate={true}
        motionStiffness={90}
        motionDamping={15}
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