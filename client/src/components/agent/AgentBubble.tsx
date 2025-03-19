import React from 'react';
import { Bot, MessageSquare } from 'lucide-react';
import { useAgent } from './AgentContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AgentBubble() {
  const { toggleAgentVisibility, isAgentVisible, conversationHistory } = useAgent();
  
  // Check if the last message has suggestions to indicate in the bubble
  const hasSuggestions = React.useMemo(() => {
    if (conversationHistory.length === 0) return false;
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    return (
      lastMessage.role === 'assistant' && 
      lastMessage.suggestedFollowUps && 
      lastMessage.suggestedFollowUps.length > 0
    );
  }, [conversationHistory]);
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Suggestion indicator */}
      {hasSuggestions && !isAgentVisible && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs animate-pulse z-10">
          <MessageSquare className="h-3 w-3" />
        </div>
      )}
      
      {/* Main bubble button */}
      <Button 
        onClick={toggleAgentVisibility}
        className={cn(
          "h-14 w-14 rounded-full p-2 shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "flex items-center justify-center",
          "transition-all duration-200 ease-in-out",
          isAgentVisible && "rotate-90 scale-90",
          hasSuggestions && !isAgentVisible && "ring-2 ring-amber-400"
        )}
        aria-label={isAgentVisible ? "Close assistant" : "Open assistant"}
      >
        <Bot className="h-8 w-8" />
      </Button>
    </div>
  );
}