/**
 * Chat Interface Component
 * 
 * This component provides a chat interface for the Clinician Assistant,
 * including message history, conversation management, and input controls.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquarePlus,
  Send,
  Settings,
  Bot,
  RefreshCw,
  Loader2,
  Sparkles,
  InfoIcon
} from 'lucide-react';
import { assistantService } from '@/lib/services/assistantService';
import { 
  Conversation, 
  Message,
  MessageRole
} from '@shared/assistantTypes';
import MessageBubble from './MessageBubble';
import { ConversationSelector } from './ConversationSelector';
import AssistantSettings from './AssistantSettings';

/**
 * Chat Interface Component
 */
export function ChatInterface() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // State
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<{ isConfigured: boolean, connectionValid: boolean }>({
    isConfigured: false,
    connectionValid: false
  });
  
  // Queries
  const { 
    data: conversationsData,
    isLoading: isLoadingConversations,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['/api/assistant/conversations'],
    queryFn: async () => {
      return await assistantService.getConversations();
    }
  });
  
  const {
    data: statusData,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['/api/assistant/status'],
    queryFn: async () => {
      return await assistantService.checkStatus();
    }
  });
  
  // Mutations
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      return await assistantService.createConversation({
        name: `Conversation ${new Date().toLocaleString()}`
      });
    },
    onSuccess: (data) => {
      refetchConversations();
      setActiveConversationId(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create a new conversation.",
        variant: "destructive"
      });
    }
  });
  
  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      return await assistantService.updateConversation({
        conversationId: id,
        name
      });
    },
    onSuccess: () => {
      refetchConversations();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update the conversation.",
        variant: "destructive"
      });
    }
  });
  
  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await assistantService.deleteConversation(id);
    },
    onSuccess: () => {
      refetchConversations();
      if (conversations.length > 1) {
        // Select another conversation
        const nextConversation = conversations.find(c => c.id !== activeConversationId);
        if (nextConversation) {
          setActiveConversationId(nextConversation.id);
        } else {
          setActiveConversationId(null);
        }
      } else {
        setActiveConversationId(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete the conversation.",
        variant: "destructive"
      });
    }
  });
  
  const clearConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await assistantService.clearConversation(id);
    },
    onSuccess: () => {
      refetchConversations();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clear the conversation.",
        variant: "destructive"
      });
    }
  });
  
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, conversationId }: { message: string, conversationId: string }) => {
      return await assistantService.sendMessage({
        message,
        conversationId
      });
    },
    onSuccess: (data) => {
      refetchConversations();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send the message.",
        variant: "destructive"
      });
      setSendingMessage(false);
    }
  });
  
  // Effects
  useEffect(() => {
    if (conversationsData?.conversations) {
      // Convert string roles to MessageRole type
      const typedConversations = conversationsData.conversations.map(conversation => ({
        ...conversation,
        messages: conversation.messages.map(message => ({
          ...message,
          role: message.role as MessageRole
        }))
      }));
      
      setConversations(typedConversations);
      
      // Set active conversation if none is selected
      if (!activeConversationId && typedConversations.length > 0) {
        setActiveConversationId(typedConversations[0].id);
      }
    }
  }, [conversationsData, activeConversationId]);
  
  useEffect(() => {
    if (statusData) {
      setAssistantStatus({
        isConfigured: statusData.isConfigured,
        connectionValid: statusData.connectionValid
      });
      
      // If not configured, switch to settings tab
      if (!statusData.isConfigured) {
        setActiveTab('settings');
      }
    }
  }, [statusData]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [conversations, activeConversationId]);
  
  // Handlers
  const handleCreateConversation = () => {
    createConversationMutation.mutate();
  };
  
  const handleUpdateConversation = (id: string, name: string) => {
    updateConversationMutation.mutate({ id, name });
  };
  
  const handleDeleteConversation = (id: string) => {
    deleteConversationMutation.mutate(id);
  };
  
  const handleClearConversation = () => {
    if (activeConversationId) {
      clearConversationMutation.mutate(activeConversationId);
    }
  };
  
  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversationId) return;
    
    // Optimistically update the UI
    setSendingMessage(true);
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString()
    };
    
    // Clear input
    setMessageText('');
    
    // Add optimistic message to conversation
    const activeConversation = conversations.find(c => c.id === activeConversationId);
    if (activeConversation) {
      const updatedConversation = {
        ...activeConversation,
        messages: [...activeConversation.messages, optimisticMessage]
      };
      
      setConversations(
        conversations.map(c => c.id === activeConversationId ? updatedConversation : c)
      );
      
      // Send to server
      sendMessageMutation.mutate({
        message: optimisticMessage.content,
        conversationId: activeConversationId
      });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Get active conversation
  const activeConversation = activeConversationId
    ? conversations.find(c => c.id === activeConversationId)
    : null;
  
  // Determine if the input should be disabled
  const inputDisabled = !activeConversationId || 
    !assistantStatus.isConfigured || 
    !assistantStatus.connectionValid ||
    sendingMessage;
  
  return (
    <div className="flex flex-col h-full">
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as 'chat' | 'settings')}
        className="flex flex-col h-full"
      >
        <div className="border-b px-2">
          <TabsList className="h-12">
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <Bot className="h-4 w-4" />
              <span>Clinician Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 pt-0">
          <div className="flex h-full">
            {/* Sidebar: Conversation list */}
            <div className="w-[260px] border-r flex flex-col h-full">
              <ConversationSelector
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={(id: string) => setActiveConversationId(id)}
                onNewConversation={handleCreateConversation}
                onRenameConversation={handleUpdateConversation}
                onDeleteConversation={handleDeleteConversation}
              />
            </div>
            
            {/* Main chat area */}
            <div className="flex-1 flex flex-col h-full">
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">
                    {activeConversation?.name || 'Conversation'}
                  </h3>
                  
                  {/* Status indicator */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`h-2 w-2 rounded-full ${
                          assistantStatus.isConfigured 
                            ? assistantStatus.connectionValid
                              ? "bg-green-500"
                              : "bg-yellow-500"
                            : "bg-red-500"
                        }`} />
                      </TooltipTrigger>
                      <TooltipContent>
                        {assistantStatus.isConfigured 
                          ? assistantStatus.connectionValid
                            ? "Assistant is configured and connected"
                            : "Assistant is configured but connection failed"
                          : "Assistant is not configured"
                        }
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {activeConversation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearConversation}
                    disabled={!activeConversation.messages.length}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Clear Chat
                  </Button>
                )}
              </div>
              
              {/* Messages area */}
              <ScrollArea className="flex-1 p-4">
                {activeConversation ? (
                  activeConversation.messages.length > 0 ? (
                    <div className="space-y-2">
                      {activeConversation.messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                      {sendingMessage && (
                        <MessageBubble
                          message={{
                            id: 'loading',
                            role: 'assistant',
                            content: '',
                            createdAt: new Date().toISOString()
                          }}
                        />
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                      <Sparkles className="h-8 w-8 mb-4 text-primary/50" />
                      <h3 className="text-lg font-medium">How can I help you today?</h3>
                      <p className="max-w-md mt-2">
                        Ask me about client progress, sessions, budget utilization, or clinical data.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                    <MessageSquarePlus className="h-8 w-8 mb-4 text-primary/50" />
                    <h3 className="text-lg font-medium">No conversation selected</h3>
                    <p className="max-w-md mt-2">
                      Create a new conversation or select an existing one to start chatting.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleCreateConversation}
                    >
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      New Conversation
                    </Button>
                  </div>
                )}
              </ScrollArea>
              
              {/* Input area */}
              <div className="border-t p-4">
                {!assistantStatus.isConfigured && (
                  <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                    <InfoIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      The assistant is not configured. Go to the Settings tab to configure it with your OpenAI API key.
                    </span>
                  </div>
                )}
                
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={textareaRef}
                    placeholder={inputDisabled 
                      ? activeConversationId 
                        ? "Configure the assistant to start chatting..." 
                        : "Select or create a conversation to start..."
                      : "Type your message here..."
                    }
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={inputDisabled}
                    className="min-h-[80px] flex-1 resize-none"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || inputDisabled}
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="flex-1 overflow-auto m-0 p-0">
          <AssistantSettings
            onClose={() => {
              if (assistantStatus.isConfigured) {
                setActiveTab('chat');
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}