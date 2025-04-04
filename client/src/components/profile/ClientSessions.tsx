import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Session, Client } from "@shared/schema";
import { format } from "date-fns";
import { NewSessionForm, NewSessionFormValues } from '@/components/sessions';
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
  
  // Fetch client goals to use for populating titles in assessments
  const { data: clientGoals } = useQuery({
    queryKey: ['/api/clients', clientId, 'goals'],
    queryFn: async () => {
      if (!clientId) return [];
      const response = await fetch(`/api/clients/${clientId}/goals`);
      if (!response.ok) {
        throw new Error(`Error fetching goals: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!clientId
  });
  
  // Map of goalId to goal title for quick lookup
  const goalTitlesMap = React.useMemo(() => {
    if (!clientGoals) return {};
    return clientGoals.reduce((acc: Record<number, string>, goal: any) => {
      acc[goal.id] = goal.title;
      return acc;
    }, {});
  }, [clientGoals]);
  
  // Fetch subgoals for all client goals
  const { data: subgoalsData } = useQuery({
    queryKey: ['/api/clients', clientId, 'all-subgoals'],
    queryFn: async () => {
      if (!clientGoals || !clientGoals.length) return {};
      
      // Create a map of goalId to array of subgoals
      const subgoalsMap: Record<number, any[]> = {};
      
      // Fetch subgoals for each goal
      await Promise.all(clientGoals.map(async (goal: any) => {
        const response = await fetch(`/api/goals/${goal.id}/subgoals`);
        if (response.ok) {
          const subgoals = await response.json();
          subgoalsMap[goal.id] = subgoals;
        }
      }));
      
      return subgoalsMap;
    },
    enabled: !!clientGoals && clientGoals.length > 0
  });
  
  // Create a combined map of subgoal IDs to titles
  const subgoalTitlesMap = React.useMemo(() => {
    if (!subgoalsData) return {};
    
    const titlesMap: Record<number, string> = {};
    
    // Iterate through each goal's subgoals
    Object.values(subgoalsData).forEach((subgoals: any[]) => {
      subgoals.forEach(subgoal => {
        titlesMap[subgoal.id] = subgoal.title;
      });
    });
    
    return titlesMap;
  }, [subgoalsData]);
  
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
  const prepareSessionFormData = (): NewSessionFormValues | undefined => {
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
    
    // Parse products from JSON string if necessary
    let parsedProducts = [];
    if (sessionNotesData?.products) {
      try {
        // Check if products is already an array or a JSON string
        if (typeof sessionNotesData.products === 'string') {
          parsedProducts = JSON.parse(sessionNotesData.products);
          console.log("Successfully parsed products from JSON string:", parsedProducts);
        } else if (Array.isArray(sessionNotesData.products)) {
          parsedProducts = sessionNotesData.products;
          console.log("Products was already an array:", parsedProducts);
        }
      } catch (error) {
        console.error("Error parsing products JSON:", error);
        parsedProducts = [];
      }
    }
    
    const sessionNote = {
      presentAllies: sessionNotesData?.presentAllies || [],
      presentAllyIds: sessionNotesData?.presentAllyIds || [],
      moodRating: sessionNotesData?.moodRating || 0,
      focusRating: sessionNotesData?.focusRating || 0,
      cooperationRating: sessionNotesData?.cooperationRating || 0,
      physicalActivityRating: sessionNotesData?.physicalActivityRating || 0,
      notes: sessionNotesData?.notes || "",
      products: parsedProducts,
      status: sessionNotesData?.status || "draft" as "draft" | "completed",
    };
    
    // Transform assessments data to match the form's expected structure
    // Define the expected assessment type structure
    type FormattedAssessment = {
      goalId: number;
      goalTitle: string;
      notes: string;
      subgoals: {
        subgoalId: number;
        subgoalTitle: string;
        rating: number;
        strategies: string[];
        notes: string;
      }[];
    };
    
    // Group assessments by goalId, then convert to array of objects with subgoals
    // FIXED VERSION: Only include goals and subgoals that were actually assessed
    const performanceAssessments = sessionAssessmentsData 
      ? Object.values(
          sessionAssessmentsData.reduce((acc: Record<number, FormattedAssessment>, assessment: any) => {
            // Only process assessments that have a subgoalId (actual assessments)
            if (!assessment.subgoalId) return acc;
            
            // Initialize goal entry if it doesn't exist
            if (!acc[assessment.goalId]) {
              acc[assessment.goalId] = {
                goalId: assessment.goalId,
                goalTitle: goalTitlesMap[assessment.goalId] || `Goal ${assessment.goalId}`,
                notes: assessment.notes || "",
                subgoals: []
              };
            }
            
            // Add only the assessed subgoal
            acc[assessment.goalId].subgoals.push({
              subgoalId: assessment.subgoalId,
              subgoalTitle: subgoalTitlesMap[assessment.subgoalId] || `Subgoal ${assessment.subgoalId}`,
              rating: assessment.rating || 0,
              strategies: Array.isArray(assessment.strategies) ? assessment.strategies : [],
              notes: assessment.notes || ""
            });
            
            return acc;
          }, {})
        )
      : [];
    
    console.log("Transformed performance assessments for form:", performanceAssessments);
    
    // Return the full form data object with all available data
    // Use type assertion to ensure TypeScript knows this matches the expected schema
    return {
      session: sessionData,
      sessionNote: sessionNote,
      performanceAssessments,
    } as NewSessionFormValues;
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