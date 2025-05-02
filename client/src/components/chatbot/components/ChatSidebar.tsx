import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Edit, Trash2 } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { Input } from "@/components/ui/input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast-context";

import { Session, ChatMessage } from '../types';

interface ChatSidebarProps {
  sessions: Session[];
  activeSession: number | null;
  setActiveSession: (sessionId: number) => void;
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  setMessages: (messages: any[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  welcomeMessage: any;
}

export function ChatSidebar({
  sessions,
  activeSession,
  setActiveSession,
  setSessions,
  setMessages,
  setIsLoading,
  welcomeMessage
}: ChatSidebarProps) {
  
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const { addToast } = useToast();

  const createNewSession = async () => {
    try {
      setIsLoading(true);
      
      const { sessionId } = await apiRequest<{ sessionId: number }>(
        'POST',
        '/api/chatbot/sessions',
        { title: 'New Chat' }
      );
      
      // Create a new session object with the current date
      const newSession: Session = {
        id: sessionId,
        title: 'New Chat',
        createdAt: new Date()
      };
      
      // Update the sessions state with the new session
      setSessions((prev) => [newSession, ...prev]);
      setActiveSession(sessionId);
      setMessages([welcomeMessage]);
      
      addToast({
        title: "Success",
        description: "New chat session created",
        type: "success"
      });
    } catch (error) {
      console.error('Error creating new session:', error);
      addToast({
        title: "Error",
        description: "Failed to create new chat session",
        type: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionClick = async (sessionId: number) => {
    if (activeSession === sessionId) return;
    
    try {
      setIsLoading(true);
      setActiveSession(sessionId);
      
      // Load messages for the selected session
      const sessionMessages = await apiRequest<any[]>(
        'GET',
        `/api/chatbot/sessions/${sessionId}/messages`
      );
      
      // Convert timestamps to Date objects
      const messagesWithDates = sessionMessages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      setMessages(messagesWithDates.length > 0 ? messagesWithDates : [welcomeMessage]);
    } catch (error) {
      console.error('Error loading session messages:', error);
      setMessages([welcomeMessage]);
      
      addToast({
        title: "Error",
        description: "Failed to load chat messages",
        type: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleEdit = async (sessionId: number, newTitle: string) => {
    try {
      setIsLoading(true);
      
      // Update the session title in the API
      await apiRequest(
        'PUT',
        `/api/chatbot/sessions/${sessionId}`,
        { title: newTitle }
      );
      
      // Update the sessions state with the new title
      setSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, title: newTitle } 
            : session
        )
      );
      
      // Reset editing state
      setEditingSessionId(null);
      setEditedTitle("");
      
      addToast({
        title: "Success",
        description: "Chat title updated successfully",
        type: "success"
      });
    } catch (error) {
      console.error('Error updating session title:', error);
      
      addToast({
        title: "Error",
        description: "Failed to update chat title",
        type: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startEditingTitle = (session: Session) => {
    setEditingSessionId(session.id);
    setEditedTitle(session.title);
  };

  const cancelEditingTitle = () => {
    setEditingSessionId(null);
    setEditedTitle("");
  };

  const confirmDeleteSession = (sessionId: number) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    try {
      setIsLoading(true);
      
      // Delete the session from the API
      await apiRequest(
        'DELETE',
        `/api/chatbot/sessions/${sessionToDelete}`
      );
      
      // Remove the session from the sessions state
      setSessions(prev => prev.filter(session => session.id !== sessionToDelete));
      
      // If the deleted session was the active session, select another session or create a new one
      if (activeSession === sessionToDelete) {
        const remainingSessions = sessions.filter(session => session.id !== sessionToDelete);
        if (remainingSessions.length > 0) {
          await handleSessionClick(remainingSessions[0].id);
        } else {
          await createNewSession();
        }
      }
      
      // Reset delete dialog state
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
      
      addToast({
        title: "Success",
        description: "Chat session deleted successfully",
        type: "success"
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      
      addToast({
        title: "Error",
        description: "Failed to delete chat session. Please try again.",
        type: "destructive"
      });
      
      // Reset delete dialog state even on error
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-64 border-r bg-gray-50 p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-primary/10 p-2 rounded-full flex items-center justify-center">
          <div className="flex justify-center items-center h-5 w-5 text-primary">
            <Bot className="h-5 w-5" />
          </div>
        </div>
        <div>
          <div className="font-medium">Clinical Assistant</div>
          <div className="text-xs text-muted-foreground">AI-powered chat</div>
        </div>
      </div>
      
      <Button 
        onClick={createNewSession}
        className="mb-4 w-full"
      >
        New Chat
      </Button>
      <div className="text-sm font-medium text-muted-foreground mb-2">Recent Chats</div>
      
      <ScrollArea className="flex-1 pr-3">
        {sessions.map(session => (
          <div 
            key={session.id} 
            className={`p-3 rounded-md mb-2 cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
              activeSession === session.id ? 'bg-gray-100 border' : ''
            }`}
          >
            <div 
              className="bg-primary/10 h-8 w-8 rounded-full flex items-center justify-center"
              onClick={() => handleSessionClick(session.id)}
            >
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 truncate">
              {editingSessionId === session.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTitleEdit(session.id, editedTitle);
                      } else if (e.key === 'Escape') {
                        cancelEditingTitle();
                      }
                    }}
                    className="h-6 text-sm"
                    autoFocus
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-1" 
                    onClick={() => handleTitleEdit(session.id, editedTitle)}
                  >
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-1" 
                    onClick={cancelEditingTitle}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <div 
                    className="text-sm font-medium truncate"
                    onClick={() => handleSessionClick(session.id)}
                  >
                    {session.title}
                  </div>
                  <div 
                    className="text-xs text-muted-foreground"
                    onClick={() => handleSessionClick(session.id)}
                  >
                    {session.createdAt 
                      ? (typeof session.createdAt === 'string' 
                          ? new Date(session.createdAt).toLocaleDateString() 
                          : session.createdAt.toLocaleDateString())
                      : 'New Session'}
                  </div>
                </>
              )}
            </div>
            {!editingSessionId && (
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0" 
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingTitle(session);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0 text-destructive" 
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteSession(session.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat session and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
