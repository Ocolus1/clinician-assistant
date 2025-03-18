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
    <Card className="h-full flex flex-col bg-black/80 text-white border-white/20 backdrop-blur-xl shadow-lg">
      <CardHeader className="p-2 border-b border-white/10 flex flex-row items-center space-y-0 gap-2 flex-shrink-0">
        <Avatar className="h-7 w-7 bg-blue-500">
          <Bot className="h-4 w-4 text-white" />
        </Avatar>
        <CardTitle className="text-base text-white">Practice Assistant</CardTitle>
        <Badge variant="outline" className="ml-1 bg-white/10 text-white text-xs border-white/20">AI</Badge>
        
        <div className="flex-grow"></div>
        
        <Button variant="ghost" size="icon" onClick={toggleMinimized} className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10">
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
      </CardHeader>
      
      {!isMinimized ? (
        <>
          <div className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea ref={scrollAreaRef} className="flex-grow px-3 py-2">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-1.5`}>
                      <Avatar className={`h-5 w-5 ${message.role === 'user' ? 'bg-primary' : 'bg-blue-500'}`}>
                        {message.role === 'user' ? (
                          <User className="h-3 w-3 text-white" />
                        ) : (
                          <Bot className="h-3 w-3 text-white" />
                        )}
                      </Avatar>
                      
                      <div
                        className={`rounded-lg px-2.5 py-1.5 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        <p className="text-xs leading-normal">{message.content}</p>
                        <span className={`text-[10px] block mt-0.5 ${
                          message.role === 'user' ? 'opacity-70' : 'text-white/60'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {messages.length === 1 && (
              <div className="px-3 py-1.5 flex-shrink-0 border-t border-white/10">
                <p className="text-[10px] text-white/60 mb-1.5">Suggested questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer border-white/20 text-white bg-transparent hover:bg-white/10 text-[10px] py-0.5"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <CardContent className="p-2 border-t border-white/10 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <Button 
                size="icon" 
                onClick={handleSendMessage} 
                disabled={!input.trim()} 
                className="h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </>
      ) : (
        <CardContent className="p-2 flex items-center justify-center flex-grow text-white/60 text-xs">
          Chat minimized
        </CardContent>
      )}
    </Card>
  );
}