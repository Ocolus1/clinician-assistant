import React from 'react';
import { Bot } from 'lucide-react';
import { useAgent } from './AgentContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AgentBubble() {
  const { toggleAgentVisibility, isAgentVisible } = useAgent();
  
  return (
    <Button 
      onClick={toggleAgentVisibility}
      className={cn(
        "fixed bottom-6 right-6 h-14 w-14 rounded-full p-2 shadow-lg",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "flex items-center justify-center",
        "z-50 transition-all duration-200 ease-in-out",
        isAgentVisible && "rotate-90 scale-90"
      )}
      aria-label={isAgentVisible ? "Close assistant" : "Open assistant"}
    >
      <Bot className="h-8 w-8" />
    </Button>
  );
}