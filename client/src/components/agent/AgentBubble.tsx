import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Bot, X } from 'lucide-react';
import { useAgent } from './AgentContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AgentBubbleProps {
  className?: string;
}

/**
 * A floating bubble component for interacting with the agent
 */
export function AgentBubble({ className }: AgentBubbleProps) {
  const { 
    queryConfidence, 
    isAgentVisible, 
    isProcessingQuery,
    toggleAgentVisibility, 
    processQuery 
  } = useAgent();
  
  const [userQuery, setUserQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Show pulsing animation based on confidence level
  useEffect(() => {
    if (queryConfidence > 0.7) {
      setIsPulsing(true);
      const timer = setTimeout(() => {
        setIsPulsing(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [queryConfidence]);

  // Handle query submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isProcessingQuery) return;
    
    try {
      await processQuery(userQuery);
      setUserQuery('');
      setIsExpanded(false);
      // Show the full agent panel
      if (!isAgentVisible) {
        toggleAgentVisibility();
      }
    } catch (error) {
      console.error('Error processing query:', error);
    }
  };

  // Handle escape key to close
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  return (
    <div 
      className={cn(
        'fixed bottom-6 right-6 z-50 flex flex-col items-end',
        className
      )}
    >
      {/* Search input for quick queries */}
      <AnimatePresence>
        {isExpanded && (
          <motion.form
            initial={{ opacity: 0, y: 10, width: '40px' }}
            animate={{ opacity: 1, y: 0, width: '300px' }}
            exit={{ opacity: 0, y: 10, width: '40px' }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex w-full"
            onSubmit={handleSubmit}
          >
            <Input
              ref={inputRef}
              type="text"
              placeholder="Ask a question about budgets, progress, etc."
              className="pr-12 shadow-lg"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessingQuery}
            />
            <Button 
              size="sm" 
              type="submit" 
              className="ml-2 px-2" 
              disabled={isProcessingQuery || !userQuery.trim()}
            >
              {isProcessingQuery ? (
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Agent bubble */}
      <motion.div
        className={cn(
          'flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg',
          isPulsing && 'ring-4 ring-primary/30 transition-all duration-500'
        )}
        onClick={() => {
          if (isExpanded) {
            setIsExpanded(false);
          } else if (isAgentVisible) {
            toggleAgentVisibility();
          } else {
            setIsExpanded(true);
          }
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={isPulsing ? { scale: [1, 1.05, 1] } : {}}
        transition={isPulsing ? { 
          duration: 1, 
          repeat: 2, 
          repeatType: 'reverse'
        } : {}}
      >
        {isAgentVisible ? (
          <X className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </motion.div>
    </div>
  );
}