import React, { useEffect, useState } from 'react';
import { useAgent } from './AgentContext';
import { BudgetBubbleChart } from '../dashboard/BudgetBubbleChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, PieChart, BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Component that displays visualizations based on agent responses
 */
export function AgentVisualization() {
  const { activeClient, latestVisualization, conversationHistory } = useAgent();
  const [isOpen, setIsOpen] = useState(false);
  
  // Automatically open visualization when a new one is available
  useEffect(() => {
    if (latestVisualization !== 'NONE') {
      setIsOpen(true);
    }
  }, [latestVisualization]);
  
  // Get latest response for title/context
  const latestResponse = conversationHistory.length > 0 ? 
    conversationHistory[conversationHistory.length - 1] : null;
  
  if (!isOpen || latestVisualization === 'NONE' || !activeClient) {
    return null;
  }
  
  return (
    <Card className="fixed bottom-20 left-4 w-[500px] h-[400px] shadow-xl z-40 border border-gray-200 dark:border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between p-3 space-y-0">
        <div className="flex items-center gap-2">
          {latestVisualization === 'BUBBLE_CHART' ? (
            <PieChart className="w-4 h-4 text-primary" />
          ) : (
            <BarChart3 className="w-4 h-4 text-primary" />
          )}
          <CardTitle className="text-sm font-medium">
            {latestVisualization === 'BUBBLE_CHART' ? 'Budget Allocation' : 'Progress Tracking'}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0 h-[calc(100%-60px)] overflow-auto">
        {latestVisualization === 'BUBBLE_CHART' && activeClient ? (
          <BudgetBubbleChart clientId={activeClient.id} className="h-full" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
            <Info className="h-10 w-10 text-gray-400" />
            <p>Progress visualization not available yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}