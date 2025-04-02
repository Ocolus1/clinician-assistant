import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Session, Client } from "@shared/schema";
import { format } from "date-fns";
import { FullScreenSessionForm } from '@/components/sessions';
import { SessionsListView } from '@/components/sessions';

interface ClientSessionsProps {
  clientId?: number;
}

export default function ClientSessions({ clientId: propClientId }: ClientSessionsProps) {
  const params = useParams();
  // Use the prop clientId if provided, otherwise try to get it from the URL
  const clientId = propClientId || (params.id ? parseInt(params.id) : undefined);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [createSessionDialogOpen, setCreateSessionDialogOpen] = useState(false);
  
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
  
  // Handle creating a new session
  const handleCreateNewSession = () => {
    setCreateSessionDialogOpen(true);
  };
  
  // Handle creating a new document (placeholder for now)
  const handleCreateNewDocument = () => {
    // Placeholder for document creation functionality
    console.log("Create new document requested");
    alert("Document creation will be implemented in a future update");
  };
  
  // Handle viewing a session
  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
  };
  
  return (
    <div className="space-y-6">
      {/* Session List View */}
      {clientId && (
        <SessionsListView 
          clientId={clientId}
          client={client}
          onCreateSession={handleCreateNewSession}
          onCreateDocument={handleCreateNewDocument}
          onViewSession={handleViewSession}
        />
      )}
      
      {/* Session creation form */}
      <FullScreenSessionForm 
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
    </div>
  );
}