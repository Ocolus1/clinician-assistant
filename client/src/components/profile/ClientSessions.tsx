import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Session, Client } from "@shared/schema";
import { format } from "date-fns";
import { NewSessionForm } from '@/components/sessions';
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
  const [editSessionDialogOpen, setEditSessionDialogOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
  
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
    setSessionToEdit(null); // Ensure we're not in edit mode
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
  
  // Handle editing a session
  const handleEditSession = (session: Session) => {
    console.log("Editing session:", session);
    // Store the basic session data for immediate use
    setSessionToEdit(session);
    setEditSessionDialogOpen(true);
  };
  
  // Fetch additional session data for the edit form
  const { data: sessionNotesData } = useQuery({
    queryKey: ['/api/sessions', sessionToEdit?.id, 'notes'],
    queryFn: async () => {
      if (!sessionToEdit?.id) return null;
      try {
        const response = await fetch(`/api/sessions/${sessionToEdit.id}/notes`);
        if (!response.ok) {
          console.warn(`Failed to fetch session notes: ${response.status}`);
          return null;
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching session notes:", error);
        return null;
      }
    },
    enabled: !!sessionToEdit?.id,
  });

  const { data: sessionAssessmentsData } = useQuery({
    queryKey: ['/api/sessions', sessionToEdit?.id, 'assessments'],
    queryFn: async () => {
      if (!sessionToEdit?.id) return null;
      try {
        const response = await fetch(`/api/sessions/${sessionToEdit.id}/assessments`);
        if (!response.ok) {
          console.warn(`Failed to fetch session assessments: ${response.status}`);
          return null;
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching session assessments:", error);
        return null;
      }
    },
    enabled: !!sessionToEdit?.id,
  });
  
  // Prepare initial form data for editing session
  const prepareSessionFormData = () => {
    if (!sessionToEdit) return undefined;
    
    console.log("Preparing session form data for editing session:", sessionToEdit);
    console.log("Session notes data:", sessionNotesData);
    console.log("Session assessments data:", sessionAssessmentsData);
    
    // Extract hours from session date for the time fields
    const sessionDate = new Date(sessionToEdit.sessionDate);
    const hours = sessionDate.getHours();
    const minutes = sessionDate.getMinutes();
    
    // Format time as "HH:MM"
    const timeFrom = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const toHours = (hours + Math.floor(sessionToEdit.duration / 60)) % 24;
    const toMinutes = (minutes + (sessionToEdit.duration % 60)) % 60;
    const timeTo = `${toHours.toString().padStart(2, '0')}:${toMinutes.toString().padStart(2, '0')}`;
    
    // We need to create an object that matches the expected form schema
    // Create a sessionData object first to adjust field types
    const sessionData = {
      // Use sessionId instead of id for Zod schema compatibility
      sessionId: sessionToEdit.id.toString(), 
      clientId: sessionToEdit.clientId,
      // Convert null to undefined for therapistId
      therapistId: sessionToEdit.therapistId !== null ? sessionToEdit.therapistId : undefined,
      title: sessionToEdit.title,
      description: sessionToEdit.description || "",
      sessionDate: sessionDate,
      duration: sessionToEdit.duration,
      status: sessionToEdit.status || "scheduled",
      location: sessionToEdit.location || "",
      notes: sessionToEdit.notes || "", 
      timeFrom,
      timeTo
    };
    
    // Prepare session note data with actual values if available or create default structure
    // Note: sessionNotesData may be an empty object returned by the API as a fallback
    const sessionNote = {
      presentAllies: sessionNotesData?.presentAllies || [],
      presentAllyIds: sessionNotesData?.presentAllyIds || [],
      moodRating: sessionNotesData?.moodRating || 0,
      focusRating: sessionNotesData?.focusRating || 0,
      cooperationRating: sessionNotesData?.cooperationRating || 0,
      physicalActivityRating: sessionNotesData?.physicalActivityRating || 0,
      notes: sessionNotesData?.notes || "",
      products: Array.isArray(sessionNotesData?.products) ? sessionNotesData.products : [],
      status: sessionNotesData?.status || "draft" as "draft" | "completed",
    };
    
    // Use assessments data if available
    const performanceAssessments = sessionAssessmentsData || [];
    
    // Return the full form data object with all available data
    return {
      session: sessionData,
      sessionNote: sessionNote,
      performanceAssessments: performanceAssessments,
    };
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
          onEditSession={handleEditSession}
        />
      )}
      
      {/* Session creation form */}
      <NewSessionForm 
        open={createSessionDialogOpen} 
        onOpenChange={setCreateSessionDialogOpen}
        initialClient={client}
      />
      
      {/* Session edit form */}
      <NewSessionForm 
        open={editSessionDialogOpen} 
        onOpenChange={setEditSessionDialogOpen}
        initialClient={client}
        initialData={prepareSessionFormData()}
        isEdit={true}
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