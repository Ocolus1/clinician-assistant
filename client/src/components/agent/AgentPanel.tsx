import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, Info } from 'lucide-react';
import { useAgent } from './AgentContext';
import { Message } from '@/lib/agent/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Agent message panel component
 * Displays conversation history with the intelligent agent
 * Allows for sending messages and viewing responses
 */
export function AgentPanel() {
  const { 
    isAgentVisible, 
    toggleAgentVisibility, 
    conversationHistory, 
    processQuery,
    clearConversation,
    isProcessingQuery,
    activeClient,
    queryConfidence
  } = useAgent();
  
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);
  
  // Focus input when panel opens
  useEffect(() => {
    if (isAgentVisible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isAgentVisible]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isProcessingQuery) return;
    
    const query = inputValue;
    setInputValue('');
    
    await processQuery(query);
  };
  
  // Handle pressing enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Get confidence level label
  const getConfidenceLabel = (confidence: number | undefined) => {
    if (!confidence) return null;
    if (confidence >= 0.8) return { label: 'High Confidence', color: 'bg-green-100 text-green-800 border-green-200' };
    if (confidence >= 0.6) return { label: 'Moderate Confidence', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (confidence >= 0.4) return { label: 'Low Confidence', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { label: 'Very Low Confidence', color: 'bg-red-100 text-red-800 border-red-200' };
  };
  
  return (
    <AnimatePresence>
      {isAgentVisible && (
        <motion.div
          className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] rounded-lg bg-background shadow-xl border z-50 flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <h3 className="font-medium text-lg">Assistant</h3>
              {activeClient && (
                <Badge variant="outline" className="ml-2">
                  Client: {activeClient.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full"
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
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={toggleAgentVisibility}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Messages */}
          <ScrollArea className="flex-grow p-4">
            {conversationHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <Info className="h-12 w-12 mb-2 opacity-50" />
                <p className="max-w-[250px]">
                  Ask me about budget details, client progress, or therapy strategies for this client.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversationHistory.map((message: Message) => (
                  <div 
                    key={message.id}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`
                        max-w-[85%] px-3 py-2 rounded-lg
                        ${message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-foreground'}
                      `}
                    >
                      {message.content}
                    </div>
                    
                    {message.role === 'assistant' && message.confidence !== undefined && (
                      <div className="mt-1 flex items-center">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] h-4 ${getConfidenceLabel(message.confidence)?.color}`}
                        >
                          {getConfidenceLabel(message.confidence)?.label}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          <Separator />
          
          {/* Input */}
          <div className="p-3 flex items-center gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about budget, progress, or strategies..."
              className="flex-grow"
              disabled={isProcessingQuery}
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage}
              disabled={inputValue.trim() === '' || isProcessingQuery}
              className={isProcessingQuery ? 'opacity-50' : ''}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}