import React, { useState, useRef, useEffect } from 'react';
import { useAgent } from './AgentContext';
import { VisualizationHint } from '@/lib/agent/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, User, Bot, RefreshCw, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AgentVisualization from './AgentVisualization';

export default function AgentPanel() {
  const {
    conversationHistory,
    processQuery,
    toggleAgentVisibility,
    clearConversation,
    isProcessingQuery,
    queryConfidence,
    latestVisualization
  } = useAgent();
  
  const [inputValue, setInputValue] = useState('');
  const [showVisualization, setShowVisualization] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when conversation updates
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (inputValue.trim() && !isProcessingQuery) {
      const message = inputValue;
      setInputValue('');
      await processQuery(message);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle visualization display
  const toggleVisualization = () => {
    setShowVisualization(prev => !prev);
  };

  // Format confidence score for display
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };
  
  // Get confidence badge color
  const getConfidenceBadgeClass = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-96 h-[600px] bg-card shadow-xl rounded-t-lg border flex flex-col overflow-hidden z-50">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <h3 className="font-semibold">Therapy Practice Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVisualization}
            className={cn(
              "h-8 w-8 rounded-full",
              showVisualization && "text-primary"
            )}
            title="Toggle visualization"
          >
            <BarChart2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearConversation}
            className="h-8 w-8 rounded-full"
            title="Clear conversation"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAgentVisibility}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Visualization Area (conditional) */}
      {showVisualization && (
        <div className="p-4 border-b">
          <AgentVisualization type={latestVisualization} />
        </div>
      )}
      
      {/* Conversation Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversationHistory.map((message) => (
            <div 
              key={message.id}
              className={cn(
                "flex flex-col max-w-[80%] rounded-lg p-3",
                message.role === 'user' 
                  ? "ml-auto bg-primary text-primary-foreground" 
                  : "bg-muted"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                <span className="text-xs font-medium">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </span>
                {message.role === 'assistant' && message.confidence !== undefined && (
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "text-xs ml-auto",
                      getConfidenceBadgeClass(message.confidence)
                    )}
                  >
                    {getConfidenceLabel(message.confidence)}
                  </Badge>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {/* Suggested follow-up questions */}
              {message.role === 'assistant' && message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Suggested questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {message.suggestedFollowUps.map((suggestion, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm" 
                        className="text-xs py-1 h-auto"
                        onClick={() => {
                          setInputValue(suggestion);
                          // Auto-send the follow-up question
                          setTimeout(() => {
                            processQuery(suggestion);
                          }, 100);
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>
      </ScrollArea>
      
      <Separator />
      
      {/* Input Area */}
      <div className="p-4">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask a question about clients, budgets, or progress..."
            className="resize-none"
            rows={2}
            disabled={isProcessingQuery}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessingQuery}
            size="icon"
            className="h-full aspect-square"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {isProcessingQuery ? 'Processing your request...' : 'Press Enter to send'}
        </p>
      </div>
    </div>
  );
}