/**
 * Conversation Selector Component
 * 
 * This component provides a list of conversations and actions
 * to create, rename, and delete conversations.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  MessageSquarePlus, 
  MoreHorizontal, 
  Edit2, 
  Trash, 
  Loader2,
  MessageSquare 
} from 'lucide-react';
import { Conversation } from '@shared/assistantTypes';

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
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const handleStartRename = (conversation: Conversation) => {
    setRenameId(conversation.id);
    setRenameValue(conversation.name);
    setIsRenaming(true);
  };
  
  const handleCompleteRename = () => {
    if (renameId && renameValue.trim()) {
      onRenameConversation(renameId, renameValue.trim());
    }
    setIsRenaming(false);
    setRenameId(null);
    setRenameValue('');
  };
  
  const handleCancelRename = () => {
    setIsRenaming(false);
    setRenameId(null);
    setRenameValue('');
  };
  
  const handleStartDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleting(true);
  };
  
  const handleCompleteDelete = () => {
    if (deleteId) {
      onDeleteConversation(deleteId);
    }
    setIsDeleting(false);
    setDeleteId(null);
  };
  
  const handleCancelDelete = () => {
    setIsDeleting(false);
    setDeleteId(null);
  };
  
  return (
    <>
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium">Conversations</h3>
        <Button variant="ghost" size="icon" onClick={onNewConversation}>
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          <div className="p-1">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="relative group">
                <Button
                  variant={activeConversationId === conversation.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto py-2 px-3 mb-1"
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{conversation.name}</span>
                </Button>
                
                <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem onClick={() => handleStartRename(conversation)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleStartDelete(conversation.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <Separator />
      <div className="p-3">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={onNewConversation}
        >
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>
      
      {/* Rename Dialog */}
      <AlertDialog open={isRenaming} onOpenChange={setIsRenaming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Conversation name"
            className="mt-2"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRename}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteRename}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Dialog */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCompleteDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}