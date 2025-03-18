import React, { useEffect, useState } from 'react';
import { useAgent } from './AgentContext';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { BudgetItem, BudgetSettings } from '@shared/schema';
import { transformBudgetItemsToBubbleChart } from '@/lib/utils/chartDataUtils';

// Import the components after creating them
// These imports should now work
import { BubbleChart } from '../dashboard/BubbleChart';
import { ProgressChart } from '../dashboard/ProgressChart';

/**
 * A visualization component that displays visualizations based on agent interactions
 */
export function AgentVisualization() {
  const {
    isAgentVisible,
    latestVisualization,
    activeClient
  } = useAgent();
  
  const [isVisible, setIsVisible] = useState(false);
  
  // Check if visualization should be shown
  useEffect(() => {
    if (latestVisualization !== 'NONE' && isAgentVisible) {
      setIsVisible(true);
    }
  }, [latestVisualization, isAgentVisible]);
  
  // Close visualization
  const handleClose = () => {
    setIsVisible(false);
  };
  
  // If not visible or no active client, don't render
  if (!isVisible || !activeClient) return null;
  
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <VisualizationContent 
        type={latestVisualization} 
        clientId={activeClient.id} 
        onClose={handleClose} 
      />
    </div>
  );
}

interface VisualizationContentProps {
  type: 'BUBBLE_CHART' | 'PROGRESS_CHART' | 'NONE';
  clientId: number;
  onClose: () => void;
}

/**
 * Main visualization content based on the type of visualization
 */
function VisualizationContent({ type, clientId, onClose }: VisualizationContentProps) {
  // Fetch budget items for the client
  const { data: budgetItems = [] } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/clients/${clientId}/budget-items`);
      return response as unknown as BudgetItem[];
    },
    enabled: type === 'BUBBLE_CHART'
  });
  
  // Fetch budget settings for the client
  const { data: budgetSettings } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/clients/${clientId}/budget-settings`);
      return response as unknown as BudgetSettings;
    },
    enabled: type === 'BUBBLE_CHART'
  });

  // Fetch goals with progress data for the client
  const { data: goalsWithProgress = [] } = useQuery({
    queryKey: ['/api/clients', clientId, 'goals'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/clients/${clientId}/goals`);
      // Properly cast the response to an array
      const goals = (response as unknown) as any[];
      
      // For each goal, we'd typically fetch subgoals and calculate progress
      // For now, we'll use mock progress values for demonstration
      return goals.map((goal: any) => ({
        ...goal,
        progress: Math.floor(Math.random() * 100) // This should be replaced with real progress data
      }));
    },
    enabled: type === 'PROGRESS_CHART'
  });
  
  return (
    <Card className="w-[800px] h-[600px] shadow-lg border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">
          {type === 'BUBBLE_CHART' ? 'Budget Allocation Visualization' : 'Progress Tracking'}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 h-[calc(600px-64px)]">
        {type === 'BUBBLE_CHART' && budgetItems.length > 0 && (
          <BubbleChartVisualization 
            budgetItems={budgetItems} 
            budgetSettings={budgetSettings}
          />
        )}
        {type === 'PROGRESS_CHART' && goalsWithProgress.length > 0 && (
          <ProgressChartVisualization 
            goalsWithProgress={goalsWithProgress} 
          />
        )}
        {((type === 'BUBBLE_CHART' && budgetItems.length === 0) || 
          (type === 'PROGRESS_CHART' && goalsWithProgress.length === 0)) && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No data available to visualize</p>
          </div>
        )}
      </div>
    </Card>
  );
}

interface BubbleChartVisualizationProps {
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
}

/**
 * Bubble chart visualization for budget items
 */
function BubbleChartVisualization({ budgetItems, budgetSettings }: BubbleChartVisualizationProps) {
  // Transform budget items to bubble chart data
  const bubbleData = transformBudgetItemsToBubbleChart(budgetItems);
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-sm font-medium">Budget Allocation</h4>
          <p className="text-xs text-muted-foreground">
            Visualization of budget items by category and size
          </p>
        </div>
        {budgetSettings && (
          <div className="text-right">
            <p className="text-sm font-medium">Total Budget: {budgetSettings.ndisFunds?.toLocaleString('en-US', { style: 'currency', currency: 'AUD' })}</p>
            <p className="text-xs text-muted-foreground">
              Management: {'Self-Managed'}
            </p>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-[400px]">
        <BubbleChart data={bubbleData} />
      </div>
    </div>
  );
}

interface ProgressChartVisualizationProps {
  goalsWithProgress: any[]; // Replace with proper type when available
}

/**
 * Progress chart visualization for client goals
 */
function ProgressChartVisualization({ goalsWithProgress }: ProgressChartVisualizationProps) {
  // Process data for the progress chart
  const progressData = goalsWithProgress.map(goal => ({
    name: goal.title,
    value: goal.progress
  }));
  
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h4 className="text-sm font-medium">Goal Progress</h4>
        <p className="text-xs text-muted-foreground">
          Progress tracking for client goals
        </p>
      </div>
      <div className="flex-1 min-h-[400px]">
        <ProgressChart data={progressData} />
      </div>
    </div>
  );
}