/**
 * Conversation Selector Component
 * 
 * Displays a list of conversations and provides controls
 * for managing conversations (create, rename, delete).
 */

import React, { useState } from 'react';
import { Conversation } from '@shared/assistantTypes';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  MessageSquarePlus,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X
} from 'lucide-react';

interface ConversationSelectorProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, name: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationSelector({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation
}: ConversationSelectorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const handleStartEditing = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditingName(conversation.name);
  };
  
  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      onRenameConversation(editingId, editingName);
      setEditingId(null);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  
  return (
    <>
      <div className="p-3 border-b">
        <Button 
          onClick={onNewConversation}
          className="w-full"
        >
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-sm text-center py-4 text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-center justify-between rounded-md p-2 text-sm gap-2 ${
                  activeConversationId === conversation.id 
                    ? 'bg-secondary' 
                    : 'hover:bg-secondary/50 cursor-pointer'
                }`}
                onClick={() => editingId !== conversation.id && onSelectConversation(conversation.id)}
              >
                {editingId === conversation.id ? (
                  <div className="flex items-center gap-1 w-full">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-7 text-xs"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleSaveEdit}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="truncate flex-1">
                      {conversation.name}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStartEditing(conversation)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => onDeleteConversation(conversation.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}