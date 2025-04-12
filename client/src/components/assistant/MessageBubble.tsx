import React from 'react';
import { Message } from '@shared/assistantTypes';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isLoading?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLoading = false }) => {
  const isUser = message.role === 'user';
  
  // Function to format message content with proper code blocks
  const formatContent = (content: string) => {
    // Split on SQL code blocks for special formatting
    const parts = content.split(/(```sql[\s\S]*?```|```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      // Check if this is a code block
      if (part.startsWith('```sql') || part.startsWith('```')) {
        const code = part
          .replace(/```sql\n?/, '') // Remove ```sql prefix
          .replace(/```\n?/, '')    // Remove ``` prefix
          .replace(/```$/, '')      // Remove trailing ```
          .trim();
          
        const language = part.startsWith('```sql') ? 'sql' : '';
        
        return (
          <div key={index} className="my-2 overflow-x-auto">
            <pre className="p-4 bg-secondary rounded-md text-sm">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      
      // Handle regular text with basic Markdown-like formatting
      return <div key={index} className="whitespace-pre-wrap">{part}</div>;
    });
  };
  
  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="mr-2 mt-1">
          <Avatar className="h-8 w-8 bg-primary">
            <AvatarFallback>
              <Bot className="h-4 w-4 text-primary-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      <div className={cn(
        "max-w-[80%]", 
        isUser ? "mr-2" : "ml-2"
      )}>
        <Card className={cn(
          "p-3",
          isUser ? 
            "bg-primary text-primary-foreground" : 
            "bg-card border"
        )}>
          {isLoading ? (
            <div className="flex items-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-current opacity-75 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-current opacity-75 animate-pulse delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-current opacity-75 animate-pulse delay-150"></div>
              </div>
            </div>
          ) : (
            formatContent(message.content)
          )}
        </Card>
        <div className={cn(
          "text-xs mt-1 text-muted-foreground",
          isUser ? "text-right" : "text-left"
        )}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      {isUser && (
        <div className="ml-2 mt-1">
          <Avatar className="h-8 w-8 bg-primary">
            <AvatarFallback>
              <User className="h-4 w-4 text-primary-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;