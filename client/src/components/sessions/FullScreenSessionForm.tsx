import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
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
  Trash2,
  User as UserIcon,
  MapPin as MapPinIcon,
  ClipboardList,
  UserCheck,
  Package,
  BarChart,
  ShoppingBag,
  Users,
  AlertCircle
} from "lucide-react";
import "./session-form.css";
import { ThreeColumnLayout } from "./ThreeColumnLayout";
import { Ally, BudgetItem, BudgetSettings, Client, Goal, Subgoal, Strategy, insertSessionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { borderStyles } from "@/lib/border-styles";
import { StrategySelectionDialog } from "./StrategySelectionDialog";
import { AttendeeSelectionDialog } from "./AttendeeSelectionDialog";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Session form schema
const sessionFormSchema = insertSessionSchema.extend({
  sessionDate: z.coerce.date({
    required_error: "Session date is required",
  }),
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  therapistId: z.coerce.number().optional(), // Using coerce.number() to handle string values from Select
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
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
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<(BudgetItem & { availableQuantity: number }) | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Reset dialog state when closing
  useEffect(() => {
    if (!open) {
      setSelectedProduct(null);
      setQuantity(1);
      setSearchTerm("");
    }
  }, [open]);
  
  // Log products for debugging when dialog opens
  useEffect(() => {
    if (open) {
      console.log("ProductSelectionDialog opened with products:", products);
    }
  }, [open, products]);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) {
      console.log("No products available for filtering");
      return [];
    }
    
    if (!searchTerm.trim()) return products;
    const searchTermLower = searchTerm.toLowerCase();
    
    const filtered = products.filter(product => 
      (product.description?.toLowerCase() || "").includes(searchTermLower) ||
      (product.itemCode?.toLowerCase() || "").includes(searchTermLower)
    );
    
    console.log("Filtered products:", filtered);
    return filtered;
  }, [products, searchTerm]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };
  
  // Handle quantity validation and changes
  const handleQuantityChange = (value: number) => {
    if (!selectedProduct) return;
    
    if (value < 1) {
      setQuantity(1);
      toast({
        title: "Invalid quantity",
        description: "Quantity cannot be less than 1",
        variant: "destructive"
      });
      return;
    }
    
    if (value > selectedProduct.availableQuantity) {
      setQuantity(selectedProduct.availableQuantity);
      toast({
        title: "Quantity limit reached",
        description: `Maximum available quantity is ${selectedProduct.availableQuantity}`,
        variant: "destructive"
      });
      return;
    }
    
    setQuantity(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Product to Session</DialogTitle>
          <DialogDescription>
            Select a product from the active budget plan to add to this session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {products.length === 0 ? (
            <div className="text-center p-6 border rounded-md bg-muted/20">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">No products available</p>
              <p className="text-sm text-muted-foreground mt-1">Add products to the client's active budget plan first.</p>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div className="relative">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>

              {/* Product list */}
              <ScrollArea className="h-[240px] pr-2">
                <div className="space-y-2">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center p-4">
                      <p className="text-muted-foreground">No products match your search</p>
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <Card 
                        key={product.id} 
                        className={`cursor-pointer hover:bg-accent/50 transition-colors ${selectedProduct?.id === product.id ? 'border-primary bg-primary/10' : ''}`}
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
                              <p className="font-medium">{formatCurrency(product.unitPrice)}</p>
                              <p className="text-sm text-muted-foreground">
                                Available: {product.availableQuantity}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Quantity selector */}
              {selectedProduct && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Selected Product:</h4>
                    <p>{selectedProduct.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity" className="text-sm font-medium mb-1.5 block">
                        Quantity
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <Input
                          id="quantity"
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
                          className="w-16 text-center"
                        />
                        
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setQuantity(Math.min(selectedProduct.availableQuantity, quantity + 1))}
                          disabled={quantity >= selectedProduct.availableQuantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Total</Label>
                      <div className="h-9 rounded-md border px-3 flex items-center bg-muted/50">
                        <p className="font-medium">
                          {formatCurrency(selectedProduct.unitPrice * quantity)}
                        </p>
                      </div>
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
  // Create a ref to track previous clientId for handling client changes
  const previousClientIdRef = useRef<number | null>(null);
  const formInitializedRef = useRef<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const [showAttendeeDialog, setShowAttendeeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [currentGoalId, setCurrentGoalId] = useState<number | null>(null);
  const [currentMilestoneId, setCurrentMilestoneId] = useState<number | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("session");
  
  // CRITICAL FIX: Track the exact time when product dialog is opened
  // This forces the availableProducts calculation to re-run
  const [productDialogOpenTime, setProductDialogOpenTime] = useState(Date.now());

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
      location: "Clinic",
      clientId: initialClient?.id || 0,
      therapistId: undefined,    // Clinician field (newly added)
      timeFrom: "09:00",         // Time From field (newly added)
      timeTo: "10:00",           // Time To field (newly added)
      title: "Therapy Session",  // Required field in schema but will be hidden
      duration: 60,              // Required field in schema but will be hidden
      status: "scheduled",       // Required field in schema
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

  // Reset form values when form dialog is closed and reset form when reopened
  useEffect(() => {
    // When the form is closed, mark it as not initialized
    if (!open) {
      // Simply mark as not initialized when closing
      formInitializedRef.current = false;
    } 
    // When the form is opened
    else if (open) {
      // Reset form to default values when opening the form
      if (!formInitializedRef.current) {
        // Generate a new session ID for this session
        const now = new Date();
        const newSessionId = `ST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Use the default values we defined above rather than creating a new object
        form.reset({
          ...defaultValues,
          session: {
            ...defaultValues.session,
            sessionId: newSessionId,
            sessionDate: new Date(),
            clientId: initialClient?.id || 0
          }
        });
        
        // Mark as initialized after reset is complete
        formInitializedRef.current = true;
      }
      
      // Set client ID if we have an initial client (simplified logic)
      if (initialClient) {
        form.setValue("session.clientId", initialClient.id);
      }
    }
  }, [open, initialClient, form, defaultValues]);

  // Watch clientId to update related data
  const clientId = form.watch("session.clientId");

  // Store clientId in queryClient for cross-component access
  useEffect(() => {
    if (clientId) {
      console.log("Client ID changed to:", clientId);
      queryClient.setQueryData(['formState'], { clientId });
      
      // Get previous client ID stored in ref to detect actual changes
      const prevClientId = previousClientIdRef.current;
      
      // Only reset attendees if this is a real change, not just initial setting
      if (prevClientId && prevClientId !== clientId) {
        console.log("Client changed from", prevClientId, "to", clientId, "- resetting attendees list");
        // Reset the attendees lists
        form.setValue("sessionNote.presentAllies", [], { shouldDirty: true, shouldValidate: false });
        form.setValue("sessionNote.presentAllyIds", [], { shouldDirty: true, shouldValidate: false });
        
        // Show notification to the user
        toast({
          title: "Client changed",
          description: "Attendee list has been reset for the new client.",
        });
      }
      
      // Store current client ID for next comparison
      previousClientIdRef.current = clientId;
    }
  }, [clientId, queryClient, form]);
  
  // Log when the allies query parameters change
  useEffect(() => {
    console.log("Allies query enabled status:", open && !!clientId);
    console.log("Allies query parameters:", { 
      open, 
      clientId,
      queryKey: ["/api/clients", clientId, "allies"]
    });
  }, [open, clientId]);

  // Fetch clients for client dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });

  // Fetch allies for the selected client for attendee selection
  const alliesQuery = useQuery<Ally[]>({
    queryKey: ["/api/clients", clientId, "allies"],
    queryFn: async () => {
      console.log("Fetching allies for client ID:", clientId);
      const response = await fetch(`/api/clients/${clientId}/allies`);
      if (!response.ok) {
        throw new Error(`Error fetching allies: ${response.status}`);
      }
      const data = await response.json();
      console.log("Allies data received:", JSON.stringify(data));
      return data;
    },
    enabled: open && !!clientId,
  });
  
  // Extract allies data and handle logs separately to avoid TypeScript errors
  const allies = alliesQuery.data || [];
  
  // Log allies info when data changes - this helps debug when client selection changes
  useEffect(() => {
    if (alliesQuery.data) {
      console.log("Allies fetched successfully for client ID:", clientId);
      console.log("Allies data:", alliesQuery.data);
      console.log("Allies count:", alliesQuery.data.length);
    }
    if (alliesQuery.error) {
      console.error("Error fetching allies for client ID:", clientId);
      console.error("Error details:", alliesQuery.error);
    }
  }, [alliesQuery.data, alliesQuery.error, clientId]);

  // Fetch goals for assessment
  const { data: goals = [], error: goalsError, isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ["/api/clients", clientId, "goals"],
    enabled: open && !!clientId,
    queryFn: async () => {
      console.log("DIRECT FETCH: Fetching goals for client ID:", clientId);
      try {
        const response = await fetch(`/api/clients/${clientId}/goals`);
        if (!response.ok) {
          console.error(`Error fetching goals: ${response.status}`, response);
          throw new Error(`Error fetching goals: ${response.status}`);
        }
        const data = await response.json();
        console.log("DIRECT FETCH: Goals data received:", data);
        
        // Enhanced debug logging for goals data
        if (Array.isArray(data)) {
          console.log(`GOALS DATA: Found ${data.length} goals for client ${clientId}`);
          data.forEach((goal, index) => {
            console.log(`Goal ${index + 1}: ID=${goal.id}, Title=${goal.title}`);
          });
        } else {
          console.warn("GOALS DATA WARNING: Received non-array data:", data);
        }
        
        return data;
      } catch (error) {
        console.error("DIRECT FETCH: Error in goals query:", error);
        throw error;
      }
    },
    staleTime: 10000, // Reduce refetching to avoid race conditions
  });
  
  // Get selected goal IDs from form state
  const selectedPerformanceAssessments = form.watch("performanceAssessments") || [];
  const selectedGoalIds = selectedPerformanceAssessments.map(assessment => assessment.goalId);
  
  // Debug logs for goals fetching and selection process
  useEffect(() => {
    if (open && clientId) {
      console.log(`DEBUG GOALS: Fetching status for client ${clientId}, showGoalDialog=${showGoalDialog}`);
      console.log(`DEBUG GOALS: isLoading=${isLoadingGoals}, goals count=${goals?.length || 0}`);
      
      if (goals && goals.length > 0) {
        console.log("DEBUG GOALS: Goals data available:", 
          goals.map(g => ({id: g.id, title: g.title}))
        );
      } else {
        console.log("DEBUG GOALS: No goals data available yet");
      }
      
      if (goalsError) {
        console.error("Error fetching goals:", goalsError);
      }
      
      // Add explicit logging when dialog is opened
      if (showGoalDialog) {
        console.log("GOAL DIALOG OPENED with these goals:", goals);
        console.log("Selected goal IDs when dialog opened:", selectedGoalIds);
        
        // Additional logging about selected assessments
        const assessments = form.getValues("performanceAssessments") || [];
        console.log("Current performance assessments:", assessments);
      }
    }
  }, [open, clientId, goals, goalsError, showGoalDialog, isLoadingGoals, selectedGoalIds, form]);

  // Debug logs for goals fetching
  // Enhanced debugging for goals fetching and selection process
  useEffect(() => {
    if (open && clientId) {
      console.log(`DEBUG GOALS: Fetching status for client ${clientId}, showGoalDialog=${showGoalDialog}`);
      console.log(`DEBUG GOALS: isLoading=${isLoadingGoals}, goals count=${goals?.length || 0}`);
      
      if (goals && goals.length > 0) {
        console.log("DEBUG GOALS: Goals data available:", 
          goals.map(g => ({id: g.id, title: g.title}))
        );
      } else {
        console.log("DEBUG GOALS: No goals data available yet");
      }
      
      if (goalsError) {
        console.error("Error fetching goals:", goalsError);
      }
      
      // Add explicit logging when dialog is opened
      if (showGoalDialog) {
        console.log("GOAL DIALOG OPENED with these goals:", goals);
        console.log("Selected goal IDs when dialog opened:", selectedGoalIds);
        
        // Additional logging about selected assessments
        const assessments = form.getValues("performanceAssessments") || [];
        console.log("Current performance assessments:", assessments);
      }
    }
  }, [open, clientId, goals, goalsError, showGoalDialog, isLoadingGoals, selectedGoalIds, form]);

  // Fetch subgoals for the currently selected goal
  const { data: subgoals = [] } = useQuery<Subgoal[]>({
    queryKey: ["/api/goals", currentGoalId, "subgoals"],
    enabled: open && !!currentGoalId,
  });

  // Get selected milestone IDs for the currently active goal
  const currentGoalAssessment = selectedPerformanceAssessments.find(a => a.goalId === currentGoalId);
  const selectedMilestoneIds = currentGoalAssessment?.milestones.map(m => m.milestoneId) || [];

  // Budget items for product selection
  const { data: budgetSettings, isLoading: isLoadingBudgetSettings } = useQuery<BudgetSettings>({
    queryKey: ["/api/clients", clientId, "budget-settings"],
    queryFn: async () => {
      console.log("Fetching budget settings for client ID:", clientId);
      try {
        const response = await fetch(`/api/clients/${clientId}/budget-settings`);
        if (!response.ok) {
          throw new Error(`Error fetching budget settings: ${response.status}`);
        }
        const data = await response.json();
        console.log("Budget settings data received:", JSON.stringify(data));
        
        // Check if we got an active budget plan
        if (!data || (Array.isArray(data) && data.length === 0)) {
          console.warn("WARNING: No budget settings found for client", clientId);
          return null;
        }
        
        // If we got an array instead of a single object, find the active one
        if (Array.isArray(data)) {
          const activePlan = data.find(plan => plan.isActive === true);
          console.log("Active plan found:", activePlan);
          return activePlan || data[0]; // Use active plan or first plan as fallback
        }
        
        return data;
      } catch (error) {
        console.error("Error in budget settings query:", error);
        throw error;
      }
    },
    enabled: open && !!clientId,
    staleTime: 5000, // Refresh every 5 seconds to avoid stale data
  });

  const { data: budgetItems = [], isLoading: isLoadingBudgetItems } = useQuery<BudgetItem[]>({
    queryKey: ["/api/clients", clientId, "budget-items"],
    queryFn: async () => {
      console.log("Fetching budget items for client ID:", clientId);
      try {
        const response = await fetch(`/api/clients/${clientId}/budget-items`);
        if (!response.ok) {
          throw new Error(`Error fetching budget items: ${response.status}`);
        }
        const data = await response.json();
        console.log("Budget items data received:", JSON.stringify(data));
        
        // Ensure we got valid data
        if (!data || (Array.isArray(data) && data.length === 0)) {
          console.warn("WARNING: No budget items found for client", clientId);
          return [];
        }
        
        return data;
      } catch (error) {
        console.error("Error in budget items query:", error);
        throw error;
      }
    },
    enabled: open && !!clientId,
    staleTime: 5000, // Refresh every 5 seconds to avoid stale data
  });

  // Fetch available strategies for milestone assessment
  const { data: strategies = [] } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
    enabled: open && showStrategyDialog,
  });

  // Prepare products for selection dialog from active budget plan
  const availableProducts = useMemo(() => {
    // Log the data we're working with for debugging
    console.log("Budget items in availableProducts:", budgetItems);
    console.log("Budget settings in availableProducts:", budgetSettings);
    
    // Debug mode disabled for production use - will use actual budget items
    const debugMode = false; // Disabled to show real products from active budget plan
    
    if (debugMode) {
      console.log("Debug mode enabled - returning test products");
      // Add some test products to ensure the button works
      const testProducts = Array(3).fill(null).map((_, index) => ({
        id: 1000 + index,
        clientId: clientId || 0,
        budgetSettingsId: budgetSettings?.id || 0,
        itemCode: `TEST-${index + 1}`,
        name: `Test Product ${index + 1}`, // Fix LSP error by adding required name field
        description: `Test Product ${index + 1}`,
        quantity: 10,
        unitPrice: 25.99,
        unitOfMeasure: "each",
        category: "Test" as string | null, // Match expected type
        availableQuantity: 10,
        originalQuantity: 10
      }));
      
      console.log("Debug test products:", testProducts);
      return testProducts;
    }
    
    if (!budgetItems || !budgetItems.length) {
      console.log("No budget items available");
      return [];
    }
    
    // Get currently selected products from form
    const selectedProducts = form.watch("sessionNote.products") || [];
    console.log("Selected products in THIS SESSION FORM:", selectedProducts);
    
    // CRITICAL FIX: Create a lookup of already selected quantities by budget item ID
    // This ensures we track what is selected in the current session form
    const selectedQuantitiesByItemId: Record<number, number> = {};
    
    // Process all selected products to build the lookup table
    selectedProducts.forEach(product => {
      const itemId = Number(product.budgetItemId);
      if (!selectedQuantitiesByItemId[itemId]) {
        selectedQuantitiesByItemId[itemId] = 0;
      }
      selectedQuantitiesByItemId[itemId] += Number(product.quantity || 0);
    });
    
    console.log("Session form - Selected quantities by item ID:", selectedQuantitiesByItemId);
    
    // FIXED: No longer use fallback logic that includes budget items from inactive plans
    // But add special handling for race conditions
    if (!budgetSettings) {
      console.log("No active budget settings available - cannot show any products");
      
      // CRITICAL FIX: The root cause is returning an empty array here. 
      // Instead, let's handle budget items differently
      
      // CRITICAL BUGFIX: If we have budget items, process them ALL as active
      if (budgetItems && budgetItems.length > 0) {
        console.log("RACE CONDITION FIX: We have budget items but no budget settings");
        console.log("Processing all budget items as active plan items");
        
        // Return all budget items marked as active plan
        return budgetItems
          .filter(item => {
            // Get original quantity
            const originalQuantity = Number(item.quantity || 0);
            
            // Get already selected quantity in this session form
            const alreadySelectedInForm = selectedQuantitiesByItemId[item.id] || 0;
            
            // Calculate remaining available quantity
            const availableQuantity = originalQuantity - alreadySelectedInForm;
            
            console.log(`Item ${item.id} (${item.description || 'unknown'}): Original=${originalQuantity}, Selected=${alreadySelectedInForm}, Available=${availableQuantity}`);
            
            // CRITICAL: Only include items that still have available quantity
            return availableQuantity > 0;
          })
          .map(item => {
            // Get original quantity
            const originalQuantity = Number(item.quantity || 0);
            
            // Get already selected quantity in this session form
            const alreadySelectedInForm = selectedQuantitiesByItemId[item.id] || 0;
            
            // Calculate remaining available quantity
            const availableQuantity = originalQuantity - alreadySelectedInForm;
            
            console.log(`Processing item ${item.id} (${item.description || 'unknown'}) as active`);
            
            // Mark every item as from the active plan
            return {
              ...item,
              isActivePlan: true, // CRITICAL: Mark all as active
              availableQuantity: availableQuantity, // FIXED: Use calculated available quantity
              originalQuantity: originalQuantity
            };
          });
      } else {
        // Only return empty array if we truly have no budget items
        console.log("No budget items available at all");
        return [];
      }
    }

    // Filter only products from the active budget plan
    const filteredProducts = budgetItems
      .filter((item: BudgetItem) => {
        // Major issue: Let's log more details about the items and active plan
        console.log(`Checking item ${item.id} (${item.description || 'unknown'}): budgetSettingsId=${item.budgetSettingsId}, quantity=${item.quantity}`);
        
        if (budgetSettings) {
          console.log(`Active plan ID=${budgetSettings.id}, isActive=${budgetSettings.isActive}`);
        } else {
          console.log("FIX APPLIED: Treating item as from active plan by default");
          // CRITICAL FIX: If we have budget items but no settings, consider everything active
          // This works with our ProductSelectionDialog fix above
          return true; // Let the processing continue to mark items as active
        }
        
        // CRITICAL RULE: Only include items from active budget plans
        // 1. Check if item belongs to the active plan - EXACT match required
        const isActivePlan = Number(item.budgetSettingsId) === Number(budgetSettings.id);
        
        // 2. Calculate available quantity considering what's already selected in this form
        const originalQuantity = Number(item.quantity || 0);
        const alreadySelectedInForm = selectedQuantitiesByItemId[item.id] || 0;
        const availableQuantity = originalQuantity - alreadySelectedInForm;
        
        // Only show items with remaining quantity
        const hasAvailableQuantity = availableQuantity > 0;
        
        if (!isActivePlan) {
          console.log(`Item ${item.id} skipped: not from active plan (${item.budgetSettingsId} != ${budgetSettings.id})`);
        }
        
        if (!hasAvailableQuantity) {
          console.log(`Item ${item.id} skipped: no available quantity (original=${originalQuantity}, used in form=${alreadySelectedInForm})`);
        }
        
        // Additional debug
        console.log(`Item ${item.id} result: isActivePlan=${isActivePlan}, hasAvailableQuantity=${hasAvailableQuantity}`);
        
        // Both conditions must be true
        return isActivePlan && hasAvailableQuantity;
      })
      .map((item: BudgetItem) => {
        // Get the original quantity
        const originalQuantity = Number(item.quantity || 0);
        
        // Get what's already been selected in this form
        const alreadySelectedInForm = selectedQuantitiesByItemId[item.id] || 0;
        
        // Calculate the remaining available quantity
        const availableQuantity = originalQuantity - alreadySelectedInForm;
        
        // For debugging
        console.log(`Item ${item.id} (${item.description}): Original quantity=${originalQuantity}, Already selected IN FORM=${alreadySelectedInForm}, Available=${availableQuantity}`);
        
        // Calculate if this is from the active plan
        // FIX: Force strict number comparison with Number() to avoid type issues
        // FIX: Handle the case where budgetSettings is undefined (possible race condition)
        const isActivePlan = budgetSettings ? 
          Number(item.budgetSettingsId) === Number(budgetSettings.id) : 
          true; // If no budget settings, consider everything active
        
        console.log(`Item ${item.id} (${item.description || 'unknown'}): budgetSettingsId=${item.budgetSettingsId} (${typeof item.budgetSettingsId}), activePlanId=${budgetSettings?.id} (${typeof budgetSettings?.id}), isActivePlan=${isActivePlan}`);
        
        return {
          ...item,
          isActivePlan, // CRITICAL: Pass along whether this item is from active plan
          availableQuantity, // Use the calculated available quantity
          originalQuantity // Store the original quantity for reference
        };
      })
      .filter(item => item.availableQuantity > 0);  // Only show items with available quantity
      
    console.log("Filtered products:", filteredProducts);
    
    // Add detailed debugging for each filtered item
    if (filteredProducts.length === 0) {
      console.log("WARNING: No filtered products available after processing");
      console.log("CHECK: Budget settings ID:", budgetSettings?.id);
      console.log("CHECK: Is budgetSettings defined?", !!budgetSettings);
      
      // Manually check budget items and settings for this client
      if (clientId) {
        console.log(`Checking settings and items for client ${clientId} directly via API`);
        
        // Make direct API calls to verify data
        fetch(`/api/clients/${clientId}/budget-settings`)
          .then(res => res.json())
          .then(data => {
            console.log("DEBUG API: Budget settings for client:", data);
            
            if (Array.isArray(data) && data.length > 0) {
              console.log("Active settings found from API:", data.find(s => s.isActive === true));
            }
            
            // Then fetch budget items
            return fetch(`/api/clients/${clientId}/budget-items`);
          })
          .then(res => res.json())
          .then(items => {
            console.log("DEBUG API: Budget items for client:", items);
            
            // Check which items belong to the active plan
            if (budgetSettings && items && items.length > 0) {
              const activePlanId = budgetSettings.id;
              const itemsInActivePlan = items.filter((item: BudgetItem) => Number(item.budgetSettingsId) === Number(activePlanId));
              console.log("DEBUG API: Items in active plan:", itemsInActivePlan);
              console.log("DEBUG API: Active plan ID:", activePlanId);
              
              // Check if there's a type mismatch issue
              if (itemsInActivePlan.length === 0) {
                console.warn("WARNING: Type mismatch may be causing filtering issues");
                items.forEach((item: BudgetItem, index: number) => {
                  console.log(`Item ${index+1}: ID=${item.id}, budgetSettingsId=${item.budgetSettingsId} (${typeof item.budgetSettingsId}), activePlanId=${activePlanId} (${typeof activePlanId})`);
                });
              }
            }
          })
          .catch(err => console.error("Error fetching budget data:", err));
      }
      
      if (budgetItems && budgetItems.length) {
        console.log("Original budget items before filtering:");
        budgetItems.forEach((item: any, index: number) => {
          console.log(`Item ${index+1}: ID=${item.id}, Description=${item.description}, Quantity=${item.quantity}, BudgetSettingsId=${item.budgetSettingsId}`);
        });
        
        // Check specifically which items match the active plan
        if (budgetSettings) {
          const activePlanId = budgetSettings.id;
          // Fix: Use Number to ensure strict type comparison
          const itemsMatchingActivePlan = budgetItems.filter(item => Number(item.budgetSettingsId) === Number(activePlanId));
          console.log(`Found ${itemsMatchingActivePlan.length} items matching active plan ID ${activePlanId}:`, itemsMatchingActivePlan);
          
          // Extended debug information
          if (itemsMatchingActivePlan.length === 0) {
            console.warn("WARNING: No matching items found in active plan - this is likely a type mismatch");
            console.log("Detailed comparison of budget settings ID vs item budget settings IDs:");
            
            budgetItems.forEach((item, index) => {
              console.log(`${index}. Item(${item.id}): budgetSettingsId=${item.budgetSettingsId} (${typeof item.budgetSettingsId})`);
            });
            console.log(`Active Plan ID: ${activePlanId} (${typeof activePlanId})`);
            
            // Try with string comparison
            const itemsWithStringComparison = budgetItems.filter(item => String(item.budgetSettingsId) === String(activePlanId));
            console.log(`Items with string comparison: ${itemsWithStringComparison.length}`);
          }
        }
      } else {
        console.log("No budget items found at all");
      }
    }
    
    return filteredProducts;
  }, [budgetItems, budgetSettings, form, clientId, productDialogOpenTime, form.watch("sessionNote.products")]);

  // Form submission handler
  const createSessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      console.log("Form submit data:", data);
      
      // Ensure therapistId is properly formatted
      const sessionData = {
        ...data.session,
        therapistId: data.session.therapistId ? Number(data.session.therapistId) : undefined
      };
      
      console.log("Formatted session data:", sessionData);

      // First create the session
      const sessionResponse = await apiRequest("POST", "/api/sessions", sessionData);
      console.log("Session created:", sessionResponse);

      if (!sessionResponse || !('id' in sessionResponse)) {
        throw new Error("Failed to create session");
      }

      // Create session notes with the session ID
      const sessionNoteData = {
        ...data.sessionNote,
        sessionId: sessionResponse.id,
      };

      const noteResponse = await apiRequest("POST", "/api/session-notes", sessionNoteData);
      console.log("Session note created:", noteResponse);

      if (!noteResponse || !('id' in noteResponse)) {
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
    // Safety check - if we're showing one of our internal dialogs, don't submit
    if (showAttendeeDialog || showProductDialog || showGoalDialog || showMilestoneDialog || showStrategyDialog) {
      console.log("Preventing submission while dialog is open");
      return;
    }
    
    // ADDITIONAL SAFETY CHECK: If there's a mutation in progress, don't submit again
    if (createSessionMutation.isPending) {
      console.log("Preventing duplicate submission - mutation already in progress");
      return;
    }
    
    // Calculate session duration from timeFrom and timeTo if available
    if (data.session.timeFrom && data.session.timeTo) {
      const [fromHours, fromMinutes] = data.session.timeFrom.split(':').map(Number);
      const [toHours, toMinutes] = data.session.timeTo.split(':').map(Number);
      
      const fromTimeInMinutes = fromHours * 60 + fromMinutes;
      const toTimeInMinutes = toHours * 60 + toMinutes;
      
      // Calculate duration (handling cases where the session goes past midnight)
      let durationInMinutes = toTimeInMinutes - fromTimeInMinutes;
      if (durationInMinutes < 0) {
        durationInMinutes += 24 * 60; // Add 24 hours in minutes
      }
      
      // Update the duration field (which is required by the backend)
      data.session.duration = durationInMinutes;
    }
    
    // Set a default title if needed
    if (!data.session.title || data.session.title.trim() === '') {
      data.session.title = 'Therapy Session';
    }
    
    // Add logging for debugging
    console.log("Submitting session form with data:", JSON.stringify(data, null, 2));
    
    // Use a safe wrapper to prevent duplicate submissions
    if (!isFormSubmitting) {
      setIsFormSubmitting(true);
      createSessionMutation.mutate(data, {
        onSettled: () => {
          setIsFormSubmitting(false);
        }
      });
    } else {
      console.log("Form submission prevented - already in progress");
      toast({
        title: "Submission in progress",
        description: "Please wait while your session is being created",
      });
    }
  }

  // Handlers for adding goals, milestones, products, etc.
  const handleGoalSelection = (goal: Goal) => {
    console.log("Goal selected:", goal);
    const currentAssessments = form.getValues("performanceAssessments") || [];
    console.log("Current performance assessments before adding:", currentAssessments);

    // Add the selected goal to assessments if not already added
    if (!currentAssessments.some(a => a.goalId === goal.id)) {
      const newAssessment = {
        goalId: goal.id,
        goalTitle: goal.title,
        notes: "",
        milestones: []
      };

      // Use getValues then setValue to ensure form state is properly updated
      const updatedAssessments = [...currentAssessments, newAssessment];
      console.log("Updated assessments array:", updatedAssessments);
      
      // Set the value with proper options to ensure reactivity
      form.setValue("performanceAssessments", updatedAssessments, { 
        shouldDirty: true, 
        shouldValidate: false,
        shouldTouch: true 
      });
      
      // Force form update
      setTimeout(() => {
        // Log the current form state after update
        console.log("Form state after goal selection:", form.getValues("performanceAssessments"));
        
        // Force form state update if needed
        const current = form.getValues();
        form.reset(current, { keepValues: true });
      }, 50);
      
      // Show confirmation toast
      toast({
        title: "Goal Added",
        description: `"${goal.title}" has been added to the assessment`,
      });
    } else {
      // Show warning if already selected
      toast({
        title: "Goal Already Selected",
        description: `"${goal.title}" is already in the assessment`,
        variant: "destructive"
      });
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

      form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
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

    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
  };

  const handleAddProduct = (product: BudgetItem & { availableQuantity: number; originalQuantity?: number }, quantity: number) => {
    console.log("Adding product:", product);
    console.log("Requested quantity:", quantity);
    
    // Ensure valid quantity
    if (!quantity || quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a positive quantity",
        variant: "destructive"
      });
      return;
    }
    
    // Double-check the available quantity (may have changed if other products were added)
    const currentProducts = form.getValues("sessionNote.products") || [];
    let availableQty = product.availableQuantity;
    
    // If we're adding a product that already exists in other selected products, recalculate available quantity
    const otherProductsWithSameId = currentProducts.filter(p => p.budgetItemId === product.id);
    if (otherProductsWithSameId.length > 0) {
      // If we have access to originalQuantity (added in our enhanced availableProducts calculation)
      if (product.originalQuantity) {
        // Start with the original total quantity
        availableQty = product.originalQuantity;
        
        // Subtract quantities already used in other selected products
        const usedQuantity = otherProductsWithSameId.reduce((sum, p) => sum + p.quantity, 0);
        availableQty -= usedQuantity;
      }
    }
    
    console.log("Recalculated available quantity:", availableQty);
    
    // Check if requested quantity is too large
    if (quantity > availableQty) {
      toast({
        title: "Invalid quantity",
        description: `Only ${availableQty} units available. Please enter a smaller quantity.`,
        variant: "destructive"
      });
      return;
    }

    // Check if this product is already added
    const existingProductIndex = currentProducts.findIndex(p => p.budgetItemId === product.id);

    if (existingProductIndex !== -1) {
      // Prevent adding the same product twice - this is now a requirement
      toast({
        title: "Product already added",
        description: "This product is already in the session. Edit its quantity instead.",
        variant: "destructive"
      });
      return;
    } else {
      // Add new product
      const newProduct = {
        budgetItemId: product.id,
        productCode: product.itemCode || "ITEM-" + product.id,
        productDescription: product.description || "Unknown product",
        quantity: quantity,
        unitPrice: product.unitPrice || 0,
        availableQuantity: availableQty, // Store the current available quantity for reference
        originalQuantity: product.originalQuantity || product.quantity // Keep track of original quantity
      };

      form.setValue("sessionNote.products", [...currentProducts, newProduct], { shouldDirty: true, shouldValidate: false });
      
      // Show success toast
      toast({
        title: "Product added",
        description: `${newProduct.productDescription} added to the session`,
      });
      
      // Log the updated product list for debugging
      console.log("Updated product list:", [...currentProducts, newProduct]);
    }
  };

  // Handle removing items from form
  const removeProduct = (index: number) => {
    const products = form.getValues("sessionNote.products") || [];
    
    // Get the product being removed for logging
    const productToRemove = products[index];
    console.log("Removing product:", productToRemove);
    
    // Remove the product
    const updatedProducts = [...products];
    updatedProducts.splice(index, 1);
    
    // Update the form
    form.setValue("sessionNote.products", updatedProducts, { shouldDirty: true, shouldValidate: false });
    
    // Show success toast
    toast({
      title: "Product removed",
      description: productToRemove ? `${productToRemove.productDescription} removed from the session` : "Product removed from the session",
    });
    
    // Log the updated products
    console.log("Updated products after removal:", updatedProducts);
  };
  
  // Handle adding an attendee to the session without creating a new session
  const handleAddAttendee = (ally: Ally) => {
    console.log("Adding attendee:", ally);
    
    // First check if form is properly initialized
    if (!form.getValues("session.clientId")) {
      toast({
        title: "Client Required",
        description: "Please select a client before adding attendees",
        variant: "destructive"
      });
      setShowAttendeeDialog(false);
      return;
    }
    
    // Get current attendee lists (defaulting to empty arrays if undefined)
    const currentAttendees = form.getValues("sessionNote.presentAllies") || [];
    const currentAttendeeIds = form.getValues("sessionNote.presentAllyIds") || [];
    
    // Check if ally is already in the list by ID to prevent duplicates
    const allyIdIndex = currentAttendeeIds.indexOf(ally.id);
    
    if (allyIdIndex === -1) {
      try {
        // Add both name for display and ID for data integrity - with shouldValidate: false to prevent submission
        form.setValue("sessionNote.presentAllies", [...currentAttendees, ally.name], 
          { shouldDirty: true, shouldTouch: true, shouldValidate: false });
        form.setValue("sessionNote.presentAllyIds", [...currentAttendeeIds, ally.id], 
          { shouldDirty: true, shouldTouch: true, shouldValidate: false });
        
        // Show success toast
        toast({
          title: "Attendee added",
          description: `${ally.name} has been added to the session.`,
        });
        
        console.log("Updated attendees:", [...currentAttendees, ally.name]);
        console.log("Updated attendee IDs:", [...currentAttendeeIds, ally.id]);
      } catch (error) {
        console.error("Error adding attendee:", error);
        toast({
          title: "Error",
          description: "Failed to add attendee. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      // Show error toast for duplicate
      toast({
        title: "Already added",
        description: `${ally.name} is already in the attendee list.`,
        variant: "destructive"
      });
    }
  };
  
  // Handle removing an attendee from the session
  const removeAttendee = (index: number) => {
    const currentAttendees = form.getValues("sessionNote.presentAllies") || [];
    const currentAttendeeIds = form.getValues("sessionNote.presentAllyIds") || [];
    
    // Create copies to modify
    const updatedAttendees = [...currentAttendees];
    const updatedAttendeeIds = [...currentAttendeeIds];
    
    // Remove the items at the specified index
    updatedAttendees.splice(index, 1);
    updatedAttendeeIds.splice(index, 1);
    
    // Update the form values
    form.setValue("sessionNote.presentAllies", updatedAttendees, { shouldDirty: true, shouldValidate: false });
    form.setValue("sessionNote.presentAllyIds", updatedAttendeeIds, { shouldDirty: true, shouldValidate: false });
  };

  const removeGoal = (goalId: number) => {
    const assessments = form.getValues("performanceAssessments") || [];
    const updatedAssessments = assessments.filter(a => a.goalId !== goalId);
    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
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
    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
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
              onClick={() => setShowCancelDialog(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Create Session</h1>
          </div>
          <div className="flex gap-2">
            {/* Cancel button - available on all tabs */}
            <Button 
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel
            </Button>
            
            {/* Navigation buttons based on active tab */}
            {activeTab === "session" && (
              <Button 
                onClick={() => setActiveTab("assessment")}
                variant="default"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            
            {activeTab === "assessment" && (
              <>
                <Button 
                  onClick={() => setActiveTab("session")}
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button 
                  onClick={() => setActiveTab("summary")}
                  variant="default"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
            
            {activeTab === "summary" && (
              <>
                <Button 
                  onClick={() => setActiveTab("assessment")}
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button 
                  onClick={(e) => {
                    // Extra safety check before form submission
                    if (isFormSubmitting || createSessionMutation.isPending) {
                      console.log("Preventing duplicate submission from button click");
                      e.preventDefault();
                      e.stopPropagation();
                      
                      toast({
                        title: "Submission in progress",
                        description: "Please wait while your session is being created",
                      });
                      
                      return;
                    }
                    form.handleSubmit(onSubmit)(e);
                  }}
                  disabled={isFormSubmitting || createSessionMutation.isPending}
                  variant="default"
                >
                  {isFormSubmitting || createSessionMutation.isPending ? (
                    <span className="flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 
                      Creating...
                    </span>
                  ) : "Create Session"}
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Session Creation</DialogTitle>
            </DialogHeader>
            <div className="py-3">
              <p>Are you sure you want to cancel? All unsaved changes will be lost.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Continue Editing
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setShowCancelDialog(false);
                  onOpenChange(false);
                }}
              >
                Discard Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        <Form {...form}>
          <form 
            className="flex-1 overflow-hidden" 
            onSubmit={(e) => {
              // Extra safety: Prevent submission if any dialog is open
              if (showAttendeeDialog || showProductDialog || showGoalDialog || showMilestoneDialog || showStrategyDialog) {
                console.log("Preventing form submission while dialog is open");
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
              // Otherwise, let the form handler run
              form.handleSubmit(onSubmit)(e);
            }}>
            <Tabs 
              defaultValue="session" 
              className="h-full"
              value={activeTab}
              onValueChange={setActiveTab}
            >
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
                          {/* Client Selection */}
                          <FormField
                            control={form.control}
                            name="session.clientId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Client</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  value={field.value?.toString() || ""}
                                  disabled={!!initialClient}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Search for a client..." />
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

                          {/* Therapist/Clinician Selection */}
                          <FormField
                            control={form.control}
                            name="session.therapistId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Clinician</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(Number(value))}
                                  value={field.value?.toString() || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a clinician" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {/* Populate with allies from the client's allies list */}
                                    {allies.length > 0 ? (
                                      allies.map((ally) => (
                                        <SelectItem key={ally.id} value={ally.id.toString()}>
                                          {ally.name}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="0" disabled>
                                        No clinicians available
                                      </SelectItem>
                                    )}
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
                                <FormLabel>Date</FormLabel>
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
                            {/* Time From */}
                            <FormField
                              control={form.control}
                              name="session.timeFrom"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Time From</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Start time" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {[...Array(24)].map((_, hour) => (
                                        <React.Fragment key={hour}>
                                          <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>{hour.toString().padStart(2, '0')}:00</SelectItem>
                                          <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>{hour.toString().padStart(2, '0')}:30</SelectItem>
                                        </React.Fragment>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Time To */}
                            <FormField
                              control={form.control}
                              name="session.timeTo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Time To</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="End time" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {[...Array(24)].map((_, hour) => (
                                        <React.Fragment key={hour}>
                                          <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>{hour.toString().padStart(2, '0')}:00</SelectItem>
                                          <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>{hour.toString().padStart(2, '0')}:30</SelectItem>
                                        </React.Fragment>
                                      ))}
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
                                    <SelectItem value="Clinic">Clinic</SelectItem>
                                    <SelectItem value="School">School</SelectItem>
                                    <SelectItem value="Home">Home</SelectItem>
                                    <SelectItem value="Remote">Remote</SelectItem>
                                    <SelectItem value="Hospital">Hospital</SelectItem>
                                    <SelectItem value="Community Center">Community Center</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card className={cn(borderStyles.card.border, borderStyles.card.radius, borderStyles.card.shadow)}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">
                              <UserCheck className="h-5 w-5 inline-block mr-2" />
                              Present Attendees
                            </CardTitle>
                            <div className="flex gap-1 items-center">
                              {alliesQuery.isLoading ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Loading...
                                </Badge>
                              ) : allies.length > 0 ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  {allies.length} {allies.length === 1 ? 'Ally' : 'Allies'} Available
                                </Badge>
                              ) : clientId ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  No Allies Found
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {clientId ? (
                            <>
                              {/* Display selected allies */}
                              {form.watch("sessionNote.presentAllies")?.length > 0 ? (
                                <div className="space-y-2">
                                  {form.watch("sessionNote.presentAllies").map((name, index) => {
                                    const ally = allies.find(a => a.name === name);
                                    return (
                                      <div key={index} className="flex items-center justify-between bg-accent/60 rounded-md p-2 border border-accent">
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
                                          onClick={() => removeAttendee(index)}
                                          aria-label={`Remove ${name}`}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-4 border border-dashed rounded-md border-muted">
                                  <p className="text-muted-foreground">No attendees added yet</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Add allied health professionals, family members, or other support persons who were present
                                  </p>
                                </div>
                              )}

                              {/* Add attendee button - Improved visuals and disabled state handling */}
                              <div className="mt-2">
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  type="button" // Explicitly set to button type to avoid form submission
                                  onClick={(e) => {
                                    // Prevent any default form submission behavior
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Check if any dialog is already open
                                    if (showAttendeeDialog || showProductDialog || showGoalDialog || showMilestoneDialog || showStrategyDialog) {
                                      console.log("Another dialog is already open");
                                      return;
                                    }
                                    
                                    // Check if all required fields are set
                                    const clientId = form.getValues("session.clientId");
                                    const therapistId = form.getValues("session.therapistId");
                                    
                                    if (!clientId) {
                                      toast({
                                        title: "Client required",
                                        description: "Please select a client before adding attendees.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    if (!therapistId) {
                                      toast({
                                        title: "Therapist required",
                                        description: "Please select a clinician before adding attendees.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    // Only open dialog if all validations pass
                                    setShowAttendeeDialog(true);
                                  }}
                                  disabled={alliesQuery.isLoading || 
                                    allies.length === 0 ||
                                    (allies.length > 0 && !allies.some(ally => 
                                      !form.watch("sessionNote.presentAllies")?.includes(ally.name)
                                    ))}
                                >
                                  {alliesQuery.isLoading ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                  )}
                                  {alliesQuery.isLoading ? "Loading allies..." : 
                                    allies.length === 0 ? "No allies available" : 
                                    !allies.some(ally => !form.watch("sessionNote.presentAllies")?.includes(ally.name)) ?
                                    "All allies added" : "Add Attendee"}
                                </Button>
                              </div>
                              
                              {/* Show helpful message if needed */}
                              {!alliesQuery.isLoading && allies.length === 0 && (
                                <Alert variant="default" className="mt-2 bg-amber-50 border-amber-200">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertTitle>No allies found</AlertTitle>
                                  <AlertDescription className="text-xs">
                                    This client doesn't have any allied health professionals or supporters.
                                    <br />
                                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                                      <Link href={`/client/${clientId}`}>
                                        Add allies to client profile
                                      </Link>
                                    </Button>
                                  </AlertDescription>
                                </Alert>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-4 border border-dashed rounded-md border-muted">
                              <p className="text-muted-foreground">Please select a client first</p>
                            </div>
                          )}
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
                            <div className="space-y-4">
                              {form.watch("sessionNote.products").map((product, index) => {
                                // Calculate remaining units
                                const originalProduct = availableProducts.find(p => p.id === product.budgetItemId);
                                let totalUnits = 0;
                                let usedUnits = 0;
                                let remainingUnits = 0;
                                
                                if (originalProduct) {
                                  totalUnits = originalProduct.quantity;
                                  
                                  // Calculate used units (including this product)
                                  const allProducts = form.getValues("sessionNote.products");
                                  allProducts.forEach((p) => {
                                    if (p.budgetItemId === product.budgetItemId) {
                                      usedUnits += p.quantity;
                                    }
                                  });
                                  
                                  // Remove this product's quantity
                                  usedUnits -= product.quantity; 
                                  
                                  // Calculate remaining units
                                  remainingUnits = totalUnits - usedUnits;
                                }
                                
                                // Calculate progress bar percentage
                                const progressPercentage = Math.min(Math.max((product.quantity / totalUnits) * 100, 0), 100);
                                const isNearDepletion = remainingUnits <= 1;
                                
                                return (
                                  <div key={index} className="border rounded-lg overflow-hidden">
                                    <div className="p-4">
                                      <div className="font-medium">{product.productDescription}</div>
                                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                                        <span>Code: {product.productCode}</span>
                                        <span>${Number(product.unitPrice || 0).toFixed(2)} each</span>
                                      </div>
                                      
                                      <div className="mt-4">
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="font-medium">Budget Usage</span>
                                          <span>{product.quantity} of {totalUnits} units</span>
                                        </div>
                                        
                                        {/* Progress bar */}
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full ${isNearDepletion ? 'bg-orange-500' : 'bg-primary'}`}
                                            style={{ width: `${progressPercentage}%` }}
                                          ></div>
                                        </div>
                                        
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {remainingUnits} units remaining in budget
                                        </div>
                                      </div>
                                      
                                      <div className="flex justify-between items-center mt-4">
                                        <div className="flex items-center">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-r-none"
                                            onClick={() => {
                                              const products = form.getValues("sessionNote.products");
                                              if (products[index].quantity > 1) {
                                                const updatedProducts = [...products];
                                                updatedProducts[index].quantity -= 1;
                                                form.setValue("sessionNote.products", updatedProducts, { shouldDirty: true, shouldValidate: false });
                                              }
                                            }}
                                            disabled={product.quantity <= 1}
                                          >
                                            <Minus className="h-4 w-4" />
                                          </Button>
                                          <span className="px-4 h-9 flex items-center justify-center border-y bg-background min-w-[40px]">
                                            {product.quantity}
                                          </span>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-l-none"
                                            onClick={() => {
                                              // Calculate available quantity
                                              let availableQty = remainingUnits + product.quantity;
                                              
                                              console.log("Available quantity:", availableQty);
                                              
                                              if (product.quantity < availableQty) {
                                                const products = form.getValues("sessionNote.products");
                                                const updatedProducts = [...products];
                                                updatedProducts[index].quantity += 1;
                                                form.setValue("sessionNote.products", updatedProducts, { shouldDirty: true, shouldValidate: false });
                                              } else {
                                                toast({
                                                  title: "Maximum quantity reached",
                                                  description: `Only ${availableQty} units available for this product`,
                                                  variant: "destructive"
                                                });
                                              }
                                            }}
                                          >
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        
                                        <div className="flex items-center">
                                          <span className="font-medium mr-2">Total: ${(Number(product.quantity || 0) * Number(product.unitPrice || 0)).toFixed(2)}</span>
                                          <Button 
                                            type="button"
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-gray-500 hover:text-error-500" 
                                            onClick={() => removeProduct(index)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Grand Total */}
                              <div className="flex justify-end items-center py-2 px-4 font-medium text-lg">
                                Grand Total: ${form.watch("sessionNote.products").reduce((total, product) => 
                                  total + (Number(product.quantity || 0) * Number(product.unitPrice || 0)), 0).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No products added yet</p>
                          )}

                          {/* Add product button */}
                          <div className="border rounded-lg p-4 mt-4">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                // Debug info
                                console.log("Debug info - Client ID:", clientId);
                                console.log("Debug info - Available products:", availableProducts);
                                console.log("Debug info - Budget items:", budgetItems);
                                console.log("Debug info - Budget settings:", budgetSettings);
                                console.log("Debug info - Is loading budget settings:", isLoadingBudgetSettings);
                                console.log("Debug info - Is loading budget items:", isLoadingBudgetItems);
                                
                                if (!clientId) {
                                  console.log("Button disabled: No client selected");
                                  toast({
                                    title: "Client required",
                                    description: "Please select a client first to see available products",
                                    variant: "destructive"
                                  });
                                  return;
                                } 
                                
                                // If still loading, show an informative message
                                if (isLoadingBudgetSettings || isLoadingBudgetItems) {
                                  console.log("Budget data is still loading, but we'll proceed");
                                  toast({
                                    title: "Loading budget data",
                                    description: "Product information is still loading, but we'll show what's available",
                                    duration: 3000,
                                  });
                                }
                                
                                // Add debug information about budget items and settings
                                console.log("BUTTON CLICKED - Debug Info");
                                console.log(`Client ID: ${clientId}`);
                                console.log(`Available products: ${availableProducts?.length || 0}`);
                                console.log(`Budget items: ${budgetItems?.length || 0}`);
                                console.log(`Budget settings present: ${!!budgetSettings}`);
                                
                                // Show warning toast if no available products detected
                                if (availableProducts.length === 0) {
                                  console.log("WARNING: No available products detected");
                                  
                                  // Despite no available products, if we have budget items, we'll still open the dialog
                                  // This allows our fallback logic in ProductSelectionDialog to work
                                  if (budgetItems && budgetItems.length > 0) {
                                    console.log("WORKAROUND: Opening dialog anyway because budget items exist");
                                    toast({
                                      title: "Limited product information",
                                      description: "Showing all available products from client's budget",
                                      duration: 3000,
                                    });
                                  } else {
                                    console.log("CRITICAL ERROR: No budget items available at all");
                                    // Check if we're still loading before showing an error
                                    if (isLoadingBudgetItems || isLoadingBudgetSettings) {
                                      toast({
                                        title: "Loading products",
                                        description: "Product data is still loading, please try again in a moment",
                                        duration: 3000,
                                      });
                                    } else {
                                      toast({
                                        title: "No products available",
                                        description: "This client has no products in their budget",
                                        variant: "destructive"
                                      });
                                    }
                                  }
                                }
                                
                                // Force refresh data before showing dialog
                                if (clientId) {
                                  console.log("Refreshing budget data before showing dialog");
                                  queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-settings"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-items"] });
                                }
                                
                                // CRITICAL FIX: Update the productDialogOpenTime state
                                // This forces a re-calculation of availableProducts memo based on latest form state
                                setProductDialogOpenTime(Date.now());
                                console.log("CRITICAL FIX: Updating productDialogOpenTime to force availableProducts refresh:", Date.now());
                                
                                // Then open the dialog
                                setShowProductDialog(true);
                                
                                // Debug message about products
                                if (availableProducts.length === 0) {
                                  console.log("Warning: No products available but dialog will open anyway");
                                } else {
                                  console.log(`Opening dialog with ${availableProducts.length} products`);
                                }
                              }}
                              // CRITICAL FIX: Modified button enabling logic to handle race conditions
                              // Enable button if we have a client ID AND:
                              // 1. Either we have available products (normal case), OR 
                              // 2. We have budget items (race condition case where availableProducts calculation failed)
                              // 3. OR if the data is still loading (we'll show appropriate UI in this case)
                              disabled={!clientId || 
                                (availableProducts.length === 0 && 
                                 (!budgetItems || budgetItems.length === 0) && 
                                 !isLoadingBudgetItems && 
                                 !isLoadingBudgetSettings)}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              {isLoadingBudgetItems || isLoadingBudgetSettings ? (
                                <>Loading Products...</>
                              ) : (
                                <>Add Product</>
                              )}
                            </Button>
                          </div>
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
                          <p className="text-sm text-muted-foreground">Clinician</p>
                          <p className="text-sm font-medium">
                            {form.watch("session.therapistId") 
                              ? allies.find(ally => ally.id === form.watch("session.therapistId"))?.name || "Not found"
                              : "Not selected"}
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
                          <p className="text-sm text-muted-foreground">Time</p>
                          <p className="text-sm font-medium">
                            {form.watch("session.timeFrom") && form.watch("session.timeTo") ? 
                              `${form.watch("session.timeFrom")} - ${form.watch("session.timeTo")}` : 
                              "Not set"}
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
                        {form.watch("sessionNote.presentAllies")?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {form.watch("sessionNote.presentAllies")
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
                <div className="flex gap-4 p-4">
                  {/* Left Column - 75% - Goals Assessed */}
                  <div className="w-3/4">
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

                              console.log("DEBUG: Opening goal dialog from header button");
                              console.log("Goals available:", goals?.length || 0);
                              console.log("Selected goal IDs:", selectedGoalIds);
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
                                console.log("DEBUG: Opening goal dialog from empty state button");
                                console.log("Goals available:", goals?.length || 0);
                                console.log("Selected goal IDs:", selectedGoalIds);
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
                  
                  {/* Right Column - 25% - Session Notes */}
                  <div className="w-1/4">
                    <Card className="h-full">
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
                                  className="min-h-[400px]"
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

      {/* Attendee Selection Dialog */}
      <AttendeeSelectionDialog
        open={showAttendeeDialog}
        onOpenChange={setShowAttendeeDialog}
        allies={allies}
        selectedAllies={form.watch("sessionNote.presentAllies") || []}
        onSelectAttendee={(ally) => {
          try {
            // Handle with try/catch to prevent form submission
            const currentAttendees = form.getValues("sessionNote.presentAllies") || [];
            const currentAttendeeIds = form.getValues("sessionNote.presentAllyIds") || [];
            
            // Check if already in the list
            if (!currentAttendees.includes(ally.name)) {
              form.setValue("sessionNote.presentAllies", [...currentAttendees, ally.name], 
                { shouldDirty: true, shouldValidate: false });
              form.setValue("sessionNote.presentAllyIds", [...currentAttendeeIds, ally.id], 
                { shouldDirty: true, shouldValidate: false });
              
              toast({
                title: "Attendee added",
                description: `${ally.name} has been added to the session`,
              });
            }
            
            // Important: Close dialog AFTER form updates
            setShowAttendeeDialog(false);
          } catch (error) {
            console.error("Error adding attendee:", error);
            setShowAttendeeDialog(false);
          }
        }}
      />
    </div>
  );
}

/**
 * Dialog component for selecting attendees from the client's allies list
 */
// AttendeeSelectionDialog has been moved to its own component file