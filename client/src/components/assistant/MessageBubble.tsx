/**
 * Message Bubble Component
 * 
 * This component renders a message bubble in the chat interface,
 * with different styles based on the message role.
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Message } from '@shared/assistantTypes';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';
  const isLoading = message.id === 'loading';
  
  return (
    <div className={cn(
      "flex",
      isAssistant ? "justify-start" : "justify-end"
    )}>
      <Card className={cn(
        "max-w-[80%] px-4 py-2",
        isAssistant 
          ? "bg-slate-100 dark:bg-slate-800" 
          : "bg-primary/10 dark:bg-primary/20",
        isAssistant && isLoading && "animate-pulse"
      )}>
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary/50" />
          </div>
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap break-words mb-0 text-sm">
              {message.content}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}