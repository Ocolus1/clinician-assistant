/**
 * Message Bubble Component
 * 
 * Displays a single message in the chat interface with appropriate styling
 * based on the message role (user or assistant).
 */

import React from 'react';
import { Message } from '@shared/assistantTypes';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isLoading = message.id === 'loading';
  
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <Avatar className="h-8 w-8 bg-primary-foreground border">
          <AvatarFallback className="text-primary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div 
        className={`relative rounded-lg p-3 max-w-[80%] ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-secondary text-secondary-foreground'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-1 h-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap text-sm">
              {message.content}
            </div>
            <div className="text-xs mt-1 opacity-70">
              {format(new Date(message.createdAt), 'h:mm a')}
            </div>
          </>
        )}
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}