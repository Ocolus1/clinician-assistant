import React, { useState, useRef, useEffect } from 'react';
import { useAgent } from './AgentContext';
import {
  MessageSquare,
  Send,
  X,
  RefreshCw,
  User,
  Sparkles,
  BarChart3,
  PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Panel that contains the agent conversation interface
 */
export function AgentPanel() {
  const {
    isAgentVisible,
    toggleAgentVisibility,
    conversationHistory,
    clearConversation,
    processQuery,
    isProcessingQuery,
    queryConfidence,
    latestVisualization
  } = useAgent();
  
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversationHistory]);
  
  // Focus input when panel opens
  useEffect(() => {
    if (isAgentVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAgentVisible]);
  
  // Handle input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessingQuery) return;
    
    // Process query
    await processQuery(inputValue);
    
    // Clear input
    setInputValue('');
  };
  
  // If panel is not visible, don't render anything
  if (!isAgentVisible) return null;
  
  return (
    <div className="fixed bottom-20 right-4 w-96 h-[70vh] max-h-[600px] bg-white dark:bg-gray-900 rounded-lg shadow-xl z-40 flex flex-col border border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-primary" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
          </div>
          <h3 className="font-medium">Therapy Assistant</h3>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Confidence indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  queryConfidence > 0.8 ? "bg-green-500" :
                  queryConfidence > 0.5 ? "bg-yellow-500" : "bg-red-500"
                )} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Confidence level: {Math.round(queryConfidence * 100)}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Visualization indicator */}
          {latestVisualization !== 'NONE' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-primary">
                    {latestVisualization === 'BUBBLE_CHART' ? (
                      <PieChart className="w-4 h-4" />
                    ) : (
                      <BarChart3 className="w-4 h-4" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Visualization available</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Clear conversation button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearConversation} 
            className="h-8 w-8"
            aria-label="Clear conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          {/* Close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleAgentVisibility} 
            className="h-8 w-8"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Conversation area */}
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="flex flex-col gap-4">
          {conversationHistory.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <Sparkles className="w-10 h-10 mx-auto mb-2 text-primary/50" />
              <p className="text-sm">
                Ask me about client budgets, progress tracking, or therapy strategies.
              </p>
            </div>
          ) : (
            conversationHistory.map((message) => (
              <div 
                key={message.id}
                className={cn(
                  "flex gap-2 max-w-[90%]",
                  message.role === 'user' ? "ml-auto" : "mr-auto"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="relative mt-1 flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <Sparkles className="w-2 h-2 absolute -top-1 -right-1 text-yellow-300" />
                  </div>
                )}
                
                <div 
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    message.role === 'user' 
                      ? "bg-primary text-white" 
                      : "bg-gray-100 dark:bg-gray-800"
                  )}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {message.content}
                </div>
                
                {message.role === 'user' && (
                  <div className="mt-1 flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Loading indicator */}
          {isProcessingQuery && (
            <div className="flex gap-2 max-w-[90%] mr-auto">
              <div className="relative mt-1">
                <MessageSquare className="w-5 h-5 text-primary" />
                <Sparkles className="w-2 h-2 absolute -top-1 -right-1 text-yellow-300" />
              </div>
              
              <div className="rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about budgets, progress, or strategies..."
            className="flex-1"
            disabled={isProcessingQuery}
          />
          
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || isProcessingQuery}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}