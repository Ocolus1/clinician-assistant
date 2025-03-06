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
  Users
} from "lucide-react";
import "./session-form.css";
import { ThreeColumnLayout } from "./ThreeColumnLayout";
import { Ally, BudgetItem, BudgetSettings, Client, Goal, Subgoal, Strategy, insertSessionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

// Session form schema
const sessionFormSchema = insertSessionSchema.extend({
  sessionDate: z.coerce.date({
    required_error: "Session date is required",
  }),
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  therapistId: z.string().optional(),
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
  const [activeTab, setActiveTab] = useState("session");

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
  
  // Log the initial client ID and ensure it's set correctly
  useEffect(() => {
    if (open && initialClient) {
      console.log("Form opened with initial client:", initialClient);
      console.log("Initial client ID:", initialClient.id);
      
      // Give form time to initialize, then force the client ID to be set correctly
      setTimeout(() => {
        if (form) {
          form.setValue("session.clientId", initialClient.id);
        }
      }, 100);
    }
  }, [open, initialClient]);

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
      console.log("Client ID changed to:", clientId);
      queryClient.setQueryData(['formState'], { clientId });
    }
  }, [clientId, queryClient]);
  
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

  // Fetch allies for therapist dropdown and participant selection
  const alliesQuery = useQuery<Ally[]>({
    queryKey: ["/api/clients", clientId, "allies"],
    enabled: open && !!clientId,
  });
  
  // Extract allies data and handle logs separately to avoid TypeScript errors
  const allies = alliesQuery.data || [];
  
  // Log allies info when data changes
  useEffect(() => {
    if (alliesQuery.data) {
      console.log("Allies fetched successfully:", alliesQuery.data);
      console.log("Allies count:", alliesQuery.data.length);
    }
    if (alliesQuery.error) {
      console.error("Error fetching allies:", alliesQuery.error);
    }
  }, [alliesQuery.data, alliesQuery.error]);

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
  const { data: budgetSettings } = useQuery<BudgetSettings>({
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

  // Prepare products for selection dialog from active budget plan
  const availableProducts = useMemo(() => {
    // Log the data we're working with for debugging
    console.log("Budget items in availableProducts:", budgetItems);
    console.log("Budget settings in availableProducts:", budgetSettings);
    
    // Force return some test products for debugging the Add Product button functionality
    const debugMode = true; // Set to false in production
    
    if (debugMode) {
      console.log("Debug mode enabled - returning test products");
      // Add some test products to ensure the button works
      const testProducts = Array(3).fill(null).map((_, index) => ({
        id: 1000 + index,
        clientId: clientId || 0,
        budgetSettingsId: budgetSettings?.id || 0,
        itemCode: `TEST-${index + 1}`,
        description: `Test Product ${index + 1}`,
        quantity: 10,
        unitPrice: 25.99,
        unitOfMeasure: "each",
        category: "Test",
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
    console.log("Selected products:", selectedProducts);
    
    // If no budget settings, use all budget items as a fallback
    if (!budgetSettings) {
      console.log("No budget settings available - using all budget items as fallback");
      const processedItems = budgetItems
        .filter((item: BudgetItem) => item.quantity > 0)
        .map((item: BudgetItem) => {
          const alreadySelectedItem = selectedProducts.find(p => p.budgetItemId === item.id);
          const alreadySelectedQuantity = alreadySelectedItem ? alreadySelectedItem.quantity : 0;
          const availableQuantity = item.quantity - alreadySelectedQuantity;
          
          console.log(`Fallback item ${item.id}: quantity=${item.quantity}, available=${availableQuantity}`);
          
          return {
            ...item,
            availableQuantity,
            originalQuantity: item.quantity
          };
        })
        .filter(item => item.availableQuantity > 0);
      
      console.log("Available fallback products:", processedItems);
      return processedItems;
    }

    // Filter only products from the active budget plan
    const filteredProducts = budgetItems
      .filter((item: BudgetItem) => {
        // For debugging
        console.log(`Item ${item.id}: budgetSettingsId=${item.budgetSettingsId}, quantity=${item.quantity}`);
        
        // Only include items from the active budget plan and with quantity > 0
        // If budgetSettingsId is not set, include the item anyway as a fallback
        return (item.budgetSettingsId === budgetSettings.id || !item.budgetSettingsId) && item.quantity > 0;
      })
      .map((item: BudgetItem) => {
        // Find if this item is already selected in the form
        const alreadySelectedItem = selectedProducts.find(p => p.budgetItemId === item.id);
        const alreadySelectedQuantity = alreadySelectedItem ? alreadySelectedItem.quantity : 0;

        // Calculate available quantity (original quantity minus what's already selected)
        const availableQuantity = item.quantity - alreadySelectedQuantity;
        
        // For debugging
        console.log(`Item ${item.id} (${item.description}): Original quantity=${item.quantity}, Already selected=${alreadySelectedQuantity}, Available=${availableQuantity}`);
        
        return {
          ...item,
          availableQuantity,
          originalQuantity: item.quantity // Store the original quantity for reference
        };
      })
      .filter(item => item.availableQuantity > 0);  // Only show items with available quantity
      
    console.log("Filtered products:", filteredProducts);
    return filteredProducts;
  }, [budgetItems, budgetSettings, form, clientId]);

  // Form submission handler
  const createSessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      console.log("Form submit data:", data);

      // First create the session
      const sessionResponse = await apiRequest("POST", "/api/sessions", data.session);
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

      form.setValue("sessionNote.products", [...currentProducts, newProduct]);
      
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
    form.setValue("sessionNote.products", updatedProducts);
    
    // Show success toast
    toast({
      title: "Product removed",
      description: productToRemove ? `${productToRemove.productDescription} removed from the session` : "Product removed from the session",
    });
    
    // Log the updated products
    console.log("Updated products after removal:", updatedProducts);
  };
  
  // Handle adding an attendee to the session
  const handleAddAttendee = (ally: Ally) => {
    const currentAttendees = form.getValues("sessionNote.presentAllies") || [];
    const currentAttendeeIds = form.getValues("sessionNote.presentAllyIds") || [];
    
    // Check if ally is already in the list to prevent duplicates
    if (!currentAttendees.includes(ally.name)) {
      // Add both name for display and ID for data integrity
      form.setValue("sessionNote.presentAllies", [...currentAttendees, ally.name]);
      form.setValue("sessionNote.presentAllyIds", [...currentAttendeeIds, ally.id]);
      
      // Show success toast
      toast({
        title: "Attendee added",
        description: `${ally.name} has been added to the session.`,
      });
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
    form.setValue("sessionNote.presentAllies", updatedAttendees);
    form.setValue("sessionNote.presentAllyIds", updatedAttendeeIds);
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
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={createSessionMutation.isPending}
                  variant="default"
                >
                  {createSessionMutation.isPending ? "Creating..." : "Create Session"}
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
          <form className="flex-1 overflow-hidden" onSubmit={form.handleSubmit(onSubmit)}>
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
                                  onValueChange={field.onChange}
                                  value={field.value || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a clinician" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {/* Populate with available clinicians */}
                                    <SelectItem value="1">Dr. Sarah Johnson</SelectItem>
                                    <SelectItem value="2">Dr. Michael Chen</SelectItem>
                                    <SelectItem value="3">Dr. Emily Rodriguez</SelectItem>
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
                          {/* Debug info to see what's happening with allies data */}
                          <div className="text-xs text-muted-foreground mb-2">
                            Allies available: {allies ? allies.length : 0}
                            {alliesQuery.isLoading && <span> (Loading...)</span>}
                            {alliesQuery.error && <span> (Error loading allies)</span>}
                          </div>

                          {/* Display selected allies */}
                          {form.watch("sessionNote.presentAllies")?.length > 0 ? (
                            <div className="space-y-2">
                              {form.watch("sessionNote.presentAllies").map((name, index) => {
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
                            <p className="text-sm text-muted-foreground">No attendees added yet</p>
                          )}

                          {/* Add attendee button - Always visible, but disabled if no unselected allies */}
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                console.log("Opening attendee selection dialog");
                                console.log("Current allies:", allies);
                                setShowAttendeeDialog(true);
                              }}
                              disabled={alliesQuery.isLoading || 
                                (allies.length > 0 && !allies.some(ally => 
                                  !form.watch("sessionNote.presentAllies")?.includes(ally.name)
                                ))}
                            >
                              {alliesQuery.isLoading ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4 mr-2" />
                              )}
                              {alliesQuery.isLoading ? "Loading allies..." : `Add Attendee (${allies.length})`}
                            </Button>
                          </div>
                          
                          {/* Show message based on status */}
                          {!alliesQuery.isLoading && allies.length === 0 && (
                            <div className="text-center py-2 mt-2 border-t">
                              <p className="text-muted-foreground text-sm">No allies found for this client</p>
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
                            <div className="space-y-2">
                              {form.watch("sessionNote.products").map((product, index) => (
                                <Card key={index} className="overflow-hidden border-accent-foreground/20">
                                  <div className="p-3 grid grid-cols-[1fr,auto] gap-4">
                                    <div>
                                      <p className="font-medium text-sm">{product.productDescription}</p>
                                      <p className="text-xs text-muted-foreground">Code: {product.productCode}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium">${product.unitPrice.toFixed(2)} each</p>
                                      <p className="text-xs text-muted-foreground">
                                        Total: ${(product.quantity * product.unitPrice).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-muted/30 px-3 py-2 flex items-center justify-between border-t">
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium mr-2">Quantity:</span>
                                      <div className="flex items-center">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-7 w-7 rounded-r-none"
                                          onClick={() => {
                                            const products = form.getValues("sessionNote.products");
                                            if (products[index].quantity > 1) {
                                              const updatedProducts = [...products];
                                              updatedProducts[index].quantity -= 1;
                                              form.setValue("sessionNote.products", updatedProducts);
                                            }
                                          }}
                                          disabled={product.quantity <= 1}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="px-3 h-7 flex items-center justify-center border-y bg-background">
                                          {product.quantity}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-7 w-7 rounded-l-none"
                                          onClick={() => {
                                            const products = form.getValues("sessionNote.products");
                                            
                                            // Find the original budget item for this product
                                            const originalProduct = availableProducts.find(p => p.id === product.budgetItemId);
                                            console.log("Original product:", originalProduct);
                                            console.log("Selected product:", product);
                                            
                                            // Calculate available quantity
                                            // This considers both the original quantity and the quantity already in use in other selected products
                                            let availableQty = 0;
                                            
                                            if (originalProduct) {
                                              // Start with the original budget item quantity
                                              availableQty = originalProduct.quantity;
                                              
                                              // Add back this product's quantity since we're modifying it
                                              availableQty += product.quantity;
                                              
                                              // Subtract quantities used by other selected products with the same budget item ID
                                              products.forEach((p, i) => {
                                                if (p.budgetItemId === product.budgetItemId && i !== index) {
                                                  availableQty -= p.quantity;
                                                }
                                              });
                                            } else {
                                              // Fallback - just use the product's current quantity if we can't find the original
                                              availableQty = product.quantity;
                                            }
                                            
                                            console.log("Available quantity:", availableQty);
                                            
                                            if (product.quantity < availableQty) {
                                              const updatedProducts = [...products];
                                              updatedProducts[index].quantity += 1;
                                              form.setValue("sessionNote.products", updatedProducts);
                                            } else {
                                              toast({
                                                title: "Maximum quantity reached",
                                                description: `Only ${availableQty} units available for this product`,
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <Button 
                                      type="button"
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7" 
                                      onClick={() => removeProduct(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No products added yet</p>
                          )}

                          {/* Add product button */}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              console.log("Available products:", availableProducts);
                              console.log("budgetItems:", budgetItems);
                              console.log("budgetSettings:", budgetSettings);
                              setShowProductDialog(true);
                            }}
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
                          <p className="text-sm text-muted-foreground">Clinician</p>
                          <p className="text-sm font-medium">
                            {form.watch("session.therapistId") === "1" ? "Dr. Sarah Johnson" :
                             form.watch("session.therapistId") === "2" ? "Dr. Michael Chen" :
                             form.watch("session.therapistId") === "3" ? "Dr. Emily Rodriguez" :
                             "Not selected"}
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

      {/* Attendee Selection Dialog */}
      <AttendeeSelectionDialog
        open={showAttendeeDialog}
        onOpenChange={setShowAttendeeDialog}
        allies={allies}
        selectedAllies={form.watch("sessionNote.presentAllies") || []}
        onSelectAttendee={(ally) => {
          handleAddAttendee(ally);

          // Close dialog after selection
          setShowAttendeeDialog(false);
        }}
      />
    </div>
  );
}

/**
 * Dialog component for selecting attendees from the client's allies list
 */
// AttendeeSelectionDialog has been moved to its own component file