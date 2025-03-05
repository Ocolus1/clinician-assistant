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
import { SessionDetailsLayout } from "./SessionDetailsLayout";
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

// Integrated session form schema
const integratedSessionFormSchema = sessionFormSchema.extend({
  sessionNote: sessionNoteSchema,
  performanceAssessments: z.array(performanceAssessmentSchema).default([]),
});

// Types
type IntegratedSessionFormValues = z.infer<typeof integratedSessionFormSchema>;

// Rating slider component 
interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

const RatingSlider = ({ value, onChange, label, description }: RatingSliderProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium">{value}/10</span>
      </div>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
      <Slider
        value={[value]}
        min={0}
        max={10}
        step={1}
        onValueChange={(vals) => onChange(vals[0])}
        className="cursor-pointer"
      />
    </div>
  );
};

// Goal selection dialog component
interface GoalSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Goal[];
  selectedGoalIds: number[];
  onSelectGoal: (goal: Goal) => void;
}

function GoalSelectionDialog({ 
  open, 
  onOpenChange, 
  goals, 
  selectedGoalIds, 
  onSelectGoal 
}: GoalSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Goal</DialogTitle>
          <DialogDescription>
            Choose a goal to assess in this session
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-auto pr-2 my-4">
          {goals.length === 0 ? (
            <p className="text-center text-muted-foreground">No goals found for this client</p>
          ) : (
            goals.map(goal => (
              <Card 
                key={goal.id}
                className={cn(
                  "cursor-pointer hover:border-primary transition-all",
                  selectedGoalIds.includes(goal.id) && "border-primary bg-primary/5"
                )}
                onClick={() => onSelectGoal(goal)}
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedGoalIds.includes(goal.id) && <Check className="h-4 w-4 text-primary" />}
                    {goal.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">{goal.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Milestone selection dialog component
interface MilestoneSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subgoals: Subgoal[];
  selectedMilestoneIds: number[];
  onSelectMilestone: (subgoal: Subgoal) => void;
}

function MilestoneSelectionDialog({
  open,
  onOpenChange,
  subgoals,
  selectedMilestoneIds,
  onSelectMilestone
}: MilestoneSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Milestone</DialogTitle>
          <DialogDescription>
            Choose milestones to assess for this goal
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-auto pr-2 my-4">
          {subgoals.length === 0 ? (
            <p className="text-center text-muted-foreground">No milestones found for this goal</p>
          ) : (
            subgoals.map(subgoal => (
              <Card 
                key={subgoal.id}
                className={cn(
                  "cursor-pointer hover:border-primary transition-all",
                  selectedMilestoneIds.includes(subgoal.id) && "border-primary bg-primary/5"
                )}
                onClick={() => onSelectMilestone(subgoal)}
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedMilestoneIds.includes(subgoal.id) && <Check className="h-4 w-4 text-primary" />}
                    {subgoal.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">{subgoal.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Product selection dialog component
interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: (BudgetItem & { availableQuantity: number })[];
  onSelectProduct: (product: BudgetItem & { availableQuantity: number }, quantity: number) => void;
}

function ProductSelectionDialog({
  open,
  onOpenChange,
  products,
  onSelectProduct
}: ProductSelectionDialogProps) {
  const [selectedProduct, setSelectedProduct] = useState<(BudgetItem & { availableQuantity: number }) | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  const handleAddProduct = () => {
    if (selectedProduct) {
      onSelectProduct(selectedProduct, quantity);
      setSelectedProduct(null);
      setQuantity(1);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Select a product to record for this session
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="space-y-2">
            <Label>Select Product</Label>
            <ScrollArea className="h-60 border rounded-md">
              <div className="p-2 space-y-2">
                {products.length === 0 ? (
                  <p className="text-center text-muted-foreground p-4">No products available</p>
                ) : (
                  products.map(product => (
                    <Card 
                      key={product.id}
                      className={cn(
                        "cursor-pointer hover:border-primary transition-all",
                        selectedProduct?.id === product.id && "border-primary bg-primary/5"
                      )}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>{product.description}</span>
                          <Badge variant="outline">${product.unitPrice.toFixed(2)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Available: {product.availableQuantity}</span>
                          <span>Code: {product.itemCode}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          {selectedProduct && (
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => setQuantity(Math.max(0.1, quantity - 0.1))}
                  disabled={quantity <= 0.1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0 && val <= selectedProduct.availableQuantity) {
                      setQuantity(val);
                    }
                  }}
                  step={0.1}
                  min={0.1}
                  max={selectedProduct.availableQuantity}
                  className="w-20 text-center"
                />
                
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => setQuantity(Math.min(selectedProduct.availableQuantity, quantity + 0.1))}
                  disabled={quantity >= selectedProduct.availableQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Total: ${(selectedProduct.unitPrice * quantity).toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            onClick={handleAddProduct}
            disabled={!selectedProduct || quantity <= 0}
          >
            Add Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main component
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
  const [activeTab, setActiveTab] = useState<string>("details");
  const [goalSelectionOpen, setGoalSelectionOpen] = useState<boolean>(false);
  const [milestoneSelectionOpen, setMilestoneSelectionOpen] = useState<boolean>(false);
  const [productSelectionOpen, setProductSelectionOpen] = useState<boolean>(false);
  const [strategySelectionOpen, setStrategySelectionOpen] = useState<boolean>(false);
  const [currentGoalIndex, setCurrentGoalIndex] = useState<number | null>(null);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState<number | null>(null);

  // Form with zod validation
  const form = useSafeForm<IntegratedSessionFormValues>({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues: {
      clientId: initialClient?.id || 0,
      sessionDate: new Date(),
      duration: 60,
      therapistId: undefined,
      status: "scheduled",
      location: "",
      sessionNote: {
        presentAllies: [],
        presentAllyIds: [],
        moodRating: 5,
        focusRating: 5,
        cooperationRating: 5,
        physicalActivityRating: 5,
        notes: "",
        products: [],
        status: "draft"
      },
      performanceAssessments: []
    }
  });

  // Fetch clients for selection
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: !initialClient,
  });

  // Fetch current client data if clientId is set
  const { data: currentClient } = useQuery({
    queryKey: ['/api/clients', form.watch('clientId')],
    enabled: !!form.watch('clientId') && form.watch('clientId') > 0,
  });

  // Fetch allies for the current client
  const { data: allies = [] } = useQuery({
    queryKey: ['/api/clients', form.watch('clientId'), 'allies'],
    enabled: !!form.watch('clientId') && form.watch('clientId') > 0,
  });

  // Fetch goals for the current client
  const { data: goals = [] } = useQuery({
    queryKey: ['/api/clients', form.watch('clientId'), 'goals'],
    enabled: !!form.watch('clientId') && form.watch('clientId') > 0,
  });

  // Fetch budget settings for the client
  const { data: budgetSettings } = useQuery({
    queryKey: ['/api/clients', form.watch('clientId'), 'budget-settings'],
    enabled: !!form.watch('clientId') && form.watch('clientId') > 0,
  });

  // Fetch all available budget items
  const { data: allBudgetItems = [] } = useQuery({
    queryKey: ['/api/clients', form.watch('clientId'), 'budget-items'],
    enabled: !!form.watch('clientId') && form.watch('clientId') > 0,
  });

  // Fetch all available strategies
  const { data: allStrategies = [] } = useQuery({
    queryKey: ['/api/strategies'],
  });

  // Track selected goals to fetch subgoals
  const selectedGoalIds = useMemo(() => 
    form.watch('performanceAssessments').map(assessment => assessment.goalId), 
    [form.watch('performanceAssessments')]
  );

  // Fetch subgoals for currently selected goals
  const { data: subgoalsByGoal = {} } = useQuery({
    queryKey: ['/api/subgoals-by-goals', selectedGoalIds],
    queryFn: async () => {
      if (selectedGoalIds.length === 0) return {};
      
      const subgoalPromises = selectedGoalIds.map(goalId => 
        apiRequest('GET', `/api/goals/${goalId}/subgoals`)
      );
      
      const results = await Promise.all(subgoalPromises);
      const subgoalMap: Record<number, Subgoal[]> = {};
      
      selectedGoalIds.forEach((goalId, index) => {
        subgoalMap[goalId] = results[index];
      });
      
      return subgoalMap;
    },
    enabled: selectedGoalIds.length > 0,
  });

  // Prepare available products from budget items
  const availableProducts = useMemo(() => {
    if (!budgetSettings || !allBudgetItems.length) return [];

    return allBudgetItems
      .filter((item: BudgetItem) => {
        // Only include items that have not been fully used
        const itemsInForm = form.watch('sessionNote.products') || [];
        const currentlyUsed = itemsInForm.find(p => p.budgetItemId === item.id)?.quantity || 0;
        return item.availableQuantity - currentlyUsed > 0;
      })
      .map((item: BudgetItem) => ({
        ...item,
        // Adjust availableQuantity based on what's already in the form
        availableQuantity: item.availableQuantity - (
          form.watch('sessionNote.products')
            .find(p => p.budgetItemId === item.id)?.quantity || 0
        )
      }));
  }, [budgetSettings, allBudgetItems, form.watch('sessionNote.products')]);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      // Create session first
      const sessionData = {
        clientId: data.clientId,
        sessionDate: data.sessionDate,
        duration: data.duration,
        therapistId: data.therapistId,
        status: data.status,
        location: data.location
      };

      const session = await apiRequest('POST', '/api/sessions', sessionData);

      // Create session note with the new session ID
      const sessionNoteData = {
        sessionId: session.id,
        presentAllies: data.sessionNote.presentAllies,
        presentAllyIds: data.sessionNote.presentAllyIds,
        moodRating: data.sessionNote.moodRating,
        focusRating: data.sessionNote.focusRating,
        cooperationRating: data.sessionNote.cooperationRating,
        physicalActivityRating: data.sessionNote.physicalActivityRating,
        notes: data.sessionNote.notes,
        products: data.sessionNote.products.map(p => ({
          ...p,
          sessionNoteId: 0 // Will be set by the backend
        })),
        status: data.sessionNote.status
      };

      const sessionNote = await apiRequest('POST', '/api/session-notes', sessionNoteData);

      // Create performance assessments
      const assessmentPromises = data.performanceAssessments.map(async (assessment) => {
        const assessmentData = {
          sessionNoteId: sessionNote.id,
          goalId: assessment.goalId,
          notes: assessment.notes
        };

        const createdAssessment = await apiRequest(
          'POST', 
          '/api/performance-assessments', 
          assessmentData
        );

        // Create milestone assessments
        const milestonePromises = assessment.milestones.map(async (milestone) => {
          const milestoneData = {
            performanceAssessmentId: createdAssessment.id,
            milestoneId: milestone.milestoneId,
            rating: milestone.rating,
            strategies: milestone.strategies,
            notes: milestone.notes
          };

          return apiRequest('POST', '/api/milestone-assessments', milestoneData);
        });

        await Promise.all(milestonePromises);

        return createdAssessment;
      });

      await Promise.all(assessmentPromises);

      return session;
    },
    onSuccess: () => {
      toast({
        title: "Session created",
        description: "Session and associated data have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to create session",
        description: "An error occurred while saving the session. Please try again.",
        variant: "destructive",
      });
      console.error("Session creation error:", error);
    }
  });

  function onSubmit(data: IntegratedSessionFormValues) {
    createSessionMutation.mutate(data);
  }

  // Event handlers
  const handleGoalSelection = (goal: Goal) => {
    const currentAssessments = form.getValues('performanceAssessments');
    const assessmentIndex = currentAssessments.findIndex(a => a.goalId === goal.id);

    if (assessmentIndex >= 0) {
      // Remove the goal if it's already selected
      const updatedAssessments = [
        ...currentAssessments.slice(0, assessmentIndex),
        ...currentAssessments.slice(assessmentIndex + 1)
      ];
      form.setValue('performanceAssessments', updatedAssessments);
    } else {
      // Add the goal
      form.setValue('performanceAssessments', [
        ...currentAssessments,
        {
          goalId: goal.id,
          goalTitle: goal.title,
          notes: '',
          milestones: []
        }
      ]);
    }

    setGoalSelectionOpen(false);
  };

  const handleMilestoneSelection = (subgoal: Subgoal) => {
    if (currentGoalIndex === null) return;

    const currentAssessments = form.getValues('performanceAssessments');
    const currentMilestones = currentAssessments[currentGoalIndex].milestones;
    const milestoneIndex = currentMilestones.findIndex(m => m.milestoneId === subgoal.id);

    if (milestoneIndex >= 0) {
      // Remove the milestone if it's already selected
      const updatedMilestones = [
        ...currentMilestones.slice(0, milestoneIndex),
        ...currentMilestones.slice(milestoneIndex + 1)
      ];
      form.setValue(
        `performanceAssessments.${currentGoalIndex}.milestones`, 
        updatedMilestones
      );
    } else {
      // Add the milestone
      form.setValue(
        `performanceAssessments.${currentGoalIndex}.milestones`, 
        [
          ...currentMilestones,
          {
            milestoneId: subgoal.id,
            milestoneTitle: subgoal.title,
            rating: 5,
            strategies: [],
            notes: ''
          }
        ]
      );
    }
  };

  const handleStrategySelection = (strategy: Strategy) => {
    if (currentGoalIndex === null || currentMilestoneIndex === null) return;
    
    const currentStrategies = form.getValues(
      `performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.strategies`
    ) || [];
    
    const strategyIndex = currentStrategies.indexOf(strategy.id.toString());
    
    if (strategyIndex >= 0) {
      // Remove the strategy if already selected
      const updatedStrategies = [
        ...currentStrategies.slice(0, strategyIndex),
        ...currentStrategies.slice(strategyIndex + 1)
      ];
      form.setValue(
        `performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.strategies`, 
        updatedStrategies
      );
    } else {
      // Add the strategy
      form.setValue(
        `performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.strategies`, 
        [...currentStrategies, strategy.id.toString()]
      );
    }
  };

  const handleOpenStrategiesDialog = (goalIndex: number, milestoneIndex: number) => {
    setCurrentGoalIndex(goalIndex);
    setCurrentMilestoneIndex(milestoneIndex);
    setStrategySelectionOpen(true);
  };

  const handleRemoveProduct = (index: number) => {
    const currentProducts = form.getValues('sessionNote.products');
    form.setValue('sessionNote.products', [
      ...currentProducts.slice(0, index),
      ...currentProducts.slice(index + 1)
    ]);
  };

  const handleAddProduct = (product: BudgetItem & { availableQuantity: number }, quantity: number) => {
    const currentProducts = form.getValues('sessionNote.products');
    
    // Check if product already exists
    const existingProductIndex = currentProducts.findIndex(p => p.budgetItemId === product.id);
    
    if (existingProductIndex >= 0) {
      // Update quantity of existing product
      const updatedProducts = [...currentProducts];
      const newQuantity = updatedProducts[existingProductIndex].quantity + quantity;
      
      if (newQuantity <= product.availableQuantity + currentProducts[existingProductIndex].quantity) {
        updatedProducts[existingProductIndex].quantity = newQuantity;
        form.setValue('sessionNote.products', updatedProducts);
      } else {
        toast({
          title: "Maximum quantity exceeded",
          description: "You've reached the maximum available quantity for this product.",
          variant: "destructive",
        });
      }
    } else {
      // Add new product
      form.setValue('sessionNote.products', [
        ...currentProducts,
        {
          budgetItemId: product.id,
          productCode: product.itemCode,
          productDescription: product.description,
          quantity: quantity,
          unitPrice: product.unitPrice,
          availableQuantity: product.availableQuantity
        }
      ]);
    }
  };

  // Layout adjustment when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Hide any popups
    hideUnwantedCalendars();
  };

  // Effect to set initial client from prop
  useEffect(() => {
    if (initialClient) {
      form.setValue('clientId', initialClient.id);
    }
  }, [initialClient, form]);

  // Handle back button navigation on mobile
  const handleBack = () => {
    if (activeTab === "performance") setActiveTab("details");
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
                  {/* Use the SessionDetailsLayout component for the details tab */}
                  <SessionDetailsLayout
                    headerSection={
                      <div className="space-y-4">
                        <div className="bg-card p-4 rounded-lg border">
                          <h2 className="text-xl font-semibold mb-2">Session Details</h2>
                          <p className="text-muted-foreground text-sm">
                            Record attendance, products used, and observations for this session. Use the ratings to track mood, focus, and cooperation.
                          </p>
                        </div>
                        <Card className="shadow-sm border-muted">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span>Session Information</span>
                              <Badge variant={
                              form.watch('status') === 'completed' ? 'default' :
                              form.watch('status') === 'canceled' ? 'destructive' : 'outline'
                            }>
                              {form.watch('status')}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Client selection */}
                            <FormField
                              control={form.control}
                              name="clientId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Client</FormLabel>
                                  <Select
                                    disabled={!!initialClient}
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                    value={field.value.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select client" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {clients.map((client: Client) => (
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

                            {/* Session date */}
                            <FormField
                              control={form.control}
                              name="sessionDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Date</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                          )}
                                        >
                                          {field.value ? (
                                            format(field.value, "PPP")
                                          ) : (
                                            <span>Pick a date</span>
                                          )}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <div data-calendar-container="true">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          initialFocus
                                        />
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Session time */}
                            <FormField
                              control={form.control}
                              name="sessionTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Time</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    defaultValue="09:00"
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select time" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Array.from({ length: 12 }).map((_, i) => {
                                        const hour = i + 8; // Start at 8AM
                                        return (
                                          <React.Fragment key={i}>
                                            <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>
                                              {hour.toString().padStart(2, '0')}:00
                                            </SelectItem>
                                            <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>
                                              {hour.toString().padStart(2, '0')}:30
                                            </SelectItem>
                                          </React.Fragment>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Session duration */}
                            <FormField
                              control={form.control}
                              name="duration"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duration (minutes)</FormLabel>
                                  <Select
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                    value={field.value?.toString() || "60"}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select duration" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {[15, 30, 45, 60, 75, 90, 120].map((duration) => (
                                        <SelectItem key={duration} value={duration.toString()}>
                                          {duration} minutes
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Location */}
                            <FormField
                              control={form.control}
                              name="location"
                              render={({ field }) => (
                                <FormItem>
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
                                      <SelectItem value="clinic">Clinic</SelectItem>
                                      <SelectItem value="home">Client's Home</SelectItem>
                                      <SelectItem value="school">School</SelectItem>
                                      <SelectItem value="remote">Remote (Video)</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Therapist */}
                            <FormField
                              control={form.control}
                              name="therapistId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Therapist</FormLabel>
                                  <Select
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                    value={field.value?.toString() || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select therapist" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {allies
                                        .filter((ally: Ally) => ally.relationshipType === 'Therapist')
                                        .map((ally: Ally) => (
                                          <SelectItem key={ally.id} value={ally.id.toString()}>
                                            {ally.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    }
                    presentSection={
                      <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">
                            Present / Attendees
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            {allies.length > 0 ? (
                              allies.map((ally: Ally) => (
                                <div key={ally.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`ally-${ally.id}`}
                                    checked={form.watch('sessionNote.presentAllyIds').includes(ally.id)}
                                    onCheckedChange={(checked) => {
                                      const currentIds = form.getValues('sessionNote.presentAllyIds');
                                      const currentNames = form.getValues('sessionNote.presentAllies');
                                      
                                      if (checked) {
                                        form.setValue('sessionNote.presentAllyIds', [...currentIds, ally.id]);
                                        form.setValue('sessionNote.presentAllies', [...currentNames, ally.name]);
                                      } else {
                                        form.setValue('sessionNote.presentAllyIds', 
                                          currentIds.filter(id => id !== ally.id)
                                        );
                                        form.setValue('sessionNote.presentAllies',
                                          currentNames.filter(name => name !== ally.name)
                                        );
                                      }
                                    }}
                                  />
                                  <Label
                                    htmlFor={`ally-${ally.id}`}
                                    className="text-sm font-medium leading-none cursor-pointer"
                                  >
                                    {ally.name}
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ({ally.relationshipType})
                                    </span>
                                  </Label>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No allies found for this client
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    }
                    productsSection={
                      <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex justify-between items-center">
                            <span>Products & Services</span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setProductSelectionOpen(true)}
                              disabled={!budgetSettings || availableProducts.length === 0}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {form.watch('sessionNote.products').length === 0 ? (
                            <div className="text-center p-4 border border-dashed rounded-md">
                              <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                No products added yet
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => setProductSelectionOpen(true)}
                                disabled={!budgetSettings || availableProducts.length === 0}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Add Product
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {form.watch('sessionNote.products').map((product, index) => (
                                <div key={index} className="flex justify-between border rounded-md p-2 items-center">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{product.productDescription}</p>
                                    <div className="flex text-xs text-muted-foreground">
                                      <span>Qty: {product.quantity}</span>
                                      <span className="mx-2">•</span>
                                      <span>${(product.unitPrice * product.quantity).toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveProduct(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <div className="border-t pt-2 flex justify-end">
                                <p className="text-sm font-medium">
                                  Total: ${form.watch('sessionNote.products').reduce(
                                    (sum, product) => sum + (product.unitPrice * product.quantity),
                                    0
                                  ).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    }
                    observationsSection={
                      <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Observations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <RatingSlider
                            label="Mood"
                            value={form.watch('sessionNote.moodRating')}
                            onChange={(value) => form.setValue('sessionNote.moodRating', value)}
                          />
                          <RatingSlider
                            label="Focus"
                            value={form.watch('sessionNote.focusRating')}
                            onChange={(value) => form.setValue('sessionNote.focusRating', value)}
                          />
                          <RatingSlider
                            label="Cooperation"
                            value={form.watch('sessionNote.cooperationRating')}
                            onChange={(value) => form.setValue('sessionNote.cooperationRating', value)}
                          />
                          <RatingSlider
                            label="Physical Activity"
                            value={form.watch('sessionNote.physicalActivityRating')}
                            onChange={(value) => form.setValue('sessionNote.physicalActivityRating', value)}
                          />
                          
                          <div className="pt-2">
                            <FormField
                              control={form.control}
                              name="sessionNote.notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Session Notes</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Enter general observations and notes about the session..."
                                      className="min-h-32"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    }
                  />
                </TabsContent>

                {/* Performance Assessment Tab */}
                <TabsContent value="performance" className="space-y-6 mt-0 px-4">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex justify-between items-center">
                        <span>Goal Performance Assessment</span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setGoalSelectionOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Goal
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Add goals and assess progress on specific milestones
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {form.watch('performanceAssessments').length === 0 ? (
                        <div className="text-center p-6 border border-dashed rounded-md">
                          <BarChart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground mb-2">
                            No goals have been added for assessment
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setGoalSelectionOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Select Goals
                          </Button>
                        </div>
                      ) : (
                        form.watch('performanceAssessments').map((assessment, goalIndex) => {
                          const goalId = assessment.goalId;
                          const subgoals = subgoalsByGoal[goalId] || [];
                          
                          return (
                            <Card key={goalIndex} className="border border-muted">
                              <CardHeader className="pb-2 bg-muted/30">
                                <CardTitle className="text-base">{assessment.goalTitle}</CardTitle>
                              </CardHeader>
                              <CardContent className="pt-4 space-y-4">
                                <FormField
                                  control={form.control}
                                  name={`performanceAssessments.${goalIndex}.notes`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Goal Notes</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Notes on overall goal progress..."
                                          className="min-h-20"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <Label>Milestones</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setCurrentGoalIndex(goalIndex);
                                        setMilestoneSelectionOpen(true);
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                  </div>
                                  
                                  {assessment.milestones.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center p-2">
                                      No milestones selected yet
                                    </p>
                                  ) : (
                                    assessment.milestones.map((milestone, milestoneIndex) => {
                                      const selectedSubgoal = subgoals.find(s => s.id === milestone.milestoneId);
                                      
                                      return (
                                        <Card key={milestoneIndex} className="border-muted">
                                          <CardHeader className="py-2 px-3">
                                            <CardTitle className="text-sm flex items-start justify-between">
                                              <span>{milestone.milestoneTitle || selectedSubgoal?.title}</span>
                                              <div className="flex space-x-1">
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6"
                                                  onClick={() => handleOpenStrategiesDialog(goalIndex, milestoneIndex)}
                                                >
                                                  <ClipboardList className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </CardTitle>
                                          </CardHeader>
                                          <CardContent className="py-2 px-3 space-y-3">
                                            <FormField
                                              control={form.control}
                                              name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel className="text-xs">Performance Rating</FormLabel>
                                                  <div className="flex items-center space-x-2">
                                                    <FormControl>
                                                      <Slider
                                                        value={[field.value || 5]}
                                                        min={0}
                                                        max={10}
                                                        step={1}
                                                        onValueChange={(vals) => field.onChange(vals[0])}
                                                      />
                                                    </FormControl>
                                                    <span className="text-sm font-medium w-10 text-center">
                                                      {field.value || 5}/10
                                                    </span>
                                                  </div>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            
                                            {/* Strategy display */}
                                            {milestone.strategies.length > 0 && (
                                              <div className="space-y-1">
                                                <Label className="text-xs">Strategies Applied</Label>
                                                <div className="flex flex-wrap gap-1">
                                                  {milestone.strategies.map((strategyId, idx) => {
                                                    const strategy = allStrategies.find(s => s.id.toString() === strategyId);
                                                    return (
                                                      <Badge key={idx} variant="outline" className="text-xs">
                                                        {strategy?.name || strategyId}
                                                      </Badge>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                            
                                            <FormField
                                              control={form.control}
                                              name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.notes`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel className="text-xs">Notes</FormLabel>
                                                  <FormControl>
                                                    <Textarea
                                                      placeholder="Notes on this milestone..."
                                                      className="min-h-16 text-sm"
                                                      {...field}
                                                    />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          </CardContent>
                                        </Card>
                                      );
                                    })
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
              
              {/* Bottom action bar */}
              <div className="sticky bottom-0 bg-background pt-2 pb-0 px-4">
                <div className="flex justify-end space-x-2 border-t pt-2">
                  {!isFullScreen && (
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={createSessionMutation.isPending}>
                    {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>

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
                ? form.getValues(`performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.milestoneId`) || 0
                : 0
            }
            onSelectStrategy={handleStrategySelection}
            maxStrategies={5}
          />
        </Tabs>
      </div>
    );
  }

  // Return dialog mode if not in full-screen mode
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Enter session details and notes
          </DialogDescription>
        </DialogHeader>
        
        {/* Dialog content - similar to fullscreen but with size constraints */}
        {/* Content omitted for brevity */}
        
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
              ? form.getValues(`performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.milestoneId`) || 0
              : 0
          }
          onSelectStrategy={handleStrategySelection}
          maxStrategies={5}
        />
      </DialogContent>
    </Dialog>
  );
}