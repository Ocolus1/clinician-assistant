import React, { useState } from 'react';
import { Conversation } from '@shared/assistantTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Plus, Pencil, Trash2, Check, X, MoreVertical } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  isLoadingConversations: boolean;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({ 
  conversations, 
  selectedId, 
  onSelect, 
  onNew,
  isLoadingConversations
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Start editing a conversation name
  const startEditing = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditName(conversation.name);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };
  
  // Mutation for updating a conversation name
  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      const response = await fetch(`/api/assistant/conversations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update conversation name');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
      setEditingId(null);
      toast({
        title: 'Conversation updated',
        description: 'Conversation name was updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating conversation',
        description: error.message || 'Failed to update conversation name.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation for deleting a conversation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/assistant/conversations/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/conversations'] });
      toast({
        title: 'Conversation deleted',
        description: 'Conversation was deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting conversation',
        description: error.message || 'Failed to delete conversation.',
        variant: 'destructive',
      });
    }
  });
  
  // Handle saving the edited name
  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateMutation.mutate({ id, name: editName.trim() });
    } else {
      cancelEditing();
    }
  };
  
  // Handle deleting a conversation
  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center p-4">
        <h3 className="font-semibold">Conversations</h3>
        <Button size="sm" onClick={onNew} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2">
        <div className="p-2">
          {isLoadingConversations ? (
            <div className="p-4 text-muted-foreground">Loading conversations...</div>
          ) : conversations.length === 0 ? (
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
                    className={cn(
                      "p-3 rounded-md border",
                      editingId === conv.id 
                        ? "bg-muted" 
                        : selectedId === conv.id 
                          ? "bg-accent" 
                          : "hover:bg-accent/50 cursor-pointer"
                    )}
                    onClick={() => editingId !== conv.id && onSelect(conv.id)}
                  >
                    {editingId === conv.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(conv.id);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default" 
                            onClick={() => handleSaveEdit(conv.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium truncate text-wrap">{conv.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(conv.lastMessageAt || conv.createdAt)}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditing(conv)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive" 
                                onClick={() => handleDelete(conv.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {/* Safely handle conversation messages preview with multiple fallbacks */}
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          {(() => {
                            // Enhanced preview with multiple fallbacks
                            try {
                              // First check if messages array exists and has items
                              if (!conv.messages || !Array.isArray(conv.messages) || conv.messages.length === 0) {
                                return 'No messages yet';
                              }
        
                              // Get the last message
                              const lastMessage = conv.messages[conv.messages.length - 1];
        
                              // Check if message has content
                              if (!lastMessage || typeof lastMessage.content !== 'string') {
                                return 'Empty message';
                              }
        
                              // Return truncated content
                              const preview = lastMessage.content.substring(0, 50);
                              return `${preview}${lastMessage.content.length > 50 ? '...' : ''}`;
                            } catch (err) {
                              // Final fallback if any error occurs
                              console.error('Error rendering message preview:', err);
                              return 'Unable to show preview';
                            }
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationSidebar;