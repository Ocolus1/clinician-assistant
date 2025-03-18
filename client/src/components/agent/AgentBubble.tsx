import React from 'react';
import { useAgent } from './AgentContext';
import {
  MessageSquareText,
  X,
  ChevronUp,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A floating bubble that provides access to the agent assistant
 */
export function AgentBubble() {
  const {
    isAgentVisible,
    toggleAgentVisibility,
    queryConfidence
  } = useAgent();
  
  // Change animation based on confidence (more sparkles/pulse for higher confidence)
  const confidenceClass = 
    queryConfidence > 0.8 ? 'agent-bubble-high-confidence' :
    queryConfidence > 0.5 ? 'agent-bubble-medium-confidence' :
    'agent-bubble-low-confidence';
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={toggleAgentVisibility}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full bg-primary shadow-lg hover:shadow-xl transition-all duration-300',
          'text-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:ring-offset-2',
          confidenceClass
        )}
        aria-label={isAgentVisible ? "Close assistant" : "Open assistant"}
      >
        {isAgentVisible ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageSquareText className="w-6 h-6" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
          </div>
        )}
      </button>
      
      {/* Pulse animation and confidence styling */}
      <style jsx>{`
        .agent-bubble-high-confidence {
          animation: pulse 2s infinite;
        }
        
        .agent-bubble-medium-confidence {
          animation: pulse 3s infinite;
        }
        
        .agent-bubble-low-confidence {
          animation: none;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
      `}</style>
    </div>
  );
}