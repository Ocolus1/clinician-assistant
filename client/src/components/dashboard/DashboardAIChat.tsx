import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Maximize2, Minimize2 } from 'lucide-react';
import { useDashboard } from './DashboardProvider';

// Types for chat messages
type MessageRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

// Sample suggestions for the chat interface
const SUGGESTIONS = [
  "Show me this month's appointments",
  "Which clients have expiring plans?",
  "What are my priorities for next week?",
  "Summarize my recent client progress",
];

// Helper to generate a unique ID for messages
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Dashboard AI Chat Component
 * Provides an AI chatbot interface for quick queries and actions
 * Redesigned to fit in the fixed dashboard grid layout
 */
export function DashboardAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your therapy practice assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { dashboardData } = useDashboard();
  
  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Simulate AI response - this would be replaced with actual AI service integration
  const simulateResponse = (userMessage: string) => {
    // For this mockup, we'll just echo back a simple response with some contextual awareness
    // In a real implementation, this would connect to an AI service
    
    let responseContent = '';
    
    if (userMessage.toLowerCase().includes('appointment')) {
      const appointmentCount = dashboardData?.appointments?.daily?.reduce((sum, entry) => sum + entry.count, 0) || 0;
      responseContent = `You have approximately ${appointmentCount} appointments scheduled. You can view details in the Appointment Analytics section.`;
    } else if (userMessage.toLowerCase().includes('expiring') || userMessage.toLowerCase().includes('plan')) {
      const expiringCount = dashboardData?.budgets?.expiringNextMonth.count || 0;
      responseContent = `You have ${expiringCount} budget plan${expiringCount !== 1 ? 's' : ''} expiring next month. You can see client details in the Budget Expiration card.`;
    } else if (userMessage.toLowerCase().includes('task') || userMessage.toLowerCase().includes('priorit')) {
      const nextMonthTasks = dashboardData?.tasks?.byMonth[0];
      const taskCount = nextMonthTasks 
        ? nextMonthTasks.reports + nextMonthTasks.letters + nextMonthTasks.assessments + nextMonthTasks.other
        : 0;
      responseContent = `You have ${taskCount} tasks scheduled for next month. The breakdown is shown in the Upcoming Tasks timeline.`;
    } else {
      responseContent = "I understand you're asking about your practice. For specific data insights, try asking about appointments, budget plans, or upcoming tasks.";
    }
    
    // Add AI response with a slight delay to seem more natural
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        },
      ]);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = {
      id: generateId(),
      role: 'user' as MessageRole,
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Focus the input after sending
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Process the message
    simulateResponse(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Add suggestion as user message
    const userMessage = {
      id: generateId(),
      role: 'user' as MessageRole,
      content: suggestion,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Process the suggestion
    simulateResponse(suggestion);
  };

  const toggleMinimized = () => {
    setIsMinimized(prev => !prev);
  };

  return (
    <Card className="h-full">
      <CardHeader className="p-3 border-b flex flex-row items-center space-y-0 gap-2">
        <Avatar className="h-8 w-8 bg-primary">
          <Bot className="h-4 w-4 text-white" />
        </Avatar>
        <CardTitle className="text-base">Practice Assistant</CardTitle>
        <Badge variant="outline" className="ml-2 bg-primary/10">AI</Badge>
        
        <div className="flex-grow"></div>
        
        <Button variant="ghost" size="icon" onClick={toggleMinimized} className="h-8 w-8">
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
      </CardHeader>
      
      {!isMinimized ? (
        <>
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 h-[calc(100%-110px)]">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2`}>
                    <Avatar className={`h-6 w-6 ${message.role === 'user' ? 'bg-blue-500' : 'bg-primary'}`}>
                      {message.role === 'user' ? (
                        <User className="h-3 w-3 text-white" />
                      ) : (
                        <Bot className="h-3 w-3 text-white" />
                      )}
                    </Avatar>
                    
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70 block mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {messages.length === 1 && (
            <div className="px-4 py-2">
              <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 text-xs"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <CardContent className="p-3 pt-2 border-t mt-auto">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button size="icon" onClick={handleSendMessage} disabled={!input.trim()} className="h-8 w-8">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </>
      ) : (
        <CardContent className="p-3 flex items-center justify-center h-[calc(100%-56px)] text-muted-foreground">
          Chat minimized
        </CardContent>
      )}
    </Card>
  );
}