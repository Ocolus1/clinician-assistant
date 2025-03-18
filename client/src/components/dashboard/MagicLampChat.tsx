import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Wand2,
  Zap,
  Lamp,
  X,
  MessageSquare,
  FileText,
  Calculator,
  Calendar,
  Users,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';

// Define the message type
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Example therapy-related quick actions
interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  message: string;
}

export function MagicLampChat() {
  // Quick action suggestions for the assistant
  const quickActions: QuickAction[] = [
    {
      id: 'plan-budget',
      label: 'Budget Planning',
      icon: Calculator,
      message: "Can you help me plan a budget for a new therapy client?"
    },
    {
      id: 'session-notes',
      label: 'Session Notes',
      icon: FileText,
      message: "I need help writing comprehensive session notes for today's therapy."
    },
    {
      id: 'schedule',
      label: 'Scheduling',
      icon: Calendar,
      message: "How can I optimize my therapy session schedule this week?"
    },
    {
      id: 'client-progress',
      label: 'Client Progress',
      icon: Users,
      message: "Could you analyze the progress data for my current clients?"
    }
  ];
  
  // State for the chat messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: "✨ Greetings from your magical assistant! I'm here to help with your therapy practice. What would you like to do today?",
      timestamp: new Date()
    }
  ]);
  
  // State for the input field
  const [input, setInput] = useState('');
  
  // State for the typing indicator
  const [isTyping, setIsTyping] = useState(false);
  
  // State for showing suggestion bubbles
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Effect to auto-scroll to the bottom of the chat
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);
  
  // Effect to focus on the input field when component mounts
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, []);
  
  // Generate a more detailed AI response based on query content
  const generateResponseForQuery = (query: string): string => {
    // Convert query to lowercase for easier matching
    const queryLower = query.toLowerCase();
    
    // Budget and finances related
    if (queryLower.includes('budget') || queryLower.includes('cost') || queryLower.includes('finance') || queryLower.includes('money')) {
      return "I've analyzed our budget data. Looking at the current financial plan, I see several therapy budget bubbles across the timeline. The largest allocations are in April and May 2025, with approximately $8,500 available per month. Would you like me to help optimize the budget distribution or prepare a new client budget plan?";
    }
    
    // Session or notes related
    if (queryLower.includes('session') || queryLower.includes('notes') || queryLower.includes('documentation')) {
      return "I can help with your session documentation. Based on recent sessions, I recommend focusing on behavior metrics and specific improvement goals. Would you like me to provide a template for comprehensive session notes, or help analyze existing documentation for patterns?";
    }
    
    // Schedule related
    if (queryLower.includes('schedule') || queryLower.includes('calendar') || queryLower.includes('appointment')) {
      return "Looking at your upcoming schedule, I see you have 12 client sessions this week with three 2-hour blocks still available. The most efficient scheduling would be adding appointments on Wednesday afternoon or Friday morning. Shall I show you the optimized schedule view?";
    }
    
    // Client progress related
    if (queryLower.includes('client') || queryLower.includes('progress') || queryLower.includes('improvement')) {
      return "I've analyzed client progress data from the last 3 months. There's a notable 27% average improvement in therapeutic goals. Your clients with weekly sessions show 15% better outcomes than those with bi-weekly sessions. Would you like me to prepare a detailed progress report for your review?";
    }
    
    // Default response for other queries
    return "I've processed your request and can help with that. Based on the practice data, I can provide insights and recommendations tailored to your therapy business needs. What specific aspect would you like me to focus on?";
  };
  
  // Handler for sending a message
  const handleSendMessage = (customMessage?: string | React.MouseEvent<HTMLButtonElement>) => {
    // If we received a MouseEvent, ignore it and use the input field value
    let messageText = typeof customMessage === 'string' ? customMessage : input;
    
    if (!messageText.trim()) return;
    
    // Add the user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setShowSuggestions(false);
    
    // Focus back on the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Generate AI response
    setTimeout(() => {
      const responseContent = generateResponseForQuery(messageText);
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };
  
  // Handle quick action selection
  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.message);
  };
  
  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Chat UI content - this will be placed inside a Dialog by the parent component
  return (
    <div className="flex flex-col h-[70vh]">
      {/* Fixed header with proper alignment */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 bg-black/80 border border-white/20">
            <Wand2 className="h-4 w-4 text-amber-300" />
          </Avatar>
          <h2 className="text-md font-medium">Magic Assistant</h2>
        </div>
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10">
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-grow px-3 py-2">
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
                  <Avatar className={`h-6 w-6 ${message.role === 'user' ? 'bg-black border border-white/30' : 'bg-black/80 border border-amber-500/40'}`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Wand2 className="h-4 w-4 text-amber-300" />
                    )}
                  </Avatar>
                  
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'bg-gradient-to-r from-amber-500/20 to-amber-700/20 text-white border border-amber-500/30 shadow-sm'
                    }`}
                  >
                    <p className="text-sm leading-normal">{message.content}</p>
                    <span className={`text-[10px] block mt-1 ${
                      message.role === 'user' ? 'text-white/60' : 'text-amber-300/70'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Quick action suggestions */}
            {showSuggestions && messages.length === 1 && !isTyping && (
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="mb-2">
                  <p className="text-xs text-amber-400/80 font-medium">How can I help you today?</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {quickActions.map((action, index) => (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1, duration: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuickAction(action);
                          }}
                          className="bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-500/30 
                                     text-amber-100 hover:text-white hover:bg-amber-700/30 hover:border-amber-400/40
                                     transition-all duration-200"
                        >
                          <div className="flex items-center gap-1.5">
                            <action.icon className="h-3.5 w-3.5" />
                            <span>{action.label}</span>
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
            
            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <div className="max-w-[85%] flex flex-row items-start gap-1.5">
                  <Avatar className="h-6 w-6 bg-black/80 border border-amber-500/40">
                    <Wand2 className="h-4 w-4 text-amber-300" />
                  </Avatar>
                  
                  <div className="rounded-lg px-3 py-2 bg-gradient-to-r from-amber-500/20 to-amber-700/20 text-white border border-amber-500/30 shadow-sm">
                    <div className="flex space-x-1.5 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-amber-300"
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
      
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-amber-500/50 focus:ring-amber-500/20"
          />
          <Button 
            size="icon" 
            onClick={() => handleSendMessage()} 
            disabled={!input.trim()} 
            className={`h-10 w-10 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-md shadow-amber-900/20 transition-all duration-300 disabled:opacity-50 ${!input.trim() ? 'opacity-50' : 'opacity-100'}`}
          >
            <motion.div
              animate={{ scale: input.trim() ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.5, repeat: input.trim() ? Infinity : 0, repeatDelay: 2 }}
            >
              <Zap className="h-5 w-5" />
            </motion.div>
          </Button>
        </div>
      </div>
    </div>
  );
}