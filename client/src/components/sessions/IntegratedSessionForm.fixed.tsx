import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon,
  X,
  UserCheck,
  User as UserIcon,
  MapPin as MapPinIcon,
  Package,
  Plus,
  Check
} from "lucide-react";

import { ThreeColumnLayout } from "./ThreeColumnLayout";
import { Ally, BudgetItem, BudgetSettings, Client, Goal, Subgoal, Strategy } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

// Session form schema
const sessionFormSchema = z.object({
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
          {goals.length === 0 || goals.filter(g => !selectedGoalIds.includes(g.id)).length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">
                {goals.length > 0 ? "All goals have been selected" : "No goals found for this client"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {goals
                .filter(goal => !selectedGoalIds.includes(goal.id))
                .map(goal => (
                  <Card 
                    key={goal.id} 
                    className="cursor-pointer hover:bg-muted/20"
                    onClick={() => {
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
          {subgoals.length === 0 || subgoals.filter(s => !selectedMilestoneIds.includes(s.id)).length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">
                {subgoals.length > 0 ? "All milestones have been selected" : "No milestones found for this goal"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {subgoals
                .filter(subgoal => !selectedMilestoneIds.includes(subgoal.id))
                .map(subgoal => (
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
          <DialogTitle>Add Attendee</DialogTitle>
          <DialogDescription>
            Select a person who was present in this therapy session.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {allies.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">No allies found for this client</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allies.map(ally => (
                <Card 
                  key={ally.id} 
                  className={cn(
                    "cursor-pointer hover:bg-muted/20",
                    selectedAllies.includes(ally.name || "") && "border-primary/50 bg-primary/5"
                  )}
                  onClick={() => {
                    onSelectAlly(ally);
                    onOpenChange(false);
                  }}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base flex items-center">
                      {ally.name}
                      {selectedAllies.includes(ally.name || "") && (
                        <Check className="h-4 w-4 ml-2 text-primary" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">{ally.relationship}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
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
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  
  useEffect(() => {
    // Initialize quantities
    const initialQuantities = products.reduce((acc, product) => {
      acc[product.id] = 1;
      return acc;
    }, {} as Record<number, number>);
    
    setQuantities(initialQuantities);
  }, [products]);
  
  const handleQuantityChange = (productId: number, value: string) => {
    const newQuantity = parseInt(value);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      setQuantities(prev => ({
        ...prev,
        [productId]: newQuantity
      }));
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Select a product to add to this session
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {products.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">No products available for this client</p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map(product => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="flex items-stretch">
                    <div className="flex-grow p-4">
                      <h3 className="font-medium">{product.name}</h3>
                      <div className="text-sm text-muted-foreground mt-1 flex justify-between">
                        <span>Code: {product.itemCode}</span>
                        <span className="text-primary">${product.unitPrice.toFixed(2)} each</span>
                      </div>
                      <div className="flex items-center mt-2">
                        <Label htmlFor={`qty-${product.id}`} className="mr-2 text-sm">Qty:</Label>
                        <Input
                          id={`qty-${product.id}`}
                          type="number"
                          min="1"
                          max={product.availableQuantity}
                          value={quantities[product.id] || 1}
                          onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                          className="w-20 h-8"
                        />
                        <span className="text-xs text-muted-foreground ml-2">
                          (Available: {product.availableQuantity})
                        </span>
                      </div>
                    </div>
                    <div className="bg-muted flex flex-col justify-center px-4 border-l">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={!quantities[product.id] || quantities[product.id] > product.availableQuantity}
                        onClick={() => {
                          onSelectProduct(product, quantities[product.id] || 1);
                          onOpenChange(false);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
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
  
  // Get client info for the form
  const [clientId, setClientId] = useState<number | null>(initialClient?.id || null);
  
  // Dialog state
  const [goalSelectionOpen, setGoalSelectionOpen] = useState(false);
  const [milestoneSelectionOpen, setMilestoneSelectionOpen] = useState(false);
  const [strategySelectionOpen, setStrategySelectionOpen] = useState(false);
  const [allySelectionOpen, setAllySelectionOpen] = useState(false);
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);
  
  // Track current goal and milestone indices for editing
  const [currentGoalIndex, setCurrentGoalIndex] = useState<number | null>(null);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState<number | null>(null);

  // Data queries
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !initialClient, // Only fetch all clients if no initialClient is provided
  });
  
  const { data: goals = [] } = useQuery({
    queryKey: ["/api/clients", clientId, "goals"],
    enabled: !!clientId,
  });
  
  const { data: subgoalsMap = {} } = useQuery({
    queryKey: ["/api/clients", clientId, "subgoals-by-goal"],
    enabled: !!clientId,
  });
  
  const { data: allies = [] } = useQuery({
    queryKey: ["/api/clients", clientId, "allies"],
    enabled: !!clientId,
  });
  
  const { 
    data: budgetItems = [], 
    refetch: refetchBudgetItems 
  } = useQuery({
    queryKey: ["/api/clients", clientId, "budget-items"],
    enabled: !!clientId,
  });
  
  const { 
    data: budgetSettings, 
    refetch: refetchBudgetSettings 
  } = useQuery({
    queryKey: ["/api/clients", clientId, "budget-settings"],
    enabled: !!clientId,
  });
  
  const { data: strategies = [] } = useQuery({
    queryKey: ["/api/strategies"],
  });
  
  // Form
  const form = useSafeForm<IntegratedSessionFormValues>({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues: {
      session: {
        clientId: initialClient?.id || 0,
        location: "",
        sessionDate: new Date(),
      },
      sessionNote: {
        presentAllies: [],
        presentAllyIds: [],
        moodRating: 5,
        focusRating: 5,
        cooperationRating: 5,
        physicalActivityRating: 5,
        notes: "",
        products: [],
        status: "draft",
      },
      performanceAssessments: [],
    },
  });
  
  // Watch client ID from form for updates
  const watchedClientId = form.watch("session.clientId");
  useEffect(() => {
    if (watchedClientId && watchedClientId !== clientId) {
      setClientId(watchedClientId);
    }
  }, [watchedClientId, clientId]);
  
  // Available products calculation
  const availableProducts = useMemo(() => {
    if (!budgetItems || !budgetSettings) return [];
    
    // Calculate used quantities for each product
    return budgetItems
      .filter((item: BudgetItem) => {
        return item.budgetSettingsId === budgetSettings.id;
      })
      .map((item: BudgetItem) => ({
        ...item,
        availableQuantity: item.quantity || 0
      }));
  }, [budgetItems, budgetSettings]);
  
  // Process client/allies selection
  const handleAllySelection = (ally: Ally) => {
    const currentAllies = form.getValues("sessionNote.presentAllies") || [];
    const currentAllyIds = form.getValues("sessionNote.presentAllyIds") || [];
    
    // Check if already selected
    const nameIndex = currentAllies.indexOf(ally.name || "");
    const idIndex = currentAllyIds.indexOf(ally.id);
    
    if (nameIndex >= 0) {
      // Remove if already selected
      const newAllies = [...currentAllies];
      newAllies.splice(nameIndex, 1);
      
      const newAllyIds = [...currentAllyIds];
      newAllyIds.splice(idIndex, 1);
      
      form.setValue("sessionNote.presentAllies", newAllies);
      form.setValue("sessionNote.presentAllyIds", newAllyIds);
    } else {
      // Add if not selected
      form.setValue("sessionNote.presentAllies", [...currentAllies, ally.name || ""]);
      form.setValue("sessionNote.presentAllyIds", [...currentAllyIds, ally.id]);
    }
  };
  
  // Handle add attendee button
  const handleAddAttendeeFullScreen = () => {
    setAllySelectionOpen(true);
  };
  
  const handleAddAttendeeDialogMode = () => {
    setAllySelectionOpen(true);
  };
  
  // Process goal selection
  const handleGoalSelection = (goal: Goal) => {
    const currentAssessments = form.getValues("performanceAssessments") || [];
    
    // Add new goal assessment
    form.setValue("performanceAssessments", [
      ...currentAssessments,
      {
        goalId: goal.id,
        goalTitle: goal.title,
        notes: "",
        milestones: []
      }
    ]);
    
    // Set to new goal index
    setCurrentGoalIndex(currentAssessments.length);
    setActiveTab("performance");
  };
  
  // Process milestone selection
  const handleMilestoneSelection = (subgoal: Subgoal) => {
    if (currentGoalIndex === null) return;
    
    const currentAssessments = form.getValues("performanceAssessments");
    const currentMilestones = currentAssessments[currentGoalIndex]?.milestones || [];
    
    // Create path to update the milestones array
    const milestonesPath = `performanceAssessments.${currentGoalIndex}.milestones`;
    
    // Add new milestone
    form.setValue(milestonesPath, [
      ...currentMilestones,
      {
        milestoneId: subgoal.id,
        milestoneTitle: subgoal.title,
        rating: 5,
        strategies: [],
        notes: ""
      }
    ]);
    
    // Set to newly added milestone
    setCurrentMilestoneIndex(currentMilestones.length);
  };
  
  // Process strategy selection
  const handleStrategySelection = (strategy: Strategy) => {
    if (currentGoalIndex === null || currentMilestoneIndex === null) return;
    
    const path = `performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.strategies`;
    const currentStrategies = form.getValues(path) || [];
    
    // Toggle strategy
    const strategyId = strategy.id.toString();
    const index = currentStrategies.indexOf(strategyId);
    
    if (index >= 0) {
      // Remove if already selected
      const newStrategies = [...currentStrategies];
      newStrategies.splice(index, 1);
      form.setValue(path, newStrategies);
    } else {
      // Add if not selected (up to maximum)
      if (currentStrategies.length >= 5) {
        toast({
          title: "Maximum Strategies Reached",
          description: "You can select up to 5 strategies per milestone.",
          variant: "destructive"
        });
        return;
      }
      form.setValue(path, [...currentStrategies, strategyId]);
    }
  };
  
  // Process product selection
  const handleProductSelection = (product: BudgetItem & { availableQuantity: number }, quantity: number) => {
    const currentProducts = form.getValues("sessionNote.products") || [];
    
    // Add product to form with quantity
    form.setValue("sessionNote.products", [
      ...currentProducts,
      {
        budgetItemId: product.id,
        productCode: product.itemCode || "",
        productDescription: product.name || "",
        quantity: quantity,
        unitPrice: product.unitPrice,
        availableQuantity: product.availableQuantity
      }
    ]);
  };
  
  // Create session from form data
  const createSessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      // First create the session
      const sessionPayload = {
        ...data.session,
        status: "scheduled" // Use same status name as backend expects
      };
      
      const createdSession = await apiRequest("POST", "/api/sessions", sessionPayload);
      
      if (!createdSession || !createdSession.id) {
        throw new Error("Failed to create session");
      }
      
      // Then create session note
      const notePayload = {
        ...data.sessionNote,
        sessionId: createdSession.id
      };
      
      const createdNote = await apiRequest("POST", "/api/sessions/notes", notePayload);
      
      if (!createdNote || !createdNote.id) {
        throw new Error("Failed to create session note");
      }
      
      // Create performance assessments if any
      if (data.performanceAssessments && data.performanceAssessments.length > 0) {
        const assessmentsPayload = data.performanceAssessments.map(assessment => ({
          ...assessment,
          sessionNoteId: createdNote.id
        }));
        
        // Create all assessments
        for (const assessment of assessmentsPayload) {
          await apiRequest("POST", "/api/sessions/notes/performance-assessments", assessment);
        }
      }
      
      return { session: createdSession, note: createdNote };
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "sessions"] });
      
      toast({
        title: "Session created",
        description: "The session and notes have been saved successfully."
      });
      
      // Close modal in dialog mode
      if (!isFullScreen) {
        onOpenChange(false);
      }
    },
    onError: (error) => {
      console.error("Error creating session:", error);
      toast({
        title: "Error creating session",
        description: "There was a problem creating the session. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  function onSubmit(data: IntegratedSessionFormValues) {
    // Validate before submitting
    if (!data.session.clientId) {
      toast({
        title: "Client required",
        description: "Please select a client for this session",
        variant: "destructive"
      });
      return;
    }
    
    if (!data.session.location) {
      toast({
        title: "Location required",
        description: "Please specify a location for this session",
        variant: "destructive"
      });
      return;
    }
    
    // Create session
    createSessionMutation.mutate(data);
  }
  
  // Tab navigation
  const goToNextTab = () => {
    if (activeTab === "details") setActiveTab("performance");
  };
  
  const goToPreviousTab = () => {
    if (activeTab === "performance") setActiveTab("details");
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
                  {/* Session Information Card */}
                  <Card className="shadow-sm border-2 border-primary/20 overflow-hidden flex flex-col">
                    <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-primary" />
                        Session Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      {/* Client, Location, Date & Time in a single row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                        {/* Client Selection */}
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
                                  
                                  // Reset assessments when client changes
                                  form.setValue("performanceAssessments", []);
                                  form.setValue("sessionNote.products", []);
                                  
                                  // Refetch data for new client
                                  if (refetchBudgetItems && refetchBudgetSettings) {
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

                        {/* Location */}
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

                        {/* Session Date */}
                        <FormField
                          control={form.control}
                          name="session.sessionDate"
                          render={({ field }) => {
                            const [isCalendarOpen, setIsCalendarOpen] = useState(false);
                            
                            useEffect(() => {
                              hideUnwantedCalendars();
                              
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
                                        onClick={() => setIsCalendarOpen(true)}
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
                                      {isCalendarOpen && (
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={(date) => {
                                            if (date) {
                                              const existingDate = field.value || new Date();
                                              date.setHours(existingDate.getHours());
                                              date.setMinutes(existingDate.getMinutes());
                                              field.onChange(date);
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
                      <Card className="shadow-sm border-2 border-primary/20 overflow-hidden h-full flex flex-col">
                        <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              <UserCheck className="h-5 w-5 inline-block mr-2" />
                              Present
                            </CardTitle>

                            {/* Add New Attendee Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!clientId || clientId === 0}
                              onClick={handleAddAttendeeFullScreen}
                            >
                              New Attendee
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-4">
                          {/* Ally List */}
                          {form.watch("sessionNote.presentAllies")?.length ? (
                            <div className="space-y-2">
                              {form.watch("sessionNote.presentAllies").map((allyName: string, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex items-center">
                                    <span className="text-sm">{allyName}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newAllies = [...form.getValues("sessionNote.presentAllies")];
                                      const newAllyIds = [...form.getValues("sessionNote.presentAllyIds")];
                                      newAllies.splice(idx, 1);
                                      newAllyIds.splice(idx, 1);
                                      form.setValue("sessionNote.presentAllies", newAllies);
                                      form.setValue("sessionNote.presentAllyIds", newAllyIds);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                              <p className="text-sm">No attendees added yet</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    }
                    middleColumn={
                      <Card className="shadow-sm border-2 border-primary/20 overflow-hidden h-full flex flex-col">
                        <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              <Package className="h-5 w-5 inline-block mr-2" />
                              Products Used
                            </CardTitle>

                            {/* Add Product Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!clientId || clientId === 0 || !form.watch("sessionNote.presentAllies")?.length}
                              onClick={() => setProductSelectionOpen(true)}
                            >
                              Add Product
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-4">
                          {/* Products List */}
                          {form.watch("sessionNote.products")?.length ? (
                            <div className="space-y-2">
                              {form.watch("sessionNote.products").map((product: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="overflow-hidden">
                                    <div className="text-sm font-medium truncate">{product.productDescription}</div>
                                    <div className="flex text-xs text-muted-foreground">
                                      <span className="mr-2">{product.productCode}</span>
                                      <span>
                                        {product.quantity} × ${product.unitPrice.toFixed(2)} = ${(product.quantity * product.unitPrice).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newProducts = [...form.getValues("sessionNote.products")];
                                      newProducts.splice(idx, 1);
                                      form.setValue("sessionNote.products", newProducts);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                              <p className="text-sm">No products added yet</p>
                              {!form.watch("sessionNote.presentAllies")?.length && (
                                <p className="text-xs mt-1">Add an attendee first</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    }
                    rightColumn={
                      <Card className="shadow-sm border-2 border-primary/20 overflow-hidden h-full flex flex-col">
                        <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                          <CardTitle className="text-base">Session Observations</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-4 overflow-y-auto">
                          <div className="space-y-6">
                            {/* Mood Rating */}
                            <FormField
                              control={form.control}
                              name="sessionNote.moodRating"
                              render={({ field }) => (
                                <FormItem>
                                  <RatingSlider
                                    label="Mood"
                                    value={field.value}
                                    onChange={field.onChange}
                                    description="Rate client's overall mood during the session"
                                  />
                                </FormItem>
                              )}
                            />

                            {/* Focus Rating */}
                            <FormField
                              control={form.control}
                              name="sessionNote.focusRating"
                              render={({ field }) => (
                                <FormItem>
                                  <RatingSlider
                                    label="Focus"
                                    value={field.value}
                                    onChange={field.onChange}
                                    description="Rate client's ability to focus during the session"
                                  />
                                </FormItem>
                              )}
                            />

                            {/* Cooperation Rating */}
                            <FormField
                              control={form.control}
                              name="sessionNote.cooperationRating"
                              render={({ field }) => (
                                <FormItem>
                                  <RatingSlider
                                    label="Cooperation"
                                    value={field.value}
                                    onChange={field.onChange}
                                    description="Rate client's overall cooperation"
                                  />
                                </FormItem>
                              )}
                            />

                            {/* Physical Activity Rating */}
                            <FormField
                              control={form.control}
                              name="sessionNote.physicalActivityRating"
                              render={({ field }) => (
                                <FormItem>
                                  <RatingSlider
                                    label="Physical Activity"
                                    value={field.value}
                                    onChange={field.onChange}
                                    description="Rate client's physical activity level"
                                  />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    }
                  />
                  
                  {/* Notes */}
                  <Card className="shadow-sm border-2 border-primary/20 overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                      <CardTitle className="text-base">Additional Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <FormField
                        control={form.control}
                        name="sessionNote.notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Add any additional observations or notes about this session..."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Performance Assessment Tab */}
                <TabsContent value="performance" className="space-y-6 mt-0 px-4 h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Performance Assessment</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGoalSelectionOpen(true)}
                      disabled={!clientId || clientId === 0}
                    >
                      Add Goal Assessment
                    </Button>
                  </div>

                  {/* Assessments Section */}
                  <div className="space-y-6">
                    {form.watch("performanceAssessments")?.length ? (
                      form.watch("performanceAssessments").map((assessment: any, goalIndex: number) => (
                        <Card key={goalIndex} className="shadow-sm overflow-hidden border-2 border-primary/20">
                          <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">{assessment.goalTitle}</CardTitle>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentGoalIndex(goalIndex);
                                  setMilestoneSelectionOpen(true);
                                }}
                              >
                                Add Milestone
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            {assessment.milestones?.length ? (
                              <div className="space-y-4">
                                {assessment.milestones.map((milestone: any, milestoneIndex: number) => (
                                  <div key={milestoneIndex} className="border rounded-md p-3 space-y-3">
                                    <div className="flex justify-between items-center">
                                      <h4 className="font-medium">{milestone.milestoneTitle}</h4>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setCurrentGoalIndex(goalIndex);
                                          setCurrentMilestoneIndex(milestoneIndex);
                                          setStrategySelectionOpen(true);
                                        }}
                                      >
                                        {milestone.strategies?.length ? "Edit Strategies" : "Add Strategies"}
                                      </Button>
                                    </div>

                                    {/* Milestone Rating */}
                                    <FormField
                                      control={form.control}
                                      name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <RatingSlider
                                            label="Performance Rating"
                                            value={field.value || 5}
                                            onChange={field.onChange}
                                          />
                                        </FormItem>
                                      )}
                                    />

                                    {/* Milestone Notes */}
                                    <FormField
                                      control={form.control}
                                      name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.notes`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Add notes about this milestone..."
                                              className="min-h-[80px]"
                                              {...field}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />

                                    {/* Strategies List */}
                                    {milestone.strategies?.length > 0 && (
                                      <div>
                                        <Label className="mb-2 block">Selected Strategies:</Label>
                                        <div className="flex flex-wrap gap-2">
                                          {milestone.strategies.map((strategyId: string) => {
                                            const strategy = strategies.find(s => s.id.toString() === strategyId);
                                            return (
                                              <Badge key={strategyId} variant="outline" className="bg-primary/5 border-primary/20">
                                                {strategy?.name || `Strategy ${strategyId}`}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-muted-foreground">
                                <p>No milestones added yet. Click "Add Milestone" to assess specific milestones for this goal.</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground border rounded-md">
                        <p className="mb-2">No performance assessments added yet</p>
                        <p className="text-sm">Click "Add Goal Assessment" to start evaluating progress</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>

              {/* Form actions */}
              <div className="flex justify-between pt-4 border-t mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={goToPreviousTab}
                  disabled={activeTab === "details"}
                >
                  Previous
                </Button>
                
                {activeTab === "details" ? (
                  <Button 
                    type="button" 
                    onClick={goToNextTab}
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="submit"
                    disabled={createSessionMutation.isPending}
                  >
                    {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </Tabs>

        {/* Dialogs for fullscreen mode */}
        <GoalSelectionDialog
          open={goalSelectionOpen}
          onOpenChange={setGoalSelectionOpen}
          goals={goals}
          selectedGoalIds={form.watch("performanceAssessments")?.map((a: any) => a.goalId) || []}
          onSelectGoal={handleGoalSelection}
        />
        
        <MilestoneSelectionDialog
          open={milestoneSelectionOpen}
          onOpenChange={setMilestoneSelectionOpen}
          subgoals={currentGoalIndex !== null ? 
            (subgoalsMap[form.watch(`performanceAssessments.${currentGoalIndex}.goalId`)] || []) : 
            []
          }
          selectedMilestoneIds={
            currentGoalIndex !== null ? 
            (form.watch(`performanceAssessments.${currentGoalIndex}.milestones`) || [])
              .map((m: any) => m.milestoneId) : 
            []
          }
          onSelectMilestone={handleMilestoneSelection}
        />
        
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
        
        <AllySelectionDialog
          open={allySelectionOpen}
          onOpenChange={setAllySelectionOpen}
          allies={allies
            .slice(0, 10)
            .map(ally => ({
              id: ally.id,
              name: ally.name,
              relationship: ally.relationship,
              clientId: ally.clientId,
              preferredLanguage: ally.preferredLanguage || 'English',
              email: ally.email || `${ally.name?.toLowerCase() || 'info'}@example.com`,
              phone: ally.phone || null,
              notes: ally.notes || null,
              accessTherapeutics: ally.accessTherapeutics || false,
              accessFinancials: ally.accessFinancials || false,
              archived: ally.archived || false
            }))
          }
          selectedAllies={form.watch("sessionNote.presentAllies") || []}
          onSelectAlly={handleAllySelection}
        />
        
        <ProductSelectionDialog
          open={productSelectionOpen}
          onOpenChange={setProductSelectionOpen}
          products={availableProducts}
          onSelectProduct={handleProductSelection}
        />
      </div>
    );
  }

  // Return as dialog for regular usage
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <div className="p-6 border-b flex justify-between items-center">
          <DialogTitle className="text-xl font-semibold">
            {createSessionMutation.isPending ? "Creating Session..." : "Create New Session"}
          </DialogTitle>
          <Button variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden px-6 py-4">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="details">Session Details & Observations</TabsTrigger>
            <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
              <div className="flex-grow overflow-auto pr-2">
                {/* Reuse the same tab content from the full-screen version */}
                <TabsContent value="details" className="space-y-6 mt-0">
                  {/* Session Information Card */}
                  <Card className="shadow-sm border-2 border-primary/20 overflow-hidden flex flex-col">
                    <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-primary" />
                        Session Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow p-4">
                      {/* Client, Location, Date selections - same as fullscreen */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Client Selection */}
                        <FormField
                          control={form.control}
                          name="session.clientId"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Client</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(parseInt(value));
                                }}
                                value={field.value?.toString() || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select client" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {clients.map((client) => (
                                    <SelectItem 
                                      key={client.id} 
                                      value={client.id.toString()}
                                    >
                                      {client.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Location - simplified */}
                        <FormField
                          control={form.control}
                          name="session.location"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Location</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
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
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Date & Time - simplified */}
                        <FormField
                          control={form.control}
                          name="session.sessionDate"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Date & Time</FormLabel>
                              <div className="flex gap-2">
                                <Input
                                  type="date"
                                  className="flex-1"
                                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                  onChange={(e) => {
                                    const date = new Date(field.value || new Date());
                                    const [year, month, day] = e.target.value.split("-").map(Number);
                                    date.setFullYear(year, month - 1, day);
                                    field.onChange(date);
                                  }}
                                />
                                <Input
                                  type="time"
                                  className="w-24"
                                  value={field.value ? format(field.value, "HH:mm") : ""}
                                  onChange={(e) => {
                                    const date = new Date(field.value || new Date());
                                    const [hours, minutes] = e.target.value.split(":").map(Number);
                                    date.setHours(hours, minutes);
                                    field.onChange(date);
                                  }}
                                />
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Simplified ratings in modal view */}
                  <Card className="shadow-sm border-2 border-primary/20 overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
                      <CardTitle className="text-base">Session Observations</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Mood Rating */}
                        <FormField
                          control={form.control}
                          name="sessionNote.moodRating"
                          render={({ field }) => (
                            <FormItem>
                              <RatingSlider
                                label="Mood"
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />

                        {/* Focus Rating */}
                        <FormField
                          control={form.control}
                          name="sessionNote.focusRating"
                          render={({ field }) => (
                            <FormItem>
                              <RatingSlider
                                label="Focus"
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />

                        {/* Cooperation Rating */}
                        <FormField
                          control={form.control}
                          name="sessionNote.cooperationRating"
                          render={({ field }) => (
                            <FormItem>
                              <RatingSlider
                                label="Cooperation"
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />

                        {/* Physical Activity Rating */}
                        <FormField
                          control={form.control}
                          name="sessionNote.physicalActivityRating"
                          render={({ field }) => (
                            <FormItem>
                              <RatingSlider
                                label="Physical Activity"
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Performance assessment tab - simplified in dialog mode */}
                <TabsContent value="performance" className="space-y-6 mt-0">
                  <div className="text-center py-12 text-muted-foreground border rounded-md">
                    <p className="mb-2">Performance assessments are available in full-screen mode</p>
                    <p className="text-sm">Please use the full-screen version to add detailed assessments</p>
                  </div>
                </TabsContent>
              </div>

              {/* Form actions */}
              <div className="flex justify-between pt-4 border-t mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
        
        {/* Dialogs for dialog mode */}
        <AllySelectionDialog
          open={allySelectionOpen}
          onOpenChange={setAllySelectionOpen}
          allies={allies.slice(0, 10).map(ally => ({...ally}))}
          selectedAllies={form.watch("sessionNote.presentAllies") || []}
          onSelectAlly={handleAllySelection}
        />
        
        <ProductSelectionDialog
          open={productSelectionOpen}
          onOpenChange={setProductSelectionOpen}
          products={availableProducts}
          onSelectProduct={handleProductSelection}
        />
      </DialogContent>
    </Dialog>
  );
}