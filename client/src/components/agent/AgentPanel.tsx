import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAgent } from './AgentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, RefreshCw, Zap } from 'lucide-react';

/**
 * Agent conversation panel
 * Features:
 * - Chat interface for interacting with the agent
 * - Animated message display
 * - Message history with auto-scroll
 * - Input field with submit button
 */
export function AgentPanel() {
  const { 
    isAgentVisible, 
    conversationHistory, 
    processQuery, 
    isProcessingQuery,
    clearConversation 
  } = useAgent();
  
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [conversationHistory]);
  
  // Handle query submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessingQuery) return;
    
    try {
      await processQuery(inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Error submitting query:', error);
    }
  };
  
  // Panel animation variants
  const panelVariants = {
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
        damping: 30 
      }
    }
  };
  
  // If the panel shouldn't be visible, don't render it
  if (!isAgentVisible) return null;
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={panelVariants}
      className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-background border rounded-lg shadow-lg overflow-hidden z-40 flex flex-col"
    >
      {/* Header */}
      <div className="p-3 border-b flex justify-between items-center bg-muted/30">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-primary" />
          <h3 className="font-medium">Practice Assistant</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearConversation}
          title="Clear conversation"
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      
      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-3">
        <div className="space-y-4">
          {/* Welcome message if no conversation history */}
          {conversationHistory.length === 0 && (
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-sm">
                Hi there! I'm your practice assistant. I can help you analyze budgets, 
                track progress, and recommend strategies. How can I help you today?
              </p>
            </div>
          )}
          
          {/* Conversation messages */}
          {conversationHistory.map((message) => (
            <div
              key={message.id}
              className={`${
                message.role === 'user' 
                  ? 'ml-auto bg-primary text-primary-foreground' 
                  : 'mr-auto bg-muted'
              } max-w-[85%] rounded-lg p-3`}
            >
              <p className="text-sm">{message.content}</p>
              {message.role === 'assistant' && message.confidence && (
                <div className="mt-1 flex items-center gap-1">
                  <div 
                    className="h-1.5 rounded-full bg-background/30 w-16 overflow-hidden"
                    title={`Confidence: ${Math.round(message.confidence * 100)}%`}
                  >
                    <div 
                      className="h-full bg-background"
                      style={{ width: `${message.confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Processing indicator */}
          {isProcessingQuery && (
            <div className="mr-auto bg-muted max-w-[85%] rounded-lg p-3">
              <div className="flex gap-1">
                <span className="animate-bounce">•</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>•</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question..."
          disabled={isProcessingQuery}
          className="flex-1"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!inputValue.trim() || isProcessingQuery}
        >
          <Send size={16} />
        </Button>
      </form>
    </motion.div>
  );
}