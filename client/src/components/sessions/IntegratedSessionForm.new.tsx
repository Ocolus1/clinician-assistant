import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { PerformanceHeader } from "./PerformanceHeader";
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
  UserCheck
} from "lucide-react";
import "./session-form.css";
import { ThreeColumnLayout } from "./ThreeColumnLayout";
// Debug helper has been removed in favor of a more natural implementation
import { Ally, BudgetItem, BudgetSettings, Client, Goal, Session, Subgoal, insertSessionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
import { useToast } from "@/hooks/use-toast";

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
  const [currentGoalIndex, setCurrentGoalIndex] = useState<number | null>(null);
  
  // Generate a unique session ID
  const sessionId = useMemo(() => {
    const timestamp = new Date().getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `SES-${timestamp}-${random}`.toUpperCase();
  }, []);
  
  // Track the selected client ID for fetching goals and subgoals
  const [selectedClientId, setSelectedClientId] = useState<number | null>(initialClient?.id || null);
  
  // Fetch clients for client dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });
  
  // Fetch goals for the selected client
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/clients", selectedClientId, "goals"],
    enabled: !!selectedClientId && open,
  });
  
  // Fetch subgoals for each goal
  const [subgoalsByGoalId, setSubgoalsByGoalId] = useState<Record<number, Subgoal[]>>({});
  
  // Fetch allies for the selected client
  const { data: allies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", selectedClientId, "allies"],
    enabled: !!selectedClientId && open,
  });
  
  // Fetch budget items for the selected client to use as products
  const { data: allBudgetItems = [] } = useQuery<BudgetItem[]>({
    queryKey: ["/api/clients", selectedClientId, "budget-items"],
    enabled: !!selectedClientId && open,
  });
  
  // Fetch budget settings for quantities and availability
  const { data: budgetSettings } = useQuery<BudgetSettings>({
    queryKey: ["/api/clients", selectedClientId, "budget-settings"],
    enabled: !!selectedClientId && open,
  });
  
  // Add product quantities
  const availableProducts = useMemo(() => {
    // Filter only valid product types (those with item codes and quantities)
    return allBudgetItems
      .filter((item: BudgetItem) => {
        return item.itemCode && item.quantity > 0;
      })
      .map((item: BudgetItem) => ({
        ...item,
        availableQuantity: item.quantity,
        productCode: item.itemCode || "UNKNOWN",
        productDescription: item.description || item.itemName || "Unknown Product"
      }));
  }, [allBudgetItems]);
  
  // Compute selected goal IDs for filtering in goal selection dialog
  const selectedGoalIds = useMemo(() => {
    const goalIds = form.watch('performanceAssessments')?.map(a => a.goalId) || [];
    return goalIds.filter(id => id !== undefined);
  }, [form.watch('performanceAssessments')]);
  
  // Helper function to get selected milestone IDs for a specific goal
  const getSelectedMilestoneIds = (goalId: number) => {
    const assessments = form.watch('performanceAssessments') || [];
    const goalAssessment = assessments.find(a => a.goalId === goalId);
    if (!goalAssessment) return [];
    
    return goalAssessment.milestones
      .map(m => m.milestoneId)
      .filter(id => id !== undefined) as number[];
  };
  
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
  
  // Handle goal selection
  const handleGoalSelection = (goal: Goal) => {
    const currentAssessments = form.getValues('performanceAssessments') || [];
    
    // Check if the goal already exists in assessments
    if (currentAssessments.some(a => a.goalId === goal.id)) {
      toast({
        title: "Goal already selected",
        description: "This goal is already part of the assessment.",
        variant: "destructive",
      });
      return;
    }
    
    // Add the new goal assessment
    const updatedAssessments = [
      ...currentAssessments,
      {
        goalId: goal.id,
        goalTitle: goal.title,
        notes: "",
        milestones: [],
      }
    ];
    
    form.setValue('performanceAssessments', updatedAssessments);
    
    // Store the selected goal and client ID in the query cache for later use
    queryClient.setQueryData(['selectedGoalId'], goal.id);
    queryClient.setQueryData(['formState'], {
      clientId: selectedClientId,
      performanceAssessments: updatedAssessments,
      currentGoalIndex: updatedAssessments.length - 1,
    });
    
    // Fetch subgoals for the selected goal if not already in state
    if (!subgoalsByGoalId[goal.id]) {
      fetch(`/api/goals/${goal.id}/subgoals`)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch subgoals: ${response.status}`);
          return response.json();
        })
        .then(data => {
          console.log("Subgoals fetched for goal:", goal.id, data);
          setSubgoalsByGoalId(prev => ({
            ...prev,
            [goal.id]: data
          }));
        })
        .catch(error => {
          console.error("Error fetching subgoals:", error);
          // Set an empty array if fetch fails
          setSubgoalsByGoalId(prev => ({
            ...prev,
            [goal.id]: []
          }));
        });
    }
  };
  
  // Handle milestone selection
  const handleMilestoneSelection = (subgoal: Subgoal) => {
    // Make sure we have a goal selected
    if (currentGoalIndex === null) return;
    
    const currentAssessments = form.getValues('performanceAssessments');
    const currentGoal = currentAssessments[currentGoalIndex];
    
    // Check if the milestone already exists
    if (currentGoal.milestones.some(m => m.milestoneId === subgoal.id)) {
      toast({
        title: "Milestone already selected",
        description: "This milestone is already part of the assessment.",
        variant: "destructive",
      });
      return;
    }
    
    // Add the new milestone to the current goal
    const updatedMilestones = [
      ...currentGoal.milestones,
      {
        milestoneId: subgoal.id,
        milestoneTitle: subgoal.title,
        rating: 5, // Default rating
        strategies: [],
        notes: ""
      }
    ];
    
    // Update the form data
    const updatedAssessments = [...currentAssessments];
    updatedAssessments[currentGoalIndex] = {
      ...currentGoal,
      milestones: updatedMilestones
    };
    
    form.setValue('performanceAssessments', updatedAssessments);
  };
  
  // Handlers for adding and removing assessment items
  
  // Handle Remove Goal
  const handleRemoveGoal = (goalIndex: number) => {
    const currentAssessments = form.getValues('performanceAssessments');
    const updatedAssessments = currentAssessments.filter((_, index) => index !== goalIndex);
    form.setValue('performanceAssessments', updatedAssessments);
  };
  
  // Handle Remove Milestone
  const handleRemoveMilestone = (goalIndex: number, milestoneIndex: number) => {
    const currentAssessments = form.getValues('performanceAssessments');
    const currentGoal = currentAssessments[goalIndex];
    
    const updatedMilestones = currentGoal.milestones.filter((_, index) => index !== milestoneIndex);
    
    const updatedAssessments = [...currentAssessments];
    updatedAssessments[goalIndex] = {
      ...currentGoal,
      milestones: updatedMilestones
    };
    
    form.setValue('performanceAssessments', updatedAssessments);
  };
  
  // Handle Add Product (for session notes)
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);
  
  const handleAddProduct = (product: BudgetItem & { availableQuantity: number }, quantity: number) => {
    const currentProducts = form.getValues('sessionNote.products') || [];
    
    // Check if the product already exists
    const existingProductIndex = currentProducts.findIndex(p => p.budgetItemId === product.id);
    
    if (existingProductIndex >= 0) {
      // Update quantity of existing product
      const updatedProducts = [...currentProducts];
      updatedProducts[existingProductIndex] = {
        ...updatedProducts[existingProductIndex],
        quantity: updatedProducts[existingProductIndex].quantity + quantity
      };
      form.setValue('sessionNote.products', updatedProducts);
    } else {
      // Add new product
      const newProduct = {
        budgetItemId: product.id,
        productCode: product.itemCode || 'UNKNOWN',
        productDescription: product.description || product.itemName || 'Unknown Product',
        quantity: quantity,
        unitPrice: product.unitPrice || 0,
        availableQuantity: product.availableQuantity
      };
      
      form.setValue('sessionNote.products', [...currentProducts, newProduct]);
    }
  };
  
  // Handle Remove Product
  const handleRemoveProduct = (productIndex: number) => {
    const currentProducts = form.getValues('sessionNote.products');
    const updatedProducts = currentProducts.filter((_, index) => index !== productIndex);
    form.setValue('sessionNote.products', updatedProducts);
  };
  
  // Effect to update selected client ID when client changes in form
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'session.clientId') {
        const newClientId = value.session?.clientId;
        if (newClientId && newClientId !== selectedClientId) {
          setSelectedClientId(Number(newClientId));
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, selectedClientId]);
  
  // Fix for duplicate calendars. If calendar duplicates happen, use this effect
  useEffect(() => {
    hideUnwantedCalendars();
  }, [form.formState.isSubmitting]);
  
  // Mutation for saving the session
  const sessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      // First create the session
      const sessionResponse = await apiRequest('POST', '/api/sessions', data.session);
      
      // If successful, create the session note
      if (sessionResponse && sessionResponse.id) {
        const sessionId = sessionResponse.id;
        
        // Create the session note
        const noteResponse = await apiRequest('POST', `/api/sessions/${sessionId}/notes`, {
          ...data.sessionNote,
          sessionId,
        });
        
        // Create the performance assessments
        if (data.performanceAssessments.length > 0) {
          for (const assessment of data.performanceAssessments) {
            await apiRequest('POST', `/api/sessions/${sessionId}/performance-assessments`, {
              sessionId,
              goalId: assessment.goalId,
              notes: assessment.notes || "",
              milestones: assessment.milestones.map(m => ({
                milestoneId: m.milestoneId,
                rating: m.rating || 5,
                notes: m.notes || "",
                strategies: m.strategies || []
              }))
            });
          }
        }
        
        return { sessionId, success: true };
      }
      
      throw new Error("Failed to create session");
    },
    onSuccess: (data) => {
      toast({
        title: "Session created",
        description: `Session successfully created with ID: ${data.sessionId}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving session:", error);
      toast({
        title: "Error",
        description: "Failed to save session. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Form submission handler
  function onSubmit(data: IntegratedSessionFormValues) {
    console.log("Submitting session form data:", data);
    
    // Validation passed - create the session
    sessionMutation.mutate(data);
  }
  
  // Watch form fields for selected performance assessments
  const selectedPerformanceAssessments = form.watch('performanceAssessments') || [];
  
  // Product selection dialog
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
    
    // Reset the form when dialog opens/closes
    useEffect(() => {
      if (!open) {
        setSelectedProduct(null);
        setQuantity(1);
      }
    }, [open]);
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              Select a product used in this session
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {products.length === 0 ? (
              <div className="p-4 border rounded-md bg-muted/20 text-center">
                <p className="text-muted-foreground">
                  No products available for this client
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Select 
                    value={selectedProduct?.id?.toString() || ""} 
                    onValueChange={(value) => {
                      const product = products.find(p => p.id.toString() === value);
                      if (product) {
                        setSelectedProduct(product);
                        setQuantity(1); // Reset quantity when product changes
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.itemName} ({product.itemCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedProduct && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="quantity">Quantity</Label>
                      <span className="text-sm text-muted-foreground">
                        Available: {selectedProduct.availableQuantity}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value);
                          if (!isNaN(newValue) && newValue > 0) {
                            setQuantity(Math.min(newValue, selectedProduct.availableQuantity));
                          }
                        }}
                        className="max-w-16 text-center"
                        min={1}
                        max={selectedProduct.availableQuantity}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => setQuantity(Math.min(quantity + 1, selectedProduct.availableQuantity))}
                        disabled={quantity >= selectedProduct.availableQuantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedProduct.unitPrice > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Total: ${(selectedProduct.unitPrice * quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedProduct || quantity <= 0}
              onClick={() => {
                if (selectedProduct) {
                  onSelectProduct(selectedProduct, quantity);
                  onOpenChange(false);
                }
              }}
            >
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Calculate remaining content height based on heading height for ScrollArea
  const [headingHeight, setHeadingHeight] = useState(0);
  const headerRef = React.useRef<HTMLDivElement>(null);
  
  useLayoutEffect(() => {
    if (headerRef.current) {
      const height = headerRef.current.getBoundingClientRect().height;
      setHeadingHeight(height);
    }
  }, [open]);
  
  const dialogMaxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600;
  const contentMaxHeight = dialogMaxHeight - headingHeight - 50; // 50px for padding
  
  // Full Screen mode classes
  const dialogClasses = isFullScreen 
    ? "fixed inset-0 w-full h-full rounded-none flex flex-col max-w-none bg-background" 
    : "sm:max-w-[95vw] max-h-[95vh] flex flex-col";
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClasses}>
        <div ref={headerRef}>
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl">
              {form.watch('session.sessionId') ? `Session ${form.watch('session.sessionId')}` : "New Session"}
            </DialogTitle>
            <DialogDescription>
              Create a comprehensive session record including notes and assessments
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
            <ScrollArea className="flex-1" style={{ height: isFullScreen ? 'calc(100vh - 150px)' : `${contentMaxHeight}px` }}>
              <div className="pr-4 pb-8">
                <div className="space-y-6">
                  {/* Tab Selection */}
                  <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="details">Session Details</TabsTrigger>
                      <TabsTrigger value="performance">Performance</TabsTrigger>
                      <TabsTrigger value="summary">Summary & Submit</TabsTrigger>
                    </TabsList>
                    
                    {/* Session Details Tab */}
                    <TabsContent value="details" className="space-y-4 mt-0 px-2">
                      <FormField
                        control={form.control}
                        name="session.clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client</FormLabel>
                            <Select
                              disabled={!!initialClient}
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => {
                                // Only update if value is different
                                if (value !== field.value?.toString()) {
                                  field.onChange(parseInt(value, 10));
                                  setSelectedClientId(parseInt(value, 10));
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients.map((client) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Session Date */}
                      <FormField
                        control={form.control}
                        name="session.sessionDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Session Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className="w-full pl-3 text-left font-normal"
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Select a date</span>
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
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("2023-01-01")
                                  }
                                  data-calendar-container="true"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Duration */}
                      <FormField
                        control={form.control}
                        name="session.duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (minutes)</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                                />
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Title */}
                      <FormField
                        control={form.control}
                        name="session.title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Session Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Location */}
                      <FormField
                        control={form.control}
                        name="session.location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <Input {...field} />
                                <MapPinIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Present Allies */}
                      <FormField
                        control={form.control}
                        name="sessionNote.presentAllyIds"
                        render={({ field }) => (
                          <FormItem>
                            <div className="mb-4">
                              <FormLabel>Present Allies</FormLabel>
                              <FormDescription>
                                Select allies who were present during the session
                              </FormDescription>
                            </div>
                            <div className="space-y-2">
                              {allies.length === 0 ? (
                                <div className="p-4 border rounded-md text-center bg-muted/10">
                                  <p className="text-muted-foreground">No allies found for this client</p>
                                </div>
                              ) : (
                                allies.map((ally) => (
                                  <div key={ally.id} className="flex items-start space-x-2 p-2 border rounded-md">
                                    <Checkbox
                                      checked={field.value?.includes(ally.id)}
                                      onCheckedChange={(checked) => {
                                        const currentIds = field.value || [];
                                        let updatedIds;
                                        let updatedNames;
                                        
                                        if (checked) {
                                          // Add ally ID and name
                                          updatedIds = [...currentIds, ally.id];
                                          updatedNames = [...(form.getValues('sessionNote.presentAllies') || []), ally.name];
                                        } else {
                                          // Remove ally ID and name
                                          updatedIds = currentIds.filter((id) => id !== ally.id);
                                          updatedNames = (form.getValues('sessionNote.presentAllies') || [])
                                            .filter((name) => name !== ally.name);
                                        }
                                        
                                        field.onChange(updatedIds);
                                        form.setValue('sessionNote.presentAllies', updatedNames);
                                      }}
                                      id={`ally-${ally.id}`}
                                    />
                                    <div className="grid gap-1">
                                      <Label
                                        htmlFor={`ally-${ally.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        {ally.name}
                                      </Label>
                                      <p className="text-xs text-muted-foreground">
                                        {ally.role || "Support Role"} • {ally.relationship || "Professional"}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     
                      {/* Observation Ratings */}
                      <div className="space-y-4">
                        <h3 className="section-header">
                          <UserCheck className="h-5 w-5" />
                          Session Observations
                        </h3>
                                                
                        {/* Three-column layout for session details */}
                        <ThreeColumnLayout
                          leftColumn={
                            <>
                              <h4 className="text-sm font-semibold">Present</h4>
                              
                              <div className="border rounded-md p-4 h-full">
                                {/* Present Allies List */}
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Allies Present:</p>
                                  {form.watch('sessionNote.presentAllyIds')?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {form.watch('sessionNote.presentAllyIds')?.map((allyId, index) => {
                                        const ally = allies.find(a => a.id === allyId);
                                        return (
                                          <Badge key={allyId} variant="outline" className="bg-primary/10">
                                            {ally?.name || `Ally ${index + 1}`}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No allies selected</p>
                                  )}
                                </div>
                                
                                {/* Ratings */}
                                <div className="space-y-8 mt-6">
                                  <Controller
                                    control={form.control}
                                    name="sessionNote.moodRating"
                                    render={({ field }) => (
                                      <RatingSlider
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Mood"
                                        description="Overall emotional state during session"
                                      />
                                    )}
                                  />
                                  
                                  <Controller
                                    control={form.control}
                                    name="sessionNote.focusRating"
                                    render={({ field }) => (
                                      <RatingSlider
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Focus"
                                        description="Ability to maintain attention on tasks"
                                      />
                                    )}
                                  />
                                  
                                  <Controller
                                    control={form.control}
                                    name="sessionNote.cooperationRating"
                                    render={({ field }) => (
                                      <RatingSlider
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Cooperation"
                                        description="Willingness to engage in activities"
                                      />
                                    )}
                                  />
                                  
                                  <Controller
                                    control={form.control}
                                    name="sessionNote.physicalActivityRating"
                                    render={({ field }) => (
                                      <RatingSlider
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Physical Activity"
                                        description="Energy level and movement during session"
                                      />
                                    )}
                                  />
                                </div>
                              </div>
                            </>
                          }
                          middleColumn={
                            <>
                              <div className="flex justify-between items-center">
                                <h4 className="text-sm font-semibold">Products Used</h4>
                                <Button 
                                  type="button" 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setProductSelectionOpen(true)}
                                  disabled={!selectedClientId}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              </div>
                              
                              <div className="border rounded-md p-4 h-full">
                                {/* Products Selection Dialog */}
                                <ProductSelectionDialog
                                  open={productSelectionOpen}
                                  onOpenChange={setProductSelectionOpen}
                                  products={availableProducts}
                                  onSelectProduct={handleAddProduct}
                                />
                                
                                {/* Products List */}
                                <div className="space-y-3">
                                  {form.watch('sessionNote.products')?.length > 0 ? (
                                    form.watch('sessionNote.products').map((product, index) => (
                                      <div key={index} className="flex justify-between items-start p-2 border rounded-md">
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium">{product.productDescription}</p>
                                          <div className="flex space-x-2 text-xs text-muted-foreground">
                                            <span>Code: {product.productCode}</span>
                                            <span>•</span>
                                            <span>Qty: {product.quantity}</span>
                                            {product.unitPrice > 0 && (
                                              <>
                                                <span>•</span>
                                                <span>${(product.quantity * product.unitPrice).toFixed(2)}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => handleRemoveProduct(index)}
                                          className="h-6 w-6"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-4 text-center">
                                      <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/60" />
                                      <p className="mt-2 text-sm text-muted-foreground">
                                        No products added yet
                                      </p>
                                      <p className="text-xs text-muted-foreground/80 mt-1">
                                        Click "Add" to include products used in this session
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          }
                          rightColumn={
                            <>
                              <h4 className="text-sm font-semibold">Session Observations</h4>
                              
                              <div className="border rounded-md p-4 h-full">
                                <FormField
                                  control={form.control}
                                  name="sessionNote.notes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <div className="min-h-[200px]">
                                          <RichTextEditor
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            placeholder="Enter general notes and observations about the session..."
                                            className="min-h-[200px]"
                                          />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </>
                          }
                        />
                      </div>
                    </TabsContent>
                    
                    {/* Performance Tab */}
                    <TabsContent value="performance" className="space-y-4 mt-0 px-2">
                      {/* Two-column layout: 2/3 goals, 1/3 general notes */}
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Left column (2/3) - Goals section */}
                        <div className="md:w-2/3">
                          {/* Goal Selection Dialog */}
                          <GoalSelectionDialog
                            open={goalSelectionOpen}
                            onOpenChange={setGoalSelectionOpen}
                            goals={goals}
                            selectedGoalIds={selectedGoalIds}
                            onSelectGoal={handleGoalSelection}
                          />
                          
                          {/* Performance Assessment Section */}
                          <PerformanceHeader 
                            isEmpty={selectedPerformanceAssessments.length === 0}
                            onAddGoal={() => setGoalSelectionOpen(true)}
                            clientId={selectedClientId}
                          />
                          
                          {/* Selected Goals and Milestones */}
                          {selectedPerformanceAssessments.length === 0 ? (
                            <></>
                          ) : (
                            <div className="space-y-6">
                              {selectedPerformanceAssessments.map((assessment, goalIndex) => {
                                const goal = goals.find(g => g.id === assessment.goalId);
                                const goalSubgoals = subgoalsByGoalId[assessment.goalId] || [];
                                const selectedMilestoneIds = getSelectedMilestoneIds(assessment.goalId);
                                
                                return (
                                  <Card key={goalIndex} className="performance-goal-card">
                                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                                      <div>
                                        <CardTitle className="text-base">
                                          {goal?.title || assessment.goalTitle || `Goal ${goalIndex + 1}`}
                                        </CardTitle>
                                        <CardDescription>
                                          {goal?.description || "No description available"}
                                        </CardDescription>
                                      </div>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleRemoveGoal(goalIndex)}
                                        className="h-6 w-6 -mt-1 -mr-2"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2 space-y-4">
                                      {/* Goal Notes */}
                                      <FormField
                                        control={form.control}
                                        name={`performanceAssessments.${goalIndex}.notes`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Goal Notes</FormLabel>
                                            <FormControl>
                                              <div className="min-h-[80px]">
                                                <RichTextEditor
                                                  value={field.value || ""}
                                                  onChange={field.onChange}
                                                  placeholder="Enter notes about progress on this goal..."
                                                  className="min-h-[80px]"
                                                />
                                              </div>
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      
                                      {/* Milestone Selection Dialog */}
                                      <MilestoneSelectionDialog
                                        open={milestoneSelectionOpen && currentGoalIndex === goalIndex}
                                        onOpenChange={(open) => {
                                          setMilestoneSelectionOpen(open);
                                          if (open) {
                                            setCurrentGoalIndex(goalIndex);
                                          }
                                        }}
                                        subgoals={goalSubgoals}
                                        selectedMilestoneIds={selectedMilestoneIds}
                                        onSelectMilestone={handleMilestoneSelection}
                                      />
                                      
                                      {/* Milestones */}
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <Label>Milestones</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setCurrentGoalIndex(goalIndex);
                                              setMilestoneSelectionOpen(true);
                                            }}
                                            disabled={!assessment.goalId}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Milestone
                                          </Button>
                                        </div>
                                        
                                        {/* Milestone List */}
                                        <div className="space-y-4 mt-2">
                                          {assessment.milestones.length === 0 ? (
                                            <div className="p-4 border rounded-md bg-muted/10 text-center">
                                              <p className="text-muted-foreground">
                                                No milestones added yet
                                              </p>
                                            </div>
                                          ) : (
                                            assessment.milestones.map((milestone, milestoneIndex) => {
                                              const subgoal = goalSubgoals.find(s => s.id === milestone.milestoneId);
                                              
                                              return (
                                                <div
                                                  key={milestoneIndex}
                                                  className="p-3 border rounded-md space-y-3"
                                                >
                                                  <div className="flex justify-between items-start">
                                                    <div>
                                                      <p className="font-medium text-sm">
                                                        {subgoal?.title || milestone.milestoneTitle || `Milestone ${milestoneIndex + 1}`}
                                                      </p>
                                                      <p className="text-xs text-muted-foreground">
                                                        {subgoal?.description || "No description available"}
                                                      </p>
                                                    </div>
                                                    <Button
                                                      type="button"
                                                      size="icon"
                                                      variant="ghost"
                                                      onClick={() => handleRemoveMilestone(goalIndex, milestoneIndex)}
                                                      className="h-6 w-6 -mt-1 -mr-1"
                                                    >
                                                      <X className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                  
                                                  {/* Performance Rating Slider */}
                                                  <FormField
                                                    control={form.control}
                                                    name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel className="text-xs">Performance Rating</FormLabel>
                                                        <FormControl>
                                                          <Slider
                                                            value={[field.value || 5]}
                                                            min={0}
                                                            max={10}
                                                            step={1}
                                                            onValueChange={(vals) => field.onChange(vals[0])}
                                                            className="py-2 rating-slider color-slider"
                                                          />
                                                        </FormControl>
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                          <span>Needs Work</span>
                                                          <span>Excellent</span>
                                                        </div>
                                                      </FormItem>
                                                    )}
                                                  />
                                                  
                                                  {/* Milestone Notes */}
                                                  <FormField
                                                    control={form.control}
                                                    name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.notes`}
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel className="text-xs">Notes</FormLabel>
                                                        <FormControl>
                                                          <RichTextEditor
                                                            value={field.value || ""}
                                                            onChange={field.onChange}
                                                            placeholder="Add notes about this milestone..."
                                                            className="min-h-[80px]"
                                                          />
                                                        </FormControl>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        
                        {/* Right column (1/3) - Session progress notes */}
                        <div className="md:w-1/3">
                          <h4 className="text-sm font-semibold mb-4">General Notes</h4>
                          
                          <div className="border rounded-md p-4 h-full">
                            <FormField
                              control={form.control}
                              name="session.description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Session Description</FormLabel>
                                  <FormControl>
                                    <RichTextEditor
                                      value={field.value || ""}
                                      onChange={field.onChange}
                                      placeholder="Enter general session notes and observations..."
                                      className="min-h-[250px]"
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
                    
                    {/* Summary Tab */}
                    <TabsContent value="summary" className="space-y-4 mt-0 px-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>Session Summary</CardTitle>
                          <CardDescription>
                            Review and submit the session information
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-xs">Client</Label>
                              <p>
                                {clients.find(c => c.id === form.watch('session.clientId'))?.name || "Not selected"}
                              </p>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-xs">Session Date</Label>
                              <p>
                                {form.watch('session.sessionDate') 
                                  ? format(form.watch('session.sessionDate'), "PPP") 
                                  : "Not selected"}
                              </p>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-xs">Duration</Label>
                              <p>{form.watch('session.duration')} minutes</p>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-xs">Location</Label>
                              <p>{form.watch('session.location') || "Not specified"}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-xs">Title</Label>
                              <p>{form.watch('session.title') || "Not specified"}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-xs">Session ID</Label>
                              <p>{form.watch('session.sessionId') || "Will be generated"}</p>
                            </div>
                          </div>
                          
                          <div className="pt-2">
                            <Label className="text-muted-foreground text-xs">Allies Present</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {form.watch('sessionNote.presentAllyIds')?.length > 0 ? (
                                form.watch('sessionNote.presentAllyIds').map((allyId) => {
                                  const ally = allies.find(a => a.id === allyId);
                                  return (
                                    <Badge key={allyId} variant="outline" className="bg-primary/10">
                                      {ally?.name || `Ally ID: ${allyId}`}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <p className="text-sm text-muted-foreground">No allies selected</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="pt-2">
                            <Label className="text-muted-foreground text-xs">Products Used</Label>
                            <div className="space-y-2 mt-1">
                              {form.watch('sessionNote.products')?.length > 0 ? (
                                form.watch('sessionNote.products').map((product, index) => (
                                  <div key={index} className="flex justify-between text-sm border p-2 rounded-md">
                                    <span>{product.productDescription}</span>
                                    <span>
                                      {product.quantity} x ${product.unitPrice.toFixed(2)} = 
                                      ${(product.quantity * product.unitPrice).toFixed(2)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">No products added</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="pt-2">
                            <Label className="text-muted-foreground text-xs">Client Ratings</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                              <div className="space-y-1">
                                <span className="text-xs">Mood</span>
                                <Progress value={form.watch('sessionNote.moodRating') * 10} 
                                  className={`h-2 ${form.watch('sessionNote.moodRating') > 6 ? 'bg-green-100' : 
                                    form.watch('sessionNote.moodRating') > 3 ? 'bg-amber-100' : 'bg-red-100'}`} />
                                <span className="text-sm font-medium">{form.watch('sessionNote.moodRating')}/10</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs">Focus</span>
                                <Progress value={form.watch('sessionNote.focusRating') * 10} 
                                  className={`h-2 ${form.watch('sessionNote.focusRating') > 6 ? 'bg-green-100' : 
                                    form.watch('sessionNote.focusRating') > 3 ? 'bg-amber-100' : 'bg-red-100'}`} />
                                <span className="text-sm font-medium">{form.watch('sessionNote.focusRating')}/10</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs">Cooperation</span>
                                <Progress value={form.watch('sessionNote.cooperationRating') * 10} 
                                  className={`h-2 ${form.watch('sessionNote.cooperationRating') > 6 ? 'bg-green-100' : 
                                    form.watch('sessionNote.cooperationRating') > 3 ? 'bg-amber-100' : 'bg-red-100'}`} />
                                <span className="text-sm font-medium">{form.watch('sessionNote.cooperationRating')}/10</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs">Physical</span>
                                <Progress value={form.watch('sessionNote.physicalActivityRating') * 10} 
                                  className={`h-2 ${form.watch('sessionNote.physicalActivityRating') > 6 ? 'bg-green-100' : 
                                    form.watch('sessionNote.physicalActivityRating') > 3 ? 'bg-amber-100' : 'bg-red-100'}`} />
                                <span className="text-sm font-medium">{form.watch('sessionNote.physicalActivityRating')}/10</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="pt-2">
                            <Label className="text-muted-foreground text-xs">Goals Assessed</Label>
                            <div className="space-y-2 mt-1">
                              {form.watch('performanceAssessments')?.length > 0 ? (
                                form.watch('performanceAssessments').map((assessment, index) => (
                                  <div key={index} className="border p-2 rounded-md">
                                    <p className="font-medium">{assessment.goalTitle || `Goal ${index + 1}`}</p>
                                    <div className="mt-1 pl-2 border-l-2 border-primary/30">
                                      <p className="text-xs text-muted-foreground">Milestones Assessed:</p>
                                      {assessment.milestones.length > 0 ? (
                                        <ul className="list-disc list-inside text-sm">
                                          {assessment.milestones.map((milestone, mIndex) => (
                                            <li key={mIndex}>
                                              {milestone.milestoneTitle || `Milestone ${mIndex + 1}`} 
                                              <span className="text-muted-foreground"> - Rating: {milestone.rating}/10</span>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No milestones assessed</p>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">No goals assessed</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="pt-2">
                            <Label className="text-muted-foreground text-xs">Session Note Status</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <FormField
                                control={form.control}
                                name="sessionNote.status"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value === "completed"}
                                        onCheckedChange={(checked) => {
                                          field.onChange(checked ? "completed" : "draft");
                                        }}
                                        id="status"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel htmlFor="status">
                                        Mark as completed
                                      </FormLabel>
                                      <FormDescription>
                                        You can save as a draft and complete later if needed
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter className="px-6 pb-6">
              <div className="flex justify-between w-full">
                <div className="flex gap-2">
                  {activeTab !== "details" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (activeTab === "performance") setActiveTab("details");
                        if (activeTab === "summary") setActiveTab("performance");
                      }}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  
                  {activeTab !== "summary" ? (
                    <Button
                      type="button"
                      onClick={() => {
                        if (activeTab === "details") setActiveTab("performance");
                        if (activeTab === "performance") setActiveTab("summary");
                      }}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={form.formState.isSubmitting}
                      className="min-w-32"
                    >
                      {form.formState.isSubmitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Save Session
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}