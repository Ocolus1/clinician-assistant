import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { 
  MapPin, 
  X, 
  Plus, 
  Clock, 
  User, 
  UserPlus, 
  Users, 
  Search, 
  ShoppingCart, 
  ClipboardList, 
  ClipboardPen, 
  ListChecks, 
  Target,
  ArrowRight,
  ArrowLeft,
  Eraser,
  Save,
  Check,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Custom components
import { RichTextEditor } from "@/components/ui/rich-text-editor";
// Import original NumericRating component for reference
import { NumericRating as OriginalNumericRating } from "@/components/sessions/NumericRating";

// Custom NumericRating component without High/Low labels
const NumericRating = ({ value, onChange, label, description }: { 
  value: number; 
  onChange: (value: number) => void; 
  label: string; 
  description?: string;
}) => {
  // Get appropriate color based on the rating value
  const getColorClass = (circleValue: number) => {
    const isSelected = circleValue === value;

    // Only apply color to the selected number
    if (isSelected) {
      if (value >= 8) return "bg-success-500 text-white";
      if (value >= 5) return "bg-primary-blue-500 text-white";
      if (value >= 3) return "bg-warning-500 text-white";
      if (value >= 1) return "bg-error-500 text-white";
      return "bg-gray-400 text-white";
    }

    // Subtle styling for unselected numbers
    return "bg-gray-50 text-gray-500 hover:bg-gray-100";
  };

  // Get text label for the rating to give meaning to the numbers
  const getRatingLabel = () => {
    if (value >= 9) return "Excellent";
    if (value >= 7) return "Good";
    if (value >= 5) return "Average";
    if (value >= 3) return "Fair";
    if (value >= 1) return "Poor";
    return "Not observed";
  };

  return (
    <div className="space-y-2 mb-4">
      <div className="flex justify-between items-center">
        {label && (
          <div>
            <div className="text-label font-medium text-text-secondary">{label}</div>
            {description && <div className="text-caption text-text-tertiary">{description}</div>}
          </div>
        )}
        {/* Removed the rating display div (now shown in the subgoal header) */}
      </div>

      <div className="flex justify-start mt-2" style={{ width: "85%" }}>
        <div className="rating-scale w-full">
          {Array.from({ length: 11 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              className={`rating-number ${value === i ? 'selected' : ''} ${value === i ? getColorClass(i) : ''}`}
              aria-label={`Rate ${i} out of 10`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Removed High/Low labels */}
    </div>
  );
};
import { RatingDots } from "@/components/sessions/RatingDots";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomDialogContent as DialogContent } from "@/components/profile/CustomDialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

// Types and Schemas from shared
import {
  Client,
  Ally,
  Goal,
  Subgoal,
  BudgetItem,
  BudgetSettings,
  Clinician,
  Strategy,
  insertSessionSchema,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { borderStyles } from "@/lib/border-styles";
import { useToast } from "@/hooks/use-toast";

// Define FormattedAssessment type for form data consistency
export type FormattedAssessment = {
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

// Form schemas
const sessionFormSchema = insertSessionSchema.extend({
  sessionDate: z.coerce.date({
    required_error: "Session date is required",
  }),
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  therapistId: z.coerce.number().optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  location: z.string().optional(),
  sessionId: z.string().optional(),
});

// Performance assessment schema
const performanceAssessmentSchema = z.object({
  goalId: z.number(),
  goalTitle: z.string().optional(),
  notes: z.string().optional(),
  subgoals: z.array(z.object({
    subgoalId: z.number(),
    subgoalTitle: z.string().optional(),
    rating: z.number().min(0).max(10).optional(),
    strategies: z.array(z.string()).default([]),
    notes: z.string().optional(),
  })).default([]),
});

// Product schema for session notes
const sessionProductSchema = z.object({
  budgetItemId: z.number(),
  productCode: z.string(),
  productDescription: z.string(),
  quantity: z.number().min(0.01),
  unitPrice: z.number(),
  availableQuantity: z.number(), // For validation only, not sent to server
});

// Session notes schema
const sessionNoteSchema = z.object({
  presentAllies: z.array(z.string()).default([]),
  presentAllyIds: z.array(z.number()).default([]),
  moodRating: z.number().min(0).max(10).default(5),
  focusRating: z.number().min(0).max(10).default(5),
  cooperationRating: z.number().min(0).max(10).default(5),
  physicalActivityRating: z.number().min(0).max(10).default(5),
  notes: z.string().optional(),
  products: z.array(sessionProductSchema).default([]),
  status: z.enum(["draft", "completed"]).default("draft"),
});

// Complete form schema
const newSessionFormSchema = z.object({
  session: sessionFormSchema,
  sessionNote: sessionNoteSchema,
  performanceAssessments: z.array(performanceAssessmentSchema).default([]),
});

// Type inference for form values
export type NewSessionFormValues = z.infer<typeof newSessionFormSchema>;

interface NewSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClient?: Client;
  initialData?: NewSessionFormValues;
  isEdit?: boolean;
}

// Helper function to get color based on rating score
const getRatingColor = (rating: number) => {
  if (rating >= 8) return "bg-success-500"; // Green for excellent scores (8-10)
  if (rating >= 5) return "bg-primary-blue-500";    // Blue for good scores (5-7)
  if (rating >= 3) return "bg-warning-500";   // Orange/amber for fair scores (3-4)
  return "bg-error-500";                     // Red for poor scores (1-2)
};

// Helper function to get light version of color for strategy tags
const getRatingLightColor = (rating: number) => {
  if (rating >= 8) return "bg-green-100 text-green-700"; // Green for excellent scores
  if (rating >= 5) return "bg-blue-100 text-blue-700";   // Blue for good scores
  if (rating >= 3) return "bg-amber-100 text-amber-700"; // Orange/amber for fair scores
  return "bg-red-100 text-red-700";                     // Red for poor scores
};

// Calculate average rating for a goal's subgoals
const calculateGoalAverageRating = (subgoals: any[]) => {
  if (subgoals.length === 0) return 0;
  const totalRating = subgoals.reduce((sum, subgoal) => sum + (subgoal.rating || 0), 0);
  return Math.round(totalRating / subgoals.length);
};

export function NewSessionForm({ 
  open, 
  onOpenChange, 
  initialClient,
  initialData,
  isEdit = false 
}: NewSessionFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("session");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClient || null);

  // State for attendee selection dialog
  const [attendeeDialogOpen, setAttendeeDialogOpen] = useState(false);

  // State for product selection dialog
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  // State for goal selection dialog
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  // Keep track of subgoals by goal
  const [subgoalsByGoal, setSubgoalsByGoal] = useState<Record<number, Subgoal[]>>({});

  // State to track which goal cards are expanded/collapsed
  const [expandedGoals, setExpandedGoals] = useState<Record<number, boolean>>({});

  // Form declaration
  const form = useForm<NewSessionFormValues>({
    resolver: zodResolver(newSessionFormSchema),
    defaultValues: initialData || {
      session: {
        clientId: initialClient?.id,
        title: "Therapy Session",
        sessionDate: new Date(),
        duration: 60,
        status: "scheduled",
        location: "",
        timeFrom: "09:00",
        timeTo: "10:00",
      },
      sessionNote: {
        presentAllies: [],
        presentAllyIds: [],
        moodRating: 0,
        focusRating: 0,
        cooperationRating: 0,
        physicalActivityRating: 0,
        notes: "",
        products: [],
        status: "draft",
      },
      performanceAssessments: [],
    },
  });

  // Watch form values for summary panel
  const sessionValues = form.watch("session");
  const sessionNoteValues = form.watch("sessionNote");
  const performanceAssessments = form.watch("performanceAssessments");



  // Fetch client data if needed
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      const response = await fetch(`/api/clients/${selectedClient.id}`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });

  // Effect to update form when client changes
  useEffect(() => {
    if (selectedClient) {
      form.setValue("session.clientId", selectedClient.id);
    }
  }, [selectedClient, form]);
  
  // Effect for handling initialData in edit mode
  useEffect(() => {
    if (isEdit && initialData) {
      console.log("Edit mode active with initialData:", initialData);
      console.log("Products in initialData:", initialData.sessionNote.products);
      console.log("Performance assessments in initialData:", initialData.performanceAssessments);
      
      // Make sure all required fields have values for the form to work properly
      const enhancedInitialData = {
        ...initialData,
        session: {
          ...initialData.session,
          title: initialData.session.title || "Therapy Session",
          // Ensure all required fields are present
        },
        sessionNote: {
          ...initialData.sessionNote,
          moodRating: initialData.sessionNote.moodRating || 0,
          focusRating: initialData.sessionNote.focusRating || 0,
          cooperationRating: initialData.sessionNote.cooperationRating || 0,
          physicalActivityRating: initialData.sessionNote.physicalActivityRating || 0,
          presentAllies: initialData.sessionNote.presentAllies || [],
          presentAllyIds: initialData.sessionNote.presentAllyIds || [],
          products: Array.isArray(initialData.sessionNote.products) ? 
            initialData.sessionNote.products : [],
          notes: initialData.sessionNote.notes || "",
          status: initialData.sessionNote.status || "draft",
        },
        performanceAssessments: initialData.performanceAssessments || [],
      };
      
      console.log("Enhanced initial data for form:", enhancedInitialData);
      
      // Ensure products is an array
      if (enhancedInitialData.sessionNote.products && 
          typeof enhancedInitialData.sessionNote.products === 'string') {
        try {
          enhancedInitialData.sessionNote.products = JSON.parse(enhancedInitialData.sessionNote.products);
          console.log("Parsed products from string to array:", enhancedInitialData.sessionNote.products);
        } catch (e) {
          console.error("Failed to parse products JSON:", e);
          enhancedInitialData.sessionNote.products = [];
        }
      } else if (!Array.isArray(enhancedInitialData.sessionNote.products)) {
        // If products is not an array and not a string, make it an empty array
        console.warn("Products is not an array or parseable string, defaulting to empty array");
        enhancedInitialData.sessionNote.products = [];
      }
      
      // Ensure performanceAssessments is an array with the correct structure
      if (enhancedInitialData.performanceAssessments) {
        // Ensure each assessment has the required properties
        enhancedInitialData.performanceAssessments = enhancedInitialData.performanceAssessments.map(assessment => ({
          goalId: assessment.goalId,
          goalTitle: assessment.goalTitle || `Goal ${assessment.goalId}`,
          notes: assessment.notes || "",
          subgoals: Array.isArray(assessment.subgoals) ? assessment.subgoals.map(subgoal => ({
            subgoalId: subgoal.subgoalId,
            subgoalTitle: subgoal.subgoalTitle || `Subgoal ${subgoal.subgoalId}`,
            rating: typeof subgoal.rating === 'number' ? subgoal.rating : 0,
            strategies: Array.isArray(subgoal.strategies) ? subgoal.strategies : [],
            notes: subgoal.notes || ""
          })) : []
        }));
        console.log("Normalized performance assessments:", enhancedInitialData.performanceAssessments);
      }
      
      // Reset the form with enhanced initial data
      form.reset(enhancedInitialData);
      
      // Set the active tab to the first tab
      setActiveTab("session");
      
      // Set the selected client based on initialData
      if (initialData.session.clientId) {
        setSelectedClient(clientData || { id: initialData.session.clientId });
      }
    }
  }, [isEdit, initialData, form, clientData]);

  // Fetch allies for the client
  const { data: allies = [], isLoading: alliesLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id, "allies"],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const response = await fetch(`/api/clients/${selectedClient.id}/allies`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });

  // Fetch goals for the client
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id, "goals"],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const response = await fetch(`/api/clients/${selectedClient.id}/goals`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });

  // Fetch budget items for the client
  const { data: budgetItems = [], isLoading: budgetItemsLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id, "budget-items"],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const response = await fetch(`/api/clients/${selectedClient.id}/budget-items`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });

  // Fetch budget settings for the client
  const { data: budgetSettings, isLoading: budgetSettingsLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id, "budget-settings"],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      const response = await fetch(`/api/clients/${selectedClient.id}/budget-settings`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });

  // Fetch all clinicians 
  const { data: clinicians = [], isLoading: cliniciansLoading } = useQuery({
    queryKey: ["/api/clinicians"],
    queryFn: async () => {
      const response = await fetch(`/api/clinicians`);
      return response.json();
    },
  });
  
  // Fetch assigned clinicians for the client (to use in therapist dropdown)
  const { data: assignedClinicians = [], isLoading: assignedCliniciansLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id, "clinicians"],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const response = await fetch(`/api/clients/${selectedClient.id}/clinicians`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });

  // Function to fetch subgoals for a goal
  const fetchSubgoals = async (goalId: number) => {
    if (!goalId) return;

    try {
      // Fetching subgoals for goal
      const response = await fetch(`/api/goals/${goalId}/subgoals`);
      const subgoals = await response.json();
      // Received subgoals for goal

      setSubgoalsByGoal(prev => ({
        ...prev,
        [goalId]: subgoals
      }));

      return subgoals;
    } catch (error) {
      console.error(`Error fetching subgoals for goal ${goalId}:`, error);
      return [];
    }
  };

  // Effect to fetch subgoals when goals are loaded
  useEffect(() => {
    if (goals.length > 0) {
      // Fetch subgoals for each goal
      Promise.all(goals.map((goal: Goal) => fetchSubgoals(goal.id)))
        .then(() => {
          // Final subgoals loaded by goal
        });
    }
  }, [goals]);

  // Initialize expandedGoals state when performanceAssessments change
  useEffect(() => {
    // When initial data is loaded or goals are added, set their initial expanded state
    const newExpandedGoals: Record<number, boolean> = {};

    performanceAssessments.forEach(assessment => {
      // If this goal doesn't already have an expanded state, default to collapsed
      // We're changing the default state from 'true' to 'false' to start with collapsed goals
      if (expandedGoals[assessment.goalId] === undefined) {
        newExpandedGoals[assessment.goalId] = false;
      }
    });

    if (Object.keys(newExpandedGoals).length > 0) {
      setExpandedGoals(prev => ({
        ...prev,
        ...newExpandedGoals
      }));
    }
  }, [performanceAssessments]);

  // Create or update session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: NewSessionFormValues) => {
      console.log("Submit starting with data:", data);
      
      // Create a session object that matches the server's expectations
      const sessionData = {
        clientId: data.session.clientId,
        therapistId: data.session.therapistId,
        title: data.session.title || "Therapy Session",
        description: data.session.description || "",
        sessionDate: combineDateTime(data.session.sessionDate, data.session.timeFrom, data.session.timeTo),
        duration: calculateDuration(data.session.timeFrom, data.session.timeTo),
        status: data.session.status || "scheduled",
        location: data.session.location || "",
        notes: data.session.notes || ""
      };
      
      // Step 1: Create or update the session first
      let sessionId: number;
      let sessionResponse: any;
      
      try {
        if (isEdit && data.session.sessionId) {
          // Editing existing session
          sessionId = typeof data.session.sessionId === 'string' 
            ? parseInt(data.session.sessionId) 
            : data.session.sessionId;
            
          console.log(`Updating existing session with ID: ${sessionId}`);
          const sessionDataToUpdate = { ...sessionData };
          sessionResponse = await apiRequest("PUT", `/api/sessions/${sessionId}`, sessionDataToUpdate);
        } else {
          // Creating a new session
          console.log("Creating new session");
          const sessionDataToCreate = { ...sessionData };
          sessionResponse = await apiRequest("POST", "/api/sessions", sessionDataToCreate);
          sessionId = sessionResponse.id;
          console.log(`New session created with ID: ${sessionId}`);
        }
        
        // Step 2: Handle session notes - either create or update them
        if (sessionId) {
          // Prepare session note data - ensure it's in the correct format
          const sessionNoteData = {
            ...data.sessionNote,
            sessionId: sessionId,
            clientId: data.session.clientId,
            status: data.sessionNote.status || "draft",
            // Convert products array to a JSON string before sending to the server
            products: JSON.stringify(data.sessionNote.products || [])
          };
          
          console.log("Checking for existing session notes...");
          
          // First check if there are existing notes
          const notesResponse = await fetch(`/api/sessions/${sessionId}/notes`);
          const existingNotesData = await notesResponse.json();
          
          // If we have an ID in the response, it means we have an existing note to update
          if (existingNotesData && existingNotesData.id) {
            console.log(`Updating existing session note with ID: ${existingNotesData.id}`);
            await apiRequest("PUT", `/api/session-notes/${existingNotesData.id}`, sessionNoteData);
            
            // Handle performance assessments in update mode
            if (data.performanceAssessments && data.performanceAssessments.length > 0) {
              console.log(`Updating ${data.performanceAssessments.length} performance assessments...`);
              
              // First, get existing assessments
              const assessmentsResponse = await fetch(`/api/sessions/${sessionId}/assessments`);
              const existingAssessments = await assessmentsResponse.json();
              
              // Update or create assessments
              // For each performance assessment in our form, we need to break it down to individual subgoal assessments
              const updatePromises = data.performanceAssessments.flatMap(assessment => {
                // Get the goal ID and notes from the assessment
                const { goalId, notes: goalNotes } = assessment;
                
                // Process each subgoal in this assessment
                if (!assessment.subgoals || assessment.subgoals.length === 0) {
                  // If there are no subgoals, create/update a goal-level assessment
                  const assessmentData = {
                    sessionNoteId: existingNotesData.id,
                    goalId: assessment.goalId,
                    notes: assessment.notes || ""
                  };
                  
                  // Check if general assessment for this goal already exists
                  const existingAssessment = Array.isArray(existingAssessments) && 
                    existingAssessments.find((a: any) => a.goalId === assessment.goalId && !a.subgoalId);
                  
                  if (existingAssessment) {
                    console.log(`Updating existing general assessment for goal ${assessment.goalId}`);
                    return [apiRequest("PUT", `/api/performance-assessments/${existingAssessment.id}`, assessmentData)];
                  } else {
                    console.log(`Creating new general assessment for goal ${assessment.goalId}`);
                    return [apiRequest("POST", `/api/session-notes/${existingNotesData.id}/performance`, assessmentData)];
                  }
                } else {
                  // For each subgoal, create or update a separate assessment
                  return assessment.subgoals.map(subgoal => {
                    // Create the assessment data for this subgoal
                    const subgoalAssessmentData = {
                      sessionNoteId: existingNotesData.id,
                      goalId: assessment.goalId,
                      subgoalId: subgoal.subgoalId,
                      rating: subgoal.rating || 0,
                      notes: subgoal.notes || "",
                      strategies: Array.isArray(subgoal.strategies) ? 
                        subgoal.strategies : []
                    };
                    
                    // Check if assessment for this subgoal already exists
                    const existingSubgoalAssessment = Array.isArray(existingAssessments) && 
                      existingAssessments.find((a: any) => 
                        a.goalId === assessment.goalId && 
                        a.subgoalId === subgoal.subgoalId);
                    
                    if (existingSubgoalAssessment) {
                      console.log(`Updating existing assessment for subgoal ${subgoal.subgoalId} of goal ${assessment.goalId}`);
                      return apiRequest("PUT", `/api/performance-assessments/${existingSubgoalAssessment.id}`, subgoalAssessmentData);
                    } else {
                      console.log(`Creating new assessment for subgoal ${subgoal.subgoalId} of goal ${assessment.goalId}`);
                      return apiRequest("POST", `/api/session-notes/${existingNotesData.id}/performance`, subgoalAssessmentData);
                    }
                  });
                }
              });
              
              await Promise.all(updatePromises);
              console.log("Performance assessments updated successfully");
            }
          } else {
            // Otherwise create a new session note
            console.log(`Creating new session note for session ID: ${sessionId}`);
            const noteResponse = await apiRequest("POST", `/api/sessions/${sessionId}/notes`, sessionNoteData);
            console.log("Session note created:", noteResponse);
            
            // Step 3: Create performance assessments if we have any
            if (data.performanceAssessments && data.performanceAssessments.length > 0 && noteResponse.id) {
              console.log(`Creating ${data.performanceAssessments.length} performance assessments...`);
              
              const noteId = noteResponse.id;
              // Flatten all the subgoal assessments from each goal assessment
              const assessmentPromises = data.performanceAssessments.flatMap(assessment => {
                // For each goal assessment
                const { goalId, notes: goalNotes } = assessment;
                
                if (!assessment.subgoals || assessment.subgoals.length === 0) {
                  // Just create a general goal assessment without subgoals
                  const assessmentData = {
                    sessionNoteId: noteId,
                    goalId: assessment.goalId,
                    notes: assessment.notes || ""
                  };
                  return [apiRequest("POST", `/api/session-notes/${noteId}/performance`, assessmentData)];
                } else {
                  // Create an assessment for each subgoal
                  return assessment.subgoals.map(subgoal => {
                    const subgoalAssessmentData = {
                      sessionNoteId: noteId,
                      goalId: assessment.goalId,
                      subgoalId: subgoal.subgoalId,
                      rating: subgoal.rating || 0,
                      notes: subgoal.notes || "",
                      strategies: Array.isArray(subgoal.strategies) ?
                        subgoal.strategies : []
                    };
                    return apiRequest("POST", `/api/session-notes/${noteId}/performance`, subgoalAssessmentData);
                  });
                }
              });
              
              await Promise.all(assessmentPromises);
              console.log("Performance assessments created successfully");
            }
          }
        }
        
        return sessionResponse;
      } catch (error) {
        console.error("Error in session creation/update process:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      if (selectedClient?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients", selectedClient.id, "sessions"] });
      }
      
      // Show success toast
      toast({
        title: isEdit ? "Session updated successfully" : "Session created successfully",
        description: isEdit ? "Your session has been updated." : "Your new session has been created.",
        variant: "default",
      });
      
      // Close the dialog
      onOpenChange(false);
    },
    onError: (error: any) => {
      // Extract error message properly
      let errorMessage = "An unexpected error occurred. Please try again.";
      let errorDetails = "";
      
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.data && error.data.message && typeof error.data.message === 'string') {
          errorMessage = error.data.message;
        } else if (error.error && error.error.errors) {
          // Handle Zod validation errors
          errorMessage = "Validation error. Please check your input.";
          try {
            const issues = error.error.errors;
            if (Array.isArray(issues)) {
              errorDetails = issues.map(issue => issue.message || issue.path?.join('.')).join(', ');
            }
          } catch (e) {
            // Fallback if parsing fails
            errorDetails = "Please check all required fields";
          }
        } else {
          // Try to stringify the error object if all else fails
          try {
            const parsed = JSON.stringify(error);
            if (parsed !== '{}') {
              errorDetails = parsed;
            }
          } catch (e) {
            // If all else fails, don't add any details
          }
        }
      }
      
      // Show error toast
      toast({
        title: isEdit ? "Failed to update session" : "Failed to create session",
        description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        variant: "destructive",
      });
    }
  });

  // Submit handler
  const onSubmit = (data: NewSessionFormValues) => {
    console.log("Form submitted in mode:", isEdit ? "edit" : "create");
    console.log("Form data on submit:", data);
    
    // Check if the selected therapist is assigned to the client
    const isTherapistAssigned = assignedClinicians.some(
      (assignment: any) => assignment.clinician.id === data.session.therapistId
    );
    
    if (data.session.therapistId && !isTherapistAssigned) {
      toast({
        title: "Validation Error",
        description: "The selected therapist must be assigned to the client. Please select a valid therapist.",
        variant: "destructive",
      });
      return;
    }
    
    createSessionMutation.mutate(data);
  };

  // Helper to combine date and time
  const combineDateTime = (date: Date, timeFrom?: string, timeTo?: string) => {
    if (!date) return new Date();

    const newDate = new Date(date);

    if (timeFrom) {
      const [hours, minutes] = timeFrom.split(":").map(Number);
      newDate.setHours(hours, minutes);
    }

    return newDate;
  };

  // Calculate duration in minutes from time strings
  const calculateDuration = (timeFrom?: string, timeTo?: string) => {
    if (!timeFrom || !timeTo) return 60; // Default to 60 minutes

    const [fromHours, fromMinutes] = timeFrom.split(":").map(Number);
    const [toHours, toMinutes] = timeTo.split(":").map(Number);

    const fromMinutesTotal = fromHours * 60 + fromMinutes;
    const toMinutesTotal = toHours * 60 + toMinutes;

    return toMinutesTotal - fromMinutesTotal;
  };

  // Function to collapse all goals except one
  const collapseAllGoalsExcept = (exceptGoalId: number) => {
    // Create a new state object with all goals collapsed
    const newExpandedState: Record<number, boolean> = {};
    
    // Iterate through all current goal assessments
    performanceAssessments.forEach(assessment => {
      // Collapse all goals except the specified one
      newExpandedState[assessment.goalId] = assessment.goalId === exceptGoalId;
    });
    
    // Set the new expanded state
    setExpandedGoals(newExpandedState);
  };

  // Function to add a goal assessment (without subgoals)
  const addGoalAssessment = (goalId: number) => {
    const goal = goals.find((g: Goal) => g.id === goalId);
    if (!goal) return;

    const existingAssessmentIndex = performanceAssessments.findIndex(
      a => a.goalId === goalId
    );

    if (existingAssessmentIndex !== -1) {
      // Goal is already being assessed
      return;
    }

    // Add goal assessment without subgoals (new behavior)
    const newAssessment = {
      goalId,
      goalTitle: goal.title,
      notes: "",
      subgoals: [], // Empty array - subgoals will be added individually
    };

    // First update the form with the new assessment
    form.setValue("performanceAssessments", [
      ...performanceAssessments,
      newAssessment
    ]);
    
    // Then collapse all other goals and expand only the newly added one
    // This ensures we have all goals (including the new one) in our state
    setTimeout(() => {
      collapseAllGoalsExcept(goalId);
    }, 0);
  };

  // Function to add a subgoal to a goal assessment
  const addSubgoalToAssessment = (goalId: number, subgoalId: number) => {
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return;

    const subgoal = subgoalsByGoal[goalId]?.find(s => s.id === subgoalId);
    if (!subgoal) return;

    // Check if subgoal is already added
    const subgoalExists = performanceAssessments[goalIndex].subgoals.some(
      s => s.subgoalId === subgoalId
    );

    if (subgoalExists) return;

    // Add the subgoal to the assessment
    const newAssessments = [...performanceAssessments];
    newAssessments[goalIndex].subgoals.push({
      subgoalId,
      subgoalTitle: subgoal.title,
      rating: 0, // Default rating
      strategies: [],
      notes: "",
    });

    form.setValue("performanceAssessments", newAssessments);
  };

  // Function to remove a subgoal from a goal assessment
  const removeSubgoalFromAssessment = (goalId: number, subgoalId: number) => {
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return;

    const newAssessments = [...performanceAssessments];
    newAssessments[goalIndex].subgoals = newAssessments[goalIndex].subgoals.filter(
      s => s.subgoalId !== subgoalId
    );

    form.setValue("performanceAssessments", newAssessments);
  };

  // Function to remove a goal assessment
  const removeGoalAssessment = (goalId: number) => {
    const updatedAssessments = performanceAssessments.filter(
      a => a.goalId !== goalId
    );
    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Function to toggle goal expansion/collapse
  const toggleGoalExpanded = (goalId: number) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  // Function to add an attendee
  const addAttendee = (ally: Ally) => {
    const currentPresentAllies = form.getValues("sessionNote.presentAllies");
    const currentPresentAllyIds = form.getValues("sessionNote.presentAllyIds");

    if (!currentPresentAllyIds.includes(ally.id)) {
      // Format the ally information as "Name - Relationship - Preferred language"
      const formattedAllyInfo = `${ally.name} - ${ally.relationship} - ${ally.preferredLanguage}`;
      form.setValue("sessionNote.presentAllies", [...currentPresentAllies, formattedAllyInfo]);
      form.setValue("sessionNote.presentAllyIds", [...currentPresentAllyIds, ally.id]);
    }
  };

  // Function to remove an attendee
  const removeAttendee = (index: number) => {
    const currentPresentAllies = form.getValues("sessionNote.presentAllies");
    const currentPresentAllyIds = form.getValues("sessionNote.presentAllyIds");

    form.setValue("sessionNote.presentAllies", 
      currentPresentAllies.filter((_, i) => i !== index)
    );
    form.setValue("sessionNote.presentAllyIds", 
      currentPresentAllyIds.filter((_, i) => i !== index)
    );
  };

  // Function to add a product to the session
  const addProduct = (item: BudgetItem) => {
    console.log("Adding product:", item);
    const currentProducts = form.getValues("sessionNote.products");

    // Check if product already exists
    const existingProductIndex = currentProducts.findIndex(
      p => p.budgetItemId === item.id
    );

    if (existingProductIndex !== -1) {
      // Update quantity if product already exists
      const updatedProducts = [...currentProducts];
      updatedProducts[existingProductIndex].quantity += 1;
      form.setValue("sessionNote.products", updatedProducts);
      console.log("Updated product quantity:", updatedProducts[existingProductIndex]);
    } else {
      // Make sure we have a valid itemCode
      if (!item.itemCode) {
        console.warn("Budget item missing itemCode:", item);
        toast({
          title: "Warning",
          description: "This product doesn't have a valid code and may not update budget usage correctly",
          variant: "destructive"
        });
      }
      
      // Add new product - ensure both itemCode and productCode are set
      const newProduct = {
        budgetItemId: item.id,
        productCode: item.itemCode || "",
        itemCode: item.itemCode || "", // Add itemCode as well for server compatibility
        productDescription: item.description || "",
        quantity: 1,
        unitPrice: parseFloat(String(item.unitPrice || "0")),
        availableQuantity: parseFloat(String(item.quantity || "0")),
      };
      
      form.setValue("sessionNote.products", [...currentProducts, newProduct]);
      console.log("Added new product:", newProduct);
    }
  };

  // Function to remove a product
  const removeProduct = (index: number) => {
    const currentProducts = form.getValues("sessionNote.products");
    form.setValue("sessionNote.products", 
      currentProducts.filter((_, i) => i !== index)
    );
  };

  // Calculate total product cost
  const totalProductCost = useMemo(() => {
    return sessionNoteValues.products.reduce(
      (total, product) => total + (product.quantity * product.unitPrice),
      0
    );
  }, [sessionNoteValues.products]);

  // Attendee Selection Dialog
  const AttendeeSelectionDialog = () => {
    // State for search input
    const [searchTerm, setSearchTerm] = useState('');

    // Reset search term when dialog opens
    useEffect(() => {
      if (attendeeDialogOpen) {
        setSearchTerm('');
      }
    }, [attendeeDialogOpen]);

    // Get currently selected allies
    const selectedAllies = form.watch("sessionNote.presentAllies") || [];

    // Filter allies by search term and exclude already selected allies
    const filteredAllies = allies.filter((ally: Ally) => {
      // Format the ally information as it would appear in the selectedAllies array
      const formattedAllyInfo = `${ally.name} - ${ally.relationship} - ${ally.preferredLanguage}`;

      return (searchTerm === '' || ally.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !ally.archived &&
        !selectedAllies.includes(formattedAllyInfo);
    });

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

    // Modified add attendee function that also closes the dialog
    const handleAddAttendee = (ally: Ally) => {
      addAttendee(ally);
      setAttendeeDialogOpen(false); // Close dialog after selection
    };

    return (
      <Dialog open={attendeeDialogOpen} onOpenChange={setAttendeeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Attendees</DialogTitle>
            <DialogDescription>
              Choose allies who attended this session
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <Label>Search Allies</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {alliesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : allies.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">No allies found</p>
                ) : filteredAllies.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching allies found' : 'All allies have been selected'}
                  </p>
                ) : (
                  filteredAllies.map((ally: Ally) => (
                    <div 
                      key={ally.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddAttendee(ally)}
                    >
                      <div>
                        <p className="font-medium">{ally.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {ally.relationship} • {ally.preferredLanguage || "English"}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddAttendee(ally);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAttendeeDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Product Selection Dialog
  const ProductSelectionDialog = () => {
    // State for search input
    const [searchTerm, setSearchTerm] = useState('');

    // Reset search term when dialog opens
    useEffect(() => {
      if (productDialogOpen) {
        setSearchTerm('');
      }
    }, [productDialogOpen]);

    // Get currently selected products
    const selectedProducts = form.watch("sessionNote.products") || [];
    const selectedProductIds = selectedProducts.map(p => p.budgetItemId);

    // Filter budget items by search term, exclude already selected products, and exclude items with zero quantity
    const filteredProducts = budgetItems.filter((item: BudgetItem) => 
      (searchTerm === '' || 
       item.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase())) && 
      !selectedProductIds.includes(item.id) &&
      // Only include items with quantity greater than 0
      (parseFloat(String(item.quantity || "0")) > 0)
    );

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

    // Modified add product function that also closes the dialog
    const handleAddProduct = (item: BudgetItem) => {
      addProduct(item);
      setProductDialogOpen(false); // Close dialog after selection
    };

    return (
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Products</DialogTitle>
            <DialogDescription>
              Select products and services from the client's budget
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <Label>Search Products</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or code..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {budgetItemsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : budgetItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">No budget items found</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching products found' : 'All products have been selected'}
                  </p>
                ) : (
                  filteredProducts.map((item: BudgetItem) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddProduct(item)}
                    >
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <div className="flex text-sm text-muted-foreground space-x-2">
                          <span>{item.itemCode}</span>
                          <span>•</span>
                          <span>${item.unitPrice} each</span>
                          <span>•</span>
                          <span>Available: {parseFloat(String(item.quantity || "0")).toFixed(2)}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddProduct(item);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setProductDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // State for subgoal dialog
  const [subgoalDialogOpen, setSubgoalDialogOpen] = useState(false);
  const [selectedGoalForSubgoals, setSelectedGoalForSubgoals] = useState<number | null>(null);

  // State for strategy dialog
  const [strategyDialogOpen, setStrategyDialogOpen] = useState(false);
  const [selectedSubgoalForStrategies, setSelectedSubgoalForStrategies] = useState<{goalId: number, subgoalId: number} | null>(null);

  // Function to open subgoal selection dialog
  const openSubgoalDialog = (goalId: number) => {
    setSelectedGoalForSubgoals(goalId);
    setSubgoalDialogOpen(true);
  };

  // Function to open strategy selection dialog
  const openStrategyDialog = (goalId: number, subgoalId: number) => {
    setSelectedSubgoalForStrategies({goalId, subgoalId});
    setStrategyDialogOpen(true);
  };

  // Add a strategy to a subgoal
  const addStrategyToSubgoal = (goalId: number, subgoalId: number, strategy: string) => {
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return;

    const subgoalIndex = performanceAssessments[goalIndex].subgoals.findIndex(
      s => s.subgoalId === subgoalId
    );
    if (subgoalIndex === -1) return;

    // Check if strategy already exists
    const strategies = performanceAssessments[goalIndex].subgoals[subgoalIndex].strategies;
    if (strategies.includes(strategy)) return;

    // Maximum 5 strategies
    if (strategies.length >= 5) return;

    // Add the strategy
    const newAssessments = [...performanceAssessments];
    newAssessments[goalIndex].subgoals[subgoalIndex].strategies.push(strategy);

    form.setValue("performanceAssessments", newAssessments);
  };

  // Remove a strategy from a subgoal
  const removeStrategyFromSubgoal = (goalId: number, subgoalId: number, strategy: string) => {
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return;

    const subgoalIndex = performanceAssessments[goalIndex].subgoals.findIndex(
      s => s.subgoalId === subgoalId
    );
    if (subgoalIndex === -1) return;

    // Remove the strategy
    const newAssessments = [...performanceAssessments];
    newAssessments[goalIndex].subgoals[subgoalIndex].strategies = 
      newAssessments[goalIndex].subgoals[subgoalIndex].strategies.filter(s => s !== strategy);

    form.setValue("performanceAssessments", newAssessments);
  };

  // Goal Selection Dialog
  const GoalSelectionDialog = () => {
    // State for search input
    const [searchTerm, setSearchTerm] = useState('');

    // Reset search term when dialog opens
    useEffect(() => {
      if (goalDialogOpen) {
        setSearchTerm('');
      }
    }, [goalDialogOpen]);

    // Get currently selected goal IDs
    const selectedGoalIds = performanceAssessments.map(a => a.goalId);

    // Filter goals by search term and filter out already selected goals
    const filteredGoals = goals.filter((goal: Goal) => 
      (searchTerm === '' || 
       goal.title.toLowerCase().includes(searchTerm.toLowerCase())) && 
      !selectedGoalIds.includes(goal.id)
    );

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

    // Modified add goal function that also closes the dialog
    const handleAddGoal = (goalId: number) => {
      addGoalAssessment(goalId);
      setGoalDialogOpen(false); // Close dialog after selection
    };

    return (
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Goal Assessment</DialogTitle>
            <DialogDescription>
              Select a goal to assess for this session
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <Label>Search Goals</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by title..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {goalsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : goals.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">No goals found</p>
                ) : filteredGoals.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching goals found' : 'All goals have been selected'}
                  </p>
                ) : (
                  filteredGoals.map((goal: Goal) => (
                    <div 
                      key={goal.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddGoal(goal.id)}
                    >
                      <div>
                        <p className="font-medium">{goal.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {(subgoalsByGoal[goal.id]?.length || 0)} subgoals
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddGoal(goal.id);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setGoalDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Subgoal Selection Dialog
  const SubgoalSelectionDialog = () => {
    const [searchTerm, setSearchTerm] = useState('');

    // Reset search term when dialog opens
    useEffect(() => {
      if (subgoalDialogOpen) {
        setSearchTerm('');
      }
    }, [subgoalDialogOpen]);

    if (!selectedGoalForSubgoals) return null;

    const goalIndex = performanceAssessments.findIndex(a => a.goalId === selectedGoalForSubgoals);
    if (goalIndex === -1) return null;

    // Get subgoals for the selected goal
    const goalSubgoals = subgoalsByGoal[selectedGoalForSubgoals] || [];

    // Get already selected subgoal IDs
    const selectedSubgoalIds = performanceAssessments[goalIndex].subgoals.map(s => s.subgoalId);

    // Filter subgoals that haven't been selected yet
    const filteredSubgoals = goalSubgoals.filter((subgoal: Subgoal) => 
      (searchTerm === '' || 
       subgoal.title.toLowerCase().includes(searchTerm.toLowerCase())) && 
      !selectedSubgoalIds.includes(subgoal.id)
    );

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

    // Add subgoal and close dialog
    const handleAddSubgoal = (subgoalId: number) => {
      addSubgoalToAssessment(selectedGoalForSubgoals, subgoalId);
      setSubgoalDialogOpen(false);
    };

    return (
      <Dialog open={subgoalDialogOpen} onOpenChange={setSubgoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subgoal</DialogTitle>
            <DialogDescription>
              Select a subgoal to assess for this goal
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <Label>Search Subgoals</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by title..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredSubgoals.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching subgoals found' : 'All subgoals have been selected'}
                  </p>
                ) : (
                  filteredSubgoals.map((subgoal) => (
                    <div 
                      key={subgoal.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddSubgoal(subgoal.id)}
                    >
                      <div>
                        <p className="font-medium">{subgoal.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {subgoal.description}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddSubgoal(subgoal.id);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSubgoalDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Strategy Selection Dialog
  const StrategySelectionDialog = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [strategies] = useState<string[]>([
      "Visual Supports", "Sensory Integration", "Positive Reinforcement",
      "Social Stories", "Video Modeling", "Structured Teaching",
      "AAC Devices", "Verbal Behavior Approach", "Prompting",
      "Scaffolding", "Task Analysis", "Naturalistic Teaching",
      "Pivotal Response Training", "Self-Management", "Peer-Mediated Strategies"
    ]);

    // Reset search term when dialog opens
    useEffect(() => {
      if (strategyDialogOpen) {
        setSearchTerm('');
      }
    }, [strategyDialogOpen]);

    if (!selectedSubgoalForStrategies) return null;

    const { goalId, subgoalId } = selectedSubgoalForStrategies;

    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return null;

    const subgoalIndex = performanceAssessments[goalIndex].subgoals.findIndex(
      s => s.subgoalId === subgoalId
    );
    if (subgoalIndex === -1) return null;

    // Get already selected strategies
    const selectedStrategies = performanceAssessments[goalIndex].subgoals[subgoalIndex].strategies;

    // Filter strategies that haven't been selected yet
    const filteredStrategies = strategies.filter((strategy: string) => 
      (searchTerm === '' || 
       strategy.toLowerCase().includes(searchTerm.toLowerCase())) && 
      !selectedStrategies.includes(strategy)
    );

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

    // Add strategy and close dialog if we've reached 5 strategies
    const handleAddStrategy = (strategy: string) => {
      addStrategyToSubgoal(goalId, subgoalId, strategy);

      // If we now have 5 strategies, close the dialog
      const currentStrategies = [...performanceAssessments[goalIndex].subgoals[subgoalIndex].strategies, strategy];
      if (currentStrategies.length >= 5) {
        setStrategyDialogOpen(false);
      }
    };

    return (
      <Dialog open={strategyDialogOpen} onOpenChange={setStrategyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Strategies</DialogTitle>
            <DialogDescription>
              Select up to 5 strategies used for this subgoal
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <Label>Search Strategies</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <div className="mb-3">
              <Label>Selected ({selectedStrategies.length}/5):</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedStrategies.map((strategy) => (
                  <Badge 
                    key={strategy} 
                    variant="secondary"
                    className="px-2 py-1 gap-1"
                  >
                    {strategy}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeStrategyFromSubgoal(goalId, subgoalId, strategy)} 
                    />
                  </Badge>
                ))}
                {selectedStrategies.length === 0 && (
                  <p className="text-sm text-muted-foreground">No strategies selected yet</p>
                )}
              </div>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {filteredStrategies.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching strategies found' : 
                     selectedStrategies.length >= 5 ? 'Maximum of 5 strategies reached' : 'All strategies have been selected'}
                  </p>
                ) : (
                  filteredStrategies.map((strategy) => (
                    <div 
                      key={strategy} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddStrategy(strategy)}
                    >
                      <div>
                        <p className="font-medium">{strategy}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddStrategy(strategy);
                        }}
                        disabled={selectedStrategies.length >= 5}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setStrategyDialogOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Check if form is in a loading state
  const isDataLoading = clientLoading || 
    alliesLoading || 
    goalsLoading || 
    budgetItemsLoading || 
    budgetSettingsLoading ||
    cliniciansLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen p-0 h-screen max-h-screen flex flex-col overflow-hidden" hideCloseButton>
        <div className="w-full h-full flex flex-col">
          {/* Form Header */}
          <div className="flex justify-between items-center py-4 px-6 border-b shadow-sm">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">
                {isEdit ? "Edit Session" : "New Session"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {selectedClient ? 
                  (() => {
                    // Calculate age
                    const age = selectedClient.dateOfBirth ? 
                      new Date().getFullYear() - new Date(selectedClient.dateOfBirth).getFullYear() : 
                      null;

                    // Format the client information with age and funds management
                    return `Client: ${selectedClient.originalName || selectedClient.name}${
                      age ? ` - ${age} years old` : ''
                    }${
                      selectedClient.fundsManagement ? ` - ${selectedClient.fundsManagement}` : ''
                    }`;
                  })() : 
                  "Please select a client"}
              </p>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setConfirmDialogOpen(true)}
              className="hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden h-full">
          <div className="h-full flex flex-col md:flex-row">
            {/* Left Side - Form */}
            <div className="md:w-2/3 h-full overflow-y-auto p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Session Details</h2>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full grid grid-cols-5 p-1 bg-slate-100 rounded-lg">
                        <TabsTrigger 
                          value="session" 
                          className="flex items-center data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm transition-all"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Session
                        </TabsTrigger>
                        <TabsTrigger 
                          value="details" 
                          className="flex items-center data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm transition-all"
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Observations
                        </TabsTrigger>
                        <TabsTrigger 
                          value="products" 
                          className="flex items-center data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm transition-all"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Products
                        </TabsTrigger>
                        <TabsTrigger 
                          value="assessment" 
                          className="flex items-center data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm transition-all"
                        >
                          <ListChecks className="h-4 w-4 mr-2" />
                          Assessment
                        </TabsTrigger>
                        <TabsTrigger 
                          value="session-notes" 
                          className="flex items-center data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm transition-all"
                        >
                          <ClipboardPen className="h-4 w-4 mr-2" />
                          Session Notes
                        </TabsTrigger>
                      </TabsList>

                      {/* Session Tab */}
                      <TabsContent value="session" className="py-4">
                        <div className="space-y-6">
                          <div className="flex flex-col space-y-4">
                            {/* Date */}
                            <div className="flex items-start">
                              <span className="font-medium text-slate-700 min-w-[100px]">Date:</span>
                              <FormField
                                control={form.control}
                                name="session.sessionDate"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant={"outline"}
                                            className={cn(
                                              "w-full justify-start text-left font-normal",
                                              !field.value && "text-muted-foreground"
                                            )}
                                          >
                                            {field.value ? (
                                              format(field.value, "dd MMM yyyy")
                                            ) : (
                                              <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Time */}
                            <div className="flex items-start">
                              <span className="font-medium text-slate-700 min-w-[100px]">Time:</span>
                              <div className="flex-1 space-x-2 flex items-center">
                                <FormField
                                  control={form.control}
                                  name="session.timeFrom"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Start" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {Array.from({ length: 24 }).map((_, hour) => (
                                            <>
                                              <SelectItem
                                                key={`${hour}:00`}
                                                value={`${hour.toString().padStart(2, '0')}:00`}
                                              >
                                                {`${hour.toString().padStart(2, '0')}:00`}
                                              </SelectItem>
                                              <SelectItem
                                                key={`${hour}:30`}
                                                value={`${hour.toString().padStart(2, '0')}:30`}
                                              >
                                                {`${hour.toString().padStart(2, '0')}:30`}
                                              </SelectItem>
                                            </>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <span className="text-slate-500">-</span>
                                <FormField
                                  control={form.control}
                                  name="session.timeTo"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="End" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {Array.from({ length: 24 }).map((_, hour) => (
                                            <>
                                              <SelectItem
                                                key={`${hour}:00`}
                                                value={`${hour.toString().padStart(2, '0')}:00`}
                                              >
                                                {`${hour.toString().padStart(2, '0')}:00`}
                                              </SelectItem>
                                              <SelectItem
                                                key={`${hour}:30`}
                                                value={`${hour.toString().padStart(2, '0')}:30`}
                                              >
                                                {`${hour.toString().padStart(2, '0')}:30`}
                                              </SelectItem>
                                            </>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            {/* Location */}
                            <div className="flex items-start">
                              <span className="font-medium text-slate-700 min-w-[100px]">Location:</span>
                              <FormField
                                control={form.control}
                                name="session.location"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <div className="relative">
                                        <Input
                                          placeholder="Enter session location"
                                          {...field}
                                        />
                                        <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Therapist */}
                            <div className="flex items-start">
                              <span className="font-medium text-slate-700 min-w-[100px]">Therapist:</span>
                              <FormField
                                control={form.control}
                                name="session.therapistId"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <Select
                                      onValueChange={(value) => field.onChange(parseInt(value))}
                                      defaultValue={field.value?.toString()}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select therapist" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {/* Show clinicians assigned to this client in the personal info tab */}
                                        {assignedClinicians.map((assignment: any) => (
                                          <SelectItem
                                            key={assignment.clinician.id}
                                            value={assignment.clinician.id.toString()}
                                          >
                                            {assignment.clinician.name} ({assignment.role})
                                          </SelectItem>
                                        ))}
                                        
                                        {/* If no clinicians are assigned, show a helper message */}
                                        {assignedClinicians.length === 0 && (
                                          <div className="px-2 py-2 text-sm text-muted-foreground">
                                            No therapists are assigned to this client. Please assign a therapist in the Personal Info tab first.
                                          </div>
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Attendees */}
                            <div className="flex items-start">
                              <span className="font-medium text-slate-700 min-w-[100px] pt-1">Attendees:</span>
                              <div className="flex-1">
                                {sessionNoteValues.presentAllies.length === 0 ? (
                                  <div className="text-center py-4 text-muted-foreground bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <User className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm">No attendees selected</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {sessionNoteValues.presentAllies.map((name, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between rounded-md py-1.5"
                                      >
                                        <span className="text-slate-800 flex items-center">
                                          <User className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                          {name}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeAttendee(index)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-3"
                                  onClick={() => setAttendeeDialogOpen(true)}
                                >
                                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                  Select Attendees
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Observations Tab */}
                      <TabsContent value="details" className="py-4">
                        <div className="space-y-4">

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border border-slate-200 rounded-lg shadow-sm hover:shadow transition-shadow relative overflow-hidden">
                              {/* Removed blue accent line as requested */}
                              <CardHeader className="pb-3 pl-6">
                                <CardTitle className="text-md font-medium flex items-center">
                                  <User className="h-4 w-4 mr-2 text-slate-500" />
                                  Client Behavior
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-5 pl-6 space-y-6">
                                <FormField
                                  control={form.control}
                                  name="sessionNote.moodRating"
                                  render={({ field }) => (
                                    <FormItem>
                                      <NumericRating
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Mood"
                                        description="Rate the client's mood during the session"
                                      />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="sessionNote.focusRating"
                                  render={({ field }) => (
                                    <FormItem>
                                      <NumericRating
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Focus"
                                        description="Rate the client's ability to focus during the session"
                                      />
                                    </FormItem>
                                  )}
                                />
                              </CardContent>
                            </Card>

                            <Card className="border border-slate-200 rounded-lg shadow-sm hover:shadow transition-shadow relative overflow-hidden">
                              {/* Removed blue accent line as requested */}
                              <CardHeader className="pb-3 pl-6">
                                <CardTitle className="text-md font-medium flex items-center">
                                  <ClipboardList className="h-4 w-4 mr-2 text-slate-500" />
                                  Participation
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-5 pl-6 space-y-6">
                                <FormField
                                  control={form.control}
                                  name="sessionNote.cooperationRating"
                                  render={({ field }) => (
                                    <FormItem>
                                      <NumericRating
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Cooperation"
                                        description="Rate the client's cooperation during the session"
                                      />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="sessionNote.physicalActivityRating"
                                  render={({ field }) => (
                                    <FormItem>
                                      <NumericRating
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Physical Activity"
                                        description="Rate the client's physical activity during the session"
                                      />
                                    </FormItem>
                                  )}
                                />
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Products Tab */}
                      <TabsContent value="products" className="py-4">
                        <Card className="border border-slate-200 rounded-lg shadow-sm hover:shadow transition-shadow relative overflow-hidden">
                          {/* No blue accent line for Products & Services as requested */}
                          <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-md font-medium flex items-center">
                              <ShoppingCart className="h-4 w-4 mr-2 text-slate-500" />
                              Products & Services
                            </CardTitle>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setProductDialogOpen(true)}
                              className="h-8"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Product
                            </Button>
                          </CardHeader>
                          <CardContent className="p-5">
                            {sessionNoteValues.products.length === 0 ? (
                              <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                <ShoppingCart className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                <p className="text-slate-600 font-medium">No products added</p>
                                <p className="text-xs text-slate-500 mt-2">
                                  Add products from the client's budget to track utilization
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {sessionNoteValues.products.map((product: any, index: number) => (
                                  <div 
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-slate-50/50 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow"
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium text-slate-800">{product.productDescription}</p>
                                      <div className="flex text-sm text-slate-500 space-x-2 mt-1">
                                        <span>{product.productCode}</span>
                                        <span>•</span>
                                        <span>${product.unitPrice.toFixed(2)} each</span>
                                        <span>•</span>
                                        <span>{product.quantity} of {product.availableQuantity} Units</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <div className="w-20">
                                        <Label htmlFor={`quantity-${index}`} className="sr-only">
                                          Quantity
                                        </Label>
                                        <Input
                                          id={`quantity-${index}`}
                                          type="number"
                                          min="0.01"
                                          step="0.01"
                                          value={product.quantity}
                                          onChange={(e) => {
                                            const newProducts = [...sessionNoteValues.products];
                                            newProducts[index].quantity = parseFloat(e.target.value);
                                            form.setValue("sessionNote.products", newProducts);
                                          }}
                                          className="text-right"
                                        />
                                      </div>
                                      <div className="w-24 text-right font-medium text-slate-800">
                                        ${(product.quantity * product.unitPrice).toFixed(2)}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeProduct(index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}

                                <div className="flex justify-end pt-5 mt-4 border-t border-slate-200">
                                  <div className="w-40 text-right">
                                    <p className="text-slate-500">Total</p>
                                    <p className="font-semibold text-lg text-slate-800">
                                      ${totalProductCost.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Assessment Tab */}
                      <TabsContent value="assessment" className="py-4">
                        <Card className="border border-slate-200 rounded-lg shadow-sm hover:shadow transition-shadow relative overflow-hidden">
                          <CardHeader className="pb-3 pl-6 flex flex-row items-center justify-between">
                            <CardTitle className="text-md font-medium flex items-center">
                              <ListChecks className="h-4 w-4 mr-2 text-slate-500" />
                              Goal Assessments
                            </CardTitle>
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              onClick={() => setGoalDialogOpen(true)}
                              className="h-8 bg-white text-blue-600 hover:bg-blue-50 border border-blue-600 rounded-md transition-all"
                            >
                              <Plus className="h-4 w-4 mr-1.5" />
                              <span className="text-sm font-bold tracking-wide">Goal</span>
                            </Button>
                          </CardHeader>
                          <CardContent className="p-5 pl-6">
                            {performanceAssessments.length === 0 ? (
                              <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                <ListChecks className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                <p className="text-slate-600 font-medium">No goals available</p>
                                <p className="text-xs text-slate-500 mt-2">
                                  Add goals to the client profile first
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {performanceAssessments.map((assessment: any, goalIndex: number) => (
                                  <div key={assessment.goalId} className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm hover:shadow transition-shadow relative overflow-hidden mb-4">
                                    {/* Dynamic accent line for goal card based on average subgoal rating */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                                      assessment.subgoals.length > 0 && calculateGoalAverageRating(assessment.subgoals) > 0
                                        ? getRatingColor(calculateGoalAverageRating(assessment.subgoals))
                                        : "bg-gray-300"
                                    }`}></div>
                                    {/* Goal header with expand/collapse and remove buttons */}
                                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100 pl-3">
                                      <div 
                                        className="flex items-center cursor-pointer"
                                        onClick={() => toggleGoalExpanded(assessment.goalId)}
                                      >
                                        {expandedGoals[assessment.goalId] ? 
                                          <ChevronUp className="h-4 w-4 mr-2 text-slate-500" /> : 
                                          <ChevronDown className="h-4 w-4 mr-2 text-slate-500" />
                                        }
                                        <h3 className="font-medium text-slate-800 flex items-center py-1">
                                          <span>{assessment.goalTitle}</span>
                                          {assessment.subgoals.length > 0 && calculateGoalAverageRating(assessment.subgoals) > 0 && (
                                            <span className="ml-2 text-sm font-normal flex items-center">
                                              <span className="mx-1 text-gray-400">•</span>
                                              <span className={`${
                                                calculateGoalAverageRating(assessment.subgoals) >= 8 
                                                  ? "text-success-600" 
                                                  : calculateGoalAverageRating(assessment.subgoals) >= 5
                                                    ? "text-blue-600"
                                                    : calculateGoalAverageRating(assessment.subgoals) >= 3
                                                      ? "text-amber-600"
                                                      : "text-rose-600"
                                              }`}>
                                                {calculateGoalAverageRating(assessment.subgoals).toFixed(1)} <span className="mx-0.5">|</span> 
                                                {calculateGoalAverageRating(assessment.subgoals) >= 9 ? "Excellent" : 
                                                  calculateGoalAverageRating(assessment.subgoals) >= 7 ? "Good" : 
                                                  calculateGoalAverageRating(assessment.subgoals) >= 5 ? "Average" : 
                                                  calculateGoalAverageRating(assessment.subgoals) >= 3 ? "Fair" : 
                                                  calculateGoalAverageRating(assessment.subgoals) >= 1 ? "Poor" : 
                                                  "Not observed"}
                                              </span>
                                            </span>
                                          )}
                                        </h3>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          type="button"
                                          variant="default"
                                          size="sm"
                                          onClick={() => openSubgoalDialog(assessment.goalId)}
                                          className={`h-8 text-white rounded-md shadow-sm transition-all ${
                                            assessment.subgoals.length > 0 && calculateGoalAverageRating(assessment.subgoals) > 0
                                              ? getRatingColor(calculateGoalAverageRating(assessment.subgoals))
                                              : "bg-gray-300"
                                          }`}
                                        >
                                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                                          <span className="text-xs font-semibold">Subgoal</span>
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeGoalAssessment(assessment.goalId)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Content section - controlled by collapsible state */}
                                    {expandedGoals[assessment.goalId] ? (
                                      <>
                                        {/* No subgoals message */}
                                        {assessment.subgoals.length === 0 && (
                                          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                            <p className="text-slate-600">No subgoals added</p>
                                          </div>
                                        )}

                                        {/* List of subgoals */}
                                        <div className="space-y-4">
                                          {assessment.subgoals.map((subgoal: any, subgoalIndex: number) => (
                                        <div key={subgoal.subgoalId} className="border-t border-slate-200 pt-3 mt-2 pl-6 relative">
                                          {/* Dynamic accent line based on subgoal rating */}
                                          <div className={`absolute left-3 top-3 bottom-0 w-1 ${
                                            subgoal.rating > 0 
                                              ? getRatingColor(subgoal.rating)
                                              : "bg-gray-300"
                                          }`}></div>
                                          {/* Subgoal header with remove button */}
                                          <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100">
                                            <h4 className="text-label text-text-primary flex items-center">
                                              <div className="flex items-center">
                                                <span>{subgoal.subgoalTitle}</span>
                                                {(subgoal.rating > 0) && (
                                                  <>
                                                    <span className="mx-2 text-gray-400">•</span>
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                                                      ${subgoal.rating >= 8 ? "bg-success-100 text-success-800 border border-success-300" : 
                                                        subgoal.rating >= 5 ? "bg-blue-100 text-blue-800 border border-blue-300" : 
                                                        subgoal.rating >= 3 ? "bg-amber-100 text-amber-800 border border-amber-300" : 
                                                        "bg-rose-100 text-rose-800 border border-rose-300"}`}>
                                                      <span className="font-semibold">{subgoal.rating}</span>
                                                      <span className="mx-1 text-gray-500">|</span>
                                                      <span>
                                                        {subgoal.rating >= 9 ? "Excellent" : 
                                                          subgoal.rating >= 7 ? "Good" : 
                                                          subgoal.rating >= 5 ? "Average" : 
                                                          subgoal.rating >= 3 ? "Fair" : 
                                                          subgoal.rating >= 1 ? "Poor" : 
                                                          "Not observed"}
                                                      </span>
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                            </h4>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                                              onClick={() => removeSubgoalFromAssessment(assessment.goalId, subgoal.subgoalId)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>

                                          {/* Rating - without label display (now moved to header) */}
                                          <div className="p-3 bg-white rounded-md shadow-sm">
                                            <div className="flex justify-start" style={{ width: "85%" }}>
                                              <NumericRating
                                                value={subgoal.rating || 0}
                                                onChange={(value) => {
                                                  const newAssessments = [...performanceAssessments];
                                                  newAssessments[goalIndex].subgoals[subgoalIndex].rating = value;
                                                  form.setValue("performanceAssessments", newAssessments);
                                                }}
                                                label=""
                                                description=""
                                              />
                                            </div>
                                          </div>

                                          {/* Strategies */}
                                          <div className="mt-3 p-3 bg-white rounded-md shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                              <Label className="text-label text-text-secondary">Applied Strategies</Label>
                                              <Button
                                                type="button"
                                                size="sm"
                                                className={`h-8 py-1.5 px-3 rounded-md shadow-sm transition-all inline-flex items-center justify-center font-medium text-sm ring-offset-background ${
                                                  subgoal.rating >= 8 
                                                    ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200" 
                                                    : subgoal.rating >= 5
                                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
                                                      : subgoal.rating >= 3
                                                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
                                                        : subgoal.rating > 0
                                                          ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200" 
                                                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                                                }`}
                                                onClick={() => openStrategyDialog(assessment.goalId, subgoal.subgoalId)}
                                                disabled={subgoal.strategies.length >= 5}
                                              >
                                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                {subgoal.strategies.length >= 5 ? 'Max (5)' : <span className="text-xs font-normal">Strategy</span>}
                                              </Button>
                                            </div>

                                            {subgoal.strategies.length > 0 ? (
                                              <div className="flex flex-wrap gap-2 mt-3">
                                                {subgoal.strategies.map((strategy: string) => (
                                                  <span 
                                                    key={strategy}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-medium text-xs transition-colors ${
                                                      subgoal.rating >= 8 
                                                        ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200" 
                                                        : subgoal.rating >= 5
                                                          ? "bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200"
                                                          : subgoal.rating >= 3
                                                            ? "bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200"
                                                            : subgoal.rating > 0
                                                              ? "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200" 
                                                              : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                                                    }`}
                                                  >
                                                    {strategy}
                                                    <span 
                                                      className="tag-close inline-flex items-center justify-center ml-1 cursor-pointer" 
                                                      onClick={() => removeStrategyFromSubgoal(assessment.goalId, subgoal.subgoalId, strategy)}
                                                    >
                                                      <Trash2 className={`h-3 w-3 ${
                                                        subgoal.rating >= 8 
                                                          ? "text-green-700" 
                                                          : subgoal.rating >= 5
                                                            ? "text-blue-700"
                                                            : subgoal.rating >= 3
                                                              ? "text-amber-700"
                                                              : subgoal.rating > 0
                                                                ? "text-red-700" 
                                                                : "text-gray-600"
                                                      }`} />
                                                    </span>
                                                  </span>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="mt-3 text-sm text-text-tertiary p-3 bg-gray-50 rounded-md text-center">
                                                No strategies selected yet
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center py-4">
                                    <span className="text-sm text-gray-400 italic">Click header to expand</span>
                                  </div>
                                )}
                                </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Include dialog components */}
                        <SubgoalSelectionDialog />
                        <StrategySelectionDialog />
                      </TabsContent>

                      {/* Session Notes Tab */}
                      <TabsContent value="session-notes" className="py-4">
                        <div className="space-y-6">
                          <Card className="border border-slate-200 rounded-lg shadow-sm relative overflow-hidden">
                            {/* Removed blue accent line as requested */}
                            <CardHeader className="pb-3 pl-6">
                              <CardTitle className="text-md font-medium flex items-center">
                                <ClipboardPen className="h-4 w-4 mr-2 text-slate-500" />
                                Session Notes
                              </CardTitle>
                              <CardDescription>
                                Enter detailed notes about the session
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 pl-6">
                              <FormField
                                control={form.control}
                                name="sessionNote.notes"
                                render={({ field }) => {
                                  return (
                                    <FormItem>
                                      <FormControl>
                                        <RichTextEditor
                                          value={field.value || ''}
                                          onChange={(value) => {
                                            field.onChange(value);
                                          }}
                                          placeholder="Enter detailed session notes here..."
                                          minHeight="min-h-[300px]"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }}
                              />
                            </CardContent>
                            <CardFooter className="pt-0 pb-4 px-6 flex justify-between">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  form.setValue('sessionNote.notes', '');
                                }}
                              >
                                <Eraser className="h-3.5 w-3.5 mr-1.5" />
                                Clear Notes
                              </Button>
                            </CardFooter>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="flex justify-between px-4 mt-6 py-4 border-t border-gray-100">
                    {/* Navigation buttons based on active tab */}
                    {activeTab === "session" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="button-secondary w-28 h-10"
                          onClick={() => setConfirmDialogOpen(true)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button"
                          className="button-primary w-28 h-10"
                          onClick={() => setActiveTab("details")}
                        >
                          Next
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {activeTab === "details" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="button-secondary w-28 h-10"
                          onClick={() => setActiveTab("session")}
                        >
                          <ArrowLeft className="mr-1 h-4 w-4" />
                          Previous
                        </Button>
                        <Button 
                          type="button"
                          className="button-primary w-28 h-10"
                          onClick={() => setActiveTab("products")}
                        >
                          Next
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {activeTab === "products" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="button-secondary w-28 h-10"
                          onClick={() => setActiveTab("details")}
                        >
                          <ArrowLeft className="mr-1 h-4 w-4" />
                          Previous
                        </Button>
                        <Button 
                          type="button"
                          className="button-primary w-28 h-10"
                          onClick={() => setActiveTab("assessment")}
                        >
                          Next
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {activeTab === "assessment" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="button-secondary w-28 h-10"
                          onClick={() => setActiveTab("products")}
                        >
                          <ArrowLeft className="mr-1 h-4 w-4" />
                          Previous
                        </Button>
                        <Button 
                          type="button"
                          className="button-primary w-28 h-10"
                          onClick={() => setActiveTab("session-notes")}
                        >
                          Next
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {activeTab === "session-notes" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="button-secondary w-28 h-10"
                          onClick={() => setActiveTab("assessment")}
                        >
                          <ArrowLeft className="mr-1 h-4 w-4" />
                          Previous
                        </Button>
                        <Button 
                          type="submit" 
                          className="button-primary-action w-36 h-10"
                          disabled={createSessionMutation.isPending}
                        >
                          {createSessionMutation.isPending ? (
                            <>
                              <svg className="mr-1.5 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              {isEdit ? "Updating..." : "Creating..."}
                            </>
                          ) : (
                            <>
                              <Check className="mr-1.5 h-4 w-4" />
                              {isEdit ? "Update Session" : "Create Session"}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </form>
              </Form>
            </div>

            {/* Right Side - Session Summary */}
            <div className="md:w-1/3 h-full overflow-y-auto bg-gray-50 p-4">
              <div className="sticky top-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Session Summary</h2>
                </div>

                <div className="space-y-4">
                  {/* Session Info - Enhanced UI */}
                  <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group">
                    {/* Soft black accent line on the left */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gray-700"></div>

                    <CardContent className="p-4 pl-5">
                      <h3 className="font-medium mb-3 text-gray-700 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-600" /> 
                        Session
                      </h3>

                      {sessionValues.sessionDate ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {/* Column 1: Date & Time */}
                          <div className="space-y-2">
                            <div className="flex items-start">
                              <CalendarIcon className="w-4 h-4 mr-2 mt-0.5 text-slate-500" />
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-0.5">Date</p>
                                <p className="text-sm font-medium">{format(sessionValues.sessionDate, "dd MMM yyyy")}</p>
                              </div>
                            </div>

                            <div className="flex items-start">
                              <Clock className="w-4 h-4 mr-2 mt-0.5 text-slate-500" />
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-0.5">Time</p>
                                <p className="text-sm font-medium">{sessionValues.timeFrom} - {sessionValues.timeTo}</p>
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Location & Therapist */}
                          <div className="space-y-2">
                            <div className="flex items-start">
                              <MapPin className="w-4 h-4 mr-2 mt-0.5 text-slate-500" />
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-0.5">Location</p>
                                {sessionValues.location ? (
                                  <p className="text-sm font-medium">{sessionValues.location}</p>
                                ) : (
                                  <p className="text-sm italic text-slate-400 border border-dashed border-slate-200 rounded px-1.5 py-0.5">Not specified</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-start">
                              <User className="w-4 h-4 mr-2 mt-0.5 text-slate-500" />
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-0.5">Therapist</p>
                                {sessionValues.therapistId ? (
                                  <p className="text-sm font-medium">
                                    {clinicians.find((c: Clinician) => c.id === sessionValues.therapistId)?.name || "Unknown"}
                                  </p>
                                ) : (
                                  <p className="text-sm italic text-slate-400 border border-dashed border-slate-200 rounded px-1.5 py-0.5">Not selected</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Full width: Attendees */}
                          <div className="col-span-2 mt-1">
                            <div className="flex items-start">
                              <Users className="w-4 h-4 mr-2 mt-0.5 text-slate-500" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-slate-500 mb-0.5">Attendees</p>
                                {sessionNoteValues.presentAllies.length > 0 ? (
                                  <div className="space-y-1 mt-1">
                                    {sessionNoteValues.presentAllies.map((name, idx) => (
                                      <p key={idx} className="text-sm font-medium">{name}</p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm italic text-slate-400 border border-dashed border-slate-200 rounded px-1.5 py-0.5">None selected</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-4 border border-dashed border-slate-200 rounded-md">
                          <p className="text-slate-400 text-sm flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            No session details provided
                          </p>
                        </div>
                      )}

                      {/* Visual feedback on hover - subtle scale effect */}
                      <div className="absolute inset-0 bg-gray-50 opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                    </CardContent>
                  </Card>

                  {/* Observations */}
                  <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group">
                    {/* Soft black accent line on the left */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gray-700"></div>

                    <CardContent className="p-4 pl-5">
                      <h3 className="font-medium mb-3 text-gray-700 flex items-center">
                        <Eye className="w-4 h-4 mr-2 text-gray-600" /> 
                        Observations
                      </h3>
                      <div className="space-y-3">

                        {/* Mood Rating */}
                        <div className="grid grid-cols-[100px_1fr] gap-1 items-center py-1.5">
                          <span className="text-slate-600 text-sm">Mood:</span>
                          <RatingDots 
                            rating={sessionNoteValues.moodRating} 
                            label={`Mood rating: ${sessionNoteValues.moodRating}/10`}
                          />
                        </div>

                        {/* Thin separator line */}
                        <div className="h-px w-full bg-slate-100"></div>

                        {/* Focus Rating */}
                        <div className="grid grid-cols-[100px_1fr] gap-1 items-center py-1.5">
                          <span className="text-slate-600 text-sm">Focus:</span>
                          <RatingDots 
                            rating={sessionNoteValues.focusRating} 
                            label={`Focus rating: ${sessionNoteValues.focusRating}/10`}
                          />
                        </div>

                        {/* Thin separator line */}
                        <div className="h-px w-full bg-slate-100"></div>

                        {/* Cooperation Rating */}
                        <div className="grid grid-cols-[100px_1fr] gap-1 items-center py-1.5">
                          <span className="text-slate-600 text-sm">Cooperation:</span>
                          <RatingDots 
                            rating={sessionNoteValues.cooperationRating} 
                            label={`Cooperation rating: ${sessionNoteValues.cooperationRating}/10`}
                          />
                        </div>

                        {/* Thin separator line */}
                        <div className="h-px w-full bg-slate-100"></div>

                        {/* Physical Rating */}
                        <div className="grid grid-cols-[100px_1fr] gap-1 items-center py-1.5">
                          <span className="text-slate-600 text-sm">Physical:</span>
                          <RatingDots 
                            rating={sessionNoteValues.physicalActivityRating} 
                            label={`Physical activity rating: ${sessionNoteValues.physicalActivityRating}/10`}
                          />
                        </div>

                        {/* Bottom separator line */}
                        <div className="h-px w-full bg-slate-100"></div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Products */}
                  <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group">
                    {/* Soft black accent line on the left */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gray-700"></div>

                    <CardContent className="p-4 pl-5">
                      <h3 className="font-medium mb-3 text-gray-700 flex items-center">
                        <ShoppingCart className="w-4 h-4 mr-2 text-gray-600" /> 
                        Products
                      </h3>
                      {sessionNoteValues.products.length > 0 ? (
                        <div>
                          <div className="space-y-3">
                            {sessionNoteValues.products.map((product: any, i: number) => (
                              <div 
                                key={i} 
                                className="bg-slate-50 rounded-md p-2.5 border-l-2 border-slate-200"
                              >
                                <div className="grid grid-cols-[2fr_1fr] gap-2">
                                  {/* Left Column - Product Name */}
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">
                                      {product.productDescription}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Unit Price: ${product.unitPrice.toFixed(2)}
                                    </p>
                                  </div>

                                  {/* Right Column - Units & Costs */}
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-slate-800">
                                      ${(product.quantity * product.unitPrice).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {product.quantity} of {product.availableQuantity} Units
                                    </p>
                                  </div>
                                </div>

                                {/* Progress Bar for Units Used */}
                                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2">
                                  <div 
                                    className="h-full bg-gray-500 rounded-full" 
                                    style={{ width: `${Math.min(100, (product.quantity / product.availableQuantity) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Total Section with separator */}
                          <div className="mt-3 pt-2 border-t border-slate-200">
                            <p className="text-sm font-semibold flex justify-between items-center">
                              <span>Total:</span>
                              <span className="text-base text-gray-700">${totalProductCost.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No products added</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Assessments */}
                  <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group">
                    {/* Soft black accent line on the left */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gray-700"></div>

                    <CardContent className="p-5 pl-5">
                      <h3 className="font-medium mb-4 text-gray-700 flex items-center">
                        <Target className="w-4 h-4 mr-2 text-gray-600" /> 
                        Assessments
                      </h3>
                      {performanceAssessments.length > 0 ? (
                        <div className="space-y-3">
                          {performanceAssessments.map((assessment: any) => (
                            <Accordion key={assessment.goalId} type="single" collapsible className="border rounded-md relative overflow-hidden">
                              {/* Dynamic accent line for goal accordion based on rating */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                assessment.subgoals.length > 0 && calculateGoalAverageRating(assessment.subgoals) > 0
                                  ? getRatingColor(calculateGoalAverageRating(assessment.subgoals))
                                  : "bg-gray-400"
                              }`}></div>
                              <AccordionItem value="item-1" className="border-none">
                                <AccordionTrigger className="px-3 py-3 pl-5 text-sm hover:no-underline">
                                  <div className="flex items-center">
                                    <span className="font-medium">{assessment.goalTitle}</span>
                                    {assessment.subgoals.length > 0 && calculateGoalAverageRating(assessment.subgoals) > 0 && (
                                      <span className="ml-2 text-sm font-normal flex items-center">
                                        <span className="mx-1 text-gray-400">•</span>
                                        <span className={`${
                                          calculateGoalAverageRating(assessment.subgoals) >= 8 
                                            ? "text-success-600" 
                                            : calculateGoalAverageRating(assessment.subgoals) >= 5
                                              ? "text-blue-600"
                                              : calculateGoalAverageRating(assessment.subgoals) >= 3
                                                ? "text-amber-600"
                                                : "text-rose-600"
                                        }`}>
                                          {calculateGoalAverageRating(assessment.subgoals).toFixed(1)} <span className="mx-0.5">|</span> 
                                          {calculateGoalAverageRating(assessment.subgoals) >= 9 ? "Excellent" : 
                                            calculateGoalAverageRating(assessment.subgoals) >= 7 ? "Good" : 
                                            calculateGoalAverageRating(assessment.subgoals) >= 5 ? "Average" : 
                                            calculateGoalAverageRating(assessment.subgoals) >= 3 ? "Fair" : 
                                            calculateGoalAverageRating(assessment.subgoals) >= 1 ? "Poor" : 
                                            "Not observed"}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-4 pt-1">
                                  {assessment.subgoals.length > 0 ? (
                                    <div className="space-y-4">
                                      {assessment.subgoals.map((subgoal: any) => (
                                        <div key={subgoal.subgoalId} className="border-t border-slate-100 pt-3 pl-5 relative">
                                          {/* Dynamic accent line for subgoal based on rating */}
                                          <div className={`absolute left-3 top-3 bottom-0 w-1 ${
                                            subgoal.rating > 0
                                              ? getRatingColor(subgoal.rating)
                                              : "bg-gray-400"
                                          }`}></div>
                                          <div className="flex items-center justify-between py-1">
                                            <div className="flex items-center flex-wrap gap-2">
                                              <p className="text-sm font-medium">{subgoal.subgoalTitle}</p>
                                              {subgoal.rating > 0 && (
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                                  subgoal.rating >= 8
                                                    ? "bg-green-100 text-green-700" 
                                                    : subgoal.rating >= 5
                                                      ? "bg-blue-100 text-blue-700"
                                                      : subgoal.rating >= 3
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-rose-100 text-rose-700"
                                                }`}>
                                                  {subgoal.rating.toFixed(1)} <span className="mx-0.5">|</span> 
                                                  {subgoal.rating >= 9 ? "Excellent" : 
                                                    subgoal.rating >= 7 ? "Good" : 
                                                    subgoal.rating >= 5 ? "Average" : 
                                                    subgoal.rating >= 3 ? "Fair" : 
                                                    "Poor"}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {subgoal.strategies && subgoal.strategies.length > 0 && (
                                            <div className="mt-3 mb-1">
                                              <p className="text-xs text-slate-500 mb-1.5">Strategies:</p>
                                              <div className="flex flex-wrap gap-1.5">
                                                {subgoal.strategies.map((strategy: string) => (
                                                  <span 
                                                    key={strategy} 
                                                    className={`inline-flex items-center rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${
                                                      subgoal.rating >= 8 
                                                        ? "bg-green-100 text-green-700" 
                                                        : subgoal.rating >= 5
                                                          ? "bg-blue-100 text-blue-700"
                                                          : subgoal.rating >= 3
                                                            ? "bg-amber-100 text-amber-700"
                                                            : subgoal.rating > 0
                                                              ? "bg-rose-100 text-rose-700" 
                                                              : "bg-gray-100 text-gray-700"
                                                    }`}
                                                  >
                                                    {strategy}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500">No subgoals added</p>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No goal assessments added</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Session Notes */}
                  <Card className="mt-4 relative overflow-hidden transition-all duration-200 hover:shadow-md group">
                    {/* Soft black accent line on the left */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gray-700"></div>

                    <CardContent className="p-5 pl-5">
                      <h3 className="font-medium mb-4 text-gray-700 flex items-center">
                        <ClipboardPen className="w-4 h-4 mr-2 text-gray-600" /> 
                        Session Notes
                      </h3>
                      {sessionNoteValues?.notes ? (
                        <div className="text-sm prose prose-sm max-w-none">
                          <div 
                            dangerouslySetInnerHTML={{ __html: sessionNoteValues.notes }} 
                            className="p-2 border border-slate-100 rounded-md bg-white"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No session notes added</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Dialogs */}
        <AttendeeSelectionDialog />
        <ProductSelectionDialog />
        <GoalSelectionDialog />
        <SubgoalSelectionDialog />
        <StrategySelectionDialog />
  
        {/* Exit Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Exit Session Form</DialogTitle>
              <DialogDescription>
                Are you sure you want to exit? All unsaved changes will be lost.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setConfirmDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setConfirmDialogOpen(false);
                  onOpenChange(false);
                }}
              >
                Exit without saving
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}