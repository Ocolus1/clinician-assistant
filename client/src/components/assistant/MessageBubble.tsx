/**
 * Message Bubble Component
 * 
 * This component displays a message in the chat interface.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, Loader2 } from 'lucide-react';
import { Message } from '@shared/assistantTypes';

interface MessageBubbleProps {
  message: Message;
}

/**
 * Message Bubble Component
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUserMessage = message.role === 'user';

  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 py-4",
        isUserMessage ? "justify-end" : "justify-start"
      )}
    >
      {!isUserMessage && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
      )}
      
      <div
        className={cn(
          "rounded-lg p-3 max-w-[80%]",
          isUserMessage 
            ? "bg-primary text-primary-foreground rounded-tr-none" 
            : "bg-muted rounded-tl-none"
        )}
      >
        {message.content ? (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
      
      {isUserMessage && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}