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
  FileText,
  Star,
  Target,
  Package,
  Users,
  BarChart,
  Hourglass,
  AlertCircle,
  Info,
  LayoutGrid,
  CheckCircle2,
  Clipboard
} from "lucide-react";
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
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>{label}</Label>
        <Badge variant="outline">{value}</Badge>
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <Slider
        value={[value]}
        min={0}
        max={10}
        step={1}
        onValueChange={(vals) => onChange(vals[0])}
        className="py-1"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>5</span>
        <span>10</span>
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
  const availableGoals = goals.filter(goal => !selectedGoalIds.includes(goal.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary/80" />
            <span>Select Goal</span>
          </DialogTitle>
          <DialogDescription>
            Choose a goal to assess in this session
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {availableGoals.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">All goals have been selected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableGoals.map(goal => (
                <Card 
                  key={goal.id} 
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => {
                    onSelectGoal(goal);
                    onOpenChange(false);
                  }}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary/70" />
                      {goal.title}
                    </CardTitle>
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
  const availableSubgoals = subgoals.filter(
    subgoal => !selectedMilestoneIds.includes(subgoal.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary/80" />
            <span>Select Milestone</span>
          </DialogTitle>
          <DialogDescription>
            Choose a milestone to assess for this goal
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {availableSubgoals.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">All milestones have been selected</p>
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
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary/70" />
                      {subgoal.title}
                    </CardTitle>
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

  useEffect(() => {
    if (!open) {
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [open]);

  const hasAvailableProducts = products.some(product => product.availableQuantity > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary/80" />
            <span>Add Product/Service</span>
          </DialogTitle>
          <DialogDescription>
            Select products or services used in this session
          </DialogDescription>
        </DialogHeader>

        {!hasAvailableProducts ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">No available budget items found for this client</p>
          </div>
        ) : (
          <>
            <div className="py-2">
              <Label>Select Product</Label>
              <Select 
                value={selectedProduct?.id?.toString() || ""} 
                onValueChange={(value) => {
                  const product = products.find(p => p.id.toString() === value);
                  if (product) {
                    setSelectedProduct(product);
                    // Reset quantity to 1 or max available, whichever is smaller
                    setQuantity(Math.min(1, product.availableQuantity));
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a product or service" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter(product => product.availableQuantity > 0)
                    .map(product => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary/70" />
                            {product.description}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {product.availableQuantity.toFixed(product.unitPrice % 1 === 0 ? 0 : 2)} available
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <Label>Quantity</Label>
                    <Badge variant="outline">{quantity.toFixed(selectedProduct.unitPrice % 1 === 0 ? 0 : 2)}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.max(0.01, quantity - (selectedProduct.unitPrice % 1 === 0 ? 1 : 0.5)))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Slider
                      value={[quantity]}
                      min={0.01}
                      max={selectedProduct.availableQuantity}
                      step={selectedProduct.unitPrice % 1 === 0 ? 1 : 0.5}
                      onValueChange={(vals) => setQuantity(vals[0])}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.min(selectedProduct.availableQuantity, quantity + (selectedProduct.unitPrice % 1 === 0 ? 1 : 0.5)))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-sm">
                    <span>Unit Price:</span>
                    <span className="font-medium">${selectedProduct.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold mt-1">
                    <span>Total:</span>
                    <span>${(selectedProduct.unitPrice * quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  if (selectedProduct) {
                    onSelectProduct(selectedProduct, quantity);
                    onOpenChange(false);
                  }
                }}
                disabled={!selectedProduct || quantity <= 0 || quantity > selectedProduct.availableQuantity}
                className="gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Add to Session</span>
              </Button>
            </DialogFooter>
          </>
        )}
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
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);

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
  const form = useSafeForm<IntegratedSessionFormValues>({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues,
  });

  // Watch clientId to update related data
  const clientId = form.watch("session.clientId");
  
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
    enabled: open && !!clientId && !!budgetSettings,
  });
  
  // Filter budget items to only include those with available quantity
  const availableProducts = useMemo(() => {
    if (!budgetSettings || !budgetSettings.isActive) {
      console.log("No active budget plan found");
      return [];
    }

    // Only include products from the active budget settings
    const products = allBudgetItems
      .filter((item: BudgetItem) => {
        return item.budgetSettingsId === budgetSettings.id;
      })
      .map((item: BudgetItem) => ({
        ...item,
        // Calculate available quantity based on budgeted quantity minus used quantity in the form
        availableQuantity: item.quantity - 
          (form.getValues().sessionNote?.products || [])
            .filter(p => p.budgetItemId === item.id)
            .reduce((sum, p) => sum + p.quantity, 0)
      }));
      
    console.log('Available products for session:', products);
    return products;
  }, [allBudgetItems, budgetSettings, form]);
  
  // Calculate relevant subgoals based on selected goals in the form
  const relevantSubgoals = useMemo(() => {
    const selectedGoalIds = form.getValues().performanceAssessments?.map(a => a.goalId) || [];
    return subgoals.filter(subgoal => 
      selectedGoalIds.includes(subgoal.goalId)
    );
  }, [form, subgoals]);
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setActiveTab("details");
    }
  }, [open, form, defaultValues]);
  
  // When client changes, update default values
  useEffect(() => {
    if (clientId) {
      // If this is a client change, reset performance assessments
      const currentValues = form.getValues();
      if (currentValues.session?.clientId !== clientId) {
        form.setValue("performanceAssessments", []);
        form.setValue("sessionNote.presentAllies", []);
        form.setValue("sessionNote.presentAllyIds", []);
        form.setValue("sessionNote.products", []);
      }
    }
  }, [clientId, form]);

  // Handle goal selection for performance assessment
  const handleGoalSelection = (goal: Goal) => {
    const assessments = [...form.getValues().performanceAssessments];
    
    // Find all subgoals for this goal
    const milestoneIds = subgoals
      .filter((s: Subgoal) => s.goalId === goal.id)
      .map((s: Subgoal) => s.id);
      
    // Create a new assessment for this goal
    assessments.push({
      goalId: goal.id,
      goalTitle: goal.title,
      notes: "",
      milestones: [] // Initialize with no milestones selected
    });
    
    form.setValue("performanceAssessments", assessments);
    
    // Set selected goal ID to fetch its subgoals
    setSelectedGoalId(goal.id);
  };

  // Handle milestone selection for performance assessment
  const handleMilestoneSelection = (subgoal: Subgoal) => {
    if (currentGoalIndex === null) {
      console.error("No goal selected for milestone");
      return;
    }
    
    const assessments = [...form.getValues().performanceAssessments];
    if (!assessments[currentGoalIndex]) {
      console.error("Invalid goal index");
      return;
    }
    
    // Add the selected milestone to the current goal's assessment
    const updatedMilestones = [...assessments[currentGoalIndex].milestones];
    updatedMilestones.push({
      milestoneId: subgoal.id,
      milestoneTitle: subgoal.title,
      rating: 5, // Default rating
      strategies: [],
      notes: ""
    });
    
    assessments[currentGoalIndex].milestones = updatedMilestones;
    form.setValue("performanceAssessments", assessments);
  };
  
  // Handler for adding product to session
  const handleAddProduct = (product: BudgetItem & { availableQuantity: number }, quantity: number) => {
    const products = [...form.getValues().sessionNote.products];
    
    // Check if we already have this product
    const existingProductIndex = products.findIndex(p => p.budgetItemId === product.id);
    
    if (existingProductIndex >= 0) {
      // Update existing product quantity
      products[existingProductIndex].quantity += quantity;
    } else {
      // Add as new product
      products.push({
        budgetItemId: product.id,
        productCode: product.itemCode || "",
        productDescription: product.description,
        quantity,
        unitPrice: product.unitPrice,
        availableQuantity: product.availableQuantity
      });
    }
    
    form.setValue("sessionNote.products", products);
  };

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      console.log("Creating session with data:", data);
      
      try {
        // First create the session
        const sessionResponse = await apiRequest("POST", "/api/sessions", data.session);
        if (!sessionResponse || !sessionResponse.id) {
          throw new Error("Failed to create session");
        }
        
        const sessionId = sessionResponse.id;
        console.log("Session created successfully with ID:", sessionId);
        
        // Then create the session note linked to the session
        const sessionNoteData = {
          ...data.sessionNote,
          sessionId
        };
        
        const sessionNoteResponse = await apiRequest("POST", "/api/session-notes", sessionNoteData);
        if (!sessionNoteResponse || !sessionNoteResponse.id) {
          throw new Error("Failed to create session note");
        }
        
        const sessionNoteId = sessionNoteResponse.id;
        console.log("Session note created successfully with ID:", sessionNoteId);
        
        // If we have performance assessments, create them
        if (data.performanceAssessments && data.performanceAssessments.length > 0) {
          const performanceAssessments = await Promise.all(
            data.performanceAssessments.map(async (assessment) => {
              const assessmentData = {
                ...assessment,
                sessionNoteId
              };
              
              const response = await apiRequest("POST", "/api/performance-assessments", assessmentData);
              return response;
            })
          );
          
          console.log("Performance assessments created successfully:", performanceAssessments);
        }
        
        return { 
          sessionId, 
          sessionNoteId 
        };
      } catch (error) {
        console.error("Error creating session:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Session created",
        description: "The session has been created successfully",
      });
      
      // Reset form and close dialog
      form.reset(defaultValues);
      onOpenChange(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "sessions"] });
        
        // Also refresh budget items if we used any
        if (form.getValues().sessionNote.products.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-items"] });
        }
      }
    },
    onError: (error: Error) => {
      console.error("Error in session creation mutation:", error);
      toast({
        title: "Error",
        description: `Failed to create session: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  function onSubmit(data: IntegratedSessionFormValues) {
    console.log("Submitting form data:", data);
    createSession.mutate(data);
  }

  // Return just the content without dialog wrapper if in full-screen mode
  if (isFullScreen) {
    return (
      <div className="w-full h-full flex flex-col px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details" className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Session Details</span>
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              <span>Observations</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center justify-center gap-2">
              <BarChart className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
              <div className="flex-grow overflow-auto pr-2">
                {/* Session Details Tab */}
                <TabsContent value="details" className="space-y-6 mt-0 px-4">
                  <div className="grid gap-4 py-4">
                    {/* Session ID Display */}
                    <div className="flex items-start gap-2">
                      <Clipboard className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Session ID</p>
                        <p className="text-sm text-muted-foreground font-mono">{sessionId}</p>
                      </div>
                    </div>

                    {/* Client Selection */}
                    <FormField
                      control={form.control}
                      name="session.clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-primary/70" />
                            Client
                          </FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
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

                    {/* Therapist Selection - only show if we have allies */}
                    {allies.length > 0 && (
                      <FormField
                        control={form.control}
                        name="session.therapistId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary/70" />
                              Lead Therapist
                            </FormLabel>
                            <Select
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => {
                                field.onChange(parseInt(value));
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a therapist" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {allies.map((ally) => (
                                  <SelectItem key={ally.id} value={ally.id.toString()}>
                                    {ally.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Main therapist conducting the session
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Session Date + Time */}
                    <FormField
                      control={form.control}
                      name="session.sessionDate"
                      render={({ field }) => {
                        const [isCalendarOpen, setIsCalendarOpen] = useState(false);
                        
                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-primary/70" />
                              Date & Time
                            </FormLabel>
                            <Popover onOpenChange={setIsCalendarOpen} open={isCalendarOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className="w-full h-10 pl-3 text-left font-normal flex justify-between items-center border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                                    onClick={() => setIsCalendarOpen(true)} // Explicitly control open state
                                  >
                                    {field.value ? (
                                      <span>
                                        {format(field.value, "PPP")} at {format(field.value, "h:mm a")}
                                      </span>
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start" data-calendar-container="true">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    // Preserve the time from the current value
                                    if (date) {
                                      const hours = field.value ? field.value.getHours() : 9;
                                      const minutes = field.value ? field.value.getMinutes() : 0;
                                      date.setHours(hours, minutes);
                                    }
                                    
                                    field.onChange(date);
                                    // Do not close the popover yet
                                    hideUnwantedCalendars();
                                  }}
                                  initialFocus
                                />
                                
                                <div className="border-t p-3 border-border/50">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Time:</span>
                                    <select 
                                      className="flex-1 rounded-md border px-3 py-1.5 text-sm"
                                      value={field.value ? field.value.getHours() : 9}
                                      onChange={(e) => {
                                        const newDate = new Date(field.value || new Date());
                                        newDate.setHours(parseInt(e.target.value), newDate.getMinutes());
                                        field.onChange(newDate);
                                        
                                        const checkTimer = setTimeout(hideUnwantedCalendars, 50);
                                        return () => clearTimeout(checkTimer);
                                      }}
                                    >
                                      {Array.from({ length: 24 }).map((_, i) => (
                                        <option key={i} value={i}>
                                          {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                                        </option>
                                      ))}
                                    </select>
                                    <span>:</span>
                                    <select
                                      className="flex-1 rounded-md border px-3 py-1.5 text-sm"
                                      value={field.value ? field.value.getMinutes() : 0}
                                      onChange={(e) => {
                                        const newDate = new Date(field.value || new Date());
                                        newDate.setMinutes(parseInt(e.target.value));
                                        field.onChange(newDate);
                                      }}
                                    >
                                      {[0, 15, 30, 45].map((minute) => (
                                        <option key={minute} value={minute}>
                                          {minute.toString().padStart(2, "0")}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  <div className="mt-4 flex justify-end">
                                    <Button 
                                      type="button" 
                                      size="sm"
                                      className="flex items-center gap-2"
                                      onClick={() => setIsCalendarOpen(false)}
                                    >
                                      <Check className="h-4 w-4" />
                                      <span>Set Date & Time</span>
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Duration */}
                    <FormField
                      control={form.control}
                      name="session.duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Hourglass className="h-4 w-4 text-primary/70" />
                            Duration (minutes)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
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
                          <FormLabel className="flex items-center gap-2">
                            <MapPinIcon className="h-4 w-4 text-primary/70" />
                            Location
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Session Title */}
                    <FormField
                      control={form.control}
                      name="session.title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary/70" />
                            Session Title
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="session.description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-primary/70" />
                            Session Description
                          </FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Participants Tab */}
                <TabsContent value="participants" className="mt-0 space-y-6 px-4">
                  <div className="grid gap-5 py-4">
                    {/* Present Allies/Participants */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary/80" />
                        <span>Present Allies</span>
                      </h3>
                      <div className="space-y-2 pl-7">
                        {allies.length === 0 ? (
                          <div className="text-muted-foreground text-sm italic">
                            No allies found for this client
                          </div>
                        ) : (
                          allies.map((ally) => (
                            <div key={ally.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`ally-${ally.id}`}
                                checked={form.getValues().sessionNote.presentAllyIds.includes(ally.id)}
                                onCheckedChange={(checked) => {
                                  const currentAllyIds = [...form.getValues().sessionNote.presentAllyIds];
                                  const currentAllies = [...form.getValues().sessionNote.presentAllies];
                                  
                                  if (checked) {
                                    // Add ally to the list
                                    if (!currentAllyIds.includes(ally.id)) {
                                      currentAllyIds.push(ally.id);
                                      currentAllies.push(ally.name);
                                    }
                                  } else {
                                    // Remove ally from the list
                                    const allyIdIndex = currentAllyIds.indexOf(ally.id);
                                    if (allyIdIndex !== -1) {
                                      currentAllyIds.splice(allyIdIndex, 1);
                                      currentAllies.splice(allyIdIndex, 1);
                                    }
                                  }
                                  
                                  form.setValue("sessionNote.presentAllyIds", currentAllyIds);
                                  form.setValue("sessionNote.presentAllies", currentAllies);
                                }}
                              />
                              <Label
                                htmlFor={`ally-${ally.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {ally.name} ({ally.relationship})
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Ratings Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary/80" />
                        <span>Session Ratings</span>
                      </h3>
                      <div className="space-y-6 pl-7">
                        <Controller
                          control={form.control}
                          name="sessionNote.moodRating"
                          render={({ field }) => (
                            <RatingSlider
                              value={field.value}
                              onChange={field.onChange}
                              label="Mood"
                              description="Client's emotional state during the session"
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
                              description="Client's ability to maintain attention"
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
                              description="Client's willingness to participate"
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
                              description="Client's energy and activity level"
                            />
                          )}
                        />
                      </div>
                    </div>

                    {/* Products Used Section */}
                    {budgetSettings && budgetSettings.isActive && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary/80" />
                          <span>Products & Services</span>
                        </h3>
                        <div className="space-y-4 pl-7">
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                              Record products or services used in this session
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-2"
                              onClick={() => setProductSelectionOpen(true)}
                            >
                              <Plus className="h-4 w-4" />
                              <span>Add Product</span>
                            </Button>
                          </div>
                          
                          {form.getValues().sessionNote.products.length === 0 ? (
                            <div className="text-sm text-muted-foreground italic">
                              No products added to this session
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {form.getValues().sessionNote.products.map((product, index) => (
                                <Card key={index} className="overflow-hidden">
                                  <div className="flex justify-between items-center p-3 bg-primary/5">
                                    <div className="font-medium flex items-center gap-2">
                                      <Package className="h-4 w-4 text-primary/70" />
                                      <span>{product.productDescription}</span>
                                    </div>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const products = [...form.getValues().sessionNote.products];
                                        products.splice(index, 1);
                                        form.setValue("sessionNote.products", products);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <CardContent className="py-3 flex justify-between items-center">
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Quantity:</span>{" "}
                                      <span className="font-medium">{product.quantity.toFixed(product.unitPrice % 1 === 0 ? 0 : 2)}</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Total:</span>{" "}
                                      <span className="font-medium">${(product.quantity * product.unitPrice).toFixed(2)}</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="sessionNote.notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary/70" />
                            Session Notes
                          </FormLabel>
                          <FormControl>
                            <Textarea rows={6} {...field} />
                          </FormControl>
                          <FormDescription>
                            Detailed notes about the session and observations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Performance Assessment Tab */}
                <TabsContent value="performance" className="mt-0 space-y-6 px-4">
                  <div className="py-4">
                    {/* Goals section header with add button */}
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary/80" />
                        <span>Goals Assessment</span>
                      </h3>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => setGoalSelectionOpen(true)}
                        disabled={!clientId || goals.length === 0}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Goal</span>
                      </Button>
                    </div>

                    {/* No goals message */}
                    {(!clientId || goals.length === 0) && (
                      <div className="text-center p-4 border rounded-md bg-muted/20">
                        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground mb-1">No goals available for assessment</p>
                        <p className="text-sm text-muted-foreground/70">
                          {!clientId 
                            ? "Select a client to view their goals" 
                            : "No goals have been created for this client"}
                        </p>
                      </div>
                    )}

                    {/* Performance assessments */}
                    <div className="space-y-6">
                      {form.getValues().performanceAssessments.map((assessment, assessmentIndex) => {
                        const goal = goals.find(g => g.id === assessment.goalId);
                        if (!goal) return null;
                        
                        return (
                          <Card key={assessment.goalId} className="border-primary/20">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Target className="h-4 w-4 text-primary/70" />
                                  {goal.title}
                                </CardTitle>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    const assessments = [...form.getValues().performanceAssessments];
                                    assessments.splice(assessmentIndex, 1);
                                    form.setValue("performanceAssessments", assessments);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <CardDescription>{goal.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                              {/* Goal notes */}
                              <div className="mb-5">
                                <Controller
                                  control={form.control}
                                  name={`performanceAssessments.${assessmentIndex}.notes`}
                                  render={({ field }) => (
                                    <div className="space-y-2">
                                      <Label className="text-sm">Assessment Notes</Label>
                                      <Textarea 
                                        placeholder="Add notes about overall progress on this goal"
                                        className="h-20"
                                        {...field}
                                      />
                                    </div>
                                  )}
                                />
                              </div>

                              {/* Milestones section */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-sm font-medium flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary/70" />
                                    <span>Milestones</span>
                                  </h4>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs flex items-center gap-1"
                                    onClick={() => {
                                      setCurrentGoalIndex(assessmentIndex);
                                      setSelectedGoalId(assessment.goalId);
                                      setMilestoneSelectionOpen(true);
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>Add</span>
                                  </Button>
                                </div>

                                {assessment.milestones.length === 0 ? (
                                  <div className="text-sm text-muted-foreground italic border p-3 rounded-md bg-muted/5">
                                    No milestones selected for assessment
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {assessment.milestones.map((milestone, milestoneIndex) => {
                                      const subgoal = subgoals.find(s => s.id === milestone.milestoneId);
                                      
                                      return (
                                        <div key={milestone.milestoneId} className="border rounded-md p-3 pb-4 bg-muted/5">
                                          <div className="flex justify-between items-start mb-3">
                                            <div className="space-y-1">
                                              <h5 className="text-sm font-medium flex items-center gap-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-primary/70" />
                                                {subgoal?.title || milestone.milestoneTitle || "Unnamed Milestone"}
                                              </h5>
                                              {subgoal?.description && (
                                                <p className="text-xs text-muted-foreground">{subgoal.description}</p>
                                              )}
                                            </div>
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7"
                                              onClick={() => {
                                                const assessments = [...form.getValues().performanceAssessments];
                                                assessments[assessmentIndex].milestones.splice(milestoneIndex, 1);
                                                form.setValue("performanceAssessments", assessments);
                                              }}
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                          
                                          {/* Rating slider for milestone */}
                                          <Controller
                                            control={form.control}
                                            name={`performanceAssessments.${assessmentIndex}.milestones.${milestoneIndex}.rating`}
                                            render={({ field }) => (
                                              <div className="space-y-2 mt-3">
                                                <div className="flex justify-between items-center">
                                                  <span className="text-xs">Performance Rating</span>
                                                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                                    {field.value || 0}
                                                  </Badge>
                                                </div>
                                                <Slider
                                                  value={[field.value || 0]}
                                                  min={0}
                                                  max={10}
                                                  step={1}
                                                  onValueChange={(vals) => field.onChange(vals[0])}
                                                  className="py-0.5"
                                                />
                                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                                  <span>0</span>
                                                  <span>5</span>
                                                  <span>10</span>
                                                </div>
                                              </div>
                                            )}
                                          />
                                          
                                          {/* Notes for milestone */}
                                          <Controller
                                            control={form.control}
                                            name={`performanceAssessments.${assessmentIndex}.milestones.${milestoneIndex}.notes`}
                                            render={({ field }) => (
                                              <div className="space-y-1 mt-3">
                                                <Label className="text-xs">Notes</Label>
                                                <Textarea 
                                                  placeholder="Add notes about this milestone"
                                                  className="h-16 text-sm"
                                                  {...field}
                                                />
                                              </div>
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
                  </div>
                </TabsContent>
              </div>

              {/* Form buttons */}
              <div className="pt-2 px-4 flex justify-end gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  disabled={createSession.isPending}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSession.isPending}
                  className="gap-2"
                >
                  {createSession.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Create Session</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </div>
    );
  }

  // When not full screen, wrap in dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary/80" />
            <span>Create Session</span>
          </DialogTitle>
          <DialogDescription>
            Track a therapy session and record progress
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details" className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Session Details</span>
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              <span>Observations</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center justify-center gap-2">
              <BarChart className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
              <div className="flex-grow overflow-auto pr-2">
                {/* Tab contents go here - use the same content as above */}
                
                {/* Session Details Tab */}
                <TabsContent value="details" className="space-y-6 mt-0 px-4">
                  <div className="grid gap-4 py-4">
                    {/* Session ID Display */}
                    <div className="flex items-start gap-2">
                      <Clipboard className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Session ID</p>
                        <p className="text-sm text-muted-foreground font-mono">{sessionId}</p>
                      </div>
                    </div>

                    {/* Client Selection */}
                    <FormField
                      control={form.control}
                      name="session.clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-primary/70" />
                            Client
                          </FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
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

                    {/* Therapist Selection - only show if we have allies */}
                    {allies.length > 0 && (
                      <FormField
                        control={form.control}
                        name="session.therapistId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary/70" />
                              Lead Therapist
                            </FormLabel>
                            <Select
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => {
                                field.onChange(parseInt(value));
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a therapist" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {allies.map((ally) => (
                                  <SelectItem key={ally.id} value={ally.id.toString()}>
                                    {ally.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Main therapist conducting the session
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Session Date + Time */}
                    <FormField
                      control={form.control}
                      name="session.sessionDate"
                      render={({ field }) => {
                        const [isCalendarOpen, setIsCalendarOpen] = useState(false);
                        
                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-primary/70" />
                              Date & Time
                            </FormLabel>
                            <Popover onOpenChange={setIsCalendarOpen} open={isCalendarOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className="w-full h-10 pl-3 text-left font-normal flex justify-between items-center border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                                    onClick={() => setIsCalendarOpen(true)} // Explicitly control open state
                                  >
                                    {field.value ? (
                                      <span>
                                        {format(field.value, "PPP")} at {format(field.value, "h:mm a")}
                                      </span>
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start" data-calendar-container="true">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    // Preserve the time from the current value
                                    if (date) {
                                      const hours = field.value ? field.value.getHours() : 9;
                                      const minutes = field.value ? field.value.getMinutes() : 0;
                                      date.setHours(hours, minutes);
                                    }
                                    
                                    field.onChange(date);
                                    // Do not close the popover yet
                                    hideUnwantedCalendars();
                                  }}
                                  initialFocus
                                />
                                
                                <div className="border-t p-3 border-border/50">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Time:</span>
                                    <select 
                                      className="flex-1 rounded-md border px-3 py-1.5 text-sm"
                                      value={field.value ? field.value.getHours() : 9}
                                      onChange={(e) => {
                                        const newDate = new Date(field.value || new Date());
                                        newDate.setHours(parseInt(e.target.value), newDate.getMinutes());
                                        field.onChange(newDate);
                                        
                                        const checkTimer = setTimeout(hideUnwantedCalendars, 50);
                                        return () => clearTimeout(checkTimer);
                                      }}
                                    >
                                      {Array.from({ length: 24 }).map((_, i) => (
                                        <option key={i} value={i}>
                                          {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                                        </option>
                                      ))}
                                    </select>
                                    <span>:</span>
                                    <select
                                      className="flex-1 rounded-md border px-3 py-1.5 text-sm"
                                      value={field.value ? field.value.getMinutes() : 0}
                                      onChange={(e) => {
                                        const newDate = new Date(field.value || new Date());
                                        newDate.setMinutes(parseInt(e.target.value));
                                        field.onChange(newDate);
                                      }}
                                    >
                                      {[0, 15, 30, 45].map((minute) => (
                                        <option key={minute} value={minute}>
                                          {minute.toString().padStart(2, "0")}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  <div className="mt-4 flex justify-end">
                                    <Button 
                                      type="button" 
                                      size="sm"
                                      className="flex items-center gap-2"
                                      onClick={() => setIsCalendarOpen(false)}
                                    >
                                      <Check className="h-4 w-4" />
                                      <span>Set Date & Time</span>
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Duration */}
                    <FormField
                      control={form.control}
                      name="session.duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Hourglass className="h-4 w-4 text-primary/70" />
                            Duration (minutes)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
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
                          <FormLabel className="flex items-center gap-2">
                            <MapPinIcon className="h-4 w-4 text-primary/70" />
                            Location
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Session Title */}
                    <FormField
                      control={form.control}
                      name="session.title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary/70" />
                            Session Title
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="session.description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-primary/70" />
                            Session Description
                          </FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Participants Tab */}
                <TabsContent value="participants" className="mt-0 space-y-6 px-4">
                  <div className="grid gap-5 py-4">
                    {/* Present Allies/Participants */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary/80" />
                        <span>Present Allies</span>
                      </h3>
                      <div className="space-y-2 pl-7">
                        {allies.length === 0 ? (
                          <div className="text-muted-foreground text-sm italic">
                            No allies found for this client
                          </div>
                        ) : (
                          allies.map((ally) => (
                            <div key={ally.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`ally-${ally.id}`}
                                checked={form.getValues().sessionNote.presentAllyIds.includes(ally.id)}
                                onCheckedChange={(checked) => {
                                  const currentAllyIds = [...form.getValues().sessionNote.presentAllyIds];
                                  const currentAllies = [...form.getValues().sessionNote.presentAllies];
                                  
                                  if (checked) {
                                    // Add ally to the list
                                    if (!currentAllyIds.includes(ally.id)) {
                                      currentAllyIds.push(ally.id);
                                      currentAllies.push(ally.name);
                                    }
                                  } else {
                                    // Remove ally from the list
                                    const allyIdIndex = currentAllyIds.indexOf(ally.id);
                                    if (allyIdIndex !== -1) {
                                      currentAllyIds.splice(allyIdIndex, 1);
                                      currentAllies.splice(allyIdIndex, 1);
                                    }
                                  }
                                  
                                  form.setValue("sessionNote.presentAllyIds", currentAllyIds);
                                  form.setValue("sessionNote.presentAllies", currentAllies);
                                }}
                              />
                              <Label
                                htmlFor={`ally-${ally.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {ally.name} ({ally.relationship})
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Ratings Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary/80" />
                        <span>Session Ratings</span>
                      </h3>
                      <div className="space-y-6 pl-7">
                        <Controller
                          control={form.control}
                          name="sessionNote.moodRating"
                          render={({ field }) => (
                            <RatingSlider
                              value={field.value}
                              onChange={field.onChange}
                              label="Mood"
                              description="Client's emotional state during the session"
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
                              description="Client's ability to maintain attention"
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
                              description="Client's willingness to participate"
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
                              description="Client's energy and activity level"
                            />
                          )}
                        />
                      </div>
                    </div>

                    {/* Products Used Section */}
                    {budgetSettings && budgetSettings.isActive && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary/80" />
                          <span>Products & Services</span>
                        </h3>
                        <div className="space-y-4 pl-7">
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                              Record products or services used in this session
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-2"
                              onClick={() => setProductSelectionOpen(true)}
                            >
                              <Plus className="h-4 w-4" />
                              <span>Add Product</span>
                            </Button>
                          </div>
                          
                          {form.getValues().sessionNote.products.length === 0 ? (
                            <div className="text-sm text-muted-foreground italic">
                              No products added to this session
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {form.getValues().sessionNote.products.map((product, index) => (
                                <Card key={index} className="overflow-hidden">
                                  <div className="flex justify-between items-center p-3 bg-primary/5">
                                    <div className="font-medium flex items-center gap-2">
                                      <Package className="h-4 w-4 text-primary/70" />
                                      <span>{product.productDescription}</span>
                                    </div>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const products = [...form.getValues().sessionNote.products];
                                        products.splice(index, 1);
                                        form.setValue("sessionNote.products", products);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <CardContent className="py-3 flex justify-between items-center">
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Quantity:</span>{" "}
                                      <span className="font-medium">{product.quantity.toFixed(product.unitPrice % 1 === 0 ? 0 : 2)}</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Total:</span>{" "}
                                      <span className="font-medium">${(product.quantity * product.unitPrice).toFixed(2)}</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="sessionNote.notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary/70" />
                            Session Notes
                          </FormLabel>
                          <FormControl>
                            <Textarea rows={6} {...field} />
                          </FormControl>
                          <FormDescription>
                            Detailed notes about the session and observations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Performance Assessment Tab */}
                <TabsContent value="performance" className="mt-0 space-y-6 px-4">
                  <div className="py-4">
                    {/* Goals section header with add button */}
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary/80" />
                        <span>Goals Assessment</span>
                      </h3>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => setGoalSelectionOpen(true)}
                        disabled={!clientId || goals.length === 0}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Goal</span>
                      </Button>
                    </div>

                    {/* No goals message */}
                    {(!clientId || goals.length === 0) && (
                      <div className="text-center p-4 border rounded-md bg-muted/20">
                        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground mb-1">No goals available for assessment</p>
                        <p className="text-sm text-muted-foreground/70">
                          {!clientId 
                            ? "Select a client to view their goals" 
                            : "No goals have been created for this client"}
                        </p>
                      </div>
                    )}

                    {/* Performance assessments */}
                    <div className="space-y-6">
                      {form.getValues().performanceAssessments.map((assessment, assessmentIndex) => {
                        const goal = goals.find(g => g.id === assessment.goalId);
                        if (!goal) return null;
                        
                        return (
                          <Card key={assessment.goalId} className="border-primary/20">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Target className="h-4 w-4 text-primary/70" />
                                  {goal.title}
                                </CardTitle>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    const assessments = [...form.getValues().performanceAssessments];
                                    assessments.splice(assessmentIndex, 1);
                                    form.setValue("performanceAssessments", assessments);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <CardDescription>{goal.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                              {/* Goal notes */}
                              <div className="mb-5">
                                <Controller
                                  control={form.control}
                                  name={`performanceAssessments.${assessmentIndex}.notes`}
                                  render={({ field }) => (
                                    <div className="space-y-2">
                                      <Label className="text-sm">Assessment Notes</Label>
                                      <Textarea 
                                        placeholder="Add notes about overall progress on this goal"
                                        className="h-20"
                                        {...field}
                                      />
                                    </div>
                                  )}
                                />
                              </div>

                              {/* Milestones section */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-sm font-medium flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary/70" />
                                    <span>Milestones</span>
                                  </h4>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs flex items-center gap-1"
                                    onClick={() => {
                                      setCurrentGoalIndex(assessmentIndex);
                                      setSelectedGoalId(assessment.goalId);
                                      setMilestoneSelectionOpen(true);
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>Add</span>
                                  </Button>
                                </div>

                                {assessment.milestones.length === 0 ? (
                                  <div className="text-sm text-muted-foreground italic border p-3 rounded-md bg-muted/5">
                                    No milestones selected for assessment
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {assessment.milestones.map((milestone, milestoneIndex) => {
                                      const subgoal = subgoals.find(s => s.id === milestone.milestoneId);
                                      
                                      return (
                                        <div key={milestone.milestoneId} className="border rounded-md p-3 pb-4 bg-muted/5">
                                          <div className="flex justify-between items-start mb-3">
                                            <div className="space-y-1">
                                              <h5 className="text-sm font-medium flex items-center gap-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-primary/70" />
                                                {subgoal?.title || milestone.milestoneTitle || "Unnamed Milestone"}
                                              </h5>
                                              {subgoal?.description && (
                                                <p className="text-xs text-muted-foreground">{subgoal.description}</p>
                                              )}
                                            </div>
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7"
                                              onClick={() => {
                                                const assessments = [...form.getValues().performanceAssessments];
                                                assessments[assessmentIndex].milestones.splice(milestoneIndex, 1);
                                                form.setValue("performanceAssessments", assessments);
                                              }}
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                          
                                          {/* Rating slider for milestone */}
                                          <Controller
                                            control={form.control}
                                            name={`performanceAssessments.${assessmentIndex}.milestones.${milestoneIndex}.rating`}
                                            render={({ field }) => (
                                              <div className="space-y-2 mt-3">
                                                <div className="flex justify-between items-center">
                                                  <span className="text-xs">Performance Rating</span>
                                                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                                    {field.value || 0}
                                                  </Badge>
                                                </div>
                                                <Slider
                                                  value={[field.value || 0]}
                                                  min={0}
                                                  max={10}
                                                  step={1}
                                                  onValueChange={(vals) => field.onChange(vals[0])}
                                                  className="py-0.5"
                                                />
                                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                                  <span>0</span>
                                                  <span>5</span>
                                                  <span>10</span>
                                                </div>
                                              </div>
                                            )}
                                          />
                                          
                                          {/* Notes for milestone */}
                                          <Controller
                                            control={form.control}
                                            name={`performanceAssessments.${assessmentIndex}.milestones.${milestoneIndex}.notes`}
                                            render={({ field }) => (
                                              <div className="space-y-1 mt-3">
                                                <Label className="text-xs">Notes</Label>
                                                <Textarea 
                                                  placeholder="Add notes about this milestone"
                                                  className="h-16 text-sm"
                                                  {...field}
                                                />
                                              </div>
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
                  </div>
                </TabsContent>
              </div>

              {/* Form buttons */}
              <div className="pt-2 px-4 flex justify-end gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  disabled={createSession.isPending}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSession.isPending}
                  className="gap-2"
                >
                  {createSession.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Create Session</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
      
      {/* Goal selection dialog */}
      <GoalSelectionDialog
        open={goalSelectionOpen}
        onOpenChange={setGoalSelectionOpen}
        goals={goals}
        selectedGoalIds={form.getValues().performanceAssessments.map(a => a.goalId)}
        onSelectGoal={handleGoalSelection}
      />
      
      {/* Milestone selection dialog */}
      <MilestoneSelectionDialog
        open={milestoneSelectionOpen}
        onOpenChange={setMilestoneSelectionOpen}
        subgoals={subgoals.filter(subgoal => 
          selectedGoalId === subgoal.goalId
        )}
        selectedMilestoneIds={
          currentGoalIndex !== null && form.getValues().performanceAssessments[currentGoalIndex]
            ? form.getValues().performanceAssessments[currentGoalIndex].milestones.map(m => m.milestoneId)
            : []
        }
        onSelectMilestone={handleMilestoneSelection}
      />
      
      {/* Product selection dialog */}
      <ProductSelectionDialog
        open={productSelectionOpen}
        onOpenChange={setProductSelectionOpen}
        products={availableProducts}
        onSelectProduct={handleAddProduct}
      />
    </Dialog>
  );
}