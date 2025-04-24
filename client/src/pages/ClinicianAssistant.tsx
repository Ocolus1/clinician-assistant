import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageSquare, Settings, Plus, ArrowLeft, SendHorizontal } from 'lucide-react';
import { Link } from 'wouter';
import { Message, Conversation } from '@shared/assistantTypes';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Import our new components
import MessageBubble from '@/components/assistant/MessageBubble';
import ConversationSidebar from '@/components/assistant/ConversationSidebar';
import AssistantSettings from '@/components/assistant/AssistantSettings';

// Add types for the responses
interface ConversationsResponse {
  conversations: Conversation[];
}

interface StatusResponse {
  isConfigured: boolean;
  connectionValid: boolean;
  settings?: any;
}

const ClinicianAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState('assistant');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch conversations
  const { 
    data: conversationsData, 
    isLoading: isLoadingConversations,
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['/api/assistant/conversations'],
    queryFn: async () => {
      console.log("Fetching assistant conversations...");
      const response = await fetch('/api/assistant/conversations');
      if (!response.ok) {
        console.error("Error fetching conversations:", response.status, response.statusText);
        throw new Error(`Error fetching conversations: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Conversations data received:", data);
      return data;
    },
    refetchOnWindowFocus: true, // Ensure fresh data when window is focused
    staleTime: 120, // Consider data immediately stale
  });
  // Fetch assistant status
  const { 
    data: statusData, 
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['/api/assistant/status'],
    queryFn: async () => {
      console.log("Fetching assistant status...");
      const response = await fetch('/api/assistant/status');
      if (!response.ok) {
        console.error("Error fetching assistant status:", response.status, response.statusText);
        throw new Error(`Error fetching assistant status: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Assistant status received:", data);
      return data;
    },
    refetchOnWindowFocus: true, // Ensure fresh data when window is focused
  });

  
  // Create a new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/assistant/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        // Try to get detailed error message from response if available
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create conversation');
        } catch (jsonError) {
          // If JSON parsing fails, just use the status text
          throw new Error(`Failed to create conversation: ${response.statusText}`);
        }
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Conversation created successfully:', data);
      setSelectedConversationId(data.id);
      
      // Immediately invalidate the conversations query cache
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
      
      // Force an immediate refetch
      setTimeout(() => {
        console.log('Forcing conversations refetch after creation');
        refetchConversations();
      }, 300);
      
      // Create a minimal conversation object for immediate display
      const newConversation: Conversation = {
        id: data.id,
        name: data.name,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString()
      };
      
      // Manually update the cache with the new conversation
      const currentData = queryClient.getQueryData(['/api/assistant/conversations']) as ConversationsResponse;
      const updatedConversations = currentData 
        ? [...currentData.conversations, newConversation]
        : [newConversation];
        
      queryClient.setQueryData(['/api/assistant/conversations'], {
        conversations: updatedConversations
      });
      
      toast({
        title: 'Conversation Created',
        description: 'New conversation started successfully.'
      });
    },
    onError: (error: any) => {
      console.error('Error creating conversation:', error);
      
      // Check if this might be a configuration issue
      const errorMessage = error.message || '';
      const isConfigError = errorMessage.includes('not configured');
      
      toast({
        title: isConfigError ? 'Configuration Required' : 'Error Creating Conversation',
        description: error.message || 'Failed to create new conversation.',
        variant: 'destructive'
      });
      
      // If it's a configuration error, switch to settings tab
      if (isConfigError) {
        setActiveTab('settings');
      }
    }
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string, message: string }) => {
      setIsWaitingForResponse(true);
      const response = await fetch(`/api/assistant/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
      setMessage('');
      setIsWaitingForResponse(false);
    },
    onError: (error: any) => {
      setIsWaitingForResponse(false);
      toast({
        title: 'Error Sending Message',
        description: error.message || 'Failed to send message.',
        variant: 'destructive'
      });
    }
  });

  
  // Enhanced configuration detection with local storage fallback
  const [forceConfigured, setForceConfigured] = useState<boolean>(() => {
    // Check if we previously detected configuration
    try {
      return localStorage.getItem('assistant_is_configured') === 'true';
    } catch (e) {
      return false;
    }
  });
  
  // Get conversations array, handling possible undefined cases
  const conversations = ((conversationsData || {}) as ConversationsResponse)?.conversations || [];

  
  // Determine if configured from server response OR our local override
  const serverConfigured = ((statusData || {}) as StatusResponse)?.isConfigured || false;
  const isConfigured = serverConfigured || forceConfigured;
  
  // Store configuration state in local storage when it changes
  useEffect(() => {
    if (serverConfigured || forceConfigured) {
      try {
        localStorage.setItem('assistant_is_configured', 'true');
      } catch (e) {
        console.error('Failed to store configuration state:', e);
      }
    }
  }, [serverConfigured, forceConfigured]);
  
  // Input disabled state
  const inputDisabled = !isConfigured || !selectedConversationId || isWaitingForResponse;
  
  // Create a new conversation with checking for configuration
  const createNewConversation = async () => {
    // If UI thinks assistant is not configured but it might be, double-check
    if (!isConfigured) {
      console.log('UI shows not configured, double-checking with API before creating conversation');
      try {
        const response = await fetch('/api/assistant/status', {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        
        const data = await response.json();
        console.log('Direct status check before conversation creation:', data);
        
        // If actually configured, update the cache
        if (data.isConfigured) {
          console.log('Found assistant is actually configured, updating cache');
          queryClient.setQueryData(['/api/assistant/status'], data);
          
          // Proceed to create conversation after brief delay to let UI update
          setTimeout(() => {
            const name = `New Conversation - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            createConversationMutation.mutate(name);
          }, 100);
          
          return;
        } else {
          console.log('Confirmed assistant is not configured, showing settings');
          setActiveTab('settings');
          return;
        }
      } catch (error) {
        console.error('Error checking configuration before creating conversation:', error);
      }
    }
    
    // Normal flow - create a default conversation name with date/time
    const name = `New Conversation - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    createConversationMutation.mutate(name);
  };
  
  // Send a message
  const sendMessage = () => {
    if (!message.trim() || !selectedConversationId) return;
    
    // Add the user message to the UI immediately for better UX
    const userMessage: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: message.trim(),
      createdAt: new Date().toISOString()
    };
    
    // Create assistant loading message
    const assistantLoadingMessage: Message = {
      id: 'loading-' + Date.now(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    };
    
    // Update the local state for immediate UI feedback
    const updatedConversations = conversations.map((conv: Conversation) => 
      conv.id === selectedConversationId 
        ? { 
            ...conv, 
            messages: [...conv.messages, userMessage],
          }
        : conv
    );
    
    // Update the query cache for immediate UI feedback
    queryClient.setQueryData(['/api/assistant/conversations'], { 
      conversations: updatedConversations 
    });
    
    // Scroll to bottom immediately after user sends message
    setTimeout(() => scrollToBottom('smooth'), 50);
    
    // Send the message to the API
    sendMessageMutation.mutate({ 
      conversationId: selectedConversationId, 
      message: message.trim() 
    });
  };
  
  // Get selected conversation
  const selectedConversation = conversations.find((c: Conversation) => c.id === selectedConversationId);
  
  // Effect to select the first conversation when loaded
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);
  
  // Create a ref for the scroll anchor at the bottom
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  
  // Function to scroll to the bottom of messages with improved functionality
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    // Try to scroll to the bottom anchor first
    if (bottomAnchorRef.current) {
      setTimeout(() => {
        bottomAnchorRef.current?.scrollIntoView({ 
          behavior, 
          block: 'end' 
        });
      }, 100);
      return;
    }

    // Fallback approach if anchor doesn't exist
    if (messagesContainerRef.current) {
      setTimeout(() => {
        try {
          // Try both approaches for maximum compatibility
          const lastMessage = messagesContainerRef.current?.lastElementChild;
          if (lastMessage) {
            lastMessage.scrollIntoView({ behavior, block: 'end' });
          }
          
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        } catch (e) {
          console.error("Error scrolling to bottom:", e);
        }
      }, 100);
    }
  };
  
  // Auto-scroll to bottom when messages are updated or added
  useEffect(() => {
    scrollToBottom('smooth');
  }, [selectedConversation?.messages, isWaitingForResponse]);
  
  // Also scroll when a conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      // Use a small delay to ensure the conversation is loaded
      setTimeout(() => scrollToBottom('auto'), 300);
    }
  }, [selectedConversationId]);
  
  
  return (
    <div className="container px-2 sm:px-4 md:px-6 mx-auto py-3 md:py-6 h-full">
      <div className="flex flex-wrap items-center mb-3 md:mb-6">
        <Link href="/" className="mr-auto md:mr-2">
          <Button variant="ghost" size="sm" className="text-xs md:text-sm">
            <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Back to Dashboard</span>
            <span className="inline md:hidden">Back</span>
          </Button>
        </Link>
        <h1 className="text-xl md:text-2xl font-bold order-first md:order-none w-full md:w-auto mb-2 md:mb-0">Clinician Assistant</h1>
        {!isConfigured && (
          <Badge variant="outline" className="ml-2 md:ml-4 bg-yellow-100 text-yellow-800 text-xs">
            Not Configured
          </Badge>
        )}
      </div>
      
      <Card className="border shadow-sm h-full pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="px-3 py-4 md:px-6 md:py-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
              <div>
                <CardTitle className="text-lg md:text-xl">Clinician Assistant</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Query your clinical database using natural language
                </CardDescription>
              </div>
              <TabsList className="self-start h-8 md:h-10">
                <TabsTrigger value="assistant" className="text-xs md:text-sm px-2 md:px-3 h-7 md:h-9">
                  <MessageSquare className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Assistant</span>
                  <span className="inline sm:hidden">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs md:text-sm px-2 md:px-3 h-7 md:h-9">
                  <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span>Settings</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 h-full">
            <TabsContent value="assistant" className="mt-0 h-full">
              <div className="grid grid-cols-12 min-h-[500px] max-h-[900px]">
                {/* Mobile Menu Button - Only visible on small screens */}
                <div className="lg:hidden col-span-12 flex items-center border-b p-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mr-2"
                    onClick={() => {
                      // Toggle mobile sidebar visibility
                      const sidebar = document.getElementById('conversation-sidebar');
                      if (sidebar) {
                        // Make sure to show the sidebar properly
                        if (sidebar.classList.contains('hidden')) {
                          sidebar.classList.remove('hidden');
                          sidebar.classList.add('fixed');
                        } else {
                          sidebar.classList.add('hidden');
                          sidebar.classList.remove('fixed');
                        }
                        
                        // Add a semi-transparent overlay when the sidebar is visible on mobile
                        let overlay = document.getElementById('mobile-sidebar-overlay');
                        if (!overlay && !sidebar.classList.contains('hidden')) {
                          overlay = document.createElement('div');
                          overlay.id = 'mobile-sidebar-overlay';
                          overlay.className = 'fixed inset-0 bg-black/30 z-[99] lg:hidden';
                          overlay.onclick = () => {
                            if (sidebar) {
                              sidebar.classList.add('hidden');
                              sidebar.classList.remove('fixed');
                            }
                            if (overlay) {
                              overlay.remove();
                            }
                          };
                          document.body.appendChild(overlay);
                        } else if (overlay && sidebar && sidebar.classList.contains('hidden')) {
                          overlay.remove();
                        }
                      }
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Conversations
                  </Button>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={createNewConversation}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Conversation
                  </Button>
                </div>
                
                {/* Conversation List Sidebar - Hidden on mobile, toggleable */}
                <div 
                  id="conversation-sidebar"
                  className="hidden lg:block lg:col-span-3 border-r overflow-auto bg-background z-50 
                         lg:static lg:z-auto lg:h-auto
                         fixed top-0 left-0 h-screen max-w-xs p-4 border-r z-[100]"
                >
                  <ConversationSidebar
                    conversations={conversations}
                    selectedId={selectedConversationId}
                    onSelect={(id) => {
                      setSelectedConversationId(id);
                      // Hide sidebar on mobile after selection
                      const sidebar = document.getElementById('conversation-sidebar');
                      if (sidebar && window.innerWidth < 1024) {
                        sidebar.classList.add('hidden');
                        sidebar.classList.remove('fixed');
                        
                        // Remove overlay if it exists
                        const overlay = document.getElementById('mobile-sidebar-overlay');
                        if (overlay) {
                          overlay.remove();
                        }
                      }
                    }}
                    onNew={createNewConversation}
                    isLoadingConversations={isLoadingConversations}
                  />
                </div>
                
                {/* Chat Area */}
                <div className="col-span-12 lg:col-span-9 flex flex-col">
                  {!isConfigured ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <MessageSquare className="h-16 w-16 mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Assistant Not Configured</h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        Please configure your assistant with an OpenAI API key to start using
                        the clinician assistant.
                      </p>
                      <Button onClick={() => setActiveTab('settings')}>
                        Configure Assistant
                      </Button>
                    </div>
                  ) : selectedConversation ? (
                    <>
                      {/* Messages */}
                      <div className="flex-1 p-4">
                        {selectedConversation.messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <MessageSquare className="h-16 w-16 mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">New Conversation</h3>
                            <p className="text-muted-foreground max-w-md">
                              Ask any question about your clinical data, clients, sessions, 
                              goals, or therapy progress.
                            </p>
                          </div>
                        ) : (
                          <div 
                            ref={messagesContainerRef} 
                            className="overflow-auto h-[calc(100vh-250px)] min-h-[300px]  border rounded-md p-3 flex flex-col space-y-4 scroll-smooth"
                          >
                            {selectedConversation.messages.map((msg: Message) => (
                              <MessageBubble key={msg.id} message={msg} />
                            ))}
                            {isWaitingForResponse && (
                              <MessageBubble 
                                message={{
                                  id: 'loading',
                                  role: 'assistant',
                                  content: '',
                                  createdAt: new Date().toISOString()
                                }} 
                                isLoading={true} 
                              />
                            )}
                            {/* Invisible anchor element for scrolling */}
                            <div ref={bottomAnchorRef} className="h-1" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      
                      {/* Input Area */}
                      <div className="p-2 sm:p-4 border-t">
                        <div className="flex items-center">
                          <Input
                            className="flex-1 rounded-r-none h-9 md:h-10 text-sm md:text-base focus-visible:ring-1"
                            placeholder={inputDisabled 
                              ? "Assistant not configured..." 
                              : "Type your question here..."}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={inputDisabled}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                          />
                          <Button 
                            className="rounded-l-none h-9 md:h-10 px-2 md:px-4 text-xs md:text-sm" 
                            onClick={sendMessage}
                            disabled={!message.trim() || inputDisabled}
                          >
                            <SendHorizontal className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">Send</span>
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <MessageSquare className="h-16 w-16 mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Conversation Selected</h3>
                      <p className="text-muted-foreground mb-4">
                        Start a new conversation or select an existing one.
                      </p>
                      <Button onClick={createNewConversation}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Conversation
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-0">
              <div className="max-w-xl mx-auto py-6">
                <AssistantSettings onComplete={() => {
                  // Refetch the status immediately after configuration completes
                  refetchStatus();
                  
                  // If the assistant is now configured, switch back to chat tab
                  setTimeout(() => {
                    if (((statusData || {}) as StatusResponse)?.isConfigured) {
                      setActiveTab('assistant');
                    }
                  }, 500);
                }} />
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ClinicianAssistant;