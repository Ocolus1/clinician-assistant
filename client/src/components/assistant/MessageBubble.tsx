import React, { useState } from 'react';
import { Message } from '@shared/assistantTypes';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import QueryResultVisualizer from './visualizations/QueryResultVisualizer';

interface MessageBubbleProps {
  message: Message;
  isLoading?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLoading = false }) => {
  const isUser = message.role === 'user';
  
  // Check if this might be budget data to decide whether to show by default
  const mightBeBudgetData = React.useMemo(() => {
    if (!message.queryResult) return false;
    
    // Check query text if available
    if (message.queryResult.metadata?.queryText) {
      const queryText = message.queryResult.metadata.queryText.toLowerCase();
      if (queryText.includes('budget') || 
          queryText.includes('spent') || 
          queryText.includes('utilization')) {
        return true;
      }
    }
    
    // Also check column names for budget-related terms
    if (message.queryResult.columns && Array.isArray(message.queryResult.columns)) {
      return message.queryResult.columns.some(col => {
        const colName = col.toLowerCase();
        return colName.includes('budget') || 
               colName.includes('spent') || 
               colName.includes('allocated') ||
               colName.includes('utilized') ||
               colName.includes('utilization');
      });
    }
    
    return false;
  }, [message.queryResult]);
  
  // Log for debugging
  React.useEffect(() => {
    if (message.queryResult && mightBeBudgetData) {
      console.log('Budget data visualization detected (not auto-showing)');
      // Don't auto-show as per user preference
    }
  }, [message.queryResult, mightBeBudgetData]);
  
  // Query results are always hidden by default (per user preference)
  const [showQueryResults, setShowQueryResults] = useState(false);
  
  // Function to format message content with proper code blocks and markdown
  const formatContent = (content: string) => {
    // First split on SQL code blocks for special formatting
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
      
      // Process markdown-style formatting in the text parts
      let processedText = part;
      
      // Handle bold (**text**) formatting
      processedText = processedText.replace(/\*\*(.*?)\*\*/g, (match, text) => {
        return `<strong>${text}</strong>`;
      });
      
      // Handle italic (*text*) formatting
      processedText = processedText.replace(/\*(.*?)\*/g, (match, text) => {
        return `<em>${text}</em>`;
      });
      
      // Return the processed text with HTML dangerously set
      return (
        <div 
          key={index} 
          className="whitespace-pre-wrap" 
          dangerouslySetInnerHTML={{ __html: processedText }}
        />
      );
    });
  };
  
  return (
    <div className={cn(
      "flex w-full mb-2 md:mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="mr-1 md:mr-2 mt-1">
          <Avatar className="h-6 w-6 md:h-8 md:w-8 bg-primary">
            <AvatarFallback>
              <Bot className="h-3 w-3 md:h-4 md:w-4 text-primary-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      <div className={cn(
        "max-w-[85%] sm:max-w-[80%]", 
        isUser ? "mr-1 md:mr-2" : "ml-1 md:ml-2"
      )}>
        <Card className={cn(
          "p-2 md:p-3 text-sm md:text-base",
          isUser ? 
            "bg-primary text-primary-foreground" : 
            "bg-card border"
        )}>
          {isLoading ? (
            <div className="flex items-center">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-current opacity-75 animate-pulse"></div>
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-current opacity-75 animate-pulse delay-75"></div>
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-current opacity-75 animate-pulse delay-150"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm md:text-base">
                {formatContent(message.content)}
              </div>
              
              {/* Display query result visualization if present with error handling */}
              {message.queryResult && message.queryResult.rows && Array.isArray(message.queryResult.rows) && message.queryResult.rows.length > 0 && (
                <div className="mt-3 md:mt-4 border-t pt-3 md:pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-xs md:text-sm font-medium text-muted-foreground">
                      <Database className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span>Query Results</span>
                      <span className="ml-1 md:ml-2 text-[10px] md:text-xs text-muted-foreground">
                        ({message.queryResult.rows.length} rows)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQueryResults(!showQueryResults)}
                      className="h-6 md:h-7 px-1 md:px-2 text-[10px] md:text-xs flex items-center"
                    >
                      {showQueryResults ? (
                        <>
                          <ChevronUp className="h-3 w-3 md:h-3.5 md:w-3.5 mr-0.5 md:mr-1" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5 mr-0.5 md:mr-1" />
                          <span>Show</span>
                        </>
                      )}
                    </Button>
                  </div>
                  {showQueryResults && <QueryResultVisualizer data={message.queryResult} />}
                </div>
              )}
            </>
          )}
        </Card>
        <div className={cn(
          "text-[10px] md:text-xs mt-0.5 md:mt-1 text-muted-foreground",
          isUser ? "text-right" : "text-left"
        )}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      {isUser && (
        <div className="ml-1 md:ml-2 mt-1">
          <Avatar className="h-6 w-6 md:h-8 md:w-8 bg-primary">
            <AvatarFallback>
              <User className="h-3 w-3 md:h-4 md:w-4 text-primary-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;