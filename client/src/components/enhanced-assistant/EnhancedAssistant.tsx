/**
 * Enhanced Clinician Assistant Component
 * 
 * This component provides a conversational interface for clinicians to query
 * clinical data using natural language, with advanced features like visualization,
 * conversation history, and intelligent insights.
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft,
  Loader2, 
  ChevronLeft,
  PlusCircle,
  MessageSquare, 
  MoreVertical,
  Settings,
  SendIcon,
  User,
  Clock,
  BarChart3,
  Database,
  ChevronsUpDown,
  RefreshCw
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Types for our conversation
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  response?: ResponseType;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

interface AssistantSettings {
  useBusinessContext: boolean;
  useTemplates: boolean;
  useMultiQuery: boolean;
  showSQLQueries: boolean;
  showExecutionTime: boolean;
}

const DEFAULT_SETTINGS: AssistantSettings = {
  useBusinessContext: true,
  useTemplates: true,
  useMultiQuery: true,
  showSQLQueries: false,
  showExecutionTime: true,
};

// Example questions for the UI
const EXAMPLE_QUESTIONS = [
  "How many active clients do we have?",
  "Show me a list of clients with incomplete assessments",
  "What's the average session duration for therapist Sarah in March?",
  "List all clients with budgets over 80% utilized",
  "Which therapists have the highest caseload?"
];

const EnhancedAssistant: React.FC = () => {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AssistantSettings>(DEFAULT_SETTINGS);
  const [question, setQuestion] = useState('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sidebar visibility control based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarVisible(false);
      } else {
        setIsSidebarVisible(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch available features
  const featuresQuery = useQuery({
    queryKey: ['/api/enhanced-assistant/features'],
    queryFn: getEnhancedFeatures
  });

  // Fetch query templates
  const templatesQuery = useQuery({
    queryKey: ['/api/enhanced-assistant/templates'],
    queryFn: getQueryTemplates
  });

  // Initialize with a default conversation on mount
  useEffect(() => {
    if (conversations.length === 0) {
      const newConversation = createNewConversation();
      setConversations([newConversation]);
      setActiveConversation(newConversation);
    }
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  // Create a new conversation
  const createNewConversation = (): Conversation => {
    const now = new Date();
    return {
      id: Date.now().toString(),
      title: `New Conversation - ${formatConversationTime(now)}`,
      createdAt: now,
      updatedAt: now,
      messages: []
    };
  };

  // Format time for conversation titles
  const formatConversationTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Handle starting a new conversation
  const handleNewConversation = () => {
    const newConversation = createNewConversation();
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(newConversation);
    setQuestion('');
    
    // On mobile, close the sidebar when starting a new conversation
    if (window.innerWidth < 768) {
      setIsSidebarVisible(false);
    }
  };

  // Handle deleting a conversation
  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    
    // If we deleted the active conversation, set active to the most recent one
    if (activeConversation?.id === conversationId) {
      const remainingConversations = conversations.filter(c => c.id !== conversationId);
      if (remainingConversations.length > 0) {
        setActiveConversation(remainingConversations[0]);
      } else {
        const newConversation = createNewConversation();
        setConversations([newConversation]);
        setActiveConversation(newConversation);
      }
    }
  };

  // Handle switching conversations
  const handleSwitchConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    
    // On mobile, close the sidebar when switching conversations
    if (window.innerWidth < 768) {
      setIsSidebarVisible(false);
    }
  };

  // Handle updating settings
  const handleSettingsChange = (key: keyof AssistantSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Get a more human-like response from the assistant
  const humanizeResponse = (response: ResponseType): string => {
    // If there's an explanation provided, use it
    if (response.explanation) return response.explanation;
    
    // If there's data but no explanation, generate one based on the data
    if (response.data && response.data.length > 0) {
      // Single value result
      if (response.data.length === 1 && Object.keys(response.data[0]).length === 1) {
        const key = Object.keys(response.data[0])[0];
        const value = response.data[0][key];
        
        if (key.includes('count')) {
          return `The ${key.replace('_', ' ')} is ${value}.`;
        }
        
        return `The ${key.replace('_', ' ')} is ${value}.`;
      }
      
      // Multiple rows or columns
      if (response.data.length === 0) {
        return `I couldn't find any data matching your query. Please try a different question or criteria.`;
      } else if (response.data.length === 1) {
        return `I found 1 record that matches your query. You can see the details in the results below.`;
      } else {
        return `I found ${response.data.length} records that match your query. You can see the details in the results below.`;
      }
    }
    
    // Fallback
    return "I've processed your request. Here are the results.";
  };

  // Customize the query error based on the query attempt
  const getQueryErrorMessage = (errorMessage?: string): string => {
    if (!errorMessage) return "I'm having trouble processing your request right now.";
    
    if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
      const match = errorMessage.match(/relation "(.*?)" does not exist/);
      const tableName = match ? match[1] : "the requested table";
      return `I couldn't find ${tableName} in the database. This might be because the data is stored differently than expected. Could you try rephrasing your question?`;
    }
    
    if (errorMessage.includes("syntax error")) {
      return "I couldn't generate a valid query for your question. Could you try rephrasing it or being more specific?";
    }
    
    return "I encountered an error while processing your request. This might be due to the way the question was phrased or the specific data you're looking for. Could you try a different approach?";
  };

  // Handle asking a question
  const askMutation = useMutation({
    mutationFn: askEnhancedQuestion,
    onSuccess: (data, variables) => {
      if (!activeConversation) return;
      
      // Generate a natural language response
      const humanResponse = data.errorMessage 
        ? getQueryErrorMessage(data.errorMessage)
        : humanizeResponse(data);
      
      // Update conversation with assistant response
      const updatedConversation = {
        ...activeConversation,
        updatedAt: new Date(),
        messages: [
          ...activeConversation.messages,
          {
            id: Date.now().toString(),
            content: humanResponse,
            sender: 'assistant',
            timestamp: new Date(),
            response: data
          }
        ]
      };
      
      // Update the conversations list
      setConversations(prev => 
        prev.map(c => c.id === updatedConversation.id ? updatedConversation : c)
      );
      
      // Update active conversation
      setActiveConversation(updatedConversation);
      setQuestion('');
    }
  });

  // Handle question submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || askMutation.isPending || !activeConversation) return;
    
    // Add user message to conversation
    const userMessage: Message = {
      id: Date.now().toString(),
      content: question,
      sender: 'user',
      timestamp: new Date(),
    };
    
    // Update the active conversation with the user message
    const updatedConversation = {
      ...activeConversation,
      updatedAt: new Date(),
      messages: [...activeConversation.messages, userMessage]
    };
    
    // Update the conversations list
    setConversations(prev => 
      prev.map(c => c.id === updatedConversation.id ? updatedConversation : c)
    );
    
    // Update active conversation
    setActiveConversation(updatedConversation);
    
    // Send to API with current settings
    askMutation.mutate({
      question,
      useBusinessContext: settings.useBusinessContext,
      useTemplates: settings.useTemplates,
      useMultiQuery: settings.useMultiQuery
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

  // Format timestamp for messages
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for display
  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
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
                  {column.replace('_', ' ')}
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

  // Get conversation summary for the sidebar
  const getConversationSummary = (conversation: Conversation) => {
    // Find the first user message to use as the summary
    const firstUserMessage = conversation.messages.find(m => m.sender === 'user');
    if (firstUserMessage) {
      // Truncate if too long
      return firstUserMessage.content.length > 40 
        ? `${firstUserMessage.content.substring(0, 40)}...` 
        : firstUserMessage.content;
    }
    return '';
  };

  // Render settings dialog
  const renderSettingsDialog = () => (
    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assistant Settings</DialogTitle>
          <DialogDescription>
            Configure how the assistant processes your questions and displays results.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Query Processing</h3>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="business-context" className="text-sm">Clinical Context</Label>
                <p className="text-xs text-muted-foreground">
                  Use domain knowledge specific to therapy clinics
                </p>
              </div>
              <Switch 
                id="business-context" 
                checked={settings.useBusinessContext}
                onCheckedChange={(checked) => handleSettingsChange('useBusinessContext', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="templates" className="text-sm">Query Templates</Label>
                <p className="text-xs text-muted-foreground">
                  Use pre-built templates for common questions
                </p>
              </div>
              <Switch 
                id="templates" 
                checked={settings.useTemplates}
                onCheckedChange={(checked) => handleSettingsChange('useTemplates', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="multi-query" className="text-sm">Multi-Query Analysis</Label>
                <p className="text-xs text-muted-foreground">
                  Enable complex analysis using multiple queries
                </p>
              </div>
              <Switch 
                id="multi-query" 
                checked={settings.useMultiQuery}
                onCheckedChange={(checked) => handleSettingsChange('useMultiQuery', checked)}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Display Options</h3>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-sql" className="text-sm">Show SQL Queries</Label>
                <p className="text-xs text-muted-foreground">
                  Display the SQL queries used to retrieve data
                </p>
              </div>
              <Switch 
                id="show-sql" 
                checked={settings.showSQLQueries}
                onCheckedChange={(checked) => handleSettingsChange('showSQLQueries', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-time" className="text-sm">Show Execution Time</Label>
                <p className="text-xs text-muted-foreground">
                  Display how long it took to process the query
                </p>
              </div>
              <Switch 
                id="show-time" 
                checked={settings.showExecutionTime}
                onCheckedChange={(checked) => handleSettingsChange('showExecutionTime', checked)}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettings(DEFAULT_SETTINGS)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            
            <Button 
              size="sm"
              onClick={() => setIsSettingsOpen(false)}
            >
              Apply Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-1 overflow-hidden border rounded-lg shadow-sm">
        {/* Sidebar with conversations */}
        {isSidebarVisible && (
          <div className="w-full md:w-72 border-r flex flex-col bg-background">
            <div className="p-3 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 md:hidden"
                  onClick={() => setIsSidebarVisible(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-semibold">Conversations</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleNewConversation}
                className="h-8 w-8 p-0"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations.map((conversation) => (
                  <div 
                    key={conversation.id}
                    onClick={() => handleSwitchConversation(conversation)}
                    className={`
                      p-2 rounded-md cursor-pointer
                      ${activeConversation?.id === conversation.id ? 'bg-primary/10' : 'hover:bg-muted'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{conversation.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getConversationSummary(conversation)}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-muted-foreground mr-1">{formatDisplayDate(conversation.updatedAt)}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation.id);
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsSettingsOpen(true)}
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        )}
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="p-3 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              {!isSidebarVisible && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setIsSidebarVisible(true)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <a href="/dashboard" className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm">
                <ArrowLeft className="h-3 w-3" />
                Back to Dashboard
              </a>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Clinician Assistant</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsSettingsOpen(true)}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4">
            {activeConversation && activeConversation.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                <MessageSquare className="h-12 w-12 text-primary/50" />
                <div className="space-y-2 max-w-md">
                  <h3 className="text-xl font-medium">Hello! How can I assist you today?</h3>
                  <p className="text-muted-foreground">
                    If you have any questions about clients, therapy sessions, goals,
                    or any other clinical data, feel free to ask.
                  </p>
                </div>
                
                <div className="w-full max-w-md mt-4">
                  <p className="text-sm font-medium mb-2">Example questions:</p>
                  <ul className="space-y-2 text-sm">
                    {EXAMPLE_QUESTIONS.map((example, index) => (
                      <li 
                        key={index}
                        className="p-2 border rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => handleExampleClick(example)}
                      >
                        "{example}"
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {activeConversation?.messages.map((message, index) => (
                  <div key={message.id}>
                    {/* Time separator if more than 5 minutes between messages */}
                    {index > 0 && 
                      (message.timestamp.getTime() - activeConversation.messages[index-1].timestamp.getTime() > 5 * 60 * 1000) && (
                      <div className="flex justify-center my-4">
                        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    )}
                    
                    {/* User message */}
                    {message.sender === 'user' && (
                      <div className="flex justify-end items-start mb-4">
                        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-lg rounded-tr-none p-3">
                          <p className="break-words">{message.content}</p>
                          <div className="mt-1 flex justify-end">
                            <span className="text-xs opacity-80">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Assistant message */}
                    {message.sender === 'assistant' && (
                      <div className="mb-4">
                        <div className="flex justify-start items-start">
                          <div className="max-w-[80%]">
                            {/* Main message with insightful explanation */}
                            <div className="bg-muted rounded-lg rounded-tl-none p-3">
                              <p className="break-words">{message.content}</p>
                              
                              {/* Execution metadata badges */}
                              {settings.showExecutionTime && message.response?.executionTime && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs bg-background/50">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {(message.response.executionTime / 1000).toFixed(2)}s
                                  </Badge>
                                  
                                  {message.response.usedTemplate && (
                                    <Badge variant="outline" className="text-xs bg-background/50">
                                      <Database className="h-3 w-3 mr-1" />
                                      Template: {message.response.usedTemplate}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              <div className="mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(message.timestamp)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Render data results if available */}
                            {message.response?.data && message.response.data.length > 0 && (
                              <Card className="mt-2 overflow-hidden">
                                <Tabs defaultValue="results" className="w-full">
                                  <TabsList className="w-full justify-start bg-card">
                                    <TabsTrigger value="results">
                                      <BarChart3 className="h-3.5 w-3.5 mr-1" />
                                      Results
                                    </TabsTrigger>
                                    {settings.showSQLQueries && message.response.sqlQuery && (
                                      <TabsTrigger value="query">
                                        <Database className="h-3.5 w-3.5 mr-1" />
                                        SQL Query
                                      </TabsTrigger>
                                    )}
                                  </TabsList>
                                  <CardContent className="p-3">
                                    <TabsContent value="results" className="mt-1">
                                      {renderDataTable(message.response.data)}
                                    </TabsContent>
                                    {settings.showSQLQueries && message.response.sqlQuery && (
                                      <TabsContent value="query" className="mt-1">
                                        <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                                          {message.response.sqlQuery}
                                        </pre>
                                      </TabsContent>
                                    )}
                                  </CardContent>
                                </Tabs>
                              </Card>
                            )}
                            
                            {/* Show error message if present */}
                            {message.response?.errorMessage && (
                              <Card className="mt-2 overflow-hidden border-destructive/50">
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2 text-sm text-destructive">
                                    <p className="break-words text-xs">{message.response.errorMessage}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          {/* Thinking indicator */}
          {askMutation.isPending && (
            <div className="p-3 border-t bg-muted/5">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm">Analyzing your question...</span>
              </div>
            </div>
          )}
          
          {/* Input area */}
          <div className="p-3 border-t bg-background/80">
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  ref={inputRef}
                  placeholder="Ask a question about your practice..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="flex-1"
                  disabled={askMutation.isPending}
                />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="submit"
                      disabled={!question.trim() || askMutation.isPending}
                      className="px-4"
                    >
                      {askMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SendIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </form>
          </div>
        </div>
      </div>
      
      <div className="text-center text-xs text-muted-foreground mt-3">
        © 2025 Speech Therapy Clinic. All rights reserved.
      </div>
      
      {/* Settings Dialog */}
      {renderSettingsDialog()}
    </div>
  );
};

export default EnhancedAssistant;