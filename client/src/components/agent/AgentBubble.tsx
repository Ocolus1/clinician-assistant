import React, { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { useAgent } from './AgentContext';
import { Button } from '@/components/ui/button';
import { Bot, X } from 'lucide-react';

/**
 * Floating bubble for accessing the agent
 * Features:
 * - Animated reactions based on confidence
 * - Click to open/close agent panel
 * - Hover effects for better UX
 */
export function AgentBubble() {
  const { 
    isAgentVisible, 
    toggleAgentVisibility, 
    queryConfidence, 
    isProcessingQuery
  } = useAgent();
  
  const controls = useAnimationControls();
  
  // Animate the bubble based on query confidence
  useEffect(() => {
    if (isProcessingQuery) {
      // Pulsing animation while processing
      controls.start({
        scale: [1, 1.05, 1],
        transition: { 
          repeat: Infinity, 
          duration: 1.5 
        }
      });
    } else if (queryConfidence > 0) {
      // Reaction animation based on confidence
      const animationScale = queryConfidence >= 0.8 
        ? 1.3  // High confidence
        : queryConfidence >= 0.5 
          ? 1.2  // Medium confidence
          : 1.1;  // Low confidence
      
      controls.start({
        scale: [1, animationScale, 1],
        transition: { 
          duration: 0.5, 
          times: [0, 0.5, 1] 
        }
      });
    } else {
      // Reset animation
      controls.start({ scale: 1 });
    }
  }, [queryConfidence, isProcessingQuery, controls]);
  
  // Show enlarged bubble when agent panel is open
  const baseScale = isAgentVisible ? 1.2 : 1;
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.div
        animate={controls}
        initial={{ scale: baseScale }}
        className="relative"
      >
        <Button
          onClick={toggleAgentVisibility}
          className={`rounded-full p-3 w-14 h-14 flex items-center justify-center shadow-lg ${
            isAgentVisible ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'
          }`}
        >
          {isAgentVisible ? (
            <X size={24} />
          ) : (
            <Bot size={24} />
          )}
        </Button>
        
        {isProcessingQuery && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-pulse" />
        )}
      </motion.div>
    </div>
  );
}