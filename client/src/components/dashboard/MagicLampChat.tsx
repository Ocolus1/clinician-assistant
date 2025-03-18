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

export function MagicLampChat() {
  // State for the dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // State for the chat messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: "Hello! I'm your therapy practice assistant. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  
  // State for the input field
  const [input, setInput] = useState('');
  
  // State for the typing indicator
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Effect to auto-scroll to the bottom of the chat
  useEffect(() => {
    if (scrollAreaRef.current && dialogOpen) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping, dialogOpen]);
  
  // Effect to focus on the input field when dialog opens
  useEffect(() => {
    if (dialogOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [dialogOpen]);
  
  // Handler for sending a message
  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Add the user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    // Focus back on the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Simulate AI response (for demo purposes)
    setTimeout(() => {
      const responses = [
        "I'll check that for you right away.",
        "Based on the practice data, here's what I found.",
        "I've analyzed your request and have some insights.",
        "Let me pull up that information for you.",
        "I've summarized the key points you should know."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };
  
  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Magical Lamp component - shown in the dashboard
  return (
    <div className="h-full flex flex-col justify-center items-center bg-black/90 text-white rounded-md overflow-hidden">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <motion.div 
          className="relative flex flex-col items-center justify-center w-full h-full cursor-pointer"
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          onClick={() => setDialogOpen(true)}
        >
          {/* Magical smoke effect */}
          <motion.div 
            className="absolute w-32 h-32 rounded-full bg-gradient-to-t from-white/20 to-transparent"
            animate={{ 
              scale: [1, 1.1, 1.2, 1.1, 1],
              opacity: [0.2, 0.3, 0.2, 0.3, 0.2],
              y: [0, -10]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Larger smoke */}
          <motion.div 
            className="absolute w-48 h-48 rounded-full bg-gradient-to-t from-white/10 to-transparent"
            animate={{ 
              scale: [1, 1.2, 1.4, 1.2, 1],
              opacity: [0.1, 0.2, 0.1, 0.2, 0.1],
              y: [0, -15]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          
          {/* Lamp */}
          <motion.div
            className="relative z-10 flex items-center justify-center"
            animate={{ 
              rotate: [0, 5, 0, -5, 0],
              y: [0, -5, 0, -5, 0]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div 
              className="relative bg-gradient-to-br from-amber-400 to-amber-600 rounded-b-3xl p-2 shadow-lg shadow-amber-900/50 border border-amber-300/80"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Lamp className="h-16 w-16 text-amber-900" />
              
              {/* Magical glow */}
              <motion.div 
                className="absolute inset-0 rounded-b-3xl bg-white"
                animate={{ 
                  opacity: [0.1, 0.3, 0.1],
                  scale: [0.9, 1.05, 0.9],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
          
          {/* Floating particles */}
          <motion.div 
            className="absolute top-1/4 right-1/3 w-1.5 h-1.5 rounded-full bg-amber-300"
            animate={{ y: [0, -15, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full bg-amber-200"
            animate={{ y: [0, -12, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-1/3 left-1/3 w-2 h-2 rounded-full bg-amber-100"
            animate={{ y: [0, -18, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Text */}
          <motion.div 
            className="mt-20 text-center px-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.p
              className="text-lg font-light text-amber-100 leading-relaxed"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              Have you heard of Aladdin and his magical lamp? 
              <span className="block mt-2 font-medium text-amber-200">Click on me and let's make some magic!</span>
            </motion.p>
          </motion.div>
        </motion.div>
        
        {/* Chat Dialog - Fixed UI issues */}
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] p-0 bg-black/95 border border-white/20 text-white overflow-hidden">
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
                  onClick={handleSendMessage} 
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
        </DialogContent>
      </Dialog>
    </div>
  );
}