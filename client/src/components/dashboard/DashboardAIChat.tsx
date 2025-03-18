import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Maximize2, 
  Minimize2, 
  Brain,
  Sparkles,
  Wand2,
  Zap,
  CircleDashed 
} from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import { motion, AnimatePresence } from 'framer-motion';

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
 * Futuristic Dashboard AI Chat Component 
 * Provides an AI chatbot interface with modern UI and animations
 * Designed to match a minimalist, high-tech aesthetic
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { dashboardData } = useDashboard();

  // Initialize with animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollAreaRef.current && !isInitializing) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping, isInitializing]);

  // Focus input on mount
  useEffect(() => {
    if (!isMinimized && !isInitializing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized, isInitializing]);

  // Simulate AI response with real data from dashboardData
  const simulateResponse = (userMessage: string) => {
    // Show typing indicator
    setIsTyping(true);
    
    let responseContent = '';
    
    // Slightly longer delay to show the typing animation
    setTimeout(() => {
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
      } else if (userMessage.toLowerCase().includes('progress') || userMessage.toLowerCase().includes('summarize')) {
        responseContent = "Based on recent sessions data, client progress trends are positive. Would you like me to generate a detailed report?";
      } else {
        responseContent = "I understand you're asking about your practice. For specific data insights, try asking about appointments, budget plans, or upcoming tasks.";
      }

      // Hide typing indicator and add response
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        },
      ]);
    }, 1500);
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

  // Show initialization animation
  if (isInitializing) {
    return (
      <Card className="h-full flex flex-col justify-center items-center bg-black/90 text-white border-white/20 shadow-lg overflow-hidden relative">
        {/* Minimize button in top-right corner */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleMinimized} 
          className="absolute top-2 right-2 z-10 h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
        >
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        
        <motion.div 
          className="relative flex flex-col items-center justify-center w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Orbital rings */}
          <motion.div 
            className="absolute w-32 h-32 rounded-full border border-white/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute w-48 h-48 rounded-full border border-white/10"
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute w-64 h-64 rounded-full border border-white/5"
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Center pulse */}
          <motion.div
            className="relative z-10 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div 
              className="absolute w-16 h-16 rounded-full bg-white/20"
              animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="relative z-20 bg-black/80 rounded-full p-4 shadow-lg shadow-black/50 border border-white/20">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </motion.div>
          
          {/* Floating particles */}
          <motion.div 
            className="absolute top-1/4 right-1/4 w-1.5 h-1.5 rounded-full bg-white/60"
            animate={{ y: [0, 10, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full bg-white/50"
            animate={{ y: [0, -8, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-white/70"
            animate={{ y: [0, -12, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Text */}
          <motion.div 
            className="mt-20 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <motion.div
              className="text-lg font-light text-white/90 tracking-widest"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              INITIALIZING ASSISTANT
            </motion.div>
            
            <motion.div className="mt-3 flex justify-center space-x-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/70"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    delay: i * 0.2,
                    ease: "easeInOut" 
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-black/90 text-white border-white/20 shadow-lg overflow-hidden backdrop-blur-xl relative">
      {/* Minimize button in top-right corner */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleMinimized} 
        className="absolute top-2 right-2 z-10 h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
      >
        {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
      </Button>
      
      {!isMinimized ? (
        <AnimatePresence mode="wait">
          <motion.div 
            className="flex-grow overflow-hidden flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ScrollArea ref={scrollAreaRef} className="flex-grow px-3 py-2 mt-2">
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                      <div className={`max-w-[85%] flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-1.5`}>
                        <Avatar className={`h-5 w-5 ${message.role === 'user' ? 'bg-black border border-white/30' : 'bg-black/80 border border-white/20'}`}>
                          {message.role === 'user' ? (
                            <User className="h-3 w-3 text-white" />
                          ) : (
                            <Wand2 className="h-3 w-3 text-white" />
                          )}
                        </Avatar>
                        
                        <div
                          className={`rounded-lg px-2.5 py-1.5 ${
                            message.role === 'user'
                              ? 'bg-white/20 text-white shadow-sm'
                              : 'bg-black/50 text-white border border-white/10 shadow-sm'
                          }`}
                        >
                          <p className="text-xs leading-normal">{message.content}</p>
                          <span className={`text-[10px] block mt-0.5 ${
                            message.role === 'user' ? 'text-white/60' : 'text-white/50'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Typing indicator */}
                  {isTyping && (
                    <motion.div
                      className="flex justify-start"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <div className="max-w-[85%] flex flex-row items-start gap-1.5">
                        <Avatar className="h-5 w-5 bg-black/80 border border-white/20">
                          <Wand2 className="h-3 w-3 text-white" />
                        </Avatar>
                        
                        <div className="rounded-lg px-3 py-2 bg-black/50 text-white border border-white/10 shadow-sm">
                          <div className="flex space-x-1.5 items-center h-4">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-white/70"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ 
                                  duration: 0.6, 
                                  repeat: Infinity, 
                                  delay: i * 0.15,
                                  ease: "easeInOut" 
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
            
            <motion.div
              className="p-2 border-t border-white/10 flex-shrink-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <div className="flex items-center gap-1.5">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="flex-1 h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20"
                />
                <Button 
                  size="icon" 
                  onClick={handleSendMessage} 
                  disabled={!input.trim()} 
                  className={`h-8 w-8 bg-black/80 hover:bg-black/60 text-white border border-white/20 transition-all duration-300 disabled:opacity-50 ${!input.trim() ? 'opacity-50' : 'opacity-100'}`}
                >
                  <motion.div
                    animate={{ scale: input.trim() ? [1, 1.15, 1] : 1 }}
                    transition={{ duration: 0.5, repeat: input.trim() ? Infinity : 0, repeatDelay: 2 }}
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </motion.div>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <AnimatePresence>
          <motion.div
            className="p-2 flex items-center justify-center flex-grow text-white/60 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <CircleDashed className="h-6 w-6 text-white/50" />
              </motion.div>
              Chat minimized
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </Card>
  );
}