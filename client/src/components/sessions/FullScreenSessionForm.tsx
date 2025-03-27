import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, differenceInYears } from "date-fns"; // Import differenceInYears
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
  AlertCircle,
  Save
} from "lucide-react";
import "./session-form.css";
import { ThreeColumnLayout } from "./ThreeColumnLayout";
import { Ally, BudgetItem, BudgetSettings, Client, Goal, Subgoal, Strategy, insertSessionSchema, ClientClinician, Clinician } from "@shared/schema";
import { NumericRating } from "@/components/sessions/NumericRating";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { borderStyles } from "@/lib/border-styles";
import { StrategySelectionDialog } from "./StrategySelectionDialog";
import { InlineStrategySelector } from "./InlineStrategySelector";
import { AttendeeSelectionDialog } from "./AttendeeSelectionDialog";

// UI Components
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  originalQuantity: z.number().optional(), // Original quantity from budget item
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

// Use the NumericRating component instead of the slider
const RatingSlider = ({ value, onChange, label, description }: RatingSliderProps) => {
  return (
    <NumericRating
      value={value}
      onChange={onChange}
      label={label}
      description={description}
      min={0}
      max={10}
    />
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
  const { toast } = useToast();
  // Add debugging when dialog opens
  useEffect(() => {
    if (open) {
      console.log("MilestoneSelectionDialog opened with subgoals:", subgoals);
      console.log("Selected milestone IDs:", selectedMilestoneIds);

      // Additional debug logging to check subgoals data structure
      if (subgoals && subgoals.length > 0) {
        console.log("First subgoal example:", subgoals[0]);
      } else {
        console.warn("WARNING: No subgoals available to display in the milestone selection dialog");

        // Use the toast function directly instead of a custom event
        setTimeout(() => {
          toast({
            title: "Debug: No Milestones Found",
            description: "No milestones were found for the selected goal. Check console for details.",
            variant: "destructive"
          });
        }, 100);
      }
    }
  }, [open, subgoals, selectedMilestoneIds, toast]);

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
          {!subgoals || subgoals.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No milestones available for assessment</p>
              <p className="text-xs text-gray-500 mt-2">
                This goal doesn't have any milestones defined. Please add milestones to the goal first.
              </p>
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
            <div className="product-selection-container">
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
                              <h3 className="font-medium text-sm">{product.description || 'Unnamed product'}</h3>
                              <p className="text-xs text-muted-foreground">Code: {product.itemCode || 'No code'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(product.unitPrice || 0)}</p>
                              <p className="text-xs text-muted-foreground">Available: {product.availableQuantity}</p>
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
                <div className="border rounded-md p-3 mt-4 bg-background">
                  <h3 className="font-medium mb-2">Quantity</h3>
                  <div className="flex items-center space-x-2">
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={selectedProduct.availableQuantity}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(Number(e.target.value))}
                      className="w-16 h-8 text-center"
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= selectedProduct.availableQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>

                    <div className="ml-4 flex-grow">
                      <p className="text-sm font-medium">Total: {formatCurrency(selectedProduct.unitPrice * quantity)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (selectedProduct) {
                onSelectProduct(selectedProduct, quantity);
                onOpenChange(false);
              } else {
                toast({
                  title: "No product selected",
                  description: "Please select a product before adding to the session",
                  variant: "destructive"
                });
              }
            }}
            disabled={!selectedProduct}
          >
            Add to Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface FullScreenSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<IntegratedSessionFormValues>;
  clientId?: number;
  existingSessionId?: number;
  clients: Client[]; // Added clients prop
}

export function FullScreenSessionForm({ open, onOpenChange, defaultValues, clientId, existingSessionId, clients }: FullScreenSessionFormProps) { // Added clients prop
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [goalSelectionOpen, setGoalSelectionOpen] = useState(false);
  const [milestoneSelectionOpen, setMilestoneSelectionOpen] = useState(false);
  const [strategySelectionOpen, setStrategySelectionOpen] = useState(false);
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);
  const [attendeeSelectionOpen, setAttendeeSelectionOpen] = useState(false);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState<number>(-1);
  const [currentGoalIndex, setCurrentGoalIndex] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState("session");
  const [mode, setMode] = useState<"create" | "edit">(existingSessionId ? "edit" : "create");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch client data for the form
  const { data: clientData, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
    staleTime: 0, // Don't use stale data
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Debug effect for client data
  useEffect(() => {
    if (clientData) {
      console.log("*** CLIENT DATA DEBUGGING ***");
      console.log("Raw client data:", clientData);
      console.log("Client data type:", typeof clientData);
      console.log("Has originalName:", 'originalName' in clientData);
      console.log("Has name:", 'name' in clientData);

      // Check if client data has expected properties
      const expectedProps = ['id', 'name', 'originalName', 'uniqueIdentifier', 'email'];
      const missingProps = expectedProps.filter(prop => !(prop in clientData));
      console.log("Missing properties:", missingProps);

      // Iterate through all properties
      console.log("All properties:", Object.keys(clientData));
    }
  }, [clientData]);

  // Fetch existing session if in edit mode
  const { data: sessionData, isLoading: isLoadingSession } = useQuery({
    queryKey: ['/api/sessions', existingSessionId],
    enabled: !!existingSessionId && mode === "edit",
  });

  // Fetch goals for the client
  const { data: goalsData = [], isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/clients', clientId, 'goals'],
    enabled: !!clientId,
  });

  // Fetch allies for the client
  const { data: alliesData = [], isLoading: isLoadingAllies } = useQuery<Ally[]>({
    queryKey: ['/api/clients', clientId, 'allies'],
    enabled: !!clientId,
    staleTime: 0, // Don't use stale data
    refetchOnMount: true, // Always refetch when component mounts
    retry: 3, // Retry failed requests up to 3 times
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Fetch budget items for the client
  const { data: budgetItemsData = [], isLoading: isLoadingBudgetItems } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    enabled: !!clientId,
  });

  // Fetch clinicians for dropdown
  const { data: cliniciansData = [] } = useQuery<Clinician[]>({
    queryKey: ['/api/clinicians'],
  });

  // Create or update session mutation
  const sessionMutation = useMutation({
    mutationFn: (data: IntegratedSessionFormValues) => {
      console.log("Submitting session data:", data);

      // Create session first
      if (mode === "create") {
        return apiRequest("POST", "/api/sessions", data.session)
          .then(session => {
            console.log("Session created:", session);

            // Create session note with the session ID
            const sessionNote = {
              ...data.sessionNote,
              sessionId: session.id
            };

            return apiRequest("POST", "/api/session-notes", sessionNote)
              .then(note => {
                console.log("Session note created:", note);

                // Create performance assessments
                const assessmentPromises = data.performanceAssessments.map(assessment => {
                  const performanceAssessment = {
                    sessionNoteId: note.id,
                    goalId: assessment.goalId,
                    notes: assessment.notes || ""
                  };

                  return apiRequest("POST", "/api/performance-assessments", performanceAssessment)
                    .then(pa => {
                      console.log("Performance assessment created:", pa);

                      // Create milestone assessments for each subgoal
                      const milestonePromises = assessment.milestones.map(milestone => {
                        const milestoneAssessment = {
                          performanceAssessmentId: pa.id,
                          subgoalId: milestone.milestoneId,
                          rating: milestone.rating || 0,
                          notes: milestone.notes || "",
                          strategies: milestone.strategies || []
                        };

                        return apiRequest("POST", "/api/milestone-assessments", milestoneAssessment);
                      });

                      return Promise.all(milestonePromises);
                    });
                });

                return Promise.all(assessmentPromises)
                  .then(() => ({ session, note }));
              });
          });
      } else {
        // Update existing session
        const updateSessionPromise = apiRequest("PUT", `/api/sessions/${existingSessionId}`, data.session);

        // Get existing session note ID
        return updateSessionPromise.then(() => {
          return apiRequest("GET", `/api/session-notes/session/${existingSessionId}`)
            .then(existingNote => {
              if (!existingNote) {
                // Create session note if it doesn't exist
                const sessionNote = {
                  ...data.sessionNote,
                  sessionId: existingSessionId
                };
                return apiRequest("POST", "/api/session-notes", sessionNote);
              } else {
                // Update existing session note
                return apiRequest("PUT", `/api/session-notes/${existingNote.id}`, {
                  ...data.sessionNote,
                  sessionId: existingSessionId
                });
              }
            })
            .then(note => {
              console.log("Session note updated:", note);

              // TODO: Update performance assessments
              // For brevity, we'll just return the note here
              return { session: { id: existingSessionId }, note };
            });
        });
      }
    },
    onSuccess: () => {
      setIsSaving(false);

      toast({
        title: mode === "create" ? "Session Created" : "Session Updated",
        description: mode === "create"
          ? "New session has been created successfully."
          : "Session has been updated successfully.",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'sessions'] });

      // Close the dialog
      onOpenChange(false);
    },
    onError: (error) => {
      setIsSaving(false);
      console.error("Error creating/updating session:", error);

      toast({
        title: "Error",
        description: `Failed to ${mode === "create" ? "create" : "update"} session. Please try again.`,
        variant: "destructive",
      });
    }
  });

  // Function to get initial values for form
  const getInitialValues = (): IntegratedSessionFormValues => {
    return {
      session: {
        sessionDate: existingSessionId && sessionData ? new Date(sessionData.sessionDate) : new Date(),
        clientId: clientId || 0,
        therapistId: null,
        location: "",
        status: "scheduled",
        notes: "",
        timeFrom: "09:00",
        timeTo: "10:00",
      },
      sessionNote: {
        presentAllies: [],
        presentAllyIds: [],
        moodRating: 5,
        focusRating: 5,
        cooperationRating: 5,
        physicalActivityRating: 5,
        generalNotes: "",
        homeRecommendations: "",
        activitySummary: "",
        products: [],
      },
      performanceAssessments: [],
    };
  };

  // Initialize form with values
  const form = useSafeForm<IntegratedSessionFormValues>({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues: getInitialValues(),
  });

  // Store available subgoals indexed by goalId for quick lookup
  const [subgoalsByGoalId, setSubgoalsByGoalId] = useState<Record<number, Subgoal[]>>({});

  // Fetch subgoals for selected goals
  useEffect(() => {
    if (form) {  // Only proceed if form is defined
      try {
        const selectedGoalIds = form.getValues().performanceAssessments.map(pa => pa.goalId);

        selectedGoalIds.forEach(goalId => {
          if (!subgoalsByGoalId[goalId]) {
            // Fetch subgoals for this goal
            fetch(`/api/goals/${goalId}/subgoals`)
              .then(response => response.json())
              .then(data => {
                console.log(`Subgoals for goal ${goalId}:`, data);
                setSubgoalsByGoalId(prev => ({
                  ...prev,
                  [goalId]: data
                }));
              })
              .catch(error => {
                console.error(`Error fetching subgoals for goal ${goalId}:`, error);
              });
          }
        });
      } catch (error) {
        console.error("Error accessing form values:", error);
      }
    }
  }, [form, subgoalsByGoalId]);

  // Format budget items for product selection
  const availableProducts = useMemo(() => {
    if (!budgetItemsData) return [];

    // Convert budget items to products with available quantity
    return budgetItemsData.map(item => ({
      ...item,
      availableQuantity: item.quantity || 0, // Default to 0 if quantity is not available
    }));
  }, [budgetItemsData]);

  // form is already defined above

  // Update form when session data changes (for edit mode)
  useEffect(() => {
    if (sessionData && mode === "edit") {
      // TODO: Load session and related data for edit mode
      console.log("Loading session data for editing:", sessionData);
    }
  }, [sessionData, mode]);

  // Handle adding a new goal assessment
  const handleAddGoalAssessment = (goal: Goal) => {
    const currentAssessments = form.getValues().performanceAssessments;
    const newAssessment = {
      goalId: goal.id,
      goalTitle: goal.title,
      notes: "",
      milestones: [] as any[],
    };

    form.setValue("performanceAssessments", [...currentAssessments, newAssessment]);

    // Automatically open milestone selection for the new goal
    setCurrentGoalIndex(currentAssessments.length);

    // Fetch subgoals for this goal if not already loaded
    if (!subgoalsByGoalId[goal.id]) {
      fetch(`/api/goals/${goal.id}/subgoals`)
        .then(response => response.json())
        .then(data => {
          console.log(`Subgoals for goal ${goal.id}:`, data);
          setSubgoalsByGoalId(prev => ({
            ...prev,
            [goal.id]: data
          }));

          // Open milestone selection dialog after subgoals are loaded
          setTimeout(() => setMilestoneSelectionOpen(true), 100);
        })
        .catch(error => {
          console.error(`Error fetching subgoals for goal ${goal.id}:`, error);

          toast({
            title: "Error",
            description: "Failed to load milestones for this goal. Please try again.",
            variant: "destructive",
          });
        });
    } else {
      // Open milestone selection dialog if subgoals are already loaded
      setTimeout(() => setMilestoneSelectionOpen(true), 100);
    }
  };

  // Handle adding a milestone to a goal assessment
  const handleAddMilestone = (subgoal: Subgoal) => {
    if (currentGoalIndex === -1) return;

    const performanceAssessments = form.getValues().performanceAssessments;
    const currentAssessment = performanceAssessments[currentGoalIndex];

    const newMilestone = {
      milestoneId: subgoal.id,
      milestoneTitle: subgoal.title,
      rating: 5, // Default rating
      strategies: [],
      notes: "",
    };

    const updatedMilestones = [...currentAssessment.milestones, newMilestone];
    const updatedAssessment = {
      ...currentAssessment,
      milestones: updatedMilestones,
    };

    const updatedAssessments = [...performanceAssessments];
    updatedAssessments[currentGoalIndex] = updatedAssessment;

    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Handle removing a milestone from a goal assessment
  const handleRemoveMilestone = (goalIndex: number, milestoneIndex: number) => {
    const performanceAssessments = form.getValues().performanceAssessments;
    const currentAssessment = performanceAssessments[goalIndex];

    const updatedMilestones = currentAssessment.milestones.filter((_, index) => index !== milestoneIndex);
    const updatedAssessment = {
      ...currentAssessment,
      milestones: updatedMilestones,
    };

    const updatedAssessments = [...performanceAssessments];
    updatedAssessments[goalIndex] = updatedAssessment;

    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Handle removing a goal assessment
  const handleRemoveGoalAssessment =(index: number) => {
    const performanceAssessments = form.getValues().performanceAssessments;
    const updatedAssessments = performanceAssessments.filter((_, i) => i !== index);
    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Handle adding a strategy to a milestone
  const handleAddStrategy = (strategies: Strategy[]) => {
    if (currentGoalIndex === -1 || currentMilestoneIndex === -1) return;

    try {
      const performanceAssessments = form.getValues().performanceAssessments || [];
      if (!performanceAssessments[currentGoalIndex]) return;

      const currentAssessment = performanceAssessments[currentGoalIndex];
      if (!currentAssessment.milestones || !currentAssessment.milestones[currentMilestoneIndex]) return;

      const currentMilestone = currentAssessment.milestones[currentMilestoneIndex];

      // Extract strategy names
      const strategyNames = strategies.map(s => s.name);

      // Ensure strategies array exists
      const currentStrategies = currentMilestone.strategies || [];

      const updatedMilestone = {
        ...currentMilestone,
        strategies: [...currentStrategies, ...strategyNames],
      };

      const updatedMilestones = [...currentAssessment.milestones];
      updatedMilestones[currentMilestoneIndex] = updatedMilestone;

      const updatedAssessment = {
        ...currentAssessment,
        milestones: updatedMilestones,
      };

      const updatedAssessments = [...performanceAssessments];
      updatedAssessments[currentGoalIndex] = updatedAssessment;

      form.setValue("performanceAssessments", updatedAssessments);
    } catch (error) {
      console.error("Error adding strategy:", error);
    }
  };

  // Handle removing a strategy from a milestone
  const handleRemoveStrategy = (goalIndex: number, milestoneIndex: number, strategyIndex: number) => {
    try {
      const performanceAssessments = form.getValues().performanceAssessments || [];
      if (!performanceAssessments[goalIndex]) return;

      const currentAssessment = performanceAssessments[goalIndex];
      if (!currentAssessment.milestones || !currentAssessment.milestones[milestoneIndex]) return;

      const currentMilestone = currentAssessment.milestones[milestoneIndex];
      if (!currentMilestone.strategies) return;

      const updatedStrategies = currentMilestone.strategies.filter((_, index) => index !== strategyIndex);

      const updatedMilestone = {
        ...currentMilestone,
        strategies: updatedStrategies,
      };

      const updatedMilestones = [...currentAssessment.milestones];
      updatedMilestones[milestoneIndex] = updatedMilestone;

      const updatedAssessment = {
        ...currentAssessment,
        milestones: updatedMilestones,
      };

      const updatedAssessments = [...performanceAssessments];
      updatedAssessments[goalIndex] = updatedAssessment;

      form.setValue("performanceAssessments", updatedAssessments);
    } catch (error) {
      console.error("Error removing strategy:", error);
    }
  };

  // Handle adding a product to the session
  const handleAddProduct = (product: BudgetItem & { availableQuantity: number }, quantity: number) => {
    try {
      if (!product || !quantity) {
        console.error("Invalid product or quantity:", product, quantity);
        return;
      }

      const currentProducts = form.getValues()?.sessionNote?.products || [];

      // Check if product already exists
      const existingIndex = currentProducts.findIndex(p => p.budgetItemId === product.id);

      if (existingIndex >= 0) {
        // Update existing product quantity
        const updatedProducts = [...currentProducts];
        updatedProducts[existingIndex] = {
          ...updatedProducts[existingIndex],
          quantity: updatedProducts[existingIndex].quantity + quantity,
        };

        form.setValue("sessionNote.products", updatedProducts);

        toast({
          title: "Product Updated",
          description: `Added ${quantity} more units of ${product.description || "product"} to the session`,
        });
      } else {
        // Add new product
        const newProduct = {
          budgetItemId: product.id,
          productCode: product.itemCode || "",
          productDescription: product.description || "",
          quantity,
          unitPrice: product.unitPrice || 0,
          availableQuantity: product.availableQuantity || 0,
          originalQuantity: product.quantity || 0,
        };

        form.setValue("sessionNote.products", [...currentProducts, newProduct]);

        toast({
          title: "Product Added",
          description: `Added ${product.description || "product"} to the session`,
        });
      }
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  // Handle removing a product from the session
  const handleRemoveProduct = (index: number) => {
    try {
      const currentProducts = form.getValues()?.sessionNote?.products || [];
      if (index < 0 || index >= currentProducts.length) {
        console.error("Invalid product index:", index, "for products:", currentProducts);
        return;
      }

      const updatedProducts = currentProducts.filter((_, i) => i !== index);
      form.setValue("sessionNote.products", updatedProducts);

      toast({
        title: "Product Removed",
        description: "Product has been removed from the session",
      });
    } catch (error) {
      console.error("Error removing product:", error);
    }
  };

  // Handle removing attendee by index
  const handleRemoveAttendeeByIndex = (index: number) => {
    try {
      console.log(`Removing attendee at index ${index}`);

      // Get current values
      const currentNames = form.getValues("sessionNote.presentAllies") || [];
      const currentIds = form.getValues("sessionNote.presentAllyIds") || [];

      console.log("Current allies before removal:", { currentNames, currentIds });

      // Filter out the specified index
      const newNames = currentNames.filter((_, i) => i !== index);
      const newIds = currentIds.filter((_, i) => i !== index);

      console.log("Updated allies after removal:", { newNames, newIds });

      // Update form state
      form.setValue("sessionNote.presentAllies", newNames);
      form.setValue("sessionNote.presentAllyIds", newIds);
    } catch (error) {
      console.error("Error removing attendee:", error);
    }
  };

  // Handle adding attendees to the session
  const handleAddAttendees = (selectedAllies: Ally[]) => {
    try {
      if (!selectedAllies || !Array.isArray(selectedAllies)) {
        console.error("Invalid selectedAllies:", selectedAllies);
        return;
      }

      console.log("Adding attendees:", selectedAllies);

      // Get current values (defaulting to empty arrays if they don't exist)
      const currentNames = form.getValues("sessionNote.presentAllies") || [];
      const currentIds = form.getValues("sessionNote.presentAllyIds") || [];

      console.log("Current attendees before adding:", { currentNames, currentIds });

      // Extract new ally names and IDs - filter out any archived allies
      const newAttendeeNames = selectedAllies
        .filter(ally => !ally.archived)
        .map(ally => ally.name || "");

      const newAttendeeIds = selectedAllies
        .filter(ally => !ally.archived)
        .map(ally => ally.id || 0);

      // Combine with existing values without duplicates
      const uniqueNames = Array.from(new Set([...currentNames, ...newAttendeeNames]));
      const uniqueIds = Array.from(new Set([...currentIds, ...newAttendeeIds]));

      console.log("Updated attendees after adding:", { uniqueNames, uniqueIds });

      console.log("Combined allies:", uniqueNames);

      // Update form with combined values
      form.setValue("sessionNote.presentAllies", uniqueNames);
      form.setValue("sessionNote.presentAllyIds", uniqueIds);
    } catch (error) {
      console.error("Error adding attendees:", error);
    }
  };

  // Handle form submission
  const onSubmit = (data: IntegratedSessionFormValues) => {
    console.log("Form submitted with data:", data);
    setIsSaving(true);
    sessionMutation.mutate(data);
  };

  // Handle time entry generation for select dropdown
  const timeOptions = useMemo(() => {
    return [...Array(24)].flatMap((_, hour) => [
      { value: `${hour.toString().padStart(2, '0')}:00`, label: `${hour.toString().padStart(2, '0')}:00` },
      { value: `${hour.toString().padStart(2, '0')}:30`, label: `${hour.toString().padStart(2, '0')}:30` }
    ]);
  }, []);

  // Total products value calculation
  const totalProductValue = useMemo(() => {
    if (!form) return 0;

    try {
      const products = form.getValues()?.sessionNote?.products || [];
      return products.reduce((total, product) => total + (product.unitPrice * product.quantity), 0);
    } catch (error) {
      console.error("Error calculating product value:", error);
      return 0;
    }
  }, [form, form?.watch("sessionNote.products")]);

  if (!open) return null;

  return (
    <ThreeColumnLayout
      open={open}
      onOpenChange={onOpenChange}
      className="overflow-auto"
      title="Session Details"
      rightColumn={
        <div className="space-y-4 p-4 w-full">
          <h2 className="text-lg font-semibold">Session Summary</h2>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Client</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Debug console logs moved to useEffect to avoid invalid React nodes */}

                {isLoadingClient ? (
                  <Skeleton className="h-6 w-[120px]" />
                ) : (
                  <div>
                    {clientData ? (
                      <p className="font-medium">{
(() => {
                          try {
                            // Safe extraction of client name with type checking
                            const clientName = clientData?.originalName || clientData?.name || null;
                            return clientName || "Client Name Unavailable";
                          } catch (e) {
                            console.error("Error extracting client name:", e);
                            return "Error Getting Client Name";
                          }
                        })()
                      }</p>
                    ) : (
                      <p>No client information available</p>
                    )}
                  </div>
                )}
                {/* Show raw client data */}
                {/* Removed "Raw client data available: Yes" section */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Date & Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  {form.watch("session.sessionDate")
                    ? format(new Date(form.watch("session.sessionDate")), "dd MMM yyyy")
                    : "Not set"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {form.watch("session.timeFrom") && form.watch("session.timeTo")
                    ? `${form.watch("session.timeFrom")} - ${form.watch("session.timeTo")}`
                    : "Time not specified"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Products</CardTitle>
              </CardHeader>
              <CardContent>
                {form.watch("sessionNote.products")?.length > 0 ? (
                  <div className="space-y-2">
                    {form.watch("sessionNote.products").map((product, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="truncate max-w-[120px]">{product.productDescription}</span>
                        <span>
                          {product.quantity} × ${product.unitPrice.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                      <span>Total</span>
                      <span>${totalProductValue.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No products added</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                {form.watch("performanceAssessments")?.length > 0 ? (
                  <div className="space-y-2">
                    {form.watch("performanceAssessments").map((assessment, index) => (
                      <div key={index} className="text-sm">
                        <p className="font-medium">{assessment.goalTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {assessment.milestones.length} milestone{assessment.milestones.length !== 1 ? 's' : ''} assessed
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No goal assessments added</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs 
            defaultValue="session" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="session">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Session</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="details">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="h-4 w-4" />
                  <span>Details</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="products">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4" />
                  <span>Products</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="assessment">
                <div className="flex items-center space-x-2">
                  <BarChart className="h-4 w-4" />
                  <span>Assessment</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="session" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
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
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Therapist Selection */}
                <FormField
                  control={form.control}
                  name="session.therapistId"
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
                          {cliniciansData?.map((clinician) => (
                            <SelectItem key={clinician.id} value={clinician.id.toString()}>
                              {clinician.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time From */}
                <FormField
                  control={form.control}
                  name="session.timeFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
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
                          {timeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
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
                      <FormLabel>End Time</FormLabel>
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
                          {timeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="session.location"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Location</FormLabel>
                      <div className="flex">
                        <FormControl>
                          <Input 
                            placeholder="Enter session location" 
                            {...field} 
                            value={field.value || ""} 
                            className="flex-1"
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="ml-2" 
                          onClick={() => field.onChange("Clinic Office")}
                        >
                          <MapPinIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Attendees */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Attendees</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAttendeeSelectionOpen(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Select
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {form.watch("sessionNote.presentAllies")?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.watch("sessionNote.presentAllies").map((name, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="flex items-center space-x-1"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          {name}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 p-0 hover:bg-transparent"
                            onClick={() => handleRemoveAttendeeByIndex(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No attendees selected</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card className={cn(borderStyles.base, "col-span-1 sm:col-span-2")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Session Notes</CardTitle>
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
                              placeholder="Enter detailed notes about the session..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className={cn(borderStyles.base)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md">Client Behavior</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="sessionNote.moodRating"
                      render={({ field }) => (
                        <FormItem>
                          <RatingSlider
                            value={field.value}
                            onChange={field.onChange}
                            label="Mood"
                            description="Rate the client's mood during the session"
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sessionNote.focusRating"
                      render={({ field }) => (
                        <FormItem>
                          <RatingSlider
                            value={field.value}
                            onChange={field.onChange}
                            label="Focus"
                            description="Rate the client's ability to focus during the session"
                          />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className={cn(borderStyles.base)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md">Participation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="sessionNote.cooperationRating"
                      render={({ field }) => (
                        <FormItem>
                          <RatingSlider
                            value={field.value}
                            onChange={field.onChange}
                            label="Cooperation"
                            description="Rate the client's cooperation during the session"
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sessionNote.physicalActivityRating"
                      render={({ field }) => (
                        <FormItem>
                          <RatingSlider
                            value={field.value}
                            onChange={field.onChange}
                            label="Physical Activity"
                            description="Rate the client's physical activity during the session"
                          />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4 pt-4">
              <Card className={cn(borderStyles.base)}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Products & Services</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProductSelectionOpen(true)}
                      disabled={!clientId}
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                  <CardDescription>
                    Add products and services from the client's budget to this session
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {form.watch("sessionNote.products")?.length > 0 ? (
                    <div className="space-y-2">
                      {form.watch("sessionNote.products").map((product, index) => (
                        <Card key={index} className={cn(borderStyles.ghost, "relative overflow-hidden")}>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-12 gap-4">
                              <div className="col-span-5">
                                <p className="font-medium">{product.productDescription}</p>
                                <p className="text-xs text-muted-foreground">Code: {product.productCode}</p>
                              </div>
                              <div className="col-span-2 text-center">
                                <p className="text-sm">{product.quantity} × ${product.unitPrice.toFixed(2)}</p>
                              </div>
                              <div className="col-span-3 text-right">
                                <p className="font-medium">${(product.quantity * product.unitPrice).toFixed(2)}</p>
                              </div>
                              <div className="col-span-2 flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveProduct(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      <div className="border-t pt-4 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total</span>
                          <span className="font-bold text-lg">
                            ${totalProductValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 border rounded-md bg-muted/20">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">No products added</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add products from the client's budget to track utilization
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assessment" className="space-y-4 pt-4">
              <Card className={cn(borderStyles.base)}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Goal Assessments</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setGoalSelectionOpen(true)}
                      disabled={isLoadingGoals || !goalsData?.length}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Goal
                    </Button>
                  </div>
                  <CardDescription>
                    Assess the client's progress toward their therapy goals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingGoals ? (
                    <div className="text-center p-4">
                      <p className="text-muted-foreground">Loading client goals...</p>
                    </div>
                  ) : !goalsData?.length ? (
                    <div className="text-center p-8 border rounded-md bg-muted/20">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">No goals available</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add goals to the client profile first
                      </p>
                    </div>
                  ) : form.watch("performanceAssessments")?.length === 0 ? (
                    <div className="text-center p-8 border rounded-md bg-muted/20">
                      <BarChart className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">No assessments added</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add goals to assess the client's progress
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {form.watch("performanceAssessments").map((assessment, goalIndex) => (
                        <Card key={goalIndex} className={cn(borderStyles.ghost, "relative overflow-hidden")}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">{assessment.goalTitle}</CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveGoalAssessment(goalIndex)}
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-4 space-y-4">
                            {/* Goal Notes */}
                            <FormField
                              control={form.control}
                              name={`performanceAssessments.${goalIndex}.notes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Enter general notes about this goal..."
                                      className="min-h-[80px]"
                                      {...field}
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Milestones */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center mb-1">
                                <h4 className="text-sm font-medium">Milestones</h4>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    setCurrentGoalIndex(goalIndex);
                                    setMilestoneSelectionOpen(true);
                                  }}
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" />
                                  Add Milestone
                                </Button>
                              </div>

                              {assessment.milestones.length === 0 ? (
                                <div className="text-sm text-muted-foreground p-2 text-center border rounded-md">
                                  No milestones added yet
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {assessment.milestones.map((milestone, milestoneIndex) => (
                                    <Card key={milestoneIndex} className="border p-3">
                                      <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-sm font-medium">{milestone.milestoneTitle}</h4>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRemoveMilestone(goalIndex, milestoneIndex)}
                                          className="h-6 w-6"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>

                                      {/* Milestone Rating */}
                                      <FormField
                                        control={form.control}
                                        name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                        render={({ field }) => (
                                          <FormItem className="mb-3">
                                            <FormLabel className="text-xs">Performance Rating</FormLabel>
                                            <FormControl>
                                              <div className="pt-1">
                                                <Slider
                                                  min={0}
                                                  max={10}
                                                  step={1}
                                                  value={[field.value || 0]}
                                                  onValueChange={(value) => field.onChange(value[0])}
                                                />
                                                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                                                  <span>0</span>
                                                  <span>5</span>
                                                  <span>10</span>
                                                </div>
                                              </div>
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />

                                      {/* Milestone Strategies */}
                                      <div className="mb-3">
                                        <div className="flex justify-between items-center mb-1">
                                          <h5 className="text-xs font-medium">Strategies Used</h5>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={() => {
                                              setCurrentGoalIndex(goalIndex);
                                              setCurrentMilestoneIndex(milestoneIndex);
                                              setStrategySelectionOpen(true);
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add
                                          </Button>
                                        </div>

                                        {milestone.strategies.length === 0 ? (
                                          <div className="text-xs text-muted-foreground p-1.5 text-center border rounded-md">
                                            No strategies added
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap gap-1.5">
                                            {milestone.strategies.map((strategy, strategyIndex) => (
                                              <Badge 
                                                key={strategyIndex} 
                                                variant="outline"
                                                className="pl-1.5 pr-0.5 py-0 h-5 text-xs flex items-center"
                                              >
                                                {strategy}
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => handleRemoveStrategy(goalIndex, milestoneIndex, strategyIndex)}
                                                  className="h-4 w-4 ml-0.5"
                                                >
                                                  <X className="h-2.5 w-2.5" />
                                                </Button>
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Milestone Notes */}
                                      <FormField
                                        control={form.control}
                                        name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.notes`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">Notes</FormLabel>
                                            <FormControl>
                                              <Textarea
                                                placeholder="Enter notes specific to this milestone..."
                                                className="min-h-[60px] text-sm"
                                                {...field}
                                                value={field.value || ""}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    </Card>
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
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <div className="flex space-x-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Session" : "Update Session"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* Goal Selection Dialog */}
      <GoalSelectionDialog
        open={goalSelectionOpen}
        onOpenChange={setGoalSelectionOpen}
        goals={goalsData || []}
        selectedGoalIds={form.getValues().performanceAssessments.map(pa => pa.goalId)}
        onSelectGoal={handleAddGoalAssessment}
      />

      {/* Milestone Selection Dialog */}
      <MilestoneSelectionDialog
        open={milestoneSelectionOpen}
        onOpenChange={setMilestoneSelectionOpen}
        subgoals={currentGoalIndex >= 0 && form.getValues().performanceAssessments[currentGoalIndex]
          ? (subgoalsByGoalId[form.getValues().performanceAssessments[currentGoalIndex].goalId] || [])
          : []}
        selectedMilestoneIds={currentGoalIndex >= 0 && form.getValues().performanceAssessments[currentGoalIndex]
          ? form.getValues().performanceAssessments[currentGoalIndex].milestones.map(m => m.milestoneId)
          : []}
        onSelectMilestone={handleAddMilestone}
      />

      {/* Strategy Selection Dialog */}
      <StrategySelectionDialog
        open={strategySelectionOpen}
        onOpenChange={setStrategySelectionOpen}
        selectedStrategies={
          currentGoalIndex >= 0 && 
          currentMilestoneIndex >= 0 && 
          form.getValues()?.performanceAssessments?.[currentGoalIndex]?.milestones?.[currentMilestoneIndex]?.strategies || []
        }
        milestoneId={
          currentGoalIndex >= 0 && 
          currentMilestoneIndex >= 0 && 
          form.getValues()?.performanceAssessments?.[currentGoalIndex]?.milestones?.[currentMilestoneIndex]?.milestoneId || 0
        }
        onSelectStrategy={(strategy) => {
          if (strategy) {
            handleAddStrategy([strategy]);
          }
        }}
      />

      {/* Product Selection Dialog */}
      <ProductSelectionDialog
        open={productSelectionOpen}
        onOpenChange={setProductSelectionOpen}
        products={availableProducts}
        onSelectProduct={handleAddProduct}
      />

      {/* Attendee Selection Dialog */}
      {/* Debug allies */}
      {attendeeSelectionOpen && (
        <>
          {console.log("FullScreenSessionForm - alliesData:", JSON.stringify(alliesData))}
          {console.log("FullScreenSessionForm - Allies count:", (alliesData || []).length)}
          {console.log("FullScreenSessionForm - Allies filtered by archived:", (alliesData || []).filter(ally => !ally.archived).length)}
          {console.log("FullScreenSessionForm - Each ally details:", (alliesData || []).map(ally => ({ id: ally.id, name: ally.name, archived: ally.archived })))}
        </>
      )}

      <AttendeeSelectionDialog
        open={attendeeSelectionOpen}
        onOpenChange={setAttendeeSelectionOpen}
        allies={Array.isArray(alliesData) ? alliesData.filter(ally => !ally.archived) : []}
        selectedAllies={form.getValues()?.sessionNote?.presentAllies || []}
        onSelectAttendee={(ally) => {
          console.log("Selected ally:", JSON.stringify(ally));
          if (ally) {
            const allies = [ally]; // Create array with the single ally
            handleAddAttendees(allies);
          }
        }}
        isLoading={isLoadingAllies}
      />
    </ThreeColumnLayout>
  );
}