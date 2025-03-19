import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { ResponsiveBar } from '@nivo/bar';
import { X, Maximize2, Minimize2, Info } from 'lucide-react';
import { useAgent } from './AgentContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { prepareBubbleHierarchy } from '@/lib/utils/chartDataUtils';
import { BudgetAnalysis, ProgressAnalysis } from '@/lib/agent/types';

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
  const { conversationHistory } = useAgent();
  
  // Process the most recent agent response with budget data
  const budgetData = useMemo(() => {
    // Find the latest assistant message with budget data
    const lastBudgetMessage = [...conversationHistory]
      .reverse()
      .find(msg => 
        msg.role === 'assistant' && 
        msg.data && 
        (msg.data as any).totalBudget !== undefined
      );
    
    if (lastBudgetMessage?.data) {
      // Cast to BudgetAnalysis type
      return lastBudgetMessage.data as BudgetAnalysis;
    }
    
    // If no budget data found, return null
    return null;
  }, [conversationHistory]);
  
  // Prepare hierarchical data for the bubble chart
  const chartData = useMemo(() => {
    if (!budgetData || !budgetData.budgetItems || budgetData.budgetItems.length === 0) {
      // Fallback to an empty structure if no data available
      return {
        name: 'No Budget Data',
        color: 'hsl(210, 70%, 50%)',
        children: [] as Array<{
          name: string;
          color: string;
          children: Array<{
            name: string;
            color: string;
            loc: number;
            percentUsed: number;
          }>;
        }>
      };
    }
    
    // Group budget items by category and transform to the format expected by the chart
    const bubbleData: {
      name: string;
      color: string;
      children: Array<{
        name: string;
        color: string;
        children: Array<{
          name: string;
          color: string;
          loc: number;
          percentUsed: number;
        }>;
      }>;
    } = {
      name: 'Budget Allocation',
      color: 'hsl(210, 70%, 50%)',
      children: []
    };
    
    // Group items by category
    const categories: Record<string, Array<{
      name: string;
      color: string;
      loc: number;
      percentUsed: number;
    }>> = {};
    
    // Process budget items
    budgetData.budgetItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      
      // Calculate the budget item amount and percent used
      const amount = item.quantity * item.unitPrice;
      
      // Calculate percent used (use the enhanced properties if available)
      const percentUsed = 
        (item as any).totalSpent !== undefined && (item as any).amount !== undefined
          ? Math.round(((item as any).totalSpent / (item as any).amount) * 100)
          : 0;
      
      categories[category].push({
        name: item.description,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        loc: (item as any).amount || amount,
        percentUsed
      });
    });
    
    // Convert categories to children array with proper type
    bubbleData.children = Object.entries(categories).map(([category, items]) => {
      return {
        name: category,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        children: items
      };
    });
    
    return bubbleData;
  }, [budgetData]);
  
  return (
    <div className="h-full w-full p-4">
      <ResponsiveCirclePacking
        data={chartData}
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
            <div>${value.toLocaleString()}</div>
            {/* Display percent used if available */}
            {(chartData as any).percentUsed !== undefined && (
              <div>Used: {(chartData as any).percentUsed}%</div>
            )}
          </div>
        )}
      />
      
      <div className="mt-2 flex items-center justify-center space-x-1 text-xs text-muted-foreground">
        <span>Bubble size represents budget allocation amount</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Info className="h-3 w-3 cursor-help opacity-70" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                This visualization shows budget items grouped by category. 
                Larger bubbles represent higher budget allocations.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// Progress visualization using bar chart
function ProgressChartVisualization() {
  const { conversationHistory } = useAgent();
  
  // Process the most recent agent response with progress data
  const progressData = useMemo(() => {
    // Find the latest assistant message with progress data
    const lastProgressMessage = [...conversationHistory]
      .reverse()
      .find(msg => 
        msg.role === 'assistant' && 
        msg.data && 
        (msg.data as any).overallProgress !== undefined
      );
    
    if (lastProgressMessage?.data) {
      // Cast to ProgressAnalysis type
      return lastProgressMessage.data as ProgressAnalysis;
    }
    
    // If no progress data found, return null
    return null;
  }, [conversationHistory]);
  
  // Transform progress data for the bar chart
  const chartData = useMemo(() => {
    if (!progressData || !progressData.goalProgress || progressData.goalProgress.length === 0) {
      // Default empty structure
      return [];
    }
    
    // Map goal progress to chart format
    return progressData.goalProgress.map((goal, index) => {
      // Generate a color based on index
      const hue = (index * 60) % 360;
      return {
        goal: goal.goalTitle,
        progress: Math.round(goal.progress), // Ensure we have whole numbers
        progressColor: `hsl(${hue}, 70%, 50%)`,
        milestones: goal.milestones.length,
        completedMilestones: goal.milestones.filter(m => m.completed).length
      };
    }).slice(0, 8); // Limit to 8 goals for visual clarity
  }, [progressData]);
  
  // If we have no data to display, show a message
  if (chartData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <p className="mb-2 text-sm">No progress data available</p>
          <p className="text-xs">Ask a question about client progress to see visualization</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full p-4">
      <ResponsiveBar
        data={chartData}
        keys={['progress']}
        indexBy="goal"
        margin={{ top: 10, right: 30, bottom: 50, left: 100 }}
        padding={0.3}
        layout="horizontal"
        valueScale={{ type: 'linear', max: 100 }} // Always use 100% as max
        indexScale={{ type: 'band', round: true }}
        colors={(bar) => {
          // Type safe way to access the color
          const d = bar.data as { progressColor: string; progress: number };
          
          // Color based on progress value
          if (d.progress >= 75) return 'hsl(142, 76%, 36%)'; // Green for high progress
          if (d.progress >= 50) return 'hsl(48, 96%, 53%)';  // Yellow for medium progress
          return 'hsl(358, 75%, 59%)'; // Red for low progress
        }}
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
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
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
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
        tooltip={({ data, value, color }) => (
          <div
            style={{
              padding: '12px',
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <strong style={{ color }}>{data.goal}</strong>
            <div>Progress: {value}%</div>
            <div>Milestones: {data.completedMilestones}/{data.milestones}</div>
          </div>
        )}
      />
      
      <div className="mt-2 flex items-center justify-center space-x-1 text-xs text-muted-foreground">
        <span>Goal progress compared to 50% target threshold</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Info className="h-3 w-3 cursor-help opacity-70" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                This chart shows progress toward each therapy goal. 
                The dotted line at 50% represents the target threshold.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}