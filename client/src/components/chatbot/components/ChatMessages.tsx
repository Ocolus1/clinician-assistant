import React, { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Bot, Sparkles, User } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  handleSuggestionClick: (suggestion: string) => void;
  suggestions: string[];
  activeSession?: number | null;
}

export function ChatMessages({
  messages,
  isTyping,
  handleSuggestionClick,
  suggestions,
  activeSession,
}: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Immediate scroll to bottom (for initial load and session changes)
  const scrollToBottomImmediate = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
    
    // Also try to scroll to the end marker if it exists
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, []);

  // Smooth scroll to bottom (for new messages)
  const scrollToBottomSmooth = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: "smooth",
      });
    }
    
    // Also try to scroll to the end marker if it exists
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "end" 
    });
  }, []);

  // Use useLayoutEffect for immediate scrolling when messages or session changes
  useLayoutEffect(() => {
    scrollToBottomImmediate();
  }, [messages.length, activeSession, scrollToBottomImmediate]);

  // Use useEffect for smooth scrolling when typing state changes
  useEffect(() => {
    scrollToBottomSmooth();
  }, [isTyping, scrollToBottomSmooth]);

  // Also scroll on window resize to handle layout changes
  useEffect(() => {
    const handleResize = () => scrollToBottomImmediate();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scrollToBottomImmediate]);

  return (
    <ScrollArea
      ref={scrollAreaRef}
      className="flex-1 p-4 bg-gray-50"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Welcome message */}
        {messages.length > 0 && messages[0].role === "assistant" && (
          <div className="flex justify-start mb-8">
            <div className="max-w-[80%] flex items-start gap-3">
              <Avatar className="h-8 w-8 bg-primary/20 flex items-center justify-center">
                <div className="flex justify-center items-center h-4 w-4 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
              </Avatar>

              <div className="rounded-lg px-4 py-3 bg-white border shadow-sm">
                <div className="whitespace-pre-wrap">{messages[0].content}</div>
                <div className="text-xs mt-1 text-muted-foreground">
                  {typeof messages[0].timestamp === "string"
                    ? new Date(messages[0].timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : messages[0].timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Suggestions - only show after welcome message */}
        {messages.length === 1 && (
          <div className="mt-4 mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((suggestion) => (
                <Card
                  key={suggestion}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full flex items-center justify-center">
                      <div className="flex justify-center items-center h-5 w-5 text-primary">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{suggestion}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Click to ask
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        {/* Other messages (skip the first welcome message) */}
        {messages.slice(1).map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] flex items-start gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <Avatar
                className={`h-8 w-8 ${
                  message.role === "user" ? "bg-primary" : "bg-primary/20"
                } flex items-center justify-center`}
              >
                <div className="flex justify-center items-center h-4 w-4">
                  {message.role === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </div>
              </Avatar>

              <div
                className={`rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-white border shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.role === "user"
                      ? "text-white/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {typeof message.timestamp === "string"
                    ? new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] flex items-start gap-3">
              <Avatar className="h-8 w-8 bg-primary/20 flex items-center justify-center">
                <div className="flex justify-center items-center h-4 w-4 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
              </Avatar>

              <div className="rounded-lg px-4 py-3 bg-white border shadow-sm">
                <div className="flex space-x-1 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary/40"
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
