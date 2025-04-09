import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { MessageSquare, Settings, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Message, Conversation } from '@shared/assistantTypes';

// Import component placeholders
// These will be replaced by actual components when they're created
const MessageBubble = ({ message }: { message: Message }) => (
  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
      message.role === 'user' 
        ? 'bg-primary text-primary-foreground ml-12' 
        : 'bg-muted mr-12'
    }`}>
      {message.content}
    </div>
  </div>
);

const ConversationSelector = ({ 
  conversations, 
  selectedId, 
  onSelect, 
  onNew 
}: { 
  conversations: Conversation[],
  selectedId: string | null,
  onSelect: (id: string) => void,
  onNew: () => void
}) => (
  <div className="h-full flex flex-col">
    <div className="flex justify-between items-center p-4">
      <h3 className="font-semibold">Conversations</h3>
      <Button size="sm" onClick={onNew} variant="ghost">
        <Plus className="h-4 w-4 mr-2" />
        New
      </Button>
    </div>
    <Separator />
    <div className="flex-1 overflow-auto p-2">
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
          <p>No conversations yet</p>
          <p className="text-sm">Start a new conversation</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <div 
              key={conv.id}
              className={`p-3 rounded-md cursor-pointer hover:bg-accent ${
                selectedId === conv.id ? 'bg-accent' : ''
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="font-medium truncate">{conv.name}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(conv.lastMessageAt || conv.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const AssistantSettings = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-4">Assistant Settings</h3>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
        <input 
          type="password" 
          className="w-full p-2 border rounded-md" 
          placeholder="sk-..." 
        />
        <p className="text-xs text-muted-foreground mt-1">
          Your API key is stored securely and never shared
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Model</label>
        <select className="w-full p-2 border rounded-md">
          <option>gpt-4</option>
          <option>gpt-3.5-turbo</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Temperature</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          defaultValue="0.7" 
          className="w-full" 
        />
      </div>
      <Button className="w-full">Save Settings</Button>
    </div>
  </div>
);

const ClinicianAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState('assistant');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  
  // Fetch conversations
  const { 
    data: conversationsData, 
    isLoading: isLoadingConversations,
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['/api/assistant/conversations'],
  });
  
  // Fetch assistant status
  const { 
    data: statusData, 
    isLoading: isLoadingStatus 
  } = useQuery({
    queryKey: ['/api/assistant/status'],
  });
  
  const conversations = conversationsData?.conversations || [];
  const isConfigured = statusData?.isConfigured || false;
  
  // Create a new conversation
  const createNewConversation = async () => {
    try {
      // Create a default conversation name with date/time
      const name = `Conversation ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      
      const response = await fetch('/api/assistant/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) throw new Error('Failed to create conversation');
      
      const data = await response.json();
      setSelectedConversationId(data.id);
      refetchConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };
  
  // Send a message
  const sendMessage = async () => {
    if (!message.trim() || !selectedConversationId) return;
    
    try {
      await fetch('/api/assistant/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          message: message.trim(),
        }),
      });
      
      setMessage('');
      refetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Get selected conversation
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  
  // Effect to select the first conversation when loaded
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);
  
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
                  <ConversationSelector
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
                            {selectedConversation.messages.map(msg => (
                              <MessageBubble key={msg.id} message={msg} />
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Input Area */}
                      <div className="p-4 border-t">
                        <div className="flex">
                          <input
                            type="text"
                            className="flex-1 p-2 border rounded-l-md focus:outline-none"
                            placeholder="Type your question here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
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
                          >
                            Send
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Example: "How many active clients do we have?" or "What's the progress of client John Doe?"
                        </p>
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
                <AssistantSettings />
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ClinicianAssistant;