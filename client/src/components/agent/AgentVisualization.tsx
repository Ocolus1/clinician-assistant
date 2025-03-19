import React from 'react';
import { motion } from 'framer-motion';
import { useAgent } from './AgentContext';
import { BubbleChart } from '@/components/dashboard/BubbleChart';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * Visualization component for agent responses
 * Features:
 * - Dynamic visualization based on query content
 * - Animations for smooth transitions
 * - Support for different chart types
 */
export function AgentVisualization() {
  const { 
    latestVisualization, 
    isAgentVisible 
  } = useAgent();
  
  // If no visualization is needed, don't render anything
  if (latestVisualization === 'NONE' || !isAgentVisible) return null;
  
  // Card animation variants
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: 'spring', 
        stiffness: 500, 
        damping: 30,
        delay: 0.1 // Slight delay after the panel appears
      }
    }
  };
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={cardVariants}
      className="fixed bottom-24 right-[420px] w-[500px] bg-background border rounded-lg shadow-lg overflow-hidden z-30"
    >
      <Card className="border-0 shadow-none">
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
                      { name: 'Individual Sessions', value: 5000, color: '#3498db' },
                      { name: 'Group Sessions', value: 3000, color: '#3498db' }
                    ]
                  },
                  {
                    name: 'Assessments',
                    color: '#f1c40f',
                    children: [
                      { name: 'Initial Assessment', value: 2000, color: '#f1c40f' },
                      { name: 'Progress Review', value: 1500, color: '#f1c40f' }
                    ]
                  },
                  {
                    name: 'Materials',
                    color: '#2ecc71',
                    children: [
                      { name: 'Therapy Tools', value: 1200, color: '#2ecc71' },
                      { name: 'Communication Aids', value: 800, color: '#2ecc71' }
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