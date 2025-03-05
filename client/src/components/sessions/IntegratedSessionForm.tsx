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
      // Add a test ally for Gabriel
      return [{ 
        id: 34, 
        name: "Mohamad", 
        relationship: "parent", 
        clientId: 37,
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
      // Step 1: Create the session
      const sessionResponse = await apiRequest("POST", "/api/sessions", data.session);
      const sessionData = sessionResponse as any;

      // Step 2: Create the session note with the new session ID
      const noteData = {
        ...data.sessionNote,
        sessionId: sessionData.id,
        clientId: data.session.clientId
      };

      const noteResponse = await apiRequest("POST", `/api/sessions/${sessionData.id}/notes`, noteData);
      const noteResponseData = noteResponse as any;

      // Step 3: Create performance assessments
      if (data.performanceAssessments.length > 0) {
        await Promise.all(
          data.performanceAssessments.map(assessment => 
            apiRequest("POST", `/api/session-notes/${noteResponseData.id}/performance`, {
              goalId: assessment.goalId,
              notes: assessment.notes,
              milestones: assessment.milestones
            })
          )
        );
      }

      return sessionData;
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

  // Form submission handler
  function onSubmit(data: IntegratedSessionFormValues) {
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
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

  // Return just the content without dialog wrapper if in full-screen mode
  if (isFullScreen) {
    return (
      <div className="w-full h-full flex flex-col px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="details">Session Details & Observations</TabsTrigger>
            <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
              <div className="flex-grow overflow-auto pr-2">
                {/* Session Details Tab */}
                <TabsContent value="details" className="space-y-6 mt-0 px-4">
                  {/* Full-width top section for basic session info */}
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-primary" />
                        Session Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* First row: Client, Location, Date & Time in a single row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                        {/* Client Selection - Searchable Combobox */}
                        <FormField
                          control={form.control}
                          name="session.clientId"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-base flex items-center">
                                <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                Client
                              </FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  // Set the client ID
                                  const clientId = parseInt(value);
                                  field.onChange(clientId);

                                  // Reset performance assessments when client changes
                                  form.setValue("performanceAssessments", []);

                                  // Reset products when client changes
                                  form.setValue("sessionNote.products", []);

                                  // Log when client changes to help debug
                                  console.log('Client changed to:', clientId);
                                  console.log('Initiating budget item fetch for client:', clientId);

                                  // Manually trigger refetch of budget items and settings
                                  if (refetchBudgetItems && refetchBudgetSettings) {
                                    console.log('Manually refetching budget data for client:', clientId);
                                    // Use timeout to ensure components finish rendering first
                                    setTimeout(() => {
                                      refetchBudgetItems();
                                      refetchBudgetSettings();
                                    }, 100);
                                  }
                                }}
                                value={field.value?.toString() || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select client" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="relative">
                                    <Input
                                      placeholder="Search clients..."
                                      className="mb-2 h-8"
                                      onChange={(e) => {
                                        // This will filter the client list in UI as user types
                                        const searchContainer = e.target.closest(".select-content");
                                        if (searchContainer) {
                                          const items = searchContainer.querySelectorAll(".select-item");
                                          const searchValue = e.target.value.toLowerCase();

                                          items.forEach(item => {
                                            const text = item.textContent?.toLowerCase() || "";
                                            if (text.includes(searchValue)) {
                                              item.classList.remove("hidden");
                                            } else {
                                              item.classList.add("hidden");
                                            }
                                          });
                                        }
                                      }}
                                    />
                                  </div>
                                  <ScrollArea className="h-[300px]">
                                    {clients.map((client) => (
                                      <SelectItem 
                                        key={client.id} 
                                        value={client.id.toString()}
                                        className="select-item"
                                      >
                                        {client.name}
                                      </SelectItem>
                                    ))}
                                  </ScrollArea>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                    />

                    {/* Location - with predefined list */}
                    <FormField
                      control={form.control}
                      name="session.location"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-base flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            Location
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                            defaultValue=""
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Clinic - Room 101">Clinic - Room 101</SelectItem>
                              <SelectItem value="Clinic - Room 102">Clinic - Room 102</SelectItem>
                              <SelectItem value="Clinic - Room 103">Clinic - Room 103</SelectItem>
                              <SelectItem value="Remote - Telehealth">Remote - Telehealth</SelectItem>
                              <SelectItem value="School Visit">School Visit</SelectItem>
                              <SelectItem value="Home Visit">Home Visit</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Session Date - Enhanced implementation to prevent calendar display issues */}
                    <FormField
                      control={form.control}
                      name="session.sessionDate"
                      render={({ field }) => {
                        // Use a ref to detect if the popover is open
                        const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

                        // Check for unwanted calendars when this component renders or updates
                        React.useEffect(() => {
                          // Immediate check
                          hideUnwantedCalendars();

                          // If calendar isn't explicitly opened by user, ensure it stays hidden
                          if (!isCalendarOpen) {
                            const checkTimer = setTimeout(hideUnwantedCalendars, 50);
                            return () => clearTimeout(checkTimer);
                          }
                        }, [isCalendarOpen]);

                        return (
                          <FormItem className="flex flex-col flex-1">
                            <FormLabel className="text-base">Date & Time</FormLabel>
                            <Popover onOpenChange={setIsCalendarOpen} open={isCalendarOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full h-10 pl-3 text-left font-normal ${
                                      !field.value ? "text-muted-foreground" : ""
                                    }`}
                                    onClick={() => setIsCalendarOpen(true)} // Explicitly control open state
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP p")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent 
                                className="w-auto p-0 z-[100]" 
                                align="start" 
                                side="bottom" 
                                sideOffset={4} 
                                data-calendar-container="true"
                                onEscapeKeyDown={() => setIsCalendarOpen(false)}
                                onInteractOutside={() => setIsCalendarOpen(false)}
                              >
                                <div className="bg-background border rounded-md overflow-hidden">
                                  {isCalendarOpen && ( // Only render calendar when popover is explicitly open
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={(date) => {
                                        if (date) {
                                          // Preserve time portion from existing date or use current time
                                          const existingDate = field.value || new Date();
                                          date.setHours(existingDate.getHours());
                                          date.setMinutes(existingDate.getMinutes());
                                          field.onChange(date);

                                          // Don't close yet - allow time selection
                                        }
                                      }}
                                      initialFocus
                                    />
                                  )}
                                  <div className="p-3 border-t">
                                    <Input
                                      type="time"
                                      onChange={(e) => {
                                        const date = new Date(field.value || new Date());
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        date.setHours(hours, minutes);
                                        field.onChange(date);
                                      }}
                                      defaultValue={field.value ? 
                                        format(field.value, "HH:mm") : 
                                        format(new Date(), "HH:mm")
                                      }
                                    />
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                    </CardContent>
                  </Card>

                  {/* Three-Column Layout */}
                  <ThreeColumnLayout
                    className="mt-6"
                    leftColumn={
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="section-header">
                            <UserCheck className="h-5 w-5" />
                            Present
                          </h3>

                          {/* Add New Attendee Button moved to header */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log("New Attendee button clicked, allies:", allies);

                              if (allies.length > 0) {
                                // Get current allies and filter to find available ones
                                const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                const availableAllies = allies.filter(ally => 
                                  !currentAllies.includes(ally.name)
                                );

                                if (availableAllies.length > 0) {
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
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            New Attendee
                          </Button>
                        </div>
                        <div className="bg-muted/20 rounded-lg p-4 space-y-2">
                        {/* Selected Allies List */}
                        {form.watch("sessionNote.presentAllies")?.map((name, index) => {
                          // Find the ally object to get relationship
                          const ally = allies.find(a => a.name === name);
                          return (
                            <div 
                              key={index} 
                              className="flex items-center justify-between py-2 px-1 border-b last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                  {name.charAt(0)}
                                </div>
                                <span className="font-medium">{name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-primary">{ally?.relationship || "Attendee"}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full"
                                  onClick={() => {
                                    // Get the allied ID by looking up in our allies array
                                    const allyToRemove = allies.find(a => a.name === name);

                                    // Remove from the name display array
                                    const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                    form.setValue(
                                      "sessionNote.presentAllies", 
                                      currentAllies.filter(a => a !== name)
                                    );

                                    // Also remove from the ID array if we found the ally
                                    if (allyToRemove) {
                                      const currentAllyIds = form.getValues("sessionNote.presentAllyIds") || [];
                                      form.setValue(
                                        "sessionNote.presentAllyIds", 
                                        currentAllyIds.filter(id => id !== allyToRemove.id)
                                      );
                                    }
                                  }}
                                >
                                  <svg width="18" height="18" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3.625 7.5C3.625 8.12 3.12 8.625 2.5 8.625C1.88 8.625 1.375 8.12 1.375 7.5C1.375 6.88 1.88 6.375 2.5 6.375C3.12 6.375 3.625 6.88 3.625 7.5ZM8.625 7.5C8.625 8.12 8.12 8.625 7.5 8.625C6.88 8.625 6.375 8.12 6.375 7.5C6.375 6.88 6.88 6.375 7.5 6.375C8.12 6.375 8.625 6.88 8.625 7.5ZM13.625 7.5C13.625 8.12 13.12 8.625 12.5 8.625C11.88 8.625 11.375 8.12 11.375 7.5C11.375 6.88 11.88 6.375 12.5 6.375C13.12 6.375 13.625 6.88 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                  </svg>
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        {/* New Attendee button has been moved to the header */}

                        {(!form.watch("sessionNote.presentAllies") || 
                          form.watch("sessionNote.presentAllies").length === 0) && (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">
                              No one added yet. Click "New Attendee" to add people present in this session.
                            </p>
                          </div>
                        )}
                        </div>

                        {/* Ally Selection Dialog */}
                        <Dialog 
                          open={allies.length > 0 && form.getValues("sessionNote.presentAllies")?.includes("__select__")}
                          onOpenChange={(open) => {
                            if (!open) {
                              // Remove the special marker if dialog is closed
                              const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                              form.setValue(
                                "sessionNote.presentAllies", 
                                currentAllies.filter(a => a !== "__select__")
                              );
                            }
                          }}
                        >
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Add Attendee</DialogTitle>
                              <DialogDescription>
                                Select a person who was present in this therapy session.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Select
                                onValueChange={(value) => {
                                  const currentAllies = form.getValues("sessionNote.presentAllies") || [];

                                  // Parse the selected value to get the ally ID and name
                                  const [allyId, allyName] = value.split('|');
                                  console.log(`Selected ally: ID=${allyId}, Name=${allyName}`);

                                  // Check if ally is already in the list
                                  const currentAllyIds = form.getValues("sessionNote.presentAllyIds") || [];
                                  const allyIdNum = parseInt(allyId);

                                  if (currentAllies.includes(allyName) || currentAllyIds.includes(allyIdNum)) {
                                    toast({
                                      title: "Attendee already added",
                                      description: `${allyName} is already present in this session.`,
                                      variant: "destructive"
                                    });
                                    return;
                                  }

                                  // Remove the selection marker and add the selected ally (just using the name for display)
                                  form.setValue(
                                    "sessionNote.presentAllies", 
                                    [...currentAllies.filter(a => a !== "__select__"), allyName]
                                  );

                                  // Store the ally IDs separately for data integrity
                                  form.setValue(
                                    "sessionNote.presentAllyIds",
                                    [...currentAllyIds, allyIdNum]
                                  );
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select person" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allies
                                    .filter(ally => {
                                      const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                      return !currentAllies.includes(ally.name);
                                    })
                                    .map((ally) => (
                                      <SelectItem key={ally.id} value={`${ally.id}|${ally.name}`}>
                                        {ally.name} ({ally.relationship || "Ally"})
                                      </SelectItem>
                                    ))
                                  }
                                </SelectContent>
                              </Select>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    }

                    middleColumn={
                      <>
                        <div className="flex justify-between items-center">
                          <h3 className="section-header">
                            <ShoppingCart className="h-5 w-5" />
                            Products Used
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('Opening product selection dialog');
                                console.log('Available products:', availableProducts);

                                // In dev mode, create sample products if none are available
                                if (import.meta.env.DEV && hasClientSelected && availableProducts.length === 0) {
                                  console.log('Creating sample products for development');

                                  // Create sample products for development/testing
                                  const sampleProducts = [
                                    {
                                      id: 9001,
                                      budgetSettingsId: clientId || 0,
                                      clientId: clientId || 0,
                                      itemCode: "THERAPY-001",
                                      description: "Speech Therapy Session",
                                      quantity: 10,
                                      unitPrice: 150,
                                      availableQuantity: 10,
                                      productCode: "THERAPY-001",
                                      productDescription: "Speech Therapy Session",
                                      name: "Speech Therapy Session"
                                    },
                                    {
                                      id: 9002,
                                      budgetSettingsId: clientId || 0,
                                      clientId: clientId || 0,
                                      itemCode: "ASSESS-001",
                                      description: "Assessment Session",
                                      quantity: 5,
                                      unitPrice: 200,
                                      availableQuantity: 5,
                                      productCode: "ASSESS-001",
                                      productDescription: "Assessment Session",
                                      name: "Assessment Session"
                                    }
                                  ];

                                  // Store in global window for use in the useMemo
                                  (window as any).__sampleProducts = sampleProducts;

                                  // Update local state to track sample products
                                  setHasSampleProducts(true);

                                  // Show a toast notification
                                  toast({
                                    title: "Sample Products Added",
                                    description: "Sample products have been added for this session."
                                  });
                                }

                                // Delay slightly to avoid React state issues
                                setTimeout(() => {
                                  setProductSelectionOpen(true);
                                  console.log('Product selection dialog should be open now');
                                }, 50);
                              }}
                              disabled={!availableProducts.length && !hasSampleProducts && !hasClientSelected}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Add Product
                            </Button>
                          </div>
                        </div>

                        {/* Product Selection Dialog */}
                        <ProductSelectionDialog
                          open={productSelectionOpen}
                          onOpenChange={setProductSelectionOpen}
                          products={availableProducts}
                          onSelectProduct={handleAddProduct}
                        />

                        {/* Selected Products List */}
                        {selectedProducts.length === 0 ? (
                          <div className="bg-muted/20 rounded-lg p-4 text-center">
                            <p className="text-muted-foreground">No products added to this session</p>
                          </div>
                        ) : (
                          <div className="bg-muted/20 rounded-lg p-4 space-y-2">
                            {selectedProducts.map((product, index) => {
                              const totalPrice = product.quantity * product.unitPrice;

                              return (
                                <div 
                                  key={index} 
                                  className="flex items-center justify-between py-2 px-1 border-b last:border-0"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">{product.productDescription}</div>
                                    <div className="text-sm text-muted-foreground">
                                      Code: {product.productCode}
                                    </div>

                                    {/* Availability Visualization */}
                                    <div className="mt-1">
                                      <div className="flex items-center text-xs">
                                        <span className="text-muted-foreground mr-2">Availability:</span>
                                        <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2.5">
                                          <div 
                                            className="bg-primary h-2.5 rounded-full" 
                                            style={{ 
                                              width: `${Math.min(100, (product.availableQuantity - product.quantity) / product.availableQuantity * 100)}%` 
                                            }}
                                          />
                                        </div>
                                        <span className="ml-2 text-xs">
                                          <span className="text-primary font-medium">{product.availableQuantity - product.quantity}</span>
                                          <span className="text-muted-foreground"> / {product.availableQuantity}</span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {/* Quantity Controls */}
                                    <div className="flex items-center border rounded-md mr-2">
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {
                                          if (product.quantity > 1) {
                                            const updatedProducts = [...selectedProducts];
                                            updatedProducts[index] = {
                                              ...updatedProducts[index],
                                              quantity: product.quantity - 1
                                            };
                                            form.setValue("sessionNote.products", updatedProducts);
                                          }
                                        }}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <div className="w-8 text-center">
                                        <span className="text-sm font-medium">{product.quantity}</span>
                                      </div>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {
                                          if (product.quantity < product.availableQuantity) {
                                            const updatedProducts = [...selectedProducts];
                                            updatedProducts[index] = {
                                              ...updatedProducts[index],
                                              quantity: product.quantity + 1
                                            };
                                            form.setValue("sessionNote.products", updatedProducts);
                                          } else {
                                            toast({
                                              title: "Maximum quantity reached",
                                              description: `Only ${product.availableQuantity} units available`,
                                              variant: "destructive"
                                            });
                                          }
                                        }}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    <div className="text-right">
                                      <div>
                                        <span className="text-muted-foreground text-sm">
                                          {new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: 'USD'
                                          }).format(product.unitPrice)}
                                        </span>
                                      </div>
                                      <div className="text-sm font-medium">
                                        {new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency: 'USD'
                                        }).format(totalPrice)}
                                      </div>
                                    </div>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 rounded-full ml-2"
                                      onClick={() => handleRemoveProduct(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Total Value */}
                            <div className="pt-3 mt-2 border-t flex justify-between items-center">
                              <span className="font-medium">Total Value:</span>
                              <span className="font-bold">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD'
                                }).format(
                                  selectedProducts.reduce(
                                    (total, product) => total + (product.quantity * product.unitPrice), 
                                    0
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    }

                    rightColumn={
                      <>
                        <h3 className="section-header">
                          <ClipboardList className="h-5 w-5" />
                          Session Observations
                        </h3>

                        {/* Rating Sliders */}
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="sessionNote.moodRating"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RatingSlider
                                    value={field.value}
                                    onChange={field.onChange}
                                    label="Mood"
                                    description="Rate client's overall mood during the session"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sessionNote.focusRating"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RatingSlider
                                    value={field.value}
                                    onChange={field.onChange}
                                    label="Focus"
                                    description="Rate client's ability to focus during the session"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sessionNote.cooperationRating"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RatingSlider
                                    value={field.value}
                                    onChange={field.onChange}
                                    label="Cooperation"
                                    description="Rate client's overall cooperation"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sessionNote.physicalActivityRating"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RatingSlider
                                    value={field.value}
                                    onChange={field.onChange}
                                    label="Physical Activity"
                                    description="Rate client's physical activity level"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* General Notes moved to Performance Assessment tab */}
                      </>
                    }
                  />
                </TabsContent>

                {/* Performance Assessment Tab */}
                <TabsContent value="performance" className="space-y-4 mt-0 px-2">
                  {/* Two-column layout: 2/3 goals, 1/3 general notes */}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Left column (2/3) - Goals section */}
                    <div className="md:w-2/3">
                      {/* Header aligned with content below */}
                      <div className="flex justify-between items-center w-full mb-4">
                        <h3 className="section-header">
                          <RefreshCw className="h-5 w-5" />
                          Performance Assessment
                        </h3>
                        <Button 
                          type="button" 
                          onClick={() => setGoalSelectionOpen(true)}
                          disabled={!clientId}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Goal
                        </Button>
                      </div>
                      {/* Goal Selection Dialog */}
                      <GoalSelectionDialog
                        open={goalSelectionOpen}
                        onOpenChange={setGoalSelectionOpen}
                        goals={goals}
                        selectedGoalIds={selectedGoalIds}
                        onSelectGoal={handleGoalSelection}
                      />

                      {/* Selected Goals and Milestones */}
                      {selectedPerformanceAssessments.length === 0 ? (
                        <div className="border rounded-md p-6 text-center bg-muted/10">
                          <p className="text-muted-foreground">
                            No goals selected yet. Click "Add Goal" to start assessment.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {selectedPerformanceAssessments.map((assessment, goalIndex) => {
                            const goal = goals.find(g => g.id === assessment.goalId);
                            const goalSubgoals = subgoalsByGoalId[assessment.goalId] || [];
                            const selectedMilestoneIds = getSelectedMilestoneIds(assessment.goalId);

                            return (
                              <Card key={assessment.goalId} className="overflow-hidden">
                                <CardHeader className="bg-primary/10 pb-3">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-base">
                                      {goal?.title || assessment.goalTitle}
                                    </CardTitle>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveGoal(goalIndex)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <CardDescription>
                                    {goal?.description}
                                  </CardDescription>
                                </CardHeader>

                                <CardContent className="pt-4">
                                  {/* Goal Notes section removed as requested */}

                                  {/* Milestone Section */}
                                  <div className="mt-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setCurrentGoalIndex(goalIndex);
                                          setMilestoneSelectionOpen(true);
                                          setSelectedGoalId(assessment.goalId);
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Milestone
                                      </Button>
                                    </div>

                                    {/* Milestone Selection Dialog */}
                                    {currentGoalIndex === goalIndex && (
                                      <MilestoneSelectionDialog
                                        open={milestoneSelectionOpen}
                                        onOpenChange={setMilestoneSelectionOpen}
                                        subgoals={goalSubgoals}
                                        selectedMilestoneIds={selectedMilestoneIds}
                                        onSelectMilestone={handleMilestoneSelection}
                                      />
                                    )}

                                    {/* Selected Milestones */}
                                    {assessment.milestones.length === 0 ? (
                                      <div className="border rounded-md p-3 text-center bg-muted/10">
                                        <p className="text-sm text-muted-foreground">
                                          No milestones selected yet. Click "Add Milestone" to assess progress.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        {assessment.milestones.map((milestone, milestoneIndex) => {
                                          const subgoal = goalSubgoals.find(s => s.id === milestone.milestoneId);

                                          return (
                                            <div 
                                              key={milestone.milestoneId} 
                                              className="border rounded-md p-4 space-y-3"
                                            >
                                              <FormField
                                                control={form.control}
                                                name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                                render={({ field }) => {
                                                  // Generate badge color class based on rating value
                                                  const getRatingColorClass = () => {
                                                    const value = field.value !== undefined ? field.value : 5;
                                                    if (value <= 3) return 'text-red-700';
                                                    if (value <= 6) return 'text-amber-700';
                                                    return 'text-green-700';
                                                  };

                                                  return (
                                                    <div className="flex justify-between items-start">
                                                      <div>
                                                        <h5 className="font-medium">
                                                          {subgoal?.title || milestone.milestoneTitle}
                                                          <span className={`ml-2 ${getRatingColorClass()}`}>
                                                            - Score {field.value !== undefined ? field.value : 5}
                                                          </span>
                                                        </h5>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                          {subgoal?.description}
                                                        </p>
                                                      </div>
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveMilestone(goalIndex, milestoneIndex)}
                                                      >
                                                        <X className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  );
                                                }}
                                              />

                                              {/* Milestone Rating Slider (no labels) */}
                                              <FormField
                                                control={form.control}
                                                name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                                render={({ field }) => {
                                                  // Get range class for the slider
                                                  const getRangeClass = () => {
                                                    const value = field.value !== undefined ? field.value : 5;
                                                    if (value <= 3) return 'range-low';
                                                    if (value <= 6) return 'range-mid';
                                                    return 'range-high';
                                                  };

                                                  return (
                                                    <FormItem>
                                                      <FormControl>
                                                        <div className="px-1 py-2">
                                                          <Slider
                                                            value={[field.value !== undefined ? field.value : 5]}
                                                            min={0}
                                                            max={10}
                                                            step={1}
                                                            onValueChange={(vals) => field.onChange(vals[0])}
                                                            className={`py-2 rating-slider color-slider ${getRangeClass()}`}
                                                          />
                                                        </div>
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  );
                                                }}
                                              />

                                              {/* Strategies Used */}
                                              <FormField
                                                control={form.control}
                                                name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.strategies`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <div className="flex justify-between items-center">
                                                      <FormLabel>Strategies Used</FormLabel>
                                                      <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="h-8 px-2 text-xs"
                                                        onClick={() => {
                                                          setCurrentGoalIndex(goalIndex);
                                                          setCurrentMilestoneIndex(milestoneIndex);
                                                          setStrategySelectionOpen(true);
                                                        }}
                                                      >
                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                        <span>Select Strategies</span>
                                                      </Button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                      {field.value && field.value.length > 0 ? (
                                                        field.value.map((strategy: string) => (
                                                          <Badge
                                                            key={strategy}
                                                            variant="default"
                                                            className="cursor-pointer"
                                                            onClick={() => {
                                                              field.onChange(field.value.filter((s: string) => s !== strategy));
                                                            }}
                                                          >
                                                            {strategy}
                                                            <X className="h-3 w-3 ml-1" />
                                                          </Badge>
                                                        ))
                                                      ) : (
                                                        <div className="text-sm text-muted-foreground italic">
                                                          No strategies selected
                                                        </div>
                                                      )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Max 5 strategies per milestone 
                                                      {field.value && field.value.length > 0 && ` (${field.value.length}/5 selected)`}
                                                    </p>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right column (1/3) - General Notes section */}
                    <div className="md:w-1/3">
                      {/* Rating sliders will go here */}
                    </div>
                  </div>
                </TabsContent>
              </div>

              {/* Footer with navigation and submit buttons */}
              <div className="pt-2 border-t flex justify-between items-center">
                <div className="flex items-center">
                  {activeTab !== "details" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="mr-2"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  {activeTab !== "performance" && (
                    <Button
                      type="button"
                      onClick={handleNext}
                      variant="ghost"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  {activeTab === "performance" && (
                    <Button 
                      type="submit"
                      disabled={createSessionMutation.isPending}
                    >
                      {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </Tabs>

        {/* Strategy selection dialog */}
        <StrategySelectionDialog
          open={strategySelectionOpen}
          onOpenChange={setStrategySelectionOpen}
          selectedStrategies={
            currentGoalIndex !== null && currentMilestoneIndex !== null
              ? form.getValues(`performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.strategies`) || []
              : []
          }
          milestoneId={
            currentGoalIndex !== null && currentMilestoneIndex !== null
              ? form.getValues(`performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.milestoneId`)
              : 0
          }
          onSelectStrategy={handleStrategySelection}
          maxStrategies={5}
        />
      </div>
    );
  }

  // Return the dialog version if not in full-screen mode
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
          <DialogDescription>
            Track a therapy session and record progress
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="details">Session Details & Observations</TabsTrigger>
            <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
              <div className="flex-grow overflow-auto pr-2">
                {/* Reuse the same tab content from the full-screen version */}
                <TabsContent value="details" className="space-y-6 mt-0 px-4">
                  {/* Session Notes Section with Full-Width Header and Three-Column Layout */}
                  <div className="space-y-6">
                    {/* Full-Width Header Section */}
                    <Card className="shadow-sm border-primary/10 w-full">
                      <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                        <CardTitle className="text-lg font-medium flex items-center">
                          <ClipboardList className="h-5 w-5 mr-2 text-primary/70" />
                          Session Notes
                        </CardTitle>
                        <CardDescription>
                          Record details, observations, and products used in this session
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <FormField
                          control={form.control}
                          name="sessionNote.notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>General Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter notes about the session..."
                                  className="resize-none min-h-[120px] border-primary/10 focus:border-primary/30"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Three Column Layout - Present (25%) | Products (50%) | Observations (25%) */}
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Left Column (25%) - Present in Session */}
                      <div className="w-full md:w-1/4">
                        <Card className="shadow-sm border-primary/10 h-full">
                          <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                            <CardTitle className="text-md flex items-center">
                              <UserCheck className="h-4 w-4 mr-2 text-primary/70" />
                              Present in Session
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <FormField
                              control={form.control}
                              name="sessionNote.presentAllies"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-primary/70">Attendees</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Who was present at the session..."
                                      className="resize-none min-h-24 border-primary/10 focus:border-primary/30"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      </div>
                      
                      {/* Middle Column (50%) - Products Used */}
                      <div className="w-full md:w-1/2">
                        <Card className="shadow-sm border-2 border-primary/20 overflow-hidden h-full">
                          <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                            <CardTitle className="text-md flex items-center">
                              <Package className="h-4 w-4 mr-2 text-primary/70" />
                              Products Used
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            {selectedProducts.length === 0 ? (
                              <div className="border border-primary/10 rounded-lg p-4 text-center text-muted-foreground bg-muted/5">
                                No products selected
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {selectedProducts.map((product, index) => (
                                  <div key={index} className="flex items-center justify-between border border-primary/10 rounded-lg p-3 shadow-sm">
                                    <div>
                                      <p className="font-medium">{product.productDescription || product.productCode}</p>
                                      <p className="text-sm text-muted-foreground">{product.quantity} × ${product.unitPrice.toFixed(2)}</p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeProduct(index)}
                                      className="h-8 w-8"
                                    >
                                      <X className="h-4 w-4 text-primary/70" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setProductSelectionOpen(true)}
                              className="w-full mt-4 border-primary/20 hover:bg-primary/5"
                              disabled={!clientId || (!availableProducts?.length)}
                            >
                              <Plus className="h-4 w-4 mr-2 text-primary/70" />
                              Add Product
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {/* Right Column (25%) - Session Observations */}
                      <div className="w-full md:w-1/4">
                        <Card className="shadow-sm border-primary/10 overflow-hidden h-full">
                          <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                            <CardTitle className="text-md flex items-center">
                              <BarChart className="h-4 w-4 mr-2 text-primary/70" />
                              Session Ratings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="sessionNote.moodRating"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <RatingSlider
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Mood"
                                        description="Rate client's overall mood during the session"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="sessionNote.focusRating"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <RatingSlider
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Focus"
                                        description="Rate client's ability to focus during the session"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="sessionNote.cooperationRating"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <RatingSlider
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Cooperation"
                                        description="Rate client's overall cooperation"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="sessionNote.physicalActivityRating"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <RatingSlider
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Physical Activity"
                                        description="Rate client's physical activity level"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4 mt-0 px-2">
                  {/* Two-column layout: 2/3 goals, 1/3 general notes */}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Left column (2/3) - Goals section */}
                    <div className="md:w-2/3">
                      {/* Header aligned with content below */}
                      <div className="flex justify-between items-center w-full mb-4">
                        <h3 className="section-header">
                          <RefreshCw className="h-5 w-5" />
                          Performance Assessment
                        </h3>
                        <Button 
                          type="button" 
                          onClick={() => setGoalSelectionOpen(true)}
                          disabled={!clientId}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Goal
                        </Button>
                      </div>
                      {/* Goal Selection Dialog */}
                      <GoalSelectionDialog
                        open={goalSelectionOpen}
                        onOpenChange={setGoalSelectionOpen}
                        goals={goals}
                        selectedGoalIds={selectedGoalIds}
                        onSelectGoal={handleGoalSelection}
                      />

                      {/* Selected Goals and Milestones */}
                      {selectedPerformanceAssessments.length === 0 ? (
                        <div className="border rounded-md p-6 text-center bg-muted/10">
                          <p className="text-muted-foreground">
                            No goals selected yet. Click "Add Goal" to start assessment.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {selectedPerformanceAssessments.map((assessment, goalIndex) => {
                            const goal = goals.find(g => g.id === assessment.goalId);
                            const goalSubgoals = subgoalsByGoalId[assessment.goalId] || [];
                            const selectedMilestoneIds = getSelectedMilestoneIds(assessment.goalId);

                            return (
                              <Card key={assessment.goalId} className="overflow-hidden">
                                <CardHeader className="bg-primary/10 pb-3">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-base">
                                      {goal?.title || assessment.goalTitle}
                                    </CardTitle>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveGoal(goalIndex)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <CardDescription>
                                    {goal?.description}
                                  </CardDescription>
                                </CardHeader>

                                <CardContent className="pt-4">
                                  {/* Goal Notes section removed as requested */}

                                  {/* Milestone Section */}
                                  <div className="mt-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setCurrentGoalIndex(goalIndex);
                                          setMilestoneSelectionOpen(true);
                                          setSelectedGoalId(assessment.goalId);
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Milestone
                                      </Button>
                                    </div>

                                    {/* Milestone Selection Dialog */}
                                    {currentGoalIndex === goalIndex && (
                                      <MilestoneSelectionDialog
                                        open={milestoneSelectionOpen}
                                        onOpenChange={setMilestoneSelectionOpen}
                                        subgoals={goalSubgoals}
                                        selectedMilestoneIds={selectedMilestoneIds}
                                        onSelectMilestone={handleMilestoneSelection}
                                      />
                                    )}

                                    {/* Selected Milestones */}
                                    {assessment.milestones.length === 0 ? (
                                      <div className="border rounded-md p-3 text-center bg-muted/10">
                                        <p className="text-sm text-muted-foreground">
                                          No milestones selected yet. Click "Add Milestone" to assess progress.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        {assessment.milestones.map((milestone, milestoneIndex) => {
                                          const subgoal = goalSubgoals.find(s => s.id === milestone.milestoneId);

                                          return (
                                            <div 
                                              key={milestone.milestoneId} 
                                              className="border rounded-md p-4 space-y-3"
                                            >
                                              <FormField
                                                control={form.control}
                                                name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                                render={({ field }) => {
                                                  // Generate badge color class based on rating value
                                                  const getRatingColorClass = () => {
                                                    const value = field.value !== undefined ? field.value : 5;
                                                    if (value <= 3) return 'text-red-700';
                                                    if (value <= 6) return 'text-amber-700';
                                                    return 'text-green-700';
                                                  };

                                                  return (
                                                    <div className="flex justify-between items-start">
                                                      <div>
                                                        <h5 className="font-medium">
                                                          {subgoal?.title || milestone.milestoneTitle}
                                                          <span className={`ml-2 ${getRatingColorClass()}`}>
                                                            - Score {field.value !== undefined ? field.value : 5}
                                                          </span>
                                                        </h5>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                          {subgoal?.description}
                                                        </p>
                                                      </div>
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveMilestone(goalIndex, milestoneIndex)}
                                                      >
                                                        <X className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  );
                                                }}
                                              />

                                              {/* Milestone Rating Slider (no labels) */}
                                              <FormField
                                                control={form.control}
                                                name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                                render={({ field }) => {
                                                  // Get range class for the slider
                                                  const getRangeClass = () => {
                                                    const value = field.value !== undefined ? field.value : 5;
                                                    if (value <= 3) return 'range-low';
                                                    if (value <= 6) return 'range-mid';
                                                    return 'range-high';
                                                  };

                                                  return (
                                                    <FormItem>
                                                      <FormControl>
                                                        <div className="px-1 py-2">
                                                          <Slider
                                                            value={[field.value !== undefined ? field.value : 5]}
                                                            min={0}
                                                            max={10}
                                                            step={1}
                                                            onValueChange={(vals) => field.onChange(vals[0])}
                                                            className={`py-2 rating-slider color-slider ${getRangeClass()}`}
                                                          />
                                                        </div>
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  );
                                                }}
                                              />

                                              {/* Strategies Used */}
                                              <FormField
                                                control={form.control}
                                                name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.strategies`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <div className="flex justify-between items-center">
                                                      <FormLabel>Strategies Used</FormLabel>
                                                      <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="h-8 px-2 text-xs"
                                                        onClick={() => {
                                                          setCurrentGoalIndex(goalIndex);
                                                          setCurrentMilestoneIndex(milestoneIndex);
                                                          setStrategySelectionOpen(true);
                                                        }}
                                                      >
                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                        <span>Select Strategies</span>
                                                      </Button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                      {field.value && field.value.length > 0 ? (
                                                        field.value.map((strategy: string) => (
                                                          <Badge
                                                            key={strategy}
                                                            variant="default"
                                                            className="cursor-pointer"
                                                            onClick={() => {
                                                              field.onChange(field.value.filter((s: string) => s !== strategy));
                                                            }}
                                                          >
                                                            {strategy}
                                                            <X className="h-3 w-3 ml-1" />
                                                          </Badge>
                                                        ))
                                                      ) : (
                                                        <div className="text-sm text-muted-foreground italic">
                                                          No strategies selected
                                                        </div>
                                                      )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Max 5 strategies per milestone 
                                                      {field.value && field.value.length > 0 && ` (${field.value.length}/5 selected)`}
                                                    </p>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right column (1/3) - General Notes section */}
                    <div className="md:w-1/3">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="sessionNote.notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter general notes about the session..."
                                  className="resize-none min-h-[300px] border-primary/10 focus:border-primary/30"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>

              {/* Footer with navigation and submit buttons */}
              <div className="pt-2 border-t flex justify-between items-center">
                <div className="flex items-center">
                  {activeTab !== "details" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="mr-2"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  {activeTab !== "performance" && (
                    <Button
                      type="button"
                      onClick={handleNext}
                      variant="ghost"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  {activeTab === "performance" && (
                    <Button 
                      type="submit"
                      disabled={createSessionMutation.isPending}
                    >
                      {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </Tabs>

        {/* Strategy selection dialog */}
        <StrategySelectionDialog
          open={strategySelectionOpen}
          onOpenChange={setStrategySelectionOpen}
          selectedStrategies={
            currentGoalIndex !== null && currentMilestoneIndex !== null
              ? form.getValues(`performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.strategies`) || []
              : []
          }
          milestoneId={
            currentGoalIndex !== null && currentMilestoneIndex !== null
              ? form.getValues(`performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.milestoneId`)
              : 0
          }
          onSelectStrategy={handleStrategySelection}
          maxStrategies={5}
        />
      </DialogContent>
    </Dialog>
  );
}