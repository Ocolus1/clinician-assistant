import React, { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { ChatInput } from "./components/ChatInput";
import {
  ChatMessage,
  MessageRole,
  SendMessageRequest,
  SendMessageResponse,
  Session,
} from "./types";

// Helper functions
const generateId = () => Math.random().toString(36).substring(2, 9);

// Constants
const SUGGESTIONS = [
  "What are John Smith's current goals?",
  "Show me Sarah Johnson's anxiety progress",
  "When was David Miller's last session?",
  "Which patients have budgets expiring next month?",
  "Tell me about Emily Chen's treatment plan",
  "What progress has Michael Rodriguez made on his goals?",
  "Show me Jessica Thompson's session history",
  "What are the main concerns for William Davis?",
];

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm your clinical assistant. You can ask me about patients, their goals, progress, and more. How can I help you today?",
  timestamp: new Date(),
};

/**
 * Clinician Chatbot Interface
 * A comprehensive chat interface for clinicians to query patient data
 */
export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // React Query mutation for sending messages
  const sendMessageMutation = useMutation<
    SendMessageResponse,
    Error,
    SendMessageRequest
  >({
    mutationFn: async (data) => {
      const response = await apiRequest<SendMessageResponse>(
        "POST",
        `/api/chatbot/sessions/${data.sessionId}/messages`,
        { message: data.content }
      );
      return response;
    },
    onError: (error) => {
      console.error("Error sending message:", error);
    },
  });

  // Initialize chat session on mount
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);

        // Get existing sessions or create a new one
        const existingSessions = await apiRequest<Session[]>(
          "GET",
          "/api/chatbot/sessions/clinician/0"
        );

        if (existingSessions.length > 0) {
          setActiveSession(existingSessions[0].id);
          setSessions(existingSessions);

          // Load messages for the session
          const sessionMessages = await apiRequest<ChatMessage[]>(
            "GET",
            `/api/chatbot/sessions/${existingSessions[0].id}/messages`
          );

          // Convert timestamps to Date objects
          const messagesWithDates = sessionMessages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));

          setMessages(
            messagesWithDates.length > 0 ? messagesWithDates : [welcomeMessage]
          );
        } else {
          // Create a new session
          const { sessionId } = await apiRequest<{ sessionId: number }>(
            "POST",
            "/api/chatbot/sessions",
            { title: "New Chat" }
          );

          setActiveSession(sessionId);
          setSessions([
            { id: sessionId, title: "New Chat", createdAt: new Date() },
          ]);
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
        setMessages([welcomeMessage]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, []);

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !activeSession) return;

    // Add user message to messages
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user" as MessageRole,
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Send message to API
      const response = await apiRequest<SendMessageResponse>(
        "POST",
        `/api/chatbot/sessions/${activeSession}/messages`,
        { message: userMessage.content }
      );

      // Add AI response to messages
      const botMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          response.response ||
          response.message ||
          response.content ||
          "I processed your request, but I don't have a specific response at the moment.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);

      // Add error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          "I'm sorry, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, activeSession]);

  // Handle suggestion click
  const handleSuggestionClick = async (suggestion: string) => {
    if (!activeSession) return;

    // Add user message to messages
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user" as MessageRole,
      content: suggestion,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Use React Query mutation
    sendMessageMutation.mutate(
      {
        sessionId: activeSession,
        content: suggestion,
      },
      {
        onSuccess: (data) => {
          console.log("Received response:", data);

          // Add AI response to messages
          const botMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content:
              data.response ||
              data.message ||
              data.content ||
              "I processed your request, but I don't have a specific response at the moment.",
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, botMessage]);
          setIsTyping(false);
        },
        onError: (error) => {
          console.error("Error sending suggestion:", error);

          // Add error message
          const errorMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content:
              "I'm sorry, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, errorMessage]);
          setIsTyping(false);
        },
      }
    );
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isTyping) {
        handleSendMessage();
      }
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        activeSession={activeSession}
        setActiveSession={setActiveSession}
        setSessions={setSessions}
        setMessages={setMessages}
        setIsLoading={setIsLoading}
        welcomeMessage={welcomeMessage}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <ChatHeader />

        {/* Chat messages and suggestions container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            handleSuggestionClick={handleSuggestionClick}
            suggestions={SUGGESTIONS}
            activeSession={activeSession}
          />
        </div>

        {/* Chat input */}
        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSendMessage={handleSendMessage}
          isTyping={isTyping}
          handleKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}
