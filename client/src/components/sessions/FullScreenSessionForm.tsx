import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon,
  Clock,
  Check,
  Plus,
  X,
  ChevronLeft,
  Minus,
  ShoppingCart,
  RefreshCw,
  User as UserIcon,
  MapPin as MapPinIcon,
  ClipboardList,
  UserCheck,
  Package,
  BarChart,
  ShoppingBag
} from "lucide-react";
import "./session-form.css";
import { ThreeColumnLayout } from "./ThreeColumnLayout";
import { Ally, BudgetItem, Client, Goal, Subgoal, Strategy, insertSessionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { StrategySelectionDialog } from "./StrategySelectionDialog";

// UI Components
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

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

// Goal selection dialog component
const GoalSelectionDialog = ({
  open,
  onOpenChange,
  goals,
  selectedGoalIds,
  onSelectGoal
}: GoalSelectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <CardHeader>
          <CardTitle className="text-xl">Select Goal to Assess</CardTitle>
          <CardDescription>
            Choose a goal to add a performance assessment for this session.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 px-1 py-2">
          {goals.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No goals available for assessment</p>
            </div>
          ) : (
            goals.filter(goal => !selectedGoalIds.includes(goal.id)).map(goal => (
              <Card 
                key={goal.id} 
                className={`cursor-pointer hover:bg-accent transition-colors`}
                onClick={() => {
                  onSelectGoal(goal);
                  onOpenChange(false);
                }}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium">{goal.title}</h4>
                  <p className="text-sm text-muted-foreground">{goal.description}</p>
                </CardContent>
              </Card>
            ))
          )}

          {goals.length > 0 && selectedGoalIds.length === goals.length && (
            <div className="text-center p-4">
              <p className="text-muted-foreground">All goals have been selected for assessment</p>
            </div>
          )}
        </div>
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

// Milestone selection dialog component
const MilestoneSelectionDialog = ({
  open,
  onOpenChange,
  subgoals,
  selectedMilestoneIds,
  onSelectMilestone
}: MilestoneSelectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <CardHeader>
          <CardTitle className="text-xl">Select Milestone to Assess</CardTitle>
          <CardDescription>
            Choose a milestone to add to your assessment.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 px-1 py-2">
          {subgoals.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No milestones available for assessment</p>
            </div>
          ) : (
            subgoals.filter(subgoal => !selectedMilestoneIds.includes(subgoal.id)).map(subgoal => (
              <Card 
                key={subgoal.id} 
                className={`cursor-pointer hover:bg-accent transition-colors`}
                onClick={() => {
                  onSelectMilestone(subgoal);
                  onOpenChange(false);
                }}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium">{subgoal.title}</h4>
                  <p className="text-sm text-muted-foreground">{subgoal.description}</p>
                </CardContent>
              </Card>
            ))
          )}

          {subgoals.length > 0 && selectedMilestoneIds.length === subgoals.length && (
            <div className="text-center p-4">
              <p className="text-muted-foreground">All milestones have been selected for assessment</p>
            </div>
          )}
        </div>
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

// Product selection dialog component
const ProductSelectionDialog = ({
  open,
  onOpenChange,
  products,
  onSelectProduct
}: ProductSelectionDialogProps) => {
  const [selectedProduct, setSelectedProduct] = useState<(BudgetItem & { availableQuantity: number }) | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (!open) {
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <CardHeader>
          <CardTitle className="text-xl">Add Products to Session</CardTitle>
          <CardDescription>
            Select products used during this therapy session.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 py-2">
          {products.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No products available. Add products to the client's budget first.</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[240px] pr-4">
                <div className="space-y-2">
                  {products.map(product => (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer hover:bg-accent transition-colors ${selectedProduct?.id === product.id ? 'border-primary' : ''}`}
                      onClick={() => {
                        setSelectedProduct(product);
                        setQuantity(1); // Reset quantity when selecting a new product
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{product.description}</h4>
                            <p className="text-sm text-muted-foreground">Code: {product.itemCode}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${product.unitPrice.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Available: {product.availableQuantity}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {selectedProduct && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">Quantity</h4>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={selectedProduct.availableQuantity}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= selectedProduct.availableQuantity) {
                          setQuantity(val);
                        }
                      }}
                      className="w-20 text-center"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(Math.min(selectedProduct.availableQuantity, quantity + 1))}
                      disabled={quantity >= selectedProduct.availableQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>

                    <div className="ml-4">
                      <p className="font-medium">Total: ${(selectedProduct.unitPrice * quantity).toFixed(2)}</p>
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-2"
                    onClick={() => {
                      onSelectProduct(selectedProduct, quantity);
                      onOpenChange(false);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Session
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface FullScreenSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClient?: Client;
}

export function FullScreenSessionForm({ 
  open, 
  onOpenChange,
  initialClient
}: FullScreenSessionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const [currentGoalId, setCurrentGoalId] = useState<number | null>(null);
  const [currentMilestoneId, setCurrentMilestoneId] = useState<number | null>(null);

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
  const form = useSafeForm<IntegratedSessionFormValues>({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues,
  });

  // Watch clientId to update related data
  const clientId = form.watch("session.clientId");

  // Store clientId in queryClient for cross-component access
  useEffect(() => {
    if (clientId) {
      queryClient.setQueryData(['formState'], { clientId });
    }
  }, [clientId, queryClient]);

  // Fetch clients for client dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });

  // Fetch allies for therapist dropdown and participant selection
  const { data: allies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", clientId, "allies"],
    enabled: open && !!clientId,
  });

  // Fetch goals for assessment
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/clients", clientId, "goals"],
    enabled: open && !!clientId,
  });

  // Get selected goal IDs from form state
  const selectedPerformanceAssessments = form.watch("performanceAssessments") || [];
  const selectedGoalIds = selectedPerformanceAssessments.map(assessment => assessment.goalId);

  // Fetch subgoals for the currently selected goal
  const { data: subgoals = [] } = useQuery<Subgoal[]>({
    queryKey: ["/api/goals", currentGoalId, "subgoals"],
    enabled: open && !!currentGoalId,
  });

  // Get selected milestone IDs for the currently active goal
  const currentGoalAssessment = selectedPerformanceAssessments.find(a => a.goalId === currentGoalId);
  const selectedMilestoneIds = currentGoalAssessment?.milestones.map(m => m.milestoneId) || [];

  // Budget items for product selection
  const { data: budgetSettings } = useQuery({
    queryKey: ["/api/clients", clientId, "budget-settings"],
    enabled: open && !!clientId,
  });

  const { data: budgetItems = [] } = useQuery<BudgetItem[]>({
    queryKey: ["/api/clients", clientId, "budget-items"],
    enabled: open && !!clientId,
  });

  // Fetch available strategies for milestone assessment
  const { data: strategies = [] } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
    enabled: open && showStrategyDialog,
  });

  // Prepare products for selection dialog
  const availableProducts = useMemo(() => {
    if (!budgetItems || !budgetItems.length) return [];

    // Get currently selected products from form
    const selectedProducts = form.watch("sessionNote.products") || [];

    // Calculate available quantities
    return budgetItems
      .filter((item: BudgetItem) => {
        // Only include items that are not consumables or have quantity > 0
        return item.quantity > 0;
      })
      .map((item: BudgetItem) => {
        // Find if this item is already selected in the form
        const alreadySelectedItem = selectedProducts.find(p => p.budgetItemId === item.id);
        const alreadySelectedQuantity = alreadySelectedItem ? alreadySelectedItem.quantity : 0;

        // Calculate available quantity (original quantity minus what's already selected)
        const availableQuantity = item.quantity - alreadySelectedQuantity;

        return {
          ...item,
          availableQuantity,
        };
      })
      .filter(item => item.availableQuantity > 0);  // Only show items with available quantity
  }, [budgetItems, form]);

  // Form submission handler
  const createSessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      console.log("Form submit data:", data);

      // First create the session
      const sessionResponse = await apiRequest("POST", "/api/sessions", data.session);
      console.log("Session created:", sessionResponse);

      if (!sessionResponse || !sessionResponse.id) {
        throw new Error("Failed to create session");
      }

      // Create session notes with the session ID
      const sessionNoteData = {
        ...data.sessionNote,
        sessionId: sessionResponse.id,
      };

      const noteResponse = await apiRequest("POST", "/api/session-notes", sessionNoteData);
      console.log("Session note created:", noteResponse);

      if (!noteResponse || !noteResponse.id) {
        throw new Error("Failed to create session note");
      }

      // Create performance assessments linked to the session note
      if (data.performanceAssessments && data.performanceAssessments.length > 0) {
        for (const assessment of data.performanceAssessments) {
          const assessmentData = {
            ...assessment,
            sessionNoteId: noteResponse.id,
          };

          await apiRequest("POST", "/api/performance-assessments", assessmentData);
        }
      }

      return sessionResponse;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
      console.error("Error creating session:", error);
    },
  });

  function onSubmit(data: IntegratedSessionFormValues) {
    createSessionMutation.mutate(data);
  }

  // Handlers for adding goals, milestones, products, etc.
  const handleGoalSelection = (goal: Goal) => {
    const currentAssessments = form.getValues("performanceAssessments") || [];

    // Add the selected goal to assessments if not already added
    if (!currentAssessments.some(a => a.goalId === goal.id)) {
      const newAssessment = {
        goalId: goal.id,
        goalTitle: goal.title,
        notes: "",
        milestones: []
      };

      form.setValue("performanceAssessments", [...currentAssessments, newAssessment]);
    }
  };

  const handleMilestoneSelection = (subgoal: Subgoal) => {
    const assessments = form.getValues("performanceAssessments") || [];
    const goalIndex = assessments.findIndex(a => a.goalId === currentGoalId);

    if (goalIndex === -1) return;

    // Check if milestone already exists
    if (!assessments[goalIndex].milestones.some(m => m.milestoneId === subgoal.id)) {
      const updatedAssessments = [...assessments];
      updatedAssessments[goalIndex].milestones.push({
        milestoneId: subgoal.id,
        milestoneTitle: subgoal.title,
        rating: 5, // Default rating
        strategies: [],
        notes: ""
      });

      form.setValue("performanceAssessments", updatedAssessments);
    }
  };

  const handleStrategySelection = (strategy: Strategy) => {
    const assessments = form.getValues("performanceAssessments") || [];
    const currentGoalIndex = assessments.findIndex(a => a.goalId === currentGoalId);

    if (currentGoalIndex === -1) return;

    const currentMilestoneIndex = assessments[currentGoalIndex].milestones.findIndex(
      m => m.milestoneId === currentMilestoneId
    );

    if (currentMilestoneIndex === -1) return;

    const updatedAssessments = [...assessments];
    const currentStrategies = updatedAssessments[currentGoalIndex].milestones[currentMilestoneIndex].strategies;
    const strategyName = strategy.name;

    // Check if strategy already exists
    if (currentStrategies.includes(strategyName)) {
      // Remove the strategy
      updatedAssessments[currentGoalIndex].milestones[currentMilestoneIndex].strategies = 
        currentStrategies.filter(s => s !== strategyName);
    } else {
      // Only add if we haven't reached the maximum of 5 strategies
      if (currentStrategies.length < 5) {
        updatedAssessments[currentGoalIndex].milestones[currentMilestoneIndex].strategies = [...currentStrategies, strategyName];
      }
    }

    form.setValue("performanceAssessments", updatedAssessments);
  };

  const handleAddProduct = (product: BudgetItem & { availableQuantity: number }, quantity: number) => {
    // Ensure valid quantity
    if (!quantity || quantity <= 0 || quantity > product.availableQuantity) {
      toast({
        title: "Invalid quantity",
        description: `Please enter a quantity between 1 and ${product.availableQuantity}`,
        variant: "destructive"
      });
      return;
    }

    // Add the product to the form
    const currentProducts = form.getValues("sessionNote.products") || [];

    // Check if this product is already added
    const existingProductIndex = currentProducts.findIndex(p => p.budgetItemId === product.id);

    if (existingProductIndex !== -1) {
      // Update quantity of existing product
      const updatedProducts = [...currentProducts];
      const newQuantity = updatedProducts[existingProductIndex].quantity + quantity;

      // Validate against available quantity
      if (newQuantity > product.quantity) {
        toast({
          title: "Not enough quantity",
          description: `Only ${product.quantity - updatedProducts[existingProductIndex].quantity} more units available`,
          variant: "destructive"
        });
        return;
      }

      updatedProducts[existingProductIndex].quantity = newQuantity;
      form.setValue("sessionNote.products", updatedProducts);
    } else {
      // Add new product
      const newProduct = {
        budgetItemId: product.id,
        productCode: product.itemCode || "ITEM-" + product.id,
        productDescription: product.description || "Unknown product",
        quantity: quantity,
        unitPrice: product.unitPrice || 0,
        availableQuantity: product.availableQuantity
      };

      form.setValue("sessionNote.products", [...currentProducts, newProduct]);
    }
  };

  // Handle removing items from form
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

  if (!open) return null;

  return (
    <div className="fullscreen-form">
      <div className="bg-background h-full w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-card">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Create Session</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createSessionMutation.isPending}
            >
              {createSessionMutation.isPending ? "Creating..." : "Create Session"}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Form {...form}>
          <form className="flex-1 overflow-hidden" onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="session" className="h-full">
              <div className="border-b px-4 bg-muted/20">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="session">Session Details</TabsTrigger>
                  <TabsTrigger value="assessment">Performance Assessment</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                </TabsList>
              </div>

              {/* Session Details Tab */}
              <TabsContent value="session" className="h-[calc(100%-48px)] overflow-y-auto p-4">
                <ThreeColumnLayout
                  leftColumn={
                    <div className="space-y-6 p-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Session Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Session Title */}
                          <FormField
                            control={form.control}
                            name="session.title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Session Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Speech Therapy Session" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Client Selection */}
                          <FormField
                            control={form.control}
                            name="session.clientId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Client</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  value={field.value?.toString()}
                                  disabled={!!initialClient}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a client" />
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
                                        variant={"outline"}
                                        className="w-full pl-3 text-left font-normal"
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

                          {/* Session Time */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Duration */}
                            <FormField
                              control={form.control}
                              name="session.duration"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duration (minutes)</FormLabel>
                                  <FormControl>
                                    <Input     type="number" 
                                      min={1} 
                                      {...field}
                                       onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Status */}
                            <FormField
                              control={form.control}
                              name="session.status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="scheduled">Scheduled</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Location */}
                          <FormField
                            control={form.control}
                            name="session.location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Description */}
                          <FormField
                            control={form.control}
                            name="session.description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Session details and goals..."
                                    className="resize-none"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">
                              <UserCheck className="h-5 w-5 inline-block mr-2" />
                              Present Attendees
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {allies.length > 0 ? (
                            <>
                              {/* Display selected allies */}
                              {form.watch("sessionNote.presentAllies")?.length > 0 ? (
                                <div className="space-y-2">
                                  {form.watch("sessionNote.presentAllies").map((name, index) => {
                                    if (name === "__select__") return null; // Skip special marker

                                    const ally = allies.find(a => a.name === name);
                                    return (
                                      <div key={index} className="flex items-center justify-between bg-accent rounded-md p-2">
                                        <div className="flex items-center">
                                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                            <UserIcon className="h-4 w-4 text-primary" />
                                          </div>
                                          <div>
                                            <p className="font-medium text-sm">{name}</p>
                                            <p className="text-xs text-muted-foreground">{ally?.relationship || "Supporter"}</p>
                                          </div>
                                        </div>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          onClick={() => {
                                            const allies = form.getValues("sessionNote.presentAllies") || [];
                                            const updatedAllies = allies.filter(a => a !== name);
                                            form.setValue("sessionNote.presentAllies", updatedAllies);
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No attendees added yet</p>
                              )}

                              {/* Add ally button */}
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  // Get current allies
                                  const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                  const availableAllies = allies.filter(ally => 
                                    !currentAllies.includes(ally.name)
                                  );

                                  if (availableAllies.length > 0) {
                                    // Add the first available ally
                                    form.setValue("sessionNote.presentAllies", [
                                      ...currentAllies.filter(name => name !== "__select__"),
                                      availableAllies[0].name
                                    ]);

                                    // Also track ally IDs for data integrity
                                    const allyIds = form.getValues("sessionNote.presentAllyIds") || [];
                                    form.setValue("sessionNote.presentAllyIds", [
                                      ...allyIds,
                                      availableAllies[0].id
                                    ]);
                                  } else {
                                    toast({
                                      title: "No more allies available",
                                      description: "All available attendees have been added to the session.",
                                      variant: "default"
                                    });
                                  }
                                }}
                                disabled={allies.length === form.watch("sessionNote.presentAllies")?.filter(name => name !== "__select__").length}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Attendee
                              </Button>
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-muted-foreground">No allies found for this client</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>


                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Products Used</CardTitle>
                          <CardDescription>
                            List of products used during this session
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {form.watch("sessionNote.products")?.length > 0 ? (
                            <div className="space-y-2">
                              {form.watch("sessionNote.products").map((product, index) => (
                                <div key={index} className="flex justify-between bg-accent rounded-md p-2">
                                  <div>
                                    <p className="font-medium text-sm">{product.productDescription}</p>
                                    <p className="text-xs text-muted-foreground">Code: {product.productCode}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium">{product.quantity} x ${product.unitPrice.toFixed(2)}</p>
                                    <div className="flex items-center mt-1">
                                      <p className="text-xs text-muted-foreground mr-2">
                                        ${(product.quantity * product.unitPrice).toFixed(2)}
                                      </p>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6" 
                                        onClick={() => removeProduct(index)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No products added yet</p>
                          )}

                          {/* Add product button */}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowProductDialog(true)}
                            disabled={availableProducts.length === 0}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add Product
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  }

                  middleColumn={
                    <div className="p-4 space-y-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Products Used</CardTitle>
                          <CardDescription>
                            List of products used during this session
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {form.watch("sessionNote.products")?.length > 0 ? (
                            <div className="space-y-2">
                              {form.watch("sessionNote.products").map((product, index) => (
                                <div key={index} className="flex justify-between bg-accent rounded-md p-2">
                                  <div>
                                    <p className="font-medium text-sm">{product.productDescription}</p>
                                    <p className="text-xs text-muted-foreground">Code: {product.productCode}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium">{product.quantity} x ${product.unitPrice.toFixed(2)}</p>
                                    <div className="flex items-center mt-1">
                                      <p className="text-xs text-muted-foreground mr-2">
                                        ${(product.quantity * product.unitPrice).toFixed(2)}
                                      </p>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6" 
                                        onClick={() => removeProduct(index)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No products added yet</p>
                          )}

                          {/* Add product button */}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowProductDialog(true)}
                            disabled={availableProducts.length === 0}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add Product
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Session Notes</CardTitle>
                          <CardDescription>
                            Detailed notes about the session
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <FormField
                            control={form.control}
                            name="sessionNote.notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RichTextEditor
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    placeholder="Enter detailed session notes here..."
                                    className="min-h-[200px]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  }

                  rightColumn={
                    <div className="p-4 space-y-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Session Rating</CardTitle>
                          <CardDescription>
                            Rate the client's performance during this session
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <FormField
                            control={form.control}
                            name="sessionNote.moodRating"
                            render={({ field }) => (
                              <RatingSlider
                                label="Mood & Engagement"
                                value={field.value}
                                onChange={field.onChange}
                                description="How positive and engaged was the client during the session?"
                              />
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sessionNote.focusRating"
                            render={({ field }) => (
                              <RatingSlider
                                label="Focus & Attention"
                                value={field.value}
                                onChange={field.onChange}
                                description="How well did the client maintain focus during activities?"
                              />
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sessionNote.cooperationRating"
                            render={({ field }) => (
                              <RatingSlider
                                label="Cooperation"
                                value={field.value}
                                onChange={field.onChange}
                                description="How well did the client follow instructions and cooperate?"
                              />
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sessionNote.physicalActivityRating"
                            render={({ field }) => (
                              <RatingSlider
                                label="Physical Activity"
                                value={field.value}
                                onChange={field.onChange}
                                description="How well did the client perform physical activities?"
                              />
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  }
                />
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="h-[calc(100%-48px)] overflow-y-auto p-4">
                <div className="p-4 max-w-3xl mx-auto">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Session Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">Client</p>
                          <p className="text-sm font-medium">
                            {clients.find(c => c.id === form.watch("session.clientId"))?.name || "Not selected"}
                          </p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">Date</p>
                          <p className="text-sm font-medium">
                            {form.watch("session.sessionDate") ? 
                              format(form.watch("session.sessionDate"), "PPP") : 
                              "Not set"}
                          </p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="text-sm font-medium">
                            {form.watch("session.duration") || 0} minutes
                          </p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="text-sm font-medium">
                            {form.watch("session.location") || "Not set"}
                          </p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <p className="text-sm font-medium">
                            {form.watch("session.status") || "Not set"}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-2">Attendees</p>
                        {form.watch("sessionNote.presentAllies")?.filter(name => name !== "__select__").length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {form.watch("sessionNote.presentAllies")
                              .filter(name => name !== "__select__")
                              .map((name, index) => (
                                <Badge key={index} variant="secondary">{name}</Badge>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No attendees added</p>
                        )}
                      </div>



                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-2">Session Ratings</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Mood & Engagement</span>
                            <Badge className={
                              form.watch("sessionNote.moodRating") <= 3 ? "bg-red-100 text-red-800" :
                              form.watch("sessionNote.moodRating") <= 6 ? "bg-amber-100 text-amber-800" :
                              "bg-green-100 text-green-800"
                            }>
                              {form.watch("sessionNote.moodRating")}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Focus & Attention</span>
                            <Badge className={
                              form.watch("sessionNote.focusRating") <= 3 ? "bg-red-100 text-red-800" :
                              form.watch("sessionNote.focusRating") <= 6 ? "bg-amber-100 text-amber-800" :
                              "bg-green-100 text-green-800"
                            }>
                              {form.watch("sessionNote.focusRating")}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Cooperation</span>
                            <Badge className={
                              form.watch("sessionNote.cooperationRating") <= 3 ? "bg-red-100 text-red-800" :
                              form.watch("sessionNote.cooperationRating") <= 6 ? "bg-amber-100 text-amber-800" :
                              "bg-green-100 text-green-800"
                            }>
                              {form.watch("sessionNote.cooperationRating")}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Physical Activity</span>
                            <Badge className={
                              form.watch("sessionNote.physicalActivityRating") <= 3 ? "bg-red-100 text-red-800" :
                              form.watch("sessionNote.physicalActivityRating") <= 6 ? "bg-amber-100 text-amber-800" :
                              "bg-green-100 text-green-800"
                            }>
                              {form.watch("sessionNote.physicalActivityRating")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Performance Assessment Tab */}
              <TabsContent value="assessment" className="h-[calc(100%-48px)] overflow-y-auto p-4">
                <div className="space-y-6 p-4 max-w-3xl mx-auto">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Goals Assessed</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (goals.length === 0) {
                              toast({
                                title: "No goals available",
                                description: "This client doesn't have any goals set up.",
                                variant: "default"
                              });
                              return;
                            }

                            const selectedGoalIds = form.getValues("performanceAssessments").map(a => a.goalId);
                            if (selectedGoalIds.length >= goals.length) {
                              toast({
                                title: "All goals added",
                                description: "All available goals have been added for assessment.",
                                variant: "default"
                              });
                              return;
                            }

                            setShowGoalDialog(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Goal
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPerformanceAssessments.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground">No goals selected for assessment</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                              if (goals.length === 0) {
                                toast({
                                  title: "No goals available",
                                  description: "This client doesn't have any goals set up.",
                                  variant: "default"
                                });
                                return;
                              }
                              setShowGoalDialog(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Select Goal
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedPerformanceAssessments.map((assessment, index) => (
                            <Card key={assessment.goalId} className="overflow-hidden">
                              <CardHeader className="bg-primary/10 pb-2 pt-3 px-3">
                                <div className="flex justify-between items-start">
                                  <CardTitle className="text-base">{assessment.goalTitle}</CardTitle>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => removeGoal(assessment.goalId)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-medium">Milestones</h4>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => {
                                        setCurrentGoalId(assessment.goalId);
                                        setShowMilestoneDialog(true);
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                  </div>

                                  {assessment.milestones.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No milestones added yet</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {assessment.milestones.map((milestone, mIndex) => (
                                        <div key={milestone.milestoneId} className="bg-accent rounded-md p-2">
                                          <div className="flex justify-between items-start">
                                            <h5 className="text-sm font-medium">{milestone.milestoneTitle}</h5>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              onClick={() => removeMilestone(assessment.goalId, milestone.milestoneId)}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          <div className="flex items-center mt-2">
                                            <span className="text-xs text-muted-foreground mr-2">Rating:</span>
                                            <Badge className={
                                              (milestone.rating || 0) <= 3 ? "bg-red-100 text-red-800" :
                                              (milestone.rating || 0) <= 6 ? "bg-amber-100 text-amber-800" :
                                              "bg-green-100 text-green-800"
                                            }>
                                              {milestone.rating || 0}/10
                                            </Badge>
                                          </div>

                                          <div className="mt-2">
                                            <span className="text-xs text-muted-foreground">Strategies:</span>
                                            {milestone.strategies.length === 0 ? (
                                              <div className="mt-1">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-7 px-2 text-xs w-full"
                                                  onClick={() => {
                                                    setCurrentGoalId(assessment.goalId);
                                                    setCurrentMilestoneId(milestone.milestoneId);
                                                    setShowStrategyDialog(true);
                                                  }}
                                                >
                                                  <Plus className="h-3 w-3 mr-1" /> Add Strategies
                                                </Button>
                                              </div>
                                            ) : (
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {milestone.strategies.map((strategy, sIndex) => (
                                                  <Badge key={sIndex} variant="outline" className="text-xs">
                                                    {strategy}
                                                  </Badge>
                                                ))}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-2 text-xs"
                                                  onClick={() => {
                                                    setCurrentGoalId(assessment.goalId);
                                                    setCurrentMilestoneId(milestone.milestoneId);
                                                    setShowStrategyDialog(true);
                                                  }}
                                                >
                                                  <Plus className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>

      {/* Dialogs */}
      <GoalSelectionDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        goals={goals}
        selectedGoalIds={selectedGoalIds}
        onSelectGoal={handleGoalSelection}
      />

      <MilestoneSelectionDialog
        open={showMilestoneDialog}
        onOpenChange={setShowMilestoneDialog}
        subgoals={subgoals}
        selectedMilestoneIds={selectedMilestoneIds}
        onSelectMilestone={handleMilestoneSelection}
      />

      <ProductSelectionDialog
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        products={availableProducts}
        onSelectProduct={handleAddProduct}
      />

      <StrategySelectionDialog
        open={showStrategyDialog}
        onOpenChange={setShowStrategyDialog}
        selectedStrategies={
          selectedPerformanceAssessments.find(a => a.goalId === currentGoalId)
            ?.milestones.find(m => m.milestoneId === currentMilestoneId)
            ?.strategies || []
        }
        milestoneId={currentMilestoneId || 0}
        onSelectStrategy={handleStrategySelection}
        maxStrategies={5}
      />
    </div>
  );
}