import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  User, 
  Sparkles, 
  X, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  BarChart3,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { useAgent } from './AgentContext';
import { Message } from '@/lib/agent/types';
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

interface AgentPanelProps {
  className?: string;
}

/**
 * Panel for displaying agent conversation and visualizations
 */
export function AgentPanel({ className }: AgentPanelProps) {
  const { 
    conversationHistory, 
    isAgentVisible,
    isProcessingQuery,
    clearConversation,
    processQuery 
  } = useAgent();
  
  const [userInput, setUserInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory, isMinimized]);
  
  // Focus on input when panel becomes visible
  useEffect(() => {
    if (isAgentVisible && inputRef.current && !isMinimized) {
      inputRef.current.focus();
    }
  }, [isAgentVisible, isMinimized]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isProcessingQuery) return;
    
    try {
      await processQuery(userInput);
      setUserInput('');
    } catch (error) {
      console.error('Error processing query:', error);
    }
  };
  
  // If panel is not visible, don't render anything
  if (!isAgentVisible) {
    return null;
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed bottom-20 right-6 z-40 w-full max-w-md overflow-hidden rounded-lg border bg-card shadow-lg',
          isMinimized ? 'h-14' : 'h-[70vh] max-h-[600px]',
          className
        )}
      >
        {/* Panel header */}
        <div className="flex h-14 items-center justify-between border-b bg-muted/50 px-4">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Budget Assistant</h3>
          </div>
          
          <div className="flex items-center space-x-1">
            {!isMinimized && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={clearConversation}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear conversation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Conversation area - only show when not minimized */}
        {!isMinimized && (
          <>
            <ScrollArea className="h-[calc(100%-7rem)]">
              <div className="flex flex-col space-y-4 p-4">
                {conversationHistory.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                    <Sparkles className="mb-2 h-10 w-10 text-primary/30" />
                    <p>Ask me about budgets, client progress, or therapy strategies.</p>
                    <p className="mt-1 text-xs">I can help analyze data and provide insights.</p>
                  </div>
                ) : (
                  conversationHistory.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Input area */}
            <div className="absolute bottom-0 left-0 right-0 border-t bg-card p-3">
              <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <Input
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1"
                  disabled={isProcessingQuery}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isProcessingQuery || !userInput.trim()}
                >
                  {isProcessingQuery ? (
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Component for individual message bubbles
function MessageBubble({ message }: { message: Message }) {
  const isAssistant = message.role === 'assistant';
  
  return (
    <div className={cn(
      'flex w-full',
      isAssistant ? 'justify-start' : 'justify-end'
    )}>
      <div className={cn(
        'flex max-w-[85%]',
        isAssistant ? 'flex-row' : 'flex-row-reverse'
      )}>
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isAssistant ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          {isAssistant ? (
            <Bot className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
        
        <div className={cn(
          'mx-2 rounded-lg px-3 py-2 text-sm',
          isAssistant 
            ? 'bg-muted' 
            : 'bg-primary text-primary-foreground'
        )}>
          <div className="whitespace-pre-line">{message.content}</div>
          
          {/* Show confidence indicator for assistant messages */}
          {isAssistant && message.confidence !== undefined && (
            <div className="mt-1 flex items-center justify-end text-xs text-muted-foreground">
              <div className="flex h-1 w-16 overflow-hidden rounded bg-muted-foreground/20">
                <div 
                  className={cn(
                    "h-full",
                    message.confidence > 0.8 
                      ? "bg-green-500" 
                      : message.confidence > 0.5 
                        ? "bg-yellow-500" 
                        : "bg-red-500"
                  )}
                  style={{ width: `${message.confidence * 100}%` }}
                />
              </div>
              <span className="ml-1">
                {format(new Date(message.timestamp), 'HH:mm')}
              </span>
            </div>
          )}
          
          {/* Show timestamp for user messages */}
          {!isAssistant && (
            <div className="mt-1 text-right text-xs text-primary-foreground/70">
              {format(new Date(message.timestamp), 'HH:mm')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}