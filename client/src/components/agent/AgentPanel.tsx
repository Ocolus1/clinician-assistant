import React, { useState, useRef, useEffect } from 'react';
import { useAgent } from './AgentContext';
import { X, Send, ArrowUpFromLine, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';

/**
 * Chat interface panel for interacting with the agent assistant
 */
export function AgentPanel() {
  const {
    isAgentVisible,
    toggleAgentVisibility,
    activeClient,
    conversationHistory,
    clearConversation,
    processQuery,
    isProcessingQuery
  } = useAgent();
  
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Scroll to bottom of messages when conversation updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory]);
  
  // Focus input when panel becomes visible
  useEffect(() => {
    if (isAgentVisible && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isAgentVisible]);
  
  // Handle query submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!userInput.trim() || isProcessingQuery) return;
    
    try {
      await processQuery(userInput);
      setUserInput('');
    } catch (error) {
      console.error('Error submitting query:', error);
    }
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
  };
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  if (!isAgentVisible) return null;
  
  return (
    <div className="fixed bottom-20 right-4 z-50 w-[380px] h-[500px] shadow-2xl rounded-xl bg-card overflow-hidden">
      <Card className="flex flex-col h-full border">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-full flex items-center justify-center bg-primary-100">
              <span className="text-primary text-sm font-medium">
                AI
              </span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold">Ignite Assistant</h3>
              {activeClient && (
                <p className="text-xs text-muted-foreground">Analyzing data for {activeClient.name}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7"
              onClick={clearConversation}
              title="Clear conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleAgentVisibility}
              title="Close assistant"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Messages */}
        <ScrollArea className="flex-1 p-3 bg-background/60">
          {conversationHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 space-y-3">
              <div className="relative rounded-full bg-primary/10 p-3">
                <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping"></div>
                <ArrowUpFromLine className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Ask anything about your client's data</h3>
                <p className="text-xs text-muted-foreground">
                  Try "Show me budget utilization" or "What progress has {activeClient?.name} made?"
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {conversationHistory.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-lg p-3 mb-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <time className="text-xs mt-1 opacity-70 self-end">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </time>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        <Separator />
        
        {/* Input form */}
        <form onSubmit={handleSubmit} className="p-3 bg-background">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              placeholder="Ask a question..."
              value={userInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="min-h-[60px] resize-none rounded-lg"
              disabled={isProcessingQuery}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!userInput.trim() || isProcessingQuery}
              className="shrink-0 h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}