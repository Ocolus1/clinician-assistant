import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Session, Client } from "@shared/schema";
import { format } from "date-fns";
import { NewSessionForm } from '@/components/sessions';
import { PlusIcon } from "@radix-ui/react-icons";
import { apiRequest } from '@/lib/queryClient';
import { Calendar, Clock, MapPin, User, Pencil, ArchiveIcon, RotateCcw } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface ClientSessionsProps {
  clientId?: number;
}

export default function ClientSessions({ clientId: propClientId }: ClientSessionsProps) {
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use the prop clientId if provided, otherwise try to get it from the URL
  const clientId = propClientId || (params.id ? parseInt(params.id) : undefined);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [createSessionDialogOpen, setCreateSessionDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sessionToArchive, setSessionToArchive] = useState<Session | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  // Fetch client details
  const { data: client } = useQuery<Client>({
    queryKey: ['/api/clients', clientId],
    queryFn: async () => {
      if (!clientId) {
        return null;
      }
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) {
        throw new Error(`Error fetching client: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // Fetch sessions for this client
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<Session[]>({
    queryKey: ['/api/clients', clientId, 'sessions'],
    queryFn: async () => {
      if (!clientId) {
        return [];
      }
      const response = await fetch(`/api/clients/${clientId}/sessions`);
      if (!response.ok) {
        throw new Error(`Error fetching sessions: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // Separate active and archived sessions
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<Session[]>([]);
  
  // Update sessions when data changes
  useEffect(() => {
    if (sessions) {
      // For now we'll consider "cancelled" and "waived" as "archived", and "completed" and "scheduled" as active
      const active = sessions.filter(session => 
        session.status === "completed" || session.status === "scheduled"
      );
      
      const archived = sessions.filter(session => 
        session.status === "cancelled" || session.status === "waived"
      );
      
      // Sort by date (most recent first)
      const sortedActive = [...active].sort((a, b) => 
        new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
      );
      
      const sortedArchived = [...archived].sort((a, b) => 
        new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
      );
      
      setActiveSessions(sortedActive);
      setArchivedSessions(sortedArchived);
    }
  }, [sessions]);
  
  // Archive/restore session mutation
  const archiveSessionMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) => {
      return apiRequest('PUT', `/api/sessions/${data.id}/status`, { status: data.status });
    },
    onSuccess: () => {
      setShowArchiveDialog(false);
      setSessionToArchive(null);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Session status updated successfully",
      });
      
      // Invalidate queries to refresh session data
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'sessions'] });
    },
    onError: (error) => {
      console.error("Error updating session status:", error);
      toast({
        title: "Error",
        description: "Failed to update session status. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle archive/restore button click
  const handleArchiveClick = (session: Session) => {
    setSessionToArchive(session);
    setShowArchiveDialog(true);
  };
  
  // Handle archive confirmation
  const handleArchiveConfirm = () => {
    if (sessionToArchive) {
      // If currently active, archive it (set to cancelled)
      // If archived, restore it (set to scheduled)
      const newStatus = sessionToArchive.status === "completed" || sessionToArchive.status === "scheduled" 
        ? "cancelled" 
        : "scheduled";
        
      archiveSessionMutation.mutate({
        id: sessionToArchive.id,
        status: newStatus
      });
    }
  };
  
  // Handle creating a new session
  const handleCreateNewSession = () => {
    setCreateSessionDialogOpen(true);
  };
  
  // Handle editing a session
  const handleEditSession = (session: Session) => {
    // For now, we'll just open the session details view
    // In a future update, this could be replaced with edit functionality
    setSelectedSession(session);
    
    // Show toast for now since edit isn't fully implemented
    toast({
      title: "Edit Session",
      description: "Session editing will be fully implemented in a future update.",
    });
  };
  
  // Handle viewing a session
  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
  };
  
  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch(status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      case "waived":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Waived</Badge>;
      case "rescheduled":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Rescheduled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };
  
  // Loading state
  if (isLoadingSessions) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Therapy Sessions</h3>
          <p className="text-sm text-muted-foreground">
            Schedule and track therapy sessions, view session history and notes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
          <Button onClick={handleCreateNewSession}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Session
          </Button>
        </div>
      </div>
      
      {/* Display either Active or Archived Sessions based on toggle */}
      {!showArchived ? (
        // Active Sessions
        <>
          {activeSessions.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No active sessions. Add a session to get started.</p>
              <Button onClick={handleCreateNewSession} className="mt-4">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add New Session
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.map((session) => (
                <Card key={session.id} className="relative hover:shadow-md transition-shadow">
                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditSession(session)}
                      title="Edit session"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleArchiveClick(session)}
                      title="Archive session"
                    >
                      <ArchiveIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-lg font-semibold">{session.title}</CardTitle>
                    </div>
                    <CardDescription className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1.5" />
                        {format(new Date(session.sessionDate), 'MMM d, yyyy')}
                      </div>
                      {getStatusBadge(session.status)}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 pb-3 px-6">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1.5" />
                        <span>{session.duration} minutes</span>
                      </div>
                      
                      {session.location && (
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-1.5" />
                          <span>{session.location}</span>
                        </div>
                      )}
                      
                      {session.therapistId && (
                        <div className="flex items-center text-muted-foreground">
                          <User className="h-4 w-4 mr-1.5" />
                          <span>Therapist ID: {session.therapistId}</span>
                        </div>
                      )}
                    </div>
                    
                    {session.description && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {session.description}
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => handleViewSession(session)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        // Archived Sessions
        <>
          {archivedSessions.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No archived sessions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedSessions.map((session) => (
                <Card key={session.id} className="relative opacity-75 hover:shadow-md transition-shadow">
                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleArchiveClick(session)}
                      title="Restore session"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-lg font-semibold">{session.title}</CardTitle>
                    </div>
                    <CardDescription className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1.5" />
                        {format(new Date(session.sessionDate), 'MMM d, yyyy')}
                      </div>
                      {getStatusBadge(session.status)}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 pb-3 px-6">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1.5" />
                        <span>{session.duration} minutes</span>
                      </div>
                      
                      {session.location && (
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-1.5" />
                          <span>{session.location}</span>
                        </div>
                      )}
                      
                      {session.therapistId && (
                        <div className="flex items-center text-muted-foreground">
                          <User className="h-4 w-4 mr-1.5" />
                          <span>Therapist ID: {session.therapistId}</span>
                        </div>
                      )}
                    </div>
                    
                    {session.description && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {session.description}
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => handleViewSession(session)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Session creation form */}
      <NewSessionForm 
        open={createSessionDialogOpen} 
        onOpenChange={setCreateSessionDialogOpen}
        initialClient={client}
      />
      
      {/* Session details modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{selectedSession.title}</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                  &times;
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">Date:</span>
                  <span>{format(new Date(selectedSession.sessionDate), 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">Duration:</span>
                  <span>{selectedSession.duration} minutes</span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">Location:</span>
                  <span>{selectedSession.location || 'No location specified'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">Therapist:</span>
                  <span>ID: {selectedSession.therapistId || 'Not assigned'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">Status:</span>
                  <span>{getStatusBadge(selectedSession.status)}</span>
                </div>
              </div>
              
              {selectedSession.description && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedSession.description}</p>
                </div>
              )}
              
              {selectedSession.notes && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedSession.notes}</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <Button variant="outline" className="mr-2" onClick={() => setSelectedSession(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Archive/Restore Confirmation Dialog */}
      {showArchiveDialog && sessionToArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">
                {sessionToArchive.status === "completed" || sessionToArchive.status === "scheduled" 
                  ? "Archive Session" 
                  : "Restore Session"}
              </h3>
              <p className="mb-6">
                {sessionToArchive.status === "completed" || sessionToArchive.status === "scheduled" 
                  ? "Are you sure you want to archive this session? It will be marked as cancelled." 
                  : "Are you sure you want to restore this session? It will be marked as scheduled."}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  variant={sessionToArchive.status === "completed" || sessionToArchive.status === "scheduled" ? "destructive" : "default"}
                  onClick={handleArchiveConfirm}
                >
                  {sessionToArchive.status === "completed" || sessionToArchive.status === "scheduled" ? "Archive" : "Restore"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}