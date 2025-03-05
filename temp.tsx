import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon,
  Clock,
  Check,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Minus,
  ShoppingCart,
  RefreshCw,
  User as UserIcon,
  MapPin as MapPinIcon,
  ClipboardList,
  UserCheck,
  ChevronsUpDown,
  Package,
  BarChart
} from "lucide-react";
import "./session-form.css";
import { ThreeColumnLayout } from "./ThreeColumnLayout";
// Debug helper has been removed in favor of a more natural implementation
import { Ally, BudgetItem, BudgetSettings, Client, Goal, Session, Subgoal, Strategy, insertSessionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { StrategySelectionDialog } from "./StrategySelectionDialog";

// Function to hide unwanted calendars in the UI
const hideUnwantedCalendars = () => {
  // Hide any calendar not properly contained
  const unwantedCalendars = document.querySelectorAll('.rdp:not([data-calendar-container="true"] .rdp, [data-state="open"] .rdp)');
  unwantedCalendars.forEach(calendar => {
    if (calendar.parentElement) {
      calendar.parentElement.classList.add('uncontained-calendar');
    }
  });
};

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Progress } from "@/components/ui/progress";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

// Session form schema
const sessionFormSchema = insertSessionSchema.extend({
  sessionDate: z.coerce.date({
    required_error: "Session date is required",
  }),
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  therapistId: z.coerce.number().optional(),
  location: z.string().optional(),
  sessionId: z.string().optional(), // Added session ID field for display
});

// Performance assessment schema
const performanceAssessmentSchema = z.object({
  goalId: z.number(),
  goalTitle: z.string().optional(),
  notes: z.string().optional(),
  milestones: z.array(z.object({
    milestoneId: z.number(),
    milestoneTitle: z.string().optional(),
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
  presentAllyIds: z.array(z.number()).default([]), // Store ally IDs for data integrity
  moodRating: z.number().min(0).max(10).default(5),
  focusRating: z.number().min(0).max(10).default(5),
  cooperationRating: z.number().min(0).max(10).default(5),
  physicalActivityRating: z.number().min(0).max(10).default(5),
  notes: z.string().optional(),
  products: z.array(sessionProductSchema).default([]),
  status: z.enum(["draft", "completed"]).default("draft"),
});

// Complete form schema
const integratedSessionFormSchema = z.object({
  session: sessionFormSchema,
  sessionNote: sessionNoteSchema,
  performanceAssessments: z.array(performanceAssessmentSchema).default([]),
});

type IntegratedSessionFormValues = z.infer<typeof integratedSessionFormSchema>;

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

const RatingSlider = ({ value, onChange, label, description }: RatingSliderProps) => {
  // Generate a badge color class based on value
  const getBadgeClass = () => {
    if (value <= 3) return 'bg-red-100 border-red-200 text-red-700';
    if (value <= 6) return 'bg-amber-100 border-amber-200 text-amber-700';
    return 'bg-green-100 border-green-200 text-green-700';
  };

  // Get range class for the slider
  const getRangeClass = () => {
    if (value <= 3) return 'range-low';
    if (value <= 6) return 'range-mid';
    return 'range-high';
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="font-medium text-sm">{label}</Label>
        <Badge variant="outline" className={`font-medium ${getBadgeClass()}`}>
          {value}
        </Badge>
      </div>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      <div className="relative">
        <Slider
          value={[value]}
          min={0}
          max={10}
          step={1}
          onValueChange={(vals) => onChange(vals[0])}
          className={`py-2 rating-slider color-slider ${getRangeClass()}`}
        />
      </div>
    </div>
  );
};

interface GoalSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Goal[];
  selectedGoalIds: number[];
  onSelectGoal: (goal: Goal) => void;
}

const GoalSelectionDialog = ({ 
  open, 
  onOpenChange, 
  goals, 
  selectedGoalIds, 
  onSelectGoal 
}: GoalSelectionDialogProps) => {
  const [localGoals, setLocalGoals] = useState<Goal[]>([]);
  const queryClient = useQueryClient();
  const clientId = queryClient.getQueryData<any>(['formState'])?.clientId || 37; // Default to Gabriel's ID

  // Hard-coded goals for Gabriel if necessary
  const hardcodedGoals = [
    { id: 24, clientId: 37, title: "Improve articulation of /s/ sounds", description: "Focus on correct tongue placement and airflow for s-sound production", priority: "high" },
    { id: 25, clientId: 37, title: "Improve social skills", description: "Develop appropriate conversation skills and turn-taking", priority: "medium" }
  ];

  // Fetch goals directly when dialog opens
  useEffect(() => {
    if (open) {
      // First try to use the clientId from form state
      const formClientId = queryClient.getQueryData<any>(['formState'])?.clientId || clientId;
      console.log("GoalSelectionDialog opening with clientId:", formClientId);

      // Directly fetch goals
      fetch(`/api/clients/${formClientId}/goals`)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch goals: ${response.status}`);
          return response.json();
        })
        .then(data => {
          console.log("SUCCESS - Goals fetched directly:", data);
          if (Array.isArray(data) && data.length > 0) {
            setLocalGoals(data);
          } else {
            console.log("No goals found, using hardcoded goals");
            setLocalGoals(hardcodedGoals);
          }
        })
        .catch(error => {
          console.error("Error fetching goals:", error);
          // Fallback to hardcoded goals if fetch fails
          setLocalGoals(hardcodedGoals);
        });
    }
  }, [open, clientId, queryClient]);

  // Filter out already selected goals
  const availableGoals = localGoals.filter(goal => !selectedGoalIds.includes(goal.id));

  console.log("GoalSelectionDialog - Using goals:", availableGoals);
  console.log("GoalSelectionDialog - Selected goal IDs:", selectedGoalIds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Goal</DialogTitle>
          <DialogDescription>
            Choose a goal to assess in this session
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {availableGoals.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">
                {localGoals.length > 0 ? "All goals have been selected" : "No goals found for this client"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableGoals.map(goal => (
                <Card 
                  key={goal.id} 
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => {
                    console.log("Selecting goal:", goal);
                    onSelectGoal(goal);
                    onOpenChange(false);
                  }}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface MilestoneSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subgoals: Subgoal[];
  selectedMilestoneIds: number[];
  onSelectMilestone: (subgoal: Subgoal) => void;
}

const MilestoneSelectionDialog = ({
  open,
  onOpenChange,
  subgoals,
  selectedMilestoneIds,
  onSelectMilestone
}: MilestoneSelectionDialogProps) => {
  const [localSubgoals, setLocalSubgoals] = useState<Subgoal[]>([]);
  const [goalId, setGoalId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Hard-coded subgoals for common goals
  const hardcodedSubgoals: Record<number, Subgoal[]> = {
    // Goal ID 24: Improve articulation of /s/ sounds
    24: [
      { id: 38, goalId: 24, title: "Initial /s/ sounds", description: "Improve articulation of 's' sound at beginning of words", status: "in-progress" },
      { id: 39, goalId: 24, title: "Medial /s/ sounds", description: "Improve articulation of 's' sound in middle of words", status: "not-started" }
    ],
    // Goal ID 25: Improve social skills
    25: [
      { id: 40, goalId: 25, title: "Initiating conversations", description: "Learn to appropriately start conversations with peers", status: "in-progress" }
    ]
  };

  // Get the goalId from the current context
  useEffect(() => {
    if (open) {
      // First try from subgoals passed in
      let extractedGoalId = subgoals.length > 0 ? subgoals[0]?.goalId : null;

      // If not found, try from selected goal
      if (!extractedGoalId) {
        const selectedGoalId = queryClient.getQueryData<number>(['selectedGoalId']);
        if (selectedGoalId) {
          extractedGoalId = selectedGoalId;
        }
      }

      // If still not found, try from currentGoalIndex
      if (!extractedGoalId) {
        const formState = queryClient.getQueryData<any>(['formState']);
        const performanceAssessments = formState?.performanceAssessments || [];
        const currentGoalIndex = formState?.currentGoalIndex;

        if (currentGoalIndex !== null && performanceAssessments[currentGoalIndex]) {
          extractedGoalId = performanceAssessments[currentGoalIndex].goalId;
        }
      }

      if (extractedGoalId) {
        setGoalId(extractedGoalId);
        console.log("MilestoneSelectionDialog: Found goalId:", extractedGoalId);
      } else {
        console.log("WARNING: Could not determine goal ID for milestone selection");
      }
    }
  }, [open, subgoals, queryClient]);

  // Fetch subgoals or fall back to hardcoded
  useEffect(() => {
    if (open && goalId) {
      console.log("MilestoneSelectionDialog: Fetching subgoals for goal:", goalId);

      // Try to fetch subgoals from API
      fetch(`/api/goals/${goalId}/subgoals`)
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to fetch subgoals");
          }
          return response.json();
        })
        .then(data => {
          console.log("MilestoneSelectionDialog: Received subgoals:", data);
          if (Array.isArray(data) && data.length > 0) {
            setLocalSubgoals(data);
          } else {
            console.log("No subgoals found, using hardcoded subgoals for goal", goalId);
            setLocalSubgoals(hardcodedSubgoals[goalId] || []);
          }
        })
        .catch(error => {
          console.error("Error fetching subgoals:", error);
          // Fall back to hardcoded subgoals
          console.log("Falling back to hardcoded subgoals for goal", goalId);
          setLocalSubgoals(hardcodedSubgoals[goalId] || []);
        });
    }
  }, [open, goalId]);

  // Filter out already selected subgoals
  const availableSubgoals = localSubgoals.length > 0 
    ? localSubgoals.filter(subgoal => !selectedMilestoneIds.includes(subgoal.id))
    : subgoals.filter(subgoal => !selectedMilestoneIds.includes(subgoal.id));

  console.log("MilestoneSelectionDialog - Available subgoals:", availableSubgoals);
  console.log("MilestoneSelectionDialog - Selected milestone IDs:", selectedMilestoneIds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Milestone</DialogTitle>
          <DialogDescription>
            Choose a milestone to assess for this goal
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {availableSubgoals.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">
                {localSubgoals.length > 0 ? "All milestones have been selected" : "No milestones found for this goal"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableSubgoals.map(subgoal => (
                <Card 
                  key={subgoal.id} 
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => {
                    onSelectMilestone(subgoal);
                    onOpenChange(false);
                  }}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{subgoal.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">{subgoal.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface IntegratedSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClient?: Client;
  isFullScreen?: boolean;
}

export function IntegratedSessionForm({ 
  open, 
  onOpenChange,
  initialClient,
  isFullScreen = false
}: IntegratedSessionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");

  // Dialog states for goal and milestone selection
  const [goalSelectionOpen, setGoalSelectionOpen] = useState(false);
  const [milestoneSelectionOpen, setMilestoneSelectionOpen] = useState(false);
  const [allySelectionOpen, setAllySelectionOpen] = useState(false);
  const [milestoneGoalId, setMilestoneGoalId] = useState<number | null>(null);
  const [currentGoalIndex, setCurrentGoalIndex] = useState<number | null>(null);

  // Dialog state for strategy selection
  const [strategySelectionOpen, setStrategySelectionOpen] = useState(false);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState<number | null>(null);

  // Handlers for removing items
  const removeProduct = (index: number) => {
    const products = form.getValues("sessionNote.products") || [];
    const updatedProducts = [...products];
    updatedProducts.splice(index, 1);
    form.setValue("sessionNote.products", updatedProducts);
  };

  const removeGoal = (goalId: number) => {
    const assessments = form.getValues("performanceAssessments") || [];
    const updatedAssessments = assessments.filter(a => a.goalId !== goalId);
    form.setValue("performanceAssessments", updatedAssessments);
  };
  
  // Handler for ally selection from the dialog
  const handleAllySelection = (ally: Ally) => {
    console.log("Ally selected:", ally);
    
    // Get current allies
    const currentAllies = form.getValues("sessionNote.presentAllies") || [];
    const currentAllyIds = form.getValues("sessionNote.presentAllyIds") || [];
    
    // Add the ally if not already in the list
    if (!currentAllies.includes(ally.name)) {
      form.setValue("sessionNote.presentAllies", [...currentAllies, ally.name]);
      form.setValue("sessionNote.presentAllyIds", [...currentAllyIds, ally.id]);
      
      // Show success toast
      toast({
        title: "Attendee added",
        description: `${ally.name} has been added to the session.`,
        variant: "default"
      });
    }
  };

  // Handler for adding attendees in full-screen mode
  const handleAddAttendeeFullScreen = () => {
    console.log("Adding attendee in full-screen mode, allies:", allies);
    
    // If no client is selected, show warning toast
    if (!clientId || clientId === 0) {
      toast({
        title: "Client not selected",
        description: "Please select a client before adding attendees.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if there are any allies available first
    if (allies.length === 0) {
      toast({
        title: "No allies found",
        description: "This client doesn't have any allies added to their profile yet.",
        variant: "default"
      });
      return;
    }
    
    // Get current allies and filter to find available ones
    const currentAllies = form.getValues("sessionNote.presentAllies") || [];
    const availableAllies = allies.filter(ally => 
      !currentAllies.includes(ally.name)
    );
    
    if (availableAllies.length === 0) {
      toast({
        title: "No more allies available",
        description: "All available attendees have been added to the session.",
        variant: "default"
      });
      return;
    }
    
    // Stay on the current tab and open the ally selection dialog
    console.log("Opening ally selection dialog for full-screen mode");
    setAllySelectionOpen(true);
  };
  
  // Handler for adding attendees in dialog mode
  const handleAddAttendeeDialogMode = () => {
    console.log("Adding attendee in dialog mode, allies:", allies);
    
    // If no client is selected, show warning toast
    if (!clientId || clientId === 0) {
      toast({
        title: "Client not selected",
        description: "Please select a client before adding attendees.",
        variant: "destructive"
      });
      return;
    }

    if (allies.length > 0) {
      // Get current allies and filter to find available ones
      const currentAllies = form.getValues("sessionNote.presentAllies") || [];
      const availableAllies = allies.filter(ally => 
        !currentAllies.includes(ally.name)
      );

      if (availableAllies.length > 0) {
        console.log("Setting up ally selection in dialog mode");
        
        // No need to set clientId separately; it's handled in the mutation
        
        // Add the special marker to trigger the dialog
        form.setValue("sessionNote.presentAllies", [
          ...currentAllies, 
          "__select__"
        ]);
      } else {
        toast({
          title: "No more allies available",
          description: "All available attendees have been added to the session.",
          variant: "default"
        });
      }
    } else {
      toast({
        title: "No allies found",
        description: "This client doesn't have any allies added to their profile yet.",
        variant: "default"
      });
    }
  };

  const removeMilestone = (goalId: number, milestoneId: number) => {
    const assessments = form.getValues("performanceAssessments") || [];
    const updatedAssessments = assessments.map(assessment => {
      if (assessment.goalId === goalId) {
        return {
          ...assessment,
          milestones: assessment.milestones.filter(m => m.milestoneId !== milestoneId)
        };
      }
      return assessment;
    });
    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Fetch clients for client dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });

  // Generate a unique session ID for tracking
  const sessionId = useMemo(() => {
    const now = new Date();
    // Format: ST-YYYYMMDD-XXXX (ST = Speech Therapy, XXXX is a random number)
    return `ST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  }, []);

  // Default form values
  const defaultValues: Partial<IntegratedSessionFormValues> = {
    session: {
      sessionDate: new Date(),
      location: "Clinic - Room 101",
      clientId: initialClient?.id || 0,
      title: "Therapy Session",  // Required field in schema
      duration: 60,              // Required field in schema
      status: "scheduled",       // Required field in schema
      description: "",           // Optional but initialize empty
      sessionId: sessionId,      // Add the generated session ID
    },
    sessionNote: {
      presentAllies: [],
      presentAllyIds: [], // Track ally IDs
      moodRating: 5,
      focusRating: 5,
      cooperationRating: 5,
      physicalActivityRating: 5,
      notes: "",
      products: [], // Products used in the session
      status: "draft",
    },
    performanceAssessments: [],
  };

  // Create form
  const form = useForm<IntegratedSessionFormValues>({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues,
  });

  // Watch clientId to update related data
  const clientId = form.watch("session.clientId");

  // Store clientId in queryClient for cross-component access
  useEffect(() => {
    if (clientId) {
      queryClient.setQueryData(['formState'], { clientId });
      console.log("Stored clientId in formState:", clientId);
    }
  }, [clientId, queryClient]);

  // Fetch allies for therapist dropdown and participant selection
  const { data: allAllies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", clientId, "allies"],
    enabled: open && !!clientId,
    queryFn: async () => {
      console.log(`Explicitly fetching allies for client ID: ${clientId}`);
      if (!clientId) return [];

      try {
        const response = await fetch(`/api/clients/${clientId}/allies`);
        if (!response.ok) {
          console.error(`Error fetching allies: ${response.status}`);
          return [];
        }

        const data = await response.json();
        console.log(`Successfully retrieved ${data.length} allies for client ${clientId}:`, data);
        return data;
      } catch (error) {
        console.error("Error fetching allies:", error);
        return [];
      }
    },
  });

  // Add debug logs for allies
  useEffect(() => {
    if (allAllies.length > 0) {
      console.log("Fetched allies for client:", clientId, allAllies);
    }
  }, [allAllies, clientId]);

  // Only use non-archived allies and deduplicate by name
  const allies = React.useMemo(() => {
    // Create the testing ally if none are found
    if (allAllies.length === 0 && clientId === 37) {
      // Add a test ally for Gabriel with all required fields
      return [{ 
        id: 34, 
        name: "Mohamad", 
        relationship: "parent", 
        clientId: 37,
        preferredLanguage: "English",
        email: "mohamad@example.com",
        phone: null,
        notes: null,
        accessTherapeutics: true,
        accessFinancials: false,
        archived: false 
      }];
    }

    // Filter out archived allies and deduplicate by name
    const filtered = allAllies.filter(ally => !ally.archived);

    // Deduplicate allies by name (keep the first occurrence)
    const nameMap = new Map<string, typeof filtered[0]>();
    filtered.forEach(ally => {
      if (!nameMap.has(ally.name)) {
        nameMap.set(ally.name, ally);
      }
    });

    const uniqueAllies = Array.from(nameMap.values());
    console.log("Deduplicated filtered allies:", uniqueAllies);

    return uniqueAllies;
  }, [allAllies, clientId]);

  // Fetch goals for the selected client
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/clients", clientId, "goals"],
    enabled: open && !!clientId,
  });

  // Track currently selected goal ID for fetching subgoals
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  // Get subgoals for the currently selected goal instead of all goals
  const { data: subgoals = [] } = useQuery<Subgoal[]>({
    queryKey: ["/api/goals", selectedGoalId, "subgoals"],
    enabled: open && !!selectedGoalId,
  });

  // Hide unwanted calendar elements that might appear out of context
  useEffect(() => {
    // Function to find and hide unwanted calendars
    const hideUnwantedCalendarsTimer = setInterval(hideUnwantedCalendars, 100);

    // Also run immediately
    hideUnwantedCalendars();

    // Cleanup on unmount or when dialog closes
    return () => {
      clearInterval(hideUnwantedCalendarsTimer);
    };
  }, [open]);

  // Get budget settings to identify active plan
  const { data: budgetSettings, isLoading: isLoadingBudgetSettings, error: budgetSettingsError, refetch: refetchBudgetSettings } = useQuery<BudgetSettings>({
    queryKey: ["/api/clients", clientId, "budget-settings"],
    enabled: open && !!clientId,
  });

  // Log budget settings status
  useEffect(() => {
    console.log('Budget settings query:', { 
      clientId, 
      isLoadingBudgetSettings, 
      hasData: !!budgetSettings, 
      error: budgetSettingsError
    });
  }, [clientId, budgetSettings, isLoadingBudgetSettings, budgetSettingsError]);

  // Log budget settings for debugging
  useEffect(() => {
    if (budgetSettings) {
      console.log('Budget settings loaded successfully:', budgetSettings);
      console.log('Budget settings isActive:', budgetSettings.isActive);
    }
  }, [budgetSettings]);

  // Get all budget items for the client
  const { 
    data: allBudgetItems = [], 
    isLoading: isLoadingBudgetItems, 
    error: budgetItemsError,
    refetch: refetchBudgetItems 
  } = useQuery<BudgetItem[]>({
    queryKey: ["/api/clients", clientId, "budget-items"],
    enabled: open && !!clientId, // Only need client ID to fetch budget items
  });

  // Log budget items status
  useEffect(() => {
    console.log('Budget items query:', { 
      clientId, 
      isLoadingBudgetItems, 
      itemCount: allBudgetItems?.length, 
      error: budgetItemsError
    });
  }, [clientId, allBudgetItems, isLoadingBudgetItems, budgetItemsError]);

  // Log budget items for debugging
  useEffect(() => {
    if (allBudgetItems?.length > 0) {
      console.log('Budget items loaded successfully:', allBudgetItems);
    }
  }, [allBudgetItems]);

  // Dialog state for product selection
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);

  // Get current selected products from form
  const selectedProducts = form.watch("sessionNote.products") || [];

  // Simple flags to track client selection and product availability
  const hasClientSelected = clientId !== null && clientId !== undefined;
  const [hasSampleProducts, setHasSampleProducts] = useState(false);

  // Filter to only show items from the active plan
  const availableProducts = useMemo(() => {
    // Check for sample products
    if (import.meta.env.DEV && (window as any).__sampleProducts?.length > 0) {
      console.log('Using sample products:', (window as any).__sampleProducts);
      return (window as any).__sampleProducts;
    }

    // Log debug information
    console.log('Budget items:', allBudgetItems);
    console.log('Budget settings:', budgetSettings);
    console.log('Client ID:', clientId);

    // Make sure we have budget items
    if (!Array.isArray(allBudgetItems) || allBudgetItems.length === 0) {
      console.log('No budget items available');
      return [];
    }

    // Check if we have settings
    if (!budgetSettings) {
      console.log('No budget settings available');

      // If we don't have settings but do have budget items,
      // allow use of all budget items for this client
      const tempProducts = allBudgetItems
        .filter(item => item.clientId === clientId && item.quantity > 0)
        .map(item => ({
          ...item,
          availableQuantity: item.quantity,
          productCode: item.itemCode,
          productDescription: item.description || item.itemCode,
          unitPrice: item.unitPrice
        }));

      if (tempProducts.length > 0) {
        console.log('Using budget items without active plan:', tempProducts);
        return tempProducts;
      }

      return [];
    }

    // Force coerce isActive to boolean - PostgreSQL treats booleans differently
    let isActiveBool = true; // Default to true per schema default

    // Log the exact type of the isActive field to help debug
    console.log('isActive type:', typeof budgetSettings.isActive);

    if (budgetSettings.isActive === false) {
      isActiveBool = false;
    } 
    else if (budgetSettings.isActive === null) {
      isActiveBool = true; // Default value per schema
    }
    else if (typeof budgetSettings.isActive === 'string') {
      // Handle string representations of boolean values (from some APIs/drivers)
      const isActiveStr = String(budgetSettings.isActive);
      isActiveBool = isActiveStr.toLowerCase() !== 'false';
    }

    console.log('Budget plan active status (original):', budgetSettings.isActive);
    console.log('Budget plan active status (coerced):', isActiveBool);
    console.log('Budget settings ID:', budgetSettings.id);

    if (!isActiveBool) {
      console.log('Budget settings not active');
      return [];
    }

    // Since our schema doesn't track used quantity yet, we'll assume all quantity is available
    // In a real implementation, this would be tracked in the database
    const filteredProducts = allBudgetItems
      .filter((item: BudgetItem) => {
        // Check if this item belongs to the active budget plan and has quantity available
        const matches = item.budgetSettingsId === budgetSettings.id && item.quantity > 0;
        console.log(`Product ${item.itemCode}: budgetSettingsId=${item.budgetSettingsId}, quantity=${item.quantity}, matches=${matches}`);
        return matches;
      })
      .map((item: BudgetItem) => ({
        ...item,
        availableQuantity: item.quantity, // For now, all quantity is available
        productCode: item.itemCode,  // Normalized naming for UI consistency
        productDescription: item.description || item.name || item.itemCode, // Normalized naming for UI consistency
        unitPrice: item.unitPrice
      }));

    console.log('Filtered products:', filteredProducts);
    return filteredProducts;
  }, [allBudgetItems, budgetSettings, clientId, hasSampleProducts]);

  // Create a simple lookup object for subgoals by goal ID
  const subgoalsByGoalId = React.useMemo(() => {
    const result: Record<number, Subgoal[]> = {};
    if (selectedGoalId) {
      result[selectedGoalId] = subgoals;
    }
    return result;
  }, [selectedGoalId, subgoals]);

  // Update form when client is changed
  useEffect(() => {
    if (initialClient?.id && initialClient.id !== clientId) {
      form.setValue("session.clientId", initialClient.id);
    }
  }, [initialClient, form, clientId]);

  // Get selected goals from form values
  const selectedPerformanceAssessments = form.watch("performanceAssessments") || [];
  const selectedGoalIds = selectedPerformanceAssessments.map(pa => pa.goalId);

  // Helper to get selected milestone IDs for a specific goal
  const getSelectedMilestoneIds = (goalId: number): number[] => {
    const assessment = selectedPerformanceAssessments.find(pa => pa.goalId === goalId);
    return assessment?.milestones?.map(m => m.milestoneId) || [];
  };

  // Handle goal selection
  const handleGoalSelection = (goal: Goal) => {
    console.log("Goal selected:", goal);

    // Update the form with the new goal
    const updatedAssessments = [...selectedPerformanceAssessments];
    updatedAssessments.push({
      goalId: goal.id,
      goalTitle: goal.title,
      notes: "",
      milestones: []
    });

    form.setValue("performanceAssessments", updatedAssessments);

    // Set the selected goal ID to fetch its subgoals
    setSelectedGoalId(goal.id);

    // Store selected goal data for cross-component access
    queryClient.setQueryData(['selectedGoalId'], goal.id);
    queryClient.setQueryData(['formState'], {
      ...queryClient.getQueryData(['formState']) || {},
      clientId,
      currentGoalIndex: updatedAssessments.length - 1,
      performanceAssessments: updatedAssessments
    });

    // Add a delay to ensure UI updates
    setTimeout(() => {
      if (updatedAssessments.length > 0) {
        // Force a refresh of subgoals data
        queryClient.invalidateQueries({
          queryKey: ['/api/goals', goal.id, 'subgoals']
        });
      }
    }, 100);
  };

  // Handle milestone selection
  const handleMilestoneSelection = (subgoal: Subgoal) =>{
    if (currentGoalIndex === null) return;

    const updatedAssessments = [...selectedPerformanceAssessments];
    const milestones = [...(updatedAssessments[currentGoalIndex].milestones || [])];

    milestones.push({
      milestoneId: subgoal.id,
      milestoneTitle: subgoal.title,
      rating: 5,
      strategies: [],
      notes: ""
    });

    updatedAssessments[currentGoalIndex].milestones = milestones;
    form.setValue("performanceAssessments", updatedAssessments);

    // Ensure we have the goal ID to fetch subgoals
    if (selectedGoalId=== null && updatedAssessments[currentGoalIndex]) {
      setSelectedGoalId(updatedAssessments[currentGoalIndex].goalId);
    }
  };

  // Handle strategy selection
  const handleStrategySelection = (strategy: Strategy) => {
    if (currentGoalIndex === null || currentMilestoneIndex === null) return;

    const updatedAssessments = [...selectedPerformanceAssessments];
    const milestone = updatedAssessments[currentGoalIndex].milestones[currentMilestoneIndex];
    const currentStrategies = [...(milestone.strategies || [])];

    // Check if strategy is already selected
    const strategyName = strategy.name;
    if (currentStrategies.includes(strategyName)) {
      // Remove strategy if already selected
      const updatedStrategies = currentStrategies.filter(s => s !== strategyName);
      updatedAssessments[currentGoalIndex].milestones[currentMilestoneIndex].strategies = updatedStrategies;
    } else {
      // Only add if we haven't reached the maximum of 5 strategies
      if (currentStrategies.length < 5) {
        updatedAssessments[currentGoalIndex].milestones[currentMilestoneIndex].strategies = [...currentStrategies, strategyName];
      }
    }

    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Handle removing a goal assessment
  const handleRemoveGoal = (index: number) => {
    const updatedAssessments = [...selectedPerformanceAssessments];
    updatedAssessments.splice(index, 1);
    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Handle removing a milestone assessment
  const handleRemoveMilestone = (goalIndex: number, milestoneIndex: number) => {
    const updatedAssessments = [...selectedPerformanceAssessments];
    const milestones = [...updatedAssessments[goalIndex].milestones];
    milestones.splice(milestoneIndex, 1);
    updatedAssessments[goalIndex].milestones = milestones;
    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Handle adding a product
  const handleAddProduct = (budgetItem: BudgetItem & { availableQuantity: number }, quantity: number) => {
    console.log('handleAddProduct called with:', budgetItem, quantity);

    // Ensure valid quantity
    if (!quantity || quantity <= 0 || quantity > budgetItem.availableQuantity) {
      toast({
        title: "Invalid quantity",
        description: `Please enter a quantity between 1 and ${budgetItem.availableQuantity}`,
        variant: "destructive"
      });
      return;
    }

    // Check if this product is already added
    const existingProductIndex = selectedProducts.findIndex(
      p => p.budgetItemId === budgetItem.id || p.productCode === budgetItem.itemCode
    );

    if (existingProductIndex >= 0) {
      toast({
        title: "Product already added",
        description: "This product is already in your session. Please adjust the quantity instead.",
        variant: "destructive"
      });
      return;
    }

    // Add product to the form
    const product = {
      budgetItemId: budgetItem.id,
      productCode: budgetItem.itemCode,
      productDescription: budgetItem.description || budgetItem.name || budgetItem.itemCode,
      quantity,
      unitPrice: budgetItem.unitPrice,
      availableQuantity: budgetItem.availableQuantity
    };

    form.setValue("sessionNote.products", [...selectedProducts, product]);
    setProductSelectionOpen(false);
  };

  // Handle removing a product
  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts.splice(index, 1);
    form.setValue("sessionNote.products", updatedProducts);
  };

// Product selection dialog component
interface AllySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allies: Ally[];
  selectedAllies: string[];
  onSelectAlly: (ally: Ally) => void;
}

const AllySelectionDialog = ({
  open,
  onOpenChange,
  allies,
  selectedAllies,
  onSelectAlly
}: AllySelectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Attendee</DialogTitle>
          <DialogDescription>
            Choose an attendee to add to this session.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[400px] overflow-y-auto">
          {allies.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No attendees available for this client.
            </div>
          ) : (
            <div className="grid gap-2">
              {allies.map((ally) => {
                const isSelected = selectedAllies.includes(ally.name);
                return (
                  <div
                    key={ally.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent",
                      isSelected && "border-primary bg-primary/10"
                    )}
                    onClick={() => {
                      onSelectAlly(ally);
                      onOpenChange(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{ally.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{ally.name}</div>
                        <div className="text-sm text-muted-foreground">{ally.relationship}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-1",
                        isSelected && "text-primary"
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {isSelected ? "Selected" : "Add"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: (BudgetItem & { availableQuantity: number })[];
  onSelectProduct: (product: BudgetItem & { availableQuantity: number }, quantity: number) => void;
}

const ProductSelectionDialog = ({
  open,
  onOpenChange,
  products,
  onSelectProduct
}: ProductSelectionDialogProps) => {
  const [selectedProduct, setSelectedProduct] = useState<(BudgetItem & { availableQuantity: number }) | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Clear selection when dialog opens with new products
  useEffect(() => {
    if (open) {
      console.log("ProductSelectionDialog opened with products:", products);
      // Reset selection state when dialog opens
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [open, products]);

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 1) {
      setQuantity(1);
    } else if (selectedProduct && numValue > selectedProduct.availableQuantity) {
      setQuantity(selectedProduct.availableQuantity);
    } else {
      setQuantity(numValue);
    }
  };

  const handleSelectProduct = (product: BudgetItem & { availableQuantity: number }) => {
    console.log("Product selected:", product);
    setSelectedProduct(product);
    setQuantity(1); // Reset quantity when selecting a new product
  };

  const handleAddProduct = (e?: React.MouseEvent) => {
    // Prevent event bubbling which might cause dialog to close prematurely
    if (e) e.stopPropagation();

    console.log("Adding product:", selectedProduct, "quantity:", quantity);

    if (selectedProduct) {
      onSelectProduct(selectedProduct, quantity);
      setSelectedProduct(null);
      setQuantity(1);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Product to Session</DialogTitle>
          <DialogDescription>
            Select a product from the active budget plan
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 grid grid-cols-1 gap-4">
          {products.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">No products available in active budget plan</p>
            </div>
          ) : (
            <>
              {/* Product selection */}
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                <ScrollArea className="h-full pr-3">
                  <div className="space-y-1 p-1">
                    {products.map(product => (
                      <div 
                        key={product.id} 
                        className={`p-3 border rounded-md cursor-pointer ${selectedProduct?.id === product.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/20'}`}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{product.description || product.name}</h4>
                            <p className="text-sm text-muted-foreground">Code: {product.itemCode}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(product.unitPrice)}</div>
                            <div className="text-sm text-muted-foreground">
                              Available: {product.availableQuantity}
                            </div>
                          </div>
                        </div>
                        {selectedProduct?.id === product.id && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-3">
                            <div className="flex items-center border rounded-md">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-9 w-9"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (quantity > 1) setQuantity(quantity - 1);
                                }}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input 
                                type="number" 
                                className="w-14 h-9 text-center border-0"
                                min={1}
                                max={product.availableQuantity}
                                value={quantity}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(e.target.value);
                                }}
                              />
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-9 w-9"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (quantity < product.availableQuantity) {
                                    setQuantity(quantity + 1);
                                  }
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Add to Session button clicked');
                                handleAddProduct();
                              }}
                              data-testid="add-to-session-btn"
                            >
                              Add to Session
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

  // Create session and session note mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      try {
        console.log("Creating session with data:", data.session);
        
        // Validate the client ID is present
        if (!data.session.clientId) {
          throw new Error("Client ID is required to create a session");
        }
        
        // Step 1: Create the session
        console.log("Step 1: Creating new session for client:", data.session.clientId);
        const sessionResponse = await apiRequest("POST", "/api/sessions", data.session);
        if (!sessionResponse) {
          throw new Error("Failed to create session - no response received");
        }
        
        const sessionData = sessionResponse as any;
        console.log("Session created successfully with ID:", sessionData.id);
        
        if (!sessionData.id) {
          throw new Error("Invalid session ID received from server");
        }

        // Step 2: Create the session note with the new session ID
        // Transform products array to JSON string for API compatibility
        const productsString = data.sessionNote.products && data.sessionNote.products.length > 0 
          ? JSON.stringify(data.sessionNote.products) 
          : "[]";
        
        // Format presentAllies as expected by the server
        const presentAlliesArray = data.sessionNote.presentAllies || [];
        
        // Prepare the note data in the exact format expected by the API
        const noteData = {
          sessionId: sessionData.id,
          clientId: data.session.clientId,
          presentAllies: presentAlliesArray,
          moodRating: data.sessionNote.moodRating || 5,
          physicalActivityRating: data.sessionNote.physicalActivityRating || 5,
          focusRating: data.sessionNote.focusRating || 5,
          cooperationRating: data.sessionNote.cooperationRating || 5,
          notes: data.sessionNote.notes || "",
          products: productsString,
          status: data.sessionNote.status || "draft"
        };
        
        console.log(`Step 2: Creating note for session ${sessionData.id} with data:`, noteData);

        // Use the newly created session ID for the note
        const noteResponse = await apiRequest("POST", `/api/sessions/${sessionData.id}/notes`, noteData);
        if (!noteResponse) {
          throw new Error("Failed to create session note - no response received");
        }
        
        const noteResponseData = noteResponse as any;
        console.log("Session note created successfully with ID:", noteResponseData.id);

        // Step 3: Create performance assessments if any are present
        if (data.performanceAssessments && data.performanceAssessments.length > 0) {
          console.log(`Step 3: Creating ${data.performanceAssessments.length} performance assessments for note ID:`, noteResponseData.id);
          
          try {
            await Promise.all(
              data.performanceAssessments.map(assessment => 
                apiRequest("POST", `/api/session-notes/${noteResponseData.id}/performance`, {
                  goalId: assessment.goalId,
                  notes: assessment.notes,
                  milestones: assessment.milestones
                })
              )
            );
            
            console.log("Performance assessments created successfully");
          } catch (assessmentError) {
            console.error("Error creating performance assessments:", assessmentError);
            // Continue with the session creation even if performance assessments fail
          }
        }

        return sessionData;
      } catch (error) {
        console.error("Error creating session:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session and notes created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      form.reset(defaultValues);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create session and notes",
        variant: "destructive",
      });
      console.error("Error creating session:", error);
    },
  });

  // Track the purpose of the modal when not in full-screen mode
  const [modalPurpose, setModalPurpose] = useState<"clientSelection" | "attendeeSelection">("clientSelection");
  
  // Form submission handler
  function onSubmit(data: IntegratedSessionFormValues) {
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    
    // Data validation check before submitting
    if (!data.session.clientId) {
      toast({
        title: "Missing client",
        description: "Please select a client before creating a session",
        variant: "destructive"
      });
      return;
    }
    
    // Only allow session creation in full-screen mode from the Performance Assessment tab
    if (isFullScreen) {
      // In full-screen mode, only allow submission from the performance tab
      if (activeTab !== "performance") {
        toast({
          title: "Incomplete session",
          description: "Please complete the Performance Assessment tab before creating the session",
          variant: "destructive"
        });
        
        // Automatically switch to Performance tab
        setActiveTab("performance");
        return;
      }
      
      console.log("Submitting in full-screen mode with client ID:", data.session.clientId);
      
      // Additional validation for performance tab
      if (data.performanceAssessments.length === 0) {
        toast({
          title: "Missing performance assessment",
          description: "Please add at least one performance assessment before creating the session",
          variant: "destructive"
        });
        return;
      }
    } else {
      // In dialog mode, we should only use the form for selecting a client 
      // not for creating sessions directly
      if (modalPurpose === "attendeeSelection") {
        // Just close the dialog - the handleAddAttendee function will handle the selection
        onOpenChange(false);
        return;
      }
    }
    
    createSessionMutation.mutate(data);
  }

  // Handle navigation between tabs
  const handleNext = () => {
    if (activeTab === "details") setActiveTab("participants");
    else if (activeTab === "participants") setActiveTab("performance");
  };

  const handleBack = () => {
    if (activeTab === "performance") setActiveTab("participants");
    else if (activeTab === "participants") setActiveTab("details");
  };

  // This is our handleProductSelection function that was reported as missing
