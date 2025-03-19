import React from 'react';
import { motion, Variants } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useAgent } from './AgentContext';

/**
 * Floating bubble component for accessing the virtual assistant
 * Provides a clean, modern UI element that follows Material Design principles
 */
export function AgentBubble() {
  const { toggleAgentVisibility, isAgentVisible, queryConfidence } = useAgent();
  
  // Animation variants based on confidence level
  const pulseVariants: Variants = {
    idle: {
      scale: 1,
      boxShadow: '0 0 0 0 rgba(52, 152, 219, 0)',
    },
    pulse: {
      scale: [1, 1.05, 1],
      boxShadow: [
        '0 0 0 0 rgba(52, 152, 219, 0)',
        '0 0 0 10px rgba(52, 152, 219, 0.2)',
        '0 0 0 0 rgba(52, 152, 219, 0)',
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: 'loop' as const,
      },
    },
    confident: {
      scale: [1, 1.1, 1],
      boxShadow: [
        '0 0 0 0 rgba(46, 204, 113, 0)',
        '0 0 0 10px rgba(46, 204, 113, 0.3)',
        '0 0 0 0 rgba(46, 204, 113, 0)',
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: 'loop' as const,
      },
    },
  };
  
  // Determine animation variant based on confidence
  const getAnimationVariant = () => {
    if (queryConfidence >= 0.8) return 'confident';
    if (queryConfidence >= 0.4) return 'pulse';
    return 'idle';
  };
  
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <motion.button
        className={`flex items-center justify-center w-14 h-14 rounded-full ${
          isAgentVisible ? 'bg-primary/90' : 'bg-primary'
        } text-primary-foreground shadow-lg hover:shadow-xl transition-shadow`}
        onClick={toggleAgentVisibility}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        variants={pulseVariants}
        animate={getAnimationVariant()}
        aria-label="Toggle Assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </motion.button>
    </motion.div>
  );
}