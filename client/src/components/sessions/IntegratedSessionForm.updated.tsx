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

// Session note schema 
const sessionNoteSchema = z.object({
  moodRating: z.number().min(1).max(10).default(5),
  focusRating: z.number().min(1).max(10).default(5),
  cooperationRating: z.number().min(1).max(10).default(5),
  physicalActivityRating: z.number().min(1).max(10).default(5),
  presentAllies: z.array(z.object({
    id: z.number(),
    name: z.string(),
    role: z.string().optional(),
  })).default([]),
  presentAllyIds: z.array(z.number()).default([]),
  notes: z.string().default(""),
  products: z.array(z.object({
    id: z.number().optional(),
    name: z.string(),
    code: z.string().optional(),
    quantity: z.number().min(1),
    unitPrice: z.number(),
    category: z.string().optional(),
  })).default([]),
  status: z.enum(["draft", "completed", "cancelled"]).default("draft"),
});

// Performance assessment schema for tracking goal progress
const performanceAssessmentSchema = z.object({
  goalId: z.number(),
  goalTitle: z.string(),
  rating: z.number().min(1).max(10).default(5),
  notes: z.string().default(""),
  milestones: z.array(z.object({
    milestoneId: z.number(),
    milestoneTitle: z.string(),
    rating: z.number().min(1).max(10).default(5),
    notes: z.string().default(""),
    strategies: z.array(z.string()).default([]),
  })).default([]),
});

// Combined schema for the entire form
const integratedSessionFormSchema = z.object({
  session: sessionFormSchema,
  sessionNote: sessionNoteSchema,
  performanceAssessments: z.array(performanceAssessmentSchema).default([]),
});

// Define form value type
type IntegratedSessionFormValues = z.infer<typeof integratedSessionFormSchema>;

// Rating slider component for consistent UI elements
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
        <div>
          <Label htmlFor="rating-slider">{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <span className="text-sm font-medium">{value}/10</span>
      </div>
      <Slider
        id="rating-slider"
        value={[value]}
        min={1}
        max={10}
        step={1}
        onValueChange={(vals) => onChange(vals[0])}
        className="py-1"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Low</span>
        <span>High</span>
      </div>
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

const GoalSelectionDialog = ({ 
  open, 
  onOpenChange, 
  goals, 
  selectedGoalIds, 
  onSelectGoal 
}: GoalSelectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Goal to Assess</DialogTitle>
          <DialogDescription>
            Choose a goal to evaluate progress during this session.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {goals.length === 0 ? (
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">No goals found for this client.</p>
            </div>
          ) : (
            goals
              .filter(goal => !selectedGoalIds.includes(goal.id))
              .map(goal => (
                <Card 
                  key={goal.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    onSelectGoal(goal);
                    onOpenChange(false);
                  }}
                >
                  <CardContent className="p-4">
                    <h4 className="font-medium">{goal.title}</h4>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Milestone selection dialog component
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Milestone to Assess</DialogTitle>
          <DialogDescription>
            Choose a milestone to evaluate progress during this session.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {subgoals.length === 0 ? (
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">No milestones found for this goal.</p>
            </div>
          ) : (
            subgoals
              .filter(subgoal => !selectedMilestoneIds.includes(subgoal.id))
              .map(subgoal => (
                <Card 
                  key={subgoal.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    onSelectMilestone(subgoal);
                    onOpenChange(false);
                  }}
                >
                  <CardContent className="p-4">
                    <h4 className="font-medium">{subgoal.title}</h4>
                    {subgoal.description && (
                      <p className="text-sm text-muted-foreground mt-1">{subgoal.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main form component
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
  
  // Generate a unique ID for the session
  const generateSessionId = () => {
    const timestamp = new Date().getTime().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `S-${timestamp}${randomStr}`.toUpperCase();
  };
  
  const sessionId = generateSessionId();

  // Dialog states for goal and milestone selection
  const [goalSelectionOpen, setGoalSelectionOpen] = useState(false);
  const [milestoneSelectionOpen, setMilestoneSelectionOpen] = useState(false);
  const [milestoneGoalId, setMilestoneGoalId] = useState<number | null>(null);
  const [currentGoalIndex, setCurrentGoalIndex] = useState<number | null>(null);
  
  // Product selection state
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  
  // Create a lookup for all subgoals by goal ID
  const [subgoalsByGoal, setSubgoalsByGoal] = useState<Record<number, Subgoal[]>>({});
  
  // Track currently selected goal ID for fetching subgoals
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

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

  // Update form when client is changed
  useEffect(() => {
    if (initialClient?.id && initialClient.id !== clientId) {
      form.setValue("session.clientId", initialClient.id);
    }
  }, [initialClient, form, clientId]);

  // Calculate available products
  const availableProducts = useMemo(() => {
    if (!budgetSettings || !budgetItems.length) return [];
    
    // Group by item code and calculate available quantity
    const itemsByCode: Record<string, {
      item: BudgetItem, 
      totalQuantity: number, 
      usedQuantity: number
    }> = {};
    
    budgetItems.forEach((item: BudgetItem) => {
      if (!itemsByCode[item.code]) {
        itemsByCode[item.code] = {
          item,
          totalQuantity: 0,
          usedQuantity: 0
        };
      }
      
      // Total quantity of this item in the budget
      itemsByCode[item.code].totalQuantity += item.quantity;
      
      // Handle usage tracking (would need to be calculated from session data)
      // This is a placeholder - in a real app, you'd fetch usage from sessions
      itemsByCode[item.code].usedQuantity += 0; // For now, assume no usage
    });
    
    // Convert to array of available products
    return Object.values(itemsByCode)
      .filter(entry => entry.totalQuantity > entry.usedQuantity)
      .map(entry => ({
        ...entry.item,
        availableQuantity: entry.totalQuantity - entry.usedQuantity
      }));
  }, [budgetSettings, budgetItems]);

  // Handle selection of products
  const handleAddProduct = (product: any, quantity: number) => {
    const currentProducts = form.getValues("sessionNote.products") || [];
    
    // Check if this product is already added
    const existingIndex = currentProducts.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      // Update existing product
      const updatedProducts = [...currentProducts];
      updatedProducts[existingIndex].quantity += quantity;
      form.setValue("sessionNote.products", updatedProducts);
    } else {
      // Add new product
      form.setValue("sessionNote.products", [
        ...currentProducts,
        {
          id: product.id,
          name: product.name,
          code: product.code,
          quantity: quantity,
          unitPrice: product.unitPrice,
          category: product.category
        }
      ]);
    }
    
    // Update selectedProducts for UI
    setSelectedProducts(form.getValues("sessionNote.products"));
  };

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      // Create session first
      const session = await apiRequest("POST", "/api/sessions", {
        ...data.session
      });
      
      // Then create session note with session ID
      const sessionNote = await apiRequest("POST", `/api/sessions/${session.id}/notes`, {
        ...data.sessionNote,
        sessionId: session.id
      });
      
      // Create performance assessments if any
      if (data.performanceAssessments.length > 0) {
        for (const assessment of data.performanceAssessments) {
          await apiRequest("POST", `/api/sessions/${session.id}/notes/${sessionNote.id}/assessments`, {
            ...assessment,
            sessionNoteId: sessionNote.id
          });
        }
      }
      
      return session;
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      
      // Close form and show success message
      onOpenChange(false);
      toast({
        title: "Session created",
        description: "Session was successfully created.",
      });
    },
    onError: (error) => {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "There was an error creating the session.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  function onSubmit(data: IntegratedSessionFormValues) {
    createSession.mutate(data);
  }

  // Handle client selection change
  const handleClientChange = (clientId: number) => {
    form.setValue("session.clientId", clientId);
    
    // Reset any client-specific data
    form.setValue("performanceAssessments", []);
    form.setValue("sessionNote.presentAllies", []);
    form.setValue("sessionNote.presentAllyIds", []);
    form.setValue("sessionNote.products", []);
    setSelectedProducts([]);
  };

  // Handle ally selection for participants
  const handleAllySelection = (allyId: number, selected: boolean) => {
    const currentAllies = form.getValues("sessionNote.presentAllies") || [];
    const currentAllyIds = form.getValues("sessionNote.presentAllyIds") || [];
    
    if (selected) {
      // Add ally
      const ally = allies.find(a => a.id === allyId);
      if (ally) {
        form.setValue("sessionNote.presentAllies", [
          ...currentAllies, 
          { 
            id: ally.id, 
            name: ally.name, 
            role: ally.relationship 
          }
        ]);
        form.setValue("sessionNote.presentAllyIds", [...currentAllyIds, ally.id]);
      }
    } else {
      // Remove ally
      form.setValue("sessionNote.presentAllies", currentAllies.filter(a => a.id !== allyId));
      form.setValue("sessionNote.presentAllyIds", currentAllyIds.filter(id => id !== allyId));
    }
  };

  // Get currently selected goals as a list of IDs for checking
  const selectedGoalIds = form.getValues("performanceAssessments")?.map(a => a.goalId) || [];

  // Handler for goal selection
  const handleGoalSelection = (goal: Goal) => {
    // Don't add duplicates
    if (selectedGoalIds.includes(goal.id)) return;
    
    // Fetch subgoals for this goal if not already fetched
    setSelectedGoalId(goal.id);
    
    // Add goal to form
    const currentAssessments = form.getValues("performanceAssessments") || [];
    form.setValue("performanceAssessments", [
      ...currentAssessments,
      {
        goalId: goal.id,
        goalTitle: goal.title,
        rating: 5, // Default rating
        notes: "",
        milestones: []
      }
    ]);
  };

  // Handler for milestone selection
  const handleMilestoneSelection = (subgoal: Subgoal) => {
    if (currentGoalIndex === null) return;
    
    const assessments = [...form.getValues("performanceAssessments")];
    
    // Don't add duplicate milestones
    const existingMilestoneIds = assessments[currentGoalIndex].milestones.map(m => m.milestoneId);
    if (existingMilestoneIds.includes(subgoal.id)) return;
    
    // Add milestone to the current goal
    assessments[currentGoalIndex].milestones.push({
      milestoneId: subgoal.id,
      milestoneTitle: subgoal.title,
      rating: 5, // Default rating
      notes: "",
      strategies: []
    });
    
    form.setValue("performanceAssessments", assessments);
  };
  
  // Add event listener to hide unwanted calendars
  useLayoutEffect(() => {
    hideUnwantedCalendars();
    window.addEventListener('click', hideUnwantedCalendars);
    return () => {
      window.removeEventListener('click', hideUnwantedCalendars);
    };
  }, []);

  // Get the subgoals for a specific goal
  const getSubgoalsForGoal = (goalId: number): Subgoal[] => {
    return subgoalsByGoal[goalId] || [];
  };

  // Return selected products for UI display
  const getCurrentSelectedProducts = () => {
    const products = form.getValues("sessionNote.products") || [];
    return products.map(product => ({
      ...product,
      totalPrice: product.quantity * product.unitPrice
    }));
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
    
    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value);
      if (!isNaN(value) && value > 0) {
        setQuantity(Math.min(value, selectedProduct?.availableQuantity || 1));
      }
    };
    
    const handleAddClick = () => {
      if (selectedProduct) {
        onSelectProduct(selectedProduct, quantity);
        setSelectedProduct(null);
        setQuantity(1);
        onOpenChange(false);
      }
    };
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              Select a product to add to this session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <p className="text-muted-foreground">No products available in client's budget.</p>
              </div>
            ) : (
              <>
                {/* Product selection */}
                <div className="space-y-2">
                  <Label htmlFor="product-select">Select Product</Label>
                  <Select 
                    onValueChange={(value) => {
                      const product = products.find(p => p.id.toString() === value);
                      if (product) {
                        setSelectedProduct(product);
                        setQuantity(1);
                      }
                    }}
                    value={selectedProduct?.id.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} ({product.availableQuantity} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Quantity selection - only show if product is selected */}
                {selectedProduct && (
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={selectedProduct.availableQuantity}
                        value={quantity}
                        onChange={handleQuantityChange}
                        className="w-20 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(quantity + 1, selectedProduct.availableQuantity))}
                        disabled={quantity >= selectedProduct.availableQuantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      
                      <span className="text-sm text-muted-foreground ml-2">
                        of {selectedProduct.availableQuantity} available
                      </span>
                    </div>
                    
                    {/* Product details */}
                    <div className="rounded-md border p-3 mt-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <span className="ml-1">${selectedProduct.unitPrice.toFixed(2)} each</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-1">${(selectedProduct.unitPrice * quantity).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Category:</span>
                          <span className="ml-1">{selectedProduct.category || "Uncategorized"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Code:</span>
                          <span className="ml-1">{selectedProduct.code || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              onClick={handleAddClick}
              disabled={!selectedProduct}
            >
              Add to Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      modal={true}
    >
      <DialogContent className={`max-w-7xl ${isFullScreen ? 'w-[95vw] h-[90vh]' : ''}`}>
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Record a therapy session with assessment and notes.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full mb-4">
                <TabsTrigger value="details">Session Details</TabsTrigger>
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="assessment">Assessment & Notes</TabsTrigger>
              </TabsList>
              
              {/* SESSION DETAILS TAB */}
              <TabsContent value="details" className="space-y-6">
                {/* Client and session date section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="session.clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select
                          onValueChange={(value) => handleClientChange(parseInt(value))}
                          defaultValue={field.value ? field.value.toString() : undefined}
                          value={field.value ? field.value.toString() : undefined}
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
                  
                  <FormField
                    control={form.control}
                    name="session.sessionDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Session Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild data-calendar-container="true">
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
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
                
                {/* Session title and duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="session.title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter session title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="session.duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="5" 
                            step="5" 
                            placeholder="60" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Location and session ID (read-only) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="session.location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter session location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="session.sessionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session ID</FormLabel>
                        <FormControl>
                          <Input readOnly {...field} />
                        </FormControl>
                        <FormDescription>
                          Auto-generated unique session identifier
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Session description (optional) */}
                <FormField
                  control={form.control}
                  name="session.description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a brief description of the session"
                          className="min-h-20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* PARTICIPANTS TAB */}
              <TabsContent value="participants" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                  {/* Left column (4/6) */}
                  <div className="md:col-span-4 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Session Attendees</CardTitle>
                        <CardDescription>
                          Select who was present during this session
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {allies.length === 0 ? (
                          <div className="text-center p-4 bg-muted/20 rounded-lg">
                            <p className="text-muted-foreground">No allies found for this client.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {allies.map((ally) => {
                              const allyIds = form.getValues("sessionNote.presentAllyIds") || [];
                              const isSelected = allyIds.includes(ally.id);
                              
                              return (
                                <div key={ally.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                                  <Checkbox
                                    id={`ally-${ally.id}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleAllySelection(ally.id, !!checked)}
                                  />
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`ally-${ally.id}`}
                                      className="font-medium cursor-pointer"
                                    >
                                      {ally.name}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                      {ally.relationship || "Relationship not specified"}
                                    </p>
                                    {ally.email && (
                                      <p className="text-xs text-muted-foreground">
                                        {ally.email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Products Used</CardTitle>
                        <CardDescription>
                          Record products or materials used during the session
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button
                          type="button"
                          onClick={() => setProductSelectionOpen(true)}
                          disabled={availableProducts.length === 0}
                          className="w-full"
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Add Product
                        </Button>
                        
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
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-muted-foreground flex items-center">
                                      <span>{product.quantity} × ${product.unitPrice.toFixed(2)}</span>
                                      <span className="mx-2">•</span>
                                      <span>{product.code || "No code"}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <div className="font-medium">${totalPrice.toFixed(2)}</div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeProduct(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                            
                            <div className="flex justify-between pt-2 font-medium">
                              <span>Total</span>
                              <span>
                                ${selectedProducts.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Right column (2/6) */}
                  <div className="md:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Client Ratings</CardTitle>
                        <CardDescription>
                          Rate the client's engagement during this session
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
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
                                  description="How was the client's mood?"
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
                                  description="How well did the client focus?"
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
                                  description="How cooperative was the client?"
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
                                  description="Rate physical engagement level"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              {/* ASSESSMENT & NOTES TAB */}
              <TabsContent value="assessment" className="space-y-6">
                <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                    {/* Left column (1/3) - Goal selection */}
                    <div className="md:w-1/3">
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Goal Progress</CardTitle>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!clientId || goals.length === 0}
                              onClick={() => setGoalSelectionOpen(true)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Goal
                            </Button>
                          </div>
                          <CardDescription>
                            Select goals to assess during this session
                          </CardDescription>
                        </CardHeader>
                        
                        {/* Goal Selection Dialog */}
                        <GoalSelectionDialog
                          open={goalSelectionOpen}
                          onOpenChange={setGoalSelectionOpen}
                          goals={goals}
                          selectedGoalIds={selectedGoalIds}
                          onSelectGoal={handleGoalSelection}
                        />
                        
                        {/* No goals selected message */}
                        {form.getValues("performanceAssessments").length === 0 ? (
                          <CardContent>
                            <div className="border rounded-md p-3 text-center">
                              <p className="text-muted-foreground">
                                No goals selected yet. Click "Add Goal" to start assessment.
                              </p>
                            </div>
                          </CardContent>
                        ) : (
                          <div className="px-6 pb-4 space-y-4">
                            {/* Render selected goals */}
                            {form.getValues("performanceAssessments").map((assessment, goalIndex) => {
                              // Find goal information
                              const goal = goals.find(g => g.id === assessment.goalId);
                              
                              // Find subgoals for this goal
                              const goalSubgoals = getSubgoalsForGoal(assessment.goalId);
                              
                              // Keep track of selected milestone IDs to avoid duplicates
                              const selectedMilestoneIds = assessment.milestones.map(m => m.milestoneId);
                              
                              return (
                                <Card key={assessment.goalId} className="border-muted">
                                  <CardHeader className="p-4 pb-3">
                                    <div className="flex justify-between items-start">
                                      <CardTitle className="text-sm font-medium">
                                        {goal?.title || assessment.goalTitle}
                                      </CardTitle>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 -mt-1 -mr-2"
                                        onClick={() => removeGoal(assessment.goalId)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {goal?.description && (
                                      <CardDescription className="text-xs mt-1">
                                        {goal.description}
                                      </CardDescription>
                                    )}
                                  </CardHeader>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    </div>
                    
                    {/* Middle column (1/3) - Session Notes */}
                    <div className="md:w-1/3">
                    </div>
                    
                    {/* Right column (1/3) - General Notes section */}
                    <div className="md:w-1/3">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">General Session Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <FormField
                            control={form.control}
                            name="sessionNote.notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <RichTextEditor
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    placeholder="Enter general notes about the session..."
                                    minHeight="min-h-[300px]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createSession.isPending}
              >
                {createSession.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Create Session"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}