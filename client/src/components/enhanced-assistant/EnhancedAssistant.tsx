/**
 * Enhanced Clinician Assistant Component
 * 
 * This component provides a conversational interface for clinicians to query
 * clinical data using natural language and get database-backed responses.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  askEnhancedQuestion,
  getEnhancedFeatures,
  getQueryTemplates
} from '../../lib/enhancedAssistantClient';
import { EnhancedAssistantResponse as ResponseType } from '@shared/enhancedAssistantTypes';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  BrainCircuit, 
  SendIcon, 
  User, 
  Bot, 
  MessageSquare, 
  LightbulbIcon,
  DatabaseIcon,
  Clock
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types for our conversation
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  response?: ResponseType;
}

const EXAMPLE_QUESTIONS = [
  "How many active clients do we have?",
  "Show me clients who need budget renewal this month",
  "List all sessions scheduled for next week",
  "What's the average session duration for clients with autism?",
  "Which therapists have the highest caseload?"
];

const EnhancedAssistant: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch available features (still loaded but used automatically)
  const featuresQuery = useQuery({
    queryKey: ['/api/enhanced-assistant/features'],
    queryFn: getEnhancedFeatures
  });

  // Fetch query templates
  const templatesQuery = useQuery({
    queryKey: ['/api/enhanced-assistant/templates'],
    queryFn: getQueryTemplates
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Handle asking a question
  const askMutation = useMutation({
    mutationFn: askEnhancedQuestion,
    onSuccess: (data, variables) => {
      // Add assistant response to conversation
      setConversation(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          content: data.explanation || data.originalQuestion,
          sender: 'assistant',
          timestamp: new Date(),
          response: data
        }
      ]);
      setQuestion('');
    }
  });

  // Handle question submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || askMutation.isPending) return;
    
    // Add user message to conversation
    const newMessage: Message = {
      id: Date.now().toString(),
      content: question,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setConversation(prev => [...prev, newMessage]);
    
    // Send to API
    askMutation.mutate({
      question,
      useBusinessContext: true,
      useTemplates: true,
      useMultiQuery: true
    });
  };

  // Set an example question
  const handleExampleClick = (example: string) => {
    setQuestion(example);
    // Focus the input after setting the example
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render data table from response
  const renderDataTable = (data: any[]) => {
    if (!data || data.length === 0) return null;
    
    // Extract column headers from the first data item
    const columns = Object.keys(data[0]);
    
    return (
      <div className="overflow-x-auto mt-2 rounded-md border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {columns.map((column, index) => (
                <th key={index} className="p-2 text-left text-xs font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="p-2 text-sm border-t">
                    {formatCellValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Helper function to format cell values
  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">NULL</span>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toLocaleString();
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-6rem)]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Enhanced Clinician Assistant</CardTitle>
            </div>
            <CardDescription className="m-0">
              Ask questions about your practice in plain English
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 flex flex-col">
          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4">
            {conversation.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground opacity-50" />
                <div className="space-y-2 max-w-md">
                  <h3 className="text-xl font-medium">How can I help you today?</h3>
                  <p className="text-muted-foreground">
                    Ask me anything about your practice data. I can help you find information about clients, 
                    appointments, budgets, and more.
                  </p>
                </div>
                
                <div className="w-full max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <LightbulbIcon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">Try asking:</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_QUESTIONS.map((example, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 py-1.5"
                        onClick={() => handleExampleClick(example)}
                      >
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {conversation.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-3 flex flex-col gap-1 ${
                        message.sender === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {message.sender === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                        <span className="text-xs opacity-70">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      
                      <div>
                        <p className="break-words">{message.content}</p>
                        
                        {/* Render data if it's an assistant message with data */}
                        {message.sender === 'assistant' && message.response?.data && message.response.data.length > 0 && (
                          <Tabs defaultValue="table" className="mt-3">
                            <TabsList className="w-full justify-start bg-background/50">
                              <TabsTrigger value="table">Results</TabsTrigger>
                              {message.response.sqlQuery && (
                                <TabsTrigger value="query">SQL Query</TabsTrigger>
                              )}
                            </TabsList>
                            <TabsContent value="table" className="mt-2">
                              {renderDataTable(message.response.data)}
                            </TabsContent>
                            {message.response.sqlQuery && (
                              <TabsContent value="query" className="mt-2">
                                <pre className="bg-background/50 p-2 rounded text-xs whitespace-pre-wrap">
                                  {message.response.sqlQuery}
                                </pre>
                              </TabsContent>
                            )}
                          </Tabs>
                        )}
                        
                        {/* Show metadata for assistant messages */}
                        {message.sender === 'assistant' && message.response && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {message.response.usedTemplate && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" size="sm" className="text-xs">
                                      <DatabaseIcon className="h-3 w-3 mr-1" />
                                      Template: {message.response.usedTemplate}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Used a predefined query template</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {message.response.executionTime && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" size="sm" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {(message.response.executionTime / 1000).toFixed(2)}s
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Query execution time</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          {/* Thinking indicator */}
          {askMutation.isPending && (
            <div className="p-3 border-t bg-background/80">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
          
          {/* Input area */}
          <div className="p-3 border-t bg-background/80">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask a question about your practice..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1"
                disabled={askMutation.isPending}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!question.trim() || askMutation.isPending}
              >
                <SendIcon className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAssistant;