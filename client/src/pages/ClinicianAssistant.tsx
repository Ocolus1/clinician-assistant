import React, { useEffect, useState } from 'react';
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

const ClinicianAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState('assistant');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch conversations
  const { 
    data: conversationsData, 
    isLoading: isLoadingConversations,
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['/api/assistant/conversations'],
    refetchInterval: isWaitingForResponse ? 2000 : false, // Poll while waiting for a response
  });
  
  // Fetch assistant status
  const { 
    data: statusData, 
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['/api/assistant/status'],
    refetchInterval: 5000, // Refetch every 5 seconds to catch auto-configuration
    refetchOnWindowFocus: true, // Ensure fresh data when window is focused
    staleTime: 0, // Consider data immediately stale
    retry: 3, // Retry failed requests 3 times
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
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
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
  
  // Add types for the responses
  interface ConversationsResponse {
    conversations: Conversation[];
  }
  
  interface StatusResponse {
    isConfigured: boolean;
    connectionValid: boolean;
    settings?: any;
  }
  
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
            const name = `Conversation ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
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
    const name = `Conversation ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
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
  
  // Effect to check assistant status when component mounts
  useEffect(() => {
    console.log('Initial assistant status:', statusData);
    console.log('Component mounted, forcing immediate verification of assistant configuration');
    
    // Direct fetch with explicit caching disabled
    const checkStatus = async () => {
      try {
        console.log('Making direct fetch to /api/assistant/status');
        const response = await fetch('/api/assistant/status', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.error('Status API returned error:', response.status, response.statusText);
          return;
        }
        
        const data = await response.json();
        console.log('Directly fetched status data:', data);
        
        // Manually update the query cache with the fresh data
        queryClient.setQueryData(['/api/assistant/status'], data);
        
        if (data.isConfigured) {
          console.log('Assistant is configured! Updating UI state...');
          
          // Force refresh conversations
          refetchConversations();
          
          // If on settings tab and assistant is configured, switch to chat tab
          if (activeTab === 'settings') {
            setTimeout(() => setActiveTab('assistant'), 500);
          }
        } else {
          console.log('Assistant is not yet configured according to direct API check');
        }
      } catch (error) {
        console.error('Error directly checking assistant status:', error);
      }
    };
    
    // Run immediate check
    checkStatus();
    
    // Force a refresh of the React Query cache data too
    refetchStatus();
    
    // Set up more frequent checks initially, then slow down
    const immediateInterval = setInterval(() => {
      console.log('Frequent status check (initial period)');
      checkStatus();
    }, 2000);
    
    // Switch to less frequent checks after 10 seconds
    setTimeout(() => {
      clearInterval(immediateInterval);
      
      const regularInterval = setInterval(() => {
        console.log('Regular status check');
        refetchStatus();
      }, 5000);
      
      return () => clearInterval(regularInterval);
    }, 10000);
    
    return () => clearInterval(immediateInterval);
  }, []);
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Clinician Assistant</h1>
        {!isConfigured && (
          <Badge variant="outline" className="ml-4 bg-yellow-100 text-yellow-800">
            Not Configured
          </Badge>
        )}
      </div>
      
      <Card className="border shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Clinician Assistant</CardTitle>
                <CardDescription>
                  Query your clinical database using natural language
                </CardDescription>
              </div>
              <TabsList>
                <TabsTrigger value="assistant">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Assistant
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <TabsContent value="assistant" className="mt-0">
              <div className="grid grid-cols-12 h-[600px]">
                {/* Conversation List Sidebar */}
                <div className="col-span-3 border-r h-full">
                  <ConversationSidebar
                    conversations={conversations}
                    selectedId={selectedConversationId}
                    onSelect={(id) => setSelectedConversationId(id)}
                    onNew={createNewConversation}
                  />
                </div>
                
                {/* Chat Area */}
                <div className="col-span-9 flex flex-col h-full">
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
                      <div className="flex-1 overflow-auto p-4">
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
                          <div>
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
                          </div>
                        )}
                      </div>
                      
                      {/* Input Area */}
                      <div className="p-4 border-t">
                        <div className="flex">
                          <Input
                            className="flex-1 rounded-r-none"
                            placeholder={inputDisabled ? "Assistant not configured or conversation not selected..." : "Type your question here..."}
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
                            className="rounded-l-none" 
                            onClick={sendMessage}
                            disabled={!message.trim() || inputDisabled}
                          >
                            <SendHorizontal className="h-4 w-4 mr-2" />
                            Send
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          <p className="mb-1">Example questions:</p>
                          <ul className="list-disc list-inside pl-2 space-y-1">
                            <li>"How many active clients do we have?"</li>
                            <li>"Show me a list of clients with incomplete assessments"</li>
                            <li>"What's the average session duration for therapist Sarah in March?"</li>
                            <li>"List all clients with budgets over 80% utilized"</li>
                          </ul>
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