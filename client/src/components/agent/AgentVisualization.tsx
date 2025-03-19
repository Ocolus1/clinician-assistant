import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { ResponsiveBar } from '@nivo/bar';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useAgent } from './AgentContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AgentVisualizationProps {
  className?: string;
}

/**
 * Visualization component for displaying data insights from agent
 */
export function AgentVisualization({ className }: AgentVisualizationProps) {
  const { isAgentVisible, latestVisualization } = useAgent();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // If agent is not visible or no visualization to show, don't render
  if (!isAgentVisible || latestVisualization === 'NONE') {
    return null;
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed right-6 z-30 w-full overflow-hidden rounded-lg border bg-card shadow-lg',
          isExpanded 
            ? 'bottom-4 top-4 max-w-4xl' 
            : 'bottom-[calc(20vh+6rem)] max-h-[30vh] max-w-md',
          className
        )}
      >
        {/* Visualization header */}
        <div className="flex h-10 items-center justify-between border-b bg-muted/50 px-3">
          <div className="text-sm font-medium">
            {latestVisualization === 'BUBBLE_CHART' 
              ? 'Budget Allocation' 
              : 'Progress Tracking'}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Visualization content */}
        <div className="h-[calc(100%-2.5rem)]">
          {latestVisualization === 'BUBBLE_CHART' ? (
            <BubbleChartVisualization />
          ) : (
            <ProgressChartVisualization />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Budget visualization using bubble chart
function BubbleChartVisualization() {
  // This will be replaced with real data from the agent response
  // For now we use sample structure matching our system's schema
  const data = {
    name: 'budget',
    color: 'hsl(210, 70%, 50%)',
    children: [
      {
        name: 'Therapy Services',
        color: 'hsl(10, 70%, 50%)',
        children: [
          {
            name: 'Speech Therapy',
            color: 'hsl(10, 70%, 50%)',
            loc: 5000,
            percentUsed: 65
          },
          {
            name: 'Occupational Therapy',
            color: 'hsl(30, 70%, 50%)',
            loc: 3500,
            percentUsed: 40
          }
        ]
      },
      {
        name: 'Assistive Equipment',
        color: 'hsl(120, 70%, 50%)',
        children: [
          {
            name: 'Communication Devices',
            color: 'hsl(120, 70%, 50%)',
            loc: 1200,
            percentUsed: 90
          },
          {
            name: 'Sensory Tools',
            color: 'hsl(150, 70%, 50%)',
            loc: 800,
            percentUsed: 25
          }
        ]
      },
      {
        name: 'Family Support',
        color: 'hsl(200, 70%, 50%)',
        children: [
          {
            name: 'Respite Care',
            color: 'hsl(200, 70%, 50%)',
            loc: 2000,
            percentUsed: 50
          },
          {
            name: 'Parent Training',
            color: 'hsl(230, 70%, 50%)',
            loc: 1500,
            percentUsed: 10
          }
        ]
      }
    ]
  };

  return (
    <div className="h-full w-full p-4">
      <ResponsiveCirclePacking
        data={data}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        id="name"
        value="loc"
        colors={{ scheme: 'paired' }}
        colorBy="id"
        padding={2}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.2]] }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        animate={true}
        tooltip={({ id, value, color }: { id: string; value: number; color: string }) => (
          <div
            style={{
              padding: '12px',
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <strong style={{ color }}>{id}</strong>
            <div>${value}</div>
          </div>
        )}
      />
      <div className="mt-2 text-center text-xs text-muted-foreground">
        Bubble size represents budget allocation amount
      </div>
    </div>
  );
}

// Progress visualization using bar chart
function ProgressChartVisualization() {
  // Sample data for progress bar chart
  const data = [
    {
      goal: "Communication",
      progress: 75,
      progressColor: "hsl(210, 70%, 50%)",
    },
    {
      goal: "Motor Skills",
      progress: 60,
      progressColor: "hsl(160, 70%, 50%)",
    },
    {
      goal: "Social Interaction",
      progress: 40,
      progressColor: "hsl(40, 70%, 50%)",
    },
    {
      goal: "Independence",
      progress: 85,
      progressColor: "hsl(320, 70%, 50%)",
    },
    {
      goal: "Emotional Regulation",
      progress: 30,
      progressColor: "hsl(280, 70%, 50%)",
    }
  ];

  return (
    <div className="h-full w-full p-4">
      <ResponsiveBar
        data={data}
        keys={['progress']}
        indexBy="goal"
        margin={{ top: 10, right: 30, bottom: 50, left: 100 }}
        padding={0.3}
        layout="horizontal"
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={(bar) => {
          // Type safe way to access the color
          const d = bar.data as { progressColor: string };
          return d.progressColor || '#aaaaaa';
        }}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Progress (%)',
          legendPosition: 'middle',
          legendOffset: 32
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        markers={[
          {
            axis: 'x',
            value: 50,
            lineStyle: { stroke: 'rgba(0, 0, 0, 0.15)', strokeWidth: 1, strokeDasharray: '6 6' },
            legend: 'Target',
            legendPosition: 'top',
          }
        ]}
        animate={true}
      />
      <div className="mt-2 text-center text-xs text-muted-foreground">
        Goal progress compared to 50% target threshold
      </div>
    </div>
  );
}