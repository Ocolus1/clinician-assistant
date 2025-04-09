/**
 * Chat Interface Component
 * 
 * This component provides the main chat interface for the Clinician Assistant,
 * including the message display area, input field, and conversation management.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Send,
  Settings,
  AlertCircle,
  MessageSquarePlus,
  Eraser,
  Info,
  Bot,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Message, Conversation } from '@shared/assistantTypes';
import { assistantService } from '@/lib/services/assistantService';
import { MessageBubble } from './MessageBubble';
import { ConversationSelector } from './ConversationSelector';
import { AssistantSettings } from './AssistantSettings';

interface ChatInterfaceProps {
  onClose?: () => void;
}

/**
 * Chat Interface Component
 */
export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // State
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);
  
  // Set active conversation when activeConversationId changes
  useEffect(() => {
    if (activeConversationId) {
      const conversation = conversations.find(c => c.id === activeConversationId) || null;
      setActiveConversation(conversation);
    } else {
      setActiveConversation(null);
    }
  }, [activeConversationId, conversations]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages]);
  
  // Focus input when conversation changes
  useEffect(() => {
    if (inputRef.current && !isInitializing && !showSettings) {
      inputRef.current.focus();
    }
  }, [activeConversationId, isInitializing, showSettings]);
  
  // Load all conversations
  const loadConversations = async () => {
    try {
      const result = await assistantService.getConversations();
      setConversations(result.conversations || []);
      
      // Check if the assistant is configured
      const status = await assistantService.checkStatus();
      setIsConfigured(status.isConfigured && status.connectionValid);
      
      // Set active conversation to the most recent one, if any
      if (result.conversations?.length > 0) {
        const mostRecent = [...result.conversations].sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        )[0];
        setActiveConversationId(mostRecent.id);
      }
      
      setIsInitializing(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setIsInitializing(false);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    }
  };
  
  // Create a new conversation
  const handleNewConversation = async () => {
    try {
      const result = await assistantService.createConversation({
        name: 'New Conversation',
      });
      
      if (result.conversation) {
        setConversations([result.conversation, ...conversations]);
        setActiveConversationId(result.conversation.id);
        setActiveTab('chat');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create a new conversation',
        variant: 'destructive',
      });
    }
  };
  
  // Rename a conversation
  const handleRenameConversation = async (id: string, name: string) => {
    try {
      await assistantService.updateConversation({
        conversationId: id,
        name,
      });
      
      setConversations(
        conversations.map(c => 
          c.id === id ? { ...c, name } : c
        )
      );
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename conversation',
        variant: 'destructive',
      });
    }
  };
  
  // Delete a conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await assistantService.deleteConversation(id);
      
      const updatedConversations = conversations.filter(c => c.id !== id);
      setConversations(updatedConversations);
      
      // If the active conversation was deleted, select another one
      if (activeConversationId === id) {
        if (updatedConversations.length > 0) {
          setActiveConversationId(updatedConversations[0].id);
        } else {
          setActiveConversationId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };
  
  // Send a message
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !activeConversationId) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      createdAt: new Date().toISOString(),
    };
    
    // Clear input
    setInputMessage('');
    
    // Create a placeholder for the assistant's response
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    
    // Update conversations state optimistically
    const updatedConversations = conversations.map(c => {
      if (c.id === activeConversationId) {
        return {
          ...c,
          messages: [...c.messages, userMessage, assistantMessage],
          lastMessageAt: new Date().toISOString(),
        };
      }
      return c;
    });
    
    setConversations(updatedConversations);
    setIsLoading(true);
    
    try {
      const result = await assistantService.sendMessage({
        conversationId: activeConversationId,
        message: userMessage.content,
      });
      
      if (result.message) {
        // Update the assistant message with the actual response
        const finalConversations = conversations.map(c => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              messages: [
                ...c.messages.slice(0, -1), // Remove temporary assistant message
                {
                  id: result.message.id,
                  role: 'assistant',
                  content: result.message.content,
                  createdAt: result.message.createdAt,
                },
              ],
              lastMessageAt: new Date().toISOString(),
            };
          }
          return c;
        });
        
        setConversations(finalConversations);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      
      // Remove the placeholder assistant message on error
      const errorConversations = conversations.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: c.messages.slice(0, -1), // Remove the placeholder
            lastMessageAt: new Date().toISOString(),
          };
        }
        return c;
      });
      
      setConversations(errorConversations);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle input key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Clear conversation
  const clearConversation = async () => {
    if (!activeConversationId) return;
    
    try {
      await assistantService.clearConversation(activeConversationId);
      
      setConversations(
        conversations.map(c => 
          c.id === activeConversationId 
            ? { ...c, messages: [] } 
            : c
        )
      );
      
      toast({
        title: 'Conversation cleared',
        description: 'All messages have been removed from this conversation',
      });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear conversation',
        variant: 'destructive',
      });
    }
  };
  
  // Handle settings saved
  const handleSettingsSaved = () => {
    setIsConfigured(true);
    setShowSettings(false);
    setActiveTab('chat');
  };
  
  // Show settings or chat based on configuration
  const showSettingsOrChat = () => {
    if (showSettings || !isConfigured) {
      return <AssistantSettings onClose={() => setShowSettings(false)} />;
    }
    
    return (
      <div className="flex h-full">
        {/* Conversations sidebar */}
        <div className="w-64 border-r flex flex-col h-full bg-background">
          <ConversationSelector
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => setActiveConversationId(id)}
            onNewConversation={handleNewConversation}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeConversation ? (
            <>
              {/* Chat messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {activeConversation.messages.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium">Clinician Assistant</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                        Ask questions about client data, progress reports, or budget information using natural language.
                      </p>
                      <div className="mt-6 space-y-2 max-w-md mx-auto text-sm text-left">
                        <p className="text-muted-foreground font-medium">Example questions:</p>
                        <div 
                          className="p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => setInputMessage("What is the progress of client Jane Smith on her articulation goals?")}
                        >
                          "What is the progress of client Jane Smith on her articulation goals?"
                        </div>
                        <div 
                          className="p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => setInputMessage("Show me the budget utilization for Thomas Wilson's therapy plan")}
                        >
                          "Show me the budget utilization for Thomas Wilson's therapy plan"
                        </div>
                        <div 
                          className="p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => setInputMessage("List all sessions for Emma Johnson in the last month")}
                        >
                          "List all sessions for Emma Johnson in the last month"
                        </div>
                      </div>
                    </div>
                  ) : (
                    activeConversation.messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* Input area */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask a question about your client data..."
                    className="flex-1 min-h-[60px] max-h-24"
                    disabled={isLoading}
                  />
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={sendMessage} 
                      size="icon"
                      disabled={isLoading || !inputMessage.trim()}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={clearConversation}
                            disabled={!activeConversation || activeConversation.messages.length === 0}
                          >
                            <Eraser className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear conversation</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Settings
                  </Button>
                  
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Info className="h-3 w-3 mr-1" />
                    <span>
                      Powered by OpenAI GPT
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <MessageSquarePlus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Conversation Selected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select an existing conversation or create a new one
              </p>
              <Button onClick={handleNewConversation}>
                Start a New Conversation
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render loading state
  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading the Clinician Assistant...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Main tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        <TabsList className="mx-6 justify-start">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger 
            value="settings"
            onClick={() => setShowSettings(true)}
          >
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="flex-1 overflow-hidden m-0 mt-2">
          {showSettingsOrChat()}
        </TabsContent>
        
        <TabsContent value="settings" className="flex-1 overflow-auto m-0 mt-2">
          <AssistantSettings onClose={() => {
            setActiveTab('chat');
            setShowSettings(false);
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}