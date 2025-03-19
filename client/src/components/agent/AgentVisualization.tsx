import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from './AgentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BubbleChart } from '@/components/dashboard/BubbleChart';
import { ProgressChart } from '@/components/dashboard/ProgressChart';

/**
 * Visualization component for displaying agent-generated charts and data visualizations
 * Shows different visualizations based on the query type and agent's analysis
 */
export function AgentVisualization() {
  const { latestVisualization } = useAgent();
  
  // If no visualization, don't render anything
  if (latestVisualization === 'NONE') {
    return null;
  }
  
  return (
    <motion.div
      className="fixed bottom-24 right-24 sm:right-[400px] w-[600px] max-w-[calc(100vw-4rem)] bg-background z-40"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <Card className="overflow-hidden border shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {latestVisualization === 'BUBBLE_CHART' && 'Budget Allocation'}
            {latestVisualization === 'PROGRESS_CHART' && 'Progress Tracking'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestVisualization === 'BUBBLE_CHART' && (
            <BubbleChart
              data={{
                name: 'budget',
                color: '#cccccc',
                children: [
                  {
                    name: 'Speech Therapy',
                    color: '#3498db',
                    children: [
                      { name: 'Individual Sessions', value: 5000, color: '#3498db', percentUsed: 45 },
                      { name: 'Group Sessions', value: 3000, color: '#3498db', percentUsed: 30 }
                    ]
                  },
                  {
                    name: 'Assessments',
                    color: '#f1c40f',
                    children: [
                      { name: 'Initial Assessment', value: 2000, color: '#f1c40f', percentUsed: 100 },
                      { name: 'Progress Review', value: 1500, color: '#f1c40f', percentUsed: 75 }
                    ]
                  },
                  {
                    name: 'Materials',
                    color: '#2ecc71',
                    children: [
                      { name: 'Therapy Tools', value: 1200, color: '#2ecc71', percentUsed: 60 },
                      { name: 'Communication Aids', value: 800, color: '#2ecc71', percentUsed: 25 }
                    ]
                  }
                ]
              }}
            />
          )}
          
          {latestVisualization === 'PROGRESS_CHART' && (
            <ProgressChart
              data={[
                { date: 'Jan', Goal1: 30, Goal2: 40, Goal3: 20 },
                { date: 'Feb', Goal1: 40, Goal2: 45, Goal3: 25 },
                { date: 'Mar', Goal1: 45, Goal2: 50, Goal3: 35 },
                { date: 'Apr', Goal1: 55, Goal2: 60, Goal3: 45 },
                { date: 'May', Goal1: 65, Goal2: 70, Goal3: 55 }
              ]}
              keys={['Goal1', 'Goal2', 'Goal3']}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}