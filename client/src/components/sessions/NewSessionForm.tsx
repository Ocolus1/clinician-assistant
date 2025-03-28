import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { MapPin, X, Plus, Clock, User, Search, ShoppingCart, ClipboardList, ListChecks } from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";

// Custom components
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RatingSlider } from "@/components/sessions/RatingSlider";
import { NumericRating } from "@/components/sessions/NumericRating";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

// Types and Schemas from shared
import {
  Client,
  Ally,
  Goal,
  Subgoal,
  BudgetItem,
  BudgetSettings,
  Clinician,
  Strategy,
  insertSessionSchema,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { borderStyles } from "@/lib/border-styles";

// Form schemas
const sessionFormSchema = insertSessionSchema.extend({
  sessionDate: z.coerce.date({
    required_error: "Session date is required",
  }),
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  therapistId: z.coerce.number().optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  location: z.string().optional(),
  sessionId: z.string().optional(),
});

// Performance assessment schema
const performanceAssessmentSchema = z.object({
  goalId: z.number(),
  goalTitle: z.string().optional(),
  notes: z.string().optional(),
  subgoals: z.array(z.object({
    subgoalId: z.number(),
    subgoalTitle: z.string().optional(),
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
  presentAllyIds: z.array(z.number()).default([]),
  moodRating: z.number().min(0).max(10).default(5),
  focusRating: z.number().min(0).max(10).default(5),
  cooperationRating: z.number().min(0).max(10).default(5),
  physicalActivityRating: z.number().min(0).max(10).default(5),
  notes: z.string().optional(),
  products: z.array(sessionProductSchema).default([]),
  status: z.enum(["draft", "completed"]).default("draft"),
});

// Complete form schema
const newSessionFormSchema = z.object({
  session: sessionFormSchema,
  sessionNote: sessionNoteSchema,
  performanceAssessments: z.array(performanceAssessmentSchema).default([]),
});

// Type inference for form values
type NewSessionFormValues = z.infer<typeof newSessionFormSchema>;

interface NewSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClient?: Client;
  initialData?: NewSessionFormValues;
  isEdit?: boolean;
}

export function NewSessionForm({ 
  open, 
  onOpenChange, 
  initialClient,
  initialData,
  isEdit = false 
}: NewSessionFormProps) {
  const [activeTab, setActiveTab] = useState("session");
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClient || null);
  
  // State for attendee selection dialog
  const [attendeeDialogOpen, setAttendeeDialogOpen] = useState(false);
  
  // State for product selection dialog
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  
  // State for goal selection dialog
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  
  // Keep track of subgoals by goal
  const [subgoalsByGoal, setSubgoalsByGoal] = useState<Record<number, Subgoal[]>>({});
  
  // Form declaration
  const form = useForm<NewSessionFormValues>({
    resolver: zodResolver(newSessionFormSchema),
    defaultValues: initialData || {
      session: {
        clientId: initialClient?.id,
        title: "Therapy Session",
        sessionDate: new Date(),
        duration: 60,
        status: "scheduled",
        location: "",
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
        notes: "",
        products: [],
        status: "draft",
      },
      performanceAssessments: [],
    },
  });
  
  // Watch form values for summary panel
  const sessionValues = form.watch("session");
  const sessionNoteValues = form.watch("sessionNote");
  const performanceAssessments = form.watch("performanceAssessments");

  // Fetch client data if needed
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      const response = await fetch(`/api/clients/${selectedClient.id}`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });
  
  // Effect to update form when client changes
  useEffect(() => {
    if (selectedClient) {
      form.setValue("session.clientId", selectedClient.id);
    }
  }, [selectedClient, form]);
  
  // Fetch allies for the client
  const { data: allies = [], isLoading: alliesLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id, "allies"],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const response = await fetch(`/api/clients/${selectedClient.id}/allies`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });
  
  // Fetch goals for the client
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id, "goals"],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const response = await fetch(`/api/clients/${selectedClient.id}/goals`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });
  
  // Fetch budget items for the client
  const { data: budgetItems = [], isLoading: budgetItemsLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id, "budget-items"],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const response = await fetch(`/api/clients/${selectedClient.id}/budget-items`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });
  
  // Fetch budget settings for the client
  const { data: budgetSettings, isLoading: budgetSettingsLoading } = useQuery({
    queryKey: ["/api/clients", selectedClient?.id, "budget-settings"],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      const response = await fetch(`/api/clients/${selectedClient.id}/budget-settings`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });
  
  // Fetch clinicians for therapist selection
  const { data: clinicians = [], isLoading: cliniciansLoading } = useQuery({
    queryKey: ["/api/clinicians"],
    queryFn: async () => {
      const response = await fetch(`/api/clinicians`);
      return response.json();
    },
  });
  
  // Function to fetch subgoals for a goal
  const fetchSubgoals = async (goalId: number) => {
    if (!goalId) return;
    
    try {
      console.log(`Fetching subgoals for goal ID: ${goalId}, Title: ${goals.find((g: Goal) => g.id === goalId)?.title}`);
      const response = await fetch(`/api/goals/${goalId}/subgoals`);
      const subgoals = await response.json();
      console.log(`Received ${subgoals.length} subgoals for goal ${goalId}:`, subgoals);
      
      setSubgoalsByGoal(prev => ({
        ...prev,
        [goalId]: subgoals
      }));
      
      return subgoals;
    } catch (error) {
      console.error(`Error fetching subgoals for goal ${goalId}:`, error);
      return [];
    }
  };
  
  // Effect to fetch subgoals when goals are loaded
  useEffect(() => {
    if (goals.length > 0) {
      // Fetch subgoals for each goal
      Promise.all(goals.map((goal: Goal) => fetchSubgoals(goal.id)))
        .then(() => {
          console.log("Final subgoals by goal:", subgoalsByGoal);
        });
    }
  }, [goals]);
  
  // Submit handler
  const onSubmit = async (data: NewSessionFormValues) => {
    try {
      const payload = {
        ...data,
        // Transform the data as needed
        session: {
          ...data.session,
          // Combine time fields with date
          sessionDate: combineDateTime(data.session.sessionDate, data.session.timeFrom, data.session.timeTo),
          // Calculate duration from time range
          duration: calculateDuration(data.session.timeFrom, data.session.timeTo)
        }
      };
      
      if (isEdit) {
        // Handle edit with PUT request
        // Implementation depends on your API
      } else {
        // Create new session with POST request
        const response = await apiRequest("POST", "/api/sessions", payload);
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
        if (selectedClient?.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/clients", selectedClient.id, "sessions"] });
        }
        
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to submit session:", error);
    }
  };
  
  // Helper to combine date and time
  const combineDateTime = (date: Date, timeFrom?: string, timeTo?: string) => {
    if (!date) return new Date();
    
    const newDate = new Date(date);
    
    if (timeFrom) {
      const [hours, minutes] = timeFrom.split(":").map(Number);
      newDate.setHours(hours, minutes);
    }
    
    return newDate;
  };
  
  // Calculate duration in minutes from time strings
  const calculateDuration = (timeFrom?: string, timeTo?: string) => {
    if (!timeFrom || !timeTo) return 60; // Default to 60 minutes
    
    const [fromHours, fromMinutes] = timeFrom.split(":").map(Number);
    const [toHours, toMinutes] = timeTo.split(":").map(Number);
    
    const fromMinutesTotal = fromHours * 60 + fromMinutes;
    const toMinutesTotal = toHours * 60 + toMinutes;
    
    return toMinutesTotal - fromMinutesTotal;
  };
  
  // Function to add a goal assessment (without subgoals)
  const addGoalAssessment = (goalId: number) => {
    const goal = goals.find((g: Goal) => g.id === goalId);
    if (!goal) return;
    
    const existingAssessmentIndex = performanceAssessments.findIndex(
      a => a.goalId === goalId
    );
    
    if (existingAssessmentIndex !== -1) {
      // Goal is already being assessed
      return;
    }
    
    // Add goal assessment without subgoals (new behavior)
    const newAssessment = {
      goalId,
      goalTitle: goal.title,
      notes: "",
      subgoals: [], // Empty array - subgoals will be added individually
    };
    
    form.setValue("performanceAssessments", [
      ...performanceAssessments,
      newAssessment
    ]);
  };
  
  // Function to add a subgoal to a goal assessment
  const addSubgoalToAssessment = (goalId: number, subgoalId: number) => {
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return;
    
    const subgoal = subgoalsByGoal[goalId]?.find(s => s.id === subgoalId);
    if (!subgoal) return;
    
    // Check if subgoal is already added
    const subgoalExists = performanceAssessments[goalIndex].subgoals.some(
      s => s.subgoalId === subgoalId
    );
    
    if (subgoalExists) return;
    
    // Add the subgoal to the assessment
    const newAssessments = [...performanceAssessments];
    newAssessments[goalIndex].subgoals.push({
      subgoalId,
      subgoalTitle: subgoal.title,
      rating: 5, // Default rating
      strategies: [],
      notes: "",
    });
    
    form.setValue("performanceAssessments", newAssessments);
  };
  
  // Function to remove a subgoal from a goal assessment
  const removeSubgoalFromAssessment = (goalId: number, subgoalId: number) => {
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return;
    
    const newAssessments = [...performanceAssessments];
    newAssessments[goalIndex].subgoals = newAssessments[goalIndex].subgoals.filter(
      s => s.subgoalId !== subgoalId
    );
    
    form.setValue("performanceAssessments", newAssessments);
  };
  
  // Function to remove a goal assessment
  const removeGoalAssessment = (goalId: number) => {
    const updatedAssessments = performanceAssessments.filter(
      a => a.goalId !== goalId
    );
    form.setValue("performanceAssessments", updatedAssessments);
  };
  
  // Function to add an attendee
  const addAttendee = (ally: Ally) => {
    const currentPresentAllies = form.getValues("sessionNote.presentAllies");
    const currentPresentAllyIds = form.getValues("sessionNote.presentAllyIds");
    
    if (!currentPresentAllyIds.includes(ally.id)) {
      form.setValue("sessionNote.presentAllies", [...currentPresentAllies, ally.name]);
      form.setValue("sessionNote.presentAllyIds", [...currentPresentAllyIds, ally.id]);
    }
  };
  
  // Function to remove an attendee
  const removeAttendee = (index: number) => {
    const currentPresentAllies = form.getValues("sessionNote.presentAllies");
    const currentPresentAllyIds = form.getValues("sessionNote.presentAllyIds");
    
    form.setValue("sessionNote.presentAllies", 
      currentPresentAllies.filter((_, i) => i !== index)
    );
    form.setValue("sessionNote.presentAllyIds", 
      currentPresentAllyIds.filter((_, i) => i !== index)
    );
  };
  
  // Function to add a product to the session
  const addProduct = (item: BudgetItem) => {
    const currentProducts = form.getValues("sessionNote.products");
    
    // Check if product already exists
    const existingProductIndex = currentProducts.findIndex(
      p => p.budgetItemId === item.id
    );
    
    if (existingProductIndex !== -1) {
      // Update quantity if product already exists
      const updatedProducts = [...currentProducts];
      updatedProducts[existingProductIndex].quantity += 1;
      form.setValue("sessionNote.products", updatedProducts);
    } else {
      // Add new product
      form.setValue("sessionNote.products", [
        ...currentProducts,
        {
          budgetItemId: item.id,
          productCode: item.itemCode || "",
          productDescription: item.description || "",
          quantity: 1,
          unitPrice: parseFloat(String(item.unitPrice || "0")),
          availableQuantity: parseFloat(String(item.quantity || "0")),
        }
      ]);
    }
  };
  
  // Function to remove a product
  const removeProduct = (index: number) => {
    const currentProducts = form.getValues("sessionNote.products");
    form.setValue("sessionNote.products", 
      currentProducts.filter((_, i) => i !== index)
    );
  };

  // Calculate total product cost
  const totalProductCost = useMemo(() => {
    return sessionNoteValues.products.reduce(
      (total, product) => total + (product.quantity * product.unitPrice),
      0
    );
  }, [sessionNoteValues.products]);
  
  // Attendee Selection Dialog
  const AttendeeSelectionDialog = () => {
    // State for search input
    const [searchTerm, setSearchTerm] = useState('');
    
    // Reset search term when dialog opens
    useEffect(() => {
      if (attendeeDialogOpen) {
        setSearchTerm('');
      }
    }, [attendeeDialogOpen]);
    
    // Get currently selected allies
    const selectedAllies = form.watch("sessionNote.presentAllies") || [];
    
    // Filter allies by search term and exclude already selected allies
    const filteredAllies = allies.filter((ally: Ally) => 
      (searchTerm === '' || ally.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      !ally.archived &&
      !selectedAllies.includes(ally.name)
    );
    
    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };
    
    // Modified add attendee function that also closes the dialog
    const handleAddAttendee = (ally: Ally) => {
      addAttendee(ally);
      setAttendeeDialogOpen(false); // Close dialog after selection
    };
    
    return (
      <Dialog open={attendeeDialogOpen} onOpenChange={setAttendeeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Attendees</DialogTitle>
            <DialogDescription>
              Choose allies who attended this session
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <Label>Search Allies</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {alliesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : allies.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">No allies found</p>
                ) : filteredAllies.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching allies found' : 'All allies have been selected'}
                  </p>
                ) : (
                  filteredAllies.map((ally: Ally) => (
                    <div 
                      key={ally.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddAttendee(ally)}
                    >
                      <div>
                        <p className="font-medium">{ally.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {ally.relationship} • {ally.preferredLanguage || "English"}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddAttendee(ally);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAttendeeDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Product Selection Dialog
  const ProductSelectionDialog = () => {
    // State for search input
    const [searchTerm, setSearchTerm] = useState('');
    
    // Reset search term when dialog opens
    useEffect(() => {
      if (productDialogOpen) {
        setSearchTerm('');
      }
    }, [productDialogOpen]);
    
    // Get currently selected products
    const selectedProducts = form.watch("sessionNote.products") || [];
    const selectedProductIds = selectedProducts.map(p => p.budgetItemId);
    
    // Filter budget items by search term and exclude already selected products
    const filteredProducts = budgetItems.filter((item: BudgetItem) => 
      (searchTerm === '' || 
       item.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase())) && 
      !selectedProductIds.includes(item.id)
    );
    
    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };
    
    // Modified add product function that also closes the dialog
    const handleAddProduct = (item: BudgetItem) => {
      addProduct(item);
      setProductDialogOpen(false); // Close dialog after selection
    };
    
    return (
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Products</DialogTitle>
            <DialogDescription>
              Select products and services from the client's budget
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <Label>Search Products</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or code..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {budgetItemsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : budgetItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">No budget items found</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching products found' : 'All products have been selected'}
                  </p>
                ) : (
                  filteredProducts.map((item: BudgetItem) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddProduct(item)}
                    >
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <div className="flex text-sm text-muted-foreground space-x-2">
                          <span>{item.itemCode}</span>
                          <span>•</span>
                          <span>${item.unitPrice} each</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddProduct(item);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setProductDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // State for subgoal dialog
  const [subgoalDialogOpen, setSubgoalDialogOpen] = useState(false);
  const [selectedGoalForSubgoals, setSelectedGoalForSubgoals] = useState<number | null>(null);
  
  // State for strategy dialog
  const [strategyDialogOpen, setStrategyDialogOpen] = useState(false);
  const [selectedSubgoalForStrategies, setSelectedSubgoalForStrategies] = useState<{goalId: number, subgoalId: number} | null>(null);
  
  // Function to open subgoal selection dialog
  const openSubgoalDialog = (goalId: number) => {
    setSelectedGoalForSubgoals(goalId);
    setSubgoalDialogOpen(true);
  };
  
  // Function to open strategy selection dialog
  const openStrategyDialog = (goalId: number, subgoalId: number) => {
    setSelectedSubgoalForStrategies({goalId, subgoalId});
    setStrategyDialogOpen(true);
  };
  
  // Add a strategy to a subgoal
  const addStrategyToSubgoal = (goalId: number, subgoalId: number, strategy: string) => {
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return;
    
    const subgoalIndex = performanceAssessments[goalIndex].subgoals.findIndex(
      s => s.subgoalId === subgoalId
    );
    if (subgoalIndex === -1) return;
    
    // Check if strategy already exists
    const strategies = performanceAssessments[goalIndex].subgoals[subgoalIndex].strategies;
    if (strategies.includes(strategy)) return;
    
    // Maximum 5 strategies
    if (strategies.length >= 5) return;
    
    // Add the strategy
    const newAssessments = [...performanceAssessments];
    newAssessments[goalIndex].subgoals[subgoalIndex].strategies.push(strategy);
    
    form.setValue("performanceAssessments", newAssessments);
  };
  
  // Remove a strategy from a subgoal
  const removeStrategyFromSubgoal = (goalId: number, subgoalId: number, strategy: string) => {
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return;
    
    const subgoalIndex = performanceAssessments[goalIndex].subgoals.findIndex(
      s => s.subgoalId === subgoalId
    );
    if (subgoalIndex === -1) return;
    
    // Remove the strategy
    const newAssessments = [...performanceAssessments];
    newAssessments[goalIndex].subgoals[subgoalIndex].strategies = 
      newAssessments[goalIndex].subgoals[subgoalIndex].strategies.filter(s => s !== strategy);
    
    form.setValue("performanceAssessments", newAssessments);
  };
  
  // Goal Selection Dialog
  const GoalSelectionDialog = () => {
    // State for search input
    const [searchTerm, setSearchTerm] = useState('');
    
    // Reset search term when dialog opens
    useEffect(() => {
      if (goalDialogOpen) {
        setSearchTerm('');
      }
    }, [goalDialogOpen]);
    
    // Get currently selected goal IDs
    const selectedGoalIds = performanceAssessments.map(a => a.goalId);
    
    // Filter goals by search term and filter out already selected goals
    const filteredGoals = goals.filter((goal: Goal) => 
      (searchTerm === '' || 
       goal.title.toLowerCase().includes(searchTerm.toLowerCase())) && 
      !selectedGoalIds.includes(goal.id)
    );
    
    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };
    
    // Modified add goal function that also closes the dialog
    const handleAddGoal = (goalId: number) => {
      addGoalAssessment(goalId);
      setGoalDialogOpen(false); // Close dialog after selection
    };
    
    return (
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Goal Assessment</DialogTitle>
            <DialogDescription>
              Select a goal to assess for this session
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <Label>Search Goals</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by title..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {goalsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : goals.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">No goals found</p>
                ) : filteredGoals.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching goals found' : 'All goals have been selected'}
                  </p>
                ) : (
                  filteredGoals.map((goal: Goal) => (
                    <div 
                      key={goal.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddGoal(goal.id)}
                    >
                      <div>
                        <p className="font-medium">{goal.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {(subgoalsByGoal[goal.id]?.length || 0)} subgoals
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddGoal(goal.id);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setGoalDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Subgoal Selection Dialog
  const SubgoalSelectionDialog = () => {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Reset search term when dialog opens
    useEffect(() => {
      if (subgoalDialogOpen) {
        setSearchTerm('');
      }
    }, [subgoalDialogOpen]);
    
    if (!selectedGoalForSubgoals) return null;
    
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === selectedGoalForSubgoals);
    if (goalIndex === -1) return null;
    
    // Get subgoals for the selected goal
    const goalSubgoals = subgoalsByGoal[selectedGoalForSubgoals] || [];
    
    // Get already selected subgoal IDs
    const selectedSubgoalIds = performanceAssessments[goalIndex].subgoals.map(s => s.subgoalId);
    
    // Filter subgoals that haven't been selected yet
    const filteredSubgoals = goalSubgoals.filter((subgoal: Subgoal) => 
      (searchTerm === '' || 
       subgoal.title.toLowerCase().includes(searchTerm.toLowerCase())) && 
      !selectedSubgoalIds.includes(subgoal.id)
    );
    
    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };
    
    // Add subgoal and close dialog
    const handleAddSubgoal = (subgoalId: number) => {
      addSubgoalToAssessment(selectedGoalForSubgoals, subgoalId);
      setSubgoalDialogOpen(false);
    };
    
    return (
      <Dialog open={subgoalDialogOpen} onOpenChange={setSubgoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subgoal</DialogTitle>
            <DialogDescription>
              Select a subgoal to assess for this goal
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <Label>Search Subgoals</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by title..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredSubgoals.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching subgoals found' : 'All subgoals have been selected'}
                  </p>
                ) : (
                  filteredSubgoals.map((subgoal) => (
                    <div 
                      key={subgoal.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddSubgoal(subgoal.id)}
                    >
                      <div>
                        <p className="font-medium">{subgoal.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {subgoal.description}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddSubgoal(subgoal.id);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSubgoalDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Strategy Selection Dialog
  const StrategySelectionDialog = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [strategies] = useState<string[]>([
      "Visual Supports", "Sensory Integration", "Positive Reinforcement",
      "Social Stories", "Video Modeling", "Structured Teaching",
      "AAC Devices", "Verbal Behavior Approach", "Prompting",
      "Scaffolding", "Task Analysis", "Naturalistic Teaching",
      "Pivotal Response Training", "Self-Management", "Peer-Mediated Strategies"
    ]);
    
    // Reset search term when dialog opens
    useEffect(() => {
      if (strategyDialogOpen) {
        setSearchTerm('');
      }
    }, [strategyDialogOpen]);
    
    if (!selectedSubgoalForStrategies) return null;
    
    const { goalId, subgoalId } = selectedSubgoalForStrategies;
    
    const goalIndex = performanceAssessments.findIndex(a => a.goalId === goalId);
    if (goalIndex === -1) return null;
    
    const subgoalIndex = performanceAssessments[goalIndex].subgoals.findIndex(
      s => s.subgoalId === subgoalId
    );
    if (subgoalIndex === -1) return null;
    
    // Get already selected strategies
    const selectedStrategies = performanceAssessments[goalIndex].subgoals[subgoalIndex].strategies;
    
    // Filter strategies that haven't been selected yet
    const filteredStrategies = strategies.filter((strategy: string) => 
      (searchTerm === '' || 
       strategy.toLowerCase().includes(searchTerm.toLowerCase())) && 
      !selectedStrategies.includes(strategy)
    );
    
    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };
    
    // Add strategy and close dialog if we've reached 5 strategies
    const handleAddStrategy = (strategy: string) => {
      addStrategyToSubgoal(goalId, subgoalId, strategy);
      
      // If we now have 5 strategies, close the dialog
      const currentStrategies = [...performanceAssessments[goalIndex].subgoals[subgoalIndex].strategies, strategy];
      if (currentStrategies.length >= 5) {
        setStrategyDialogOpen(false);
      }
    };
    
    return (
      <Dialog open={strategyDialogOpen} onOpenChange={setStrategyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Strategies</DialogTitle>
            <DialogDescription>
              Select up to 5 strategies used for this subgoal
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <Label>Search Strategies</Label>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            
            <div className="mb-3">
              <Label>Selected ({selectedStrategies.length}/5):</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedStrategies.map((strategy) => (
                  <Badge 
                    key={strategy} 
                    variant="secondary"
                    className="px-2 py-1 gap-1"
                  >
                    {strategy}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeStrategyFromSubgoal(goalId, subgoalId, strategy)} 
                    />
                  </Badge>
                ))}
                {selectedStrategies.length === 0 && (
                  <p className="text-sm text-muted-foreground">No strategies selected yet</p>
                )}
              </div>
            </div>
            
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {filteredStrategies.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">
                    {searchTerm ? 'No matching strategies found' : 
                     selectedStrategies.length >= 5 ? 'Maximum of 5 strategies reached' : 'All strategies have been selected'}
                  </p>
                ) : (
                  filteredStrategies.map((strategy) => (
                    <div 
                      key={strategy} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleAddStrategy(strategy)}
                    >
                      <div>
                        <p className="font-medium">{strategy}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddStrategy(strategy);
                        }}
                        disabled={selectedStrategies.length >= 5}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setStrategyDialogOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Check if form is in a loading state
  const isDataLoading = clientLoading || 
    alliesLoading || 
    goalsLoading || 
    budgetItemsLoading || 
    budgetSettingsLoading ||
    cliniciansLoading;
  
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="h-full w-full flex flex-col px-0 py-4 md:px-0">
        {/* Form Header */}
        <div className="flex justify-between items-center py-4 px-4 border-b">
          <div>
            <h1 className="text-xl font-semibold">
              {isEdit ? "Edit Session" : "New Session"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedClient ? 
                `Client: ${selectedClient.originalName || selectedClient.name}` : 
                "Please select a client"}
            </p>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col md:flex-row">
            {/* Left Side - Form */}
            <div className="md:w-4/5 h-full overflow-y-auto p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-6">
                    <h2 className="text-lg font-medium">Session Details</h2>
                    
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="session" className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Session
                        </TabsTrigger>
                        <TabsTrigger value="details" className="flex items-center">
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Details
                        </TabsTrigger>
                        <TabsTrigger value="products" className="flex items-center">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Products
                        </TabsTrigger>
                        <TabsTrigger value="assessment" className="flex items-center">
                          <ListChecks className="h-4 w-4 mr-2" />
                          Assessment
                        </TabsTrigger>
                      </TabsList>
                      
                      {/* Session Tab */}
                      <TabsContent value="session" className="py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
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
                                          className={cn(
                                            "pl-3 text-left font-normal",
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
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="session.therapistId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Therapist</FormLabel>
                                  <Select
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                    defaultValue={field.value?.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select therapist" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {clinicians.map((clinician: Clinician) => (
                                        <SelectItem
                                          key={clinician.id}
                                          value={clinician.id.toString()}
                                        >
                                          {clinician.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div>
                            <FormField
                              control={form.control}
                              name="session.timeFrom"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Time</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select time" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Array.from({ length: 24 }).map((_, hour) => (
                                        <>
                                          <SelectItem
                                            key={`${hour}:00`}
                                            value={`${hour.toString().padStart(2, '0')}:00`}
                                          >
                                            {`${hour.toString().padStart(2, '0')}:00`}
                                          </SelectItem>
                                          <SelectItem
                                            key={`${hour}:30`}
                                            value={`${hour.toString().padStart(2, '0')}:30`}
                                          >
                                            {`${hour.toString().padStart(2, '0')}:30`}
                                          </SelectItem>
                                        </>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div>
                            <FormField
                              control={form.control}
                              name="session.timeTo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Time</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select time" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Array.from({ length: 24 }).map((_, hour) => (
                                        <>
                                          <SelectItem
                                            key={`${hour}:00`}
                                            value={`${hour.toString().padStart(2, '0')}:00`}
                                          >
                                            {`${hour.toString().padStart(2, '0')}:00`}
                                          </SelectItem>
                                          <SelectItem
                                            key={`${hour}:30`}
                                            value={`${hour.toString().padStart(2, '0')}:30`}
                                          >
                                            {`${hour.toString().padStart(2, '0')}:30`}
                                          </SelectItem>
                                        </>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name="session.location"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Location</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        placeholder="Enter session location"
                                        {...field}
                                      />
                                      <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <Card className={cn(borderStyles.card.border, borderStyles.card.radius, borderStyles.card.shadow)}>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-md">Attendees</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {sessionNoteValues.presentAllies.length === 0 ? (
                                  <div className="text-center py-4 text-muted-foreground">
                                    <p>No attendees selected</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {sessionNoteValues.presentAllies.map((name, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between bg-muted/50 rounded-md p-2"
                                      >
                                        <span>{name}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeAttendee(index)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-4"
                                  onClick={() => setAttendeeDialogOpen(true)}
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Select
                                </Button>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TabsContent>
                      
                      {/* Details Tab */}
                      <TabsContent value="details" className="py-4">
                        <div className="space-y-4">
                          <Card className={cn(borderStyles.card.border, borderStyles.card.radius, borderStyles.card.shadow)}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-md">Session Notes</CardTitle>
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
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className={cn(borderStyles.card.border, borderStyles.card.radius, borderStyles.card.shadow)}>
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
                            
                            <Card className={cn(borderStyles.card.border, borderStyles.card.radius, borderStyles.card.shadow)}>
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
                        </div>
                      </TabsContent>
                      
                      {/* Products Tab */}
                      <TabsContent value="products" className="py-4">
                        <Card className={cn(borderStyles.card.border, borderStyles.card.radius, borderStyles.card.shadow)}>
                          <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-md">Products & Services</CardTitle>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setProductDialogOpen(true)}
                              className="h-8"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Product
                            </Button>
                          </CardHeader>
                          <CardContent>
                            {sessionNoteValues.products.length === 0 ? (
                              <div className="text-center py-12 border border-dashed rounded-lg">
                                <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No products added</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Add products from the client's budget to track utilization
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {sessionNoteValues.products.map((product: any, index: number) => (
                                  <div 
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium">{product.productDescription}</p>
                                      <div className="flex text-sm text-muted-foreground space-x-2">
                                        <span>{product.productCode}</span>
                                        <span>•</span>
                                        <span>${product.unitPrice.toFixed(2)} each</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <div className="w-20">
                                        <Label htmlFor={`quantity-${index}`} className="sr-only">
                                          Quantity
                                        </Label>
                                        <Input
                                          id={`quantity-${index}`}
                                          type="number"
                                          min="0.01"
                                          step="0.01"
                                          value={product.quantity}
                                          onChange={(e) => {
                                            const newProducts = [...sessionNoteValues.products];
                                            newProducts[index].quantity = parseFloat(e.target.value);
                                            form.setValue("sessionNote.products", newProducts);
                                          }}
                                          className="text-right"
                                        />
                                      </div>
                                      <div className="w-24 text-right font-medium">
                                        ${(product.quantity * product.unitPrice).toFixed(2)}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeProduct(index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                
                                <div className="flex justify-end pt-4 border-t">
                                  <div className="w-40 text-right">
                                    <p className="text-muted-foreground">Total</p>
                                    <p className="font-medium text-lg">
                                      ${totalProductCost.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      {/* Assessment Tab */}
                      <TabsContent value="assessment" className="py-4">
                        <Card className={cn(borderStyles.card.border, borderStyles.card.radius, borderStyles.card.shadow)}>
                          <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-md">Goal Assessments</CardTitle>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setGoalDialogOpen(true)}
                              className="h-8"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Goal
                            </Button>
                          </CardHeader>
                          <CardContent>
                            {performanceAssessments.length === 0 ? (
                              <div className="text-center py-12 border border-dashed rounded-lg">
                                <ListChecks className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No goals available</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Add goals to the client profile first
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {performanceAssessments.map((assessment: any, goalIndex: number) => (
                                  <div key={assessment.goalId} className="border rounded-md p-4">
                                    {/* Goal header with remove button */}
                                    <div className="flex items-center justify-between mb-4">
                                      <h3 className="font-medium">{assessment.goalTitle}</h3>
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openSubgoalDialog(assessment.goalId)}
                                          className="h-8"
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Add Subgoal
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeGoalAssessment(assessment.goalId)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* No subgoals message */}
                                    {assessment.subgoals.length === 0 && (
                                      <div className="text-center py-6 border border-dashed rounded-lg">
                                        <p className="text-muted-foreground">No subgoals added</p>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openSubgoalDialog(assessment.goalId)}
                                          className="mt-2"
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Add Subgoal
                                        </Button>
                                      </div>
                                    )}
                                    
                                    {/* List of subgoals */}
                                    <div className="space-y-6">
                                      {assessment.subgoals.map((subgoal: any, subgoalIndex: number) => (
                                        <div key={subgoal.subgoalId} className="border-t pt-4">
                                          {/* Subgoal header with remove button */}
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium">{subgoal.subgoalTitle}</h4>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeSubgoalFromAssessment(assessment.goalId, subgoal.subgoalId)}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          
                                          {/* Rating */}
                                          <NumericRating
                                            value={subgoal.rating || 5}
                                            onChange={(value) => {
                                              const newAssessments = [...performanceAssessments];
                                              newAssessments[goalIndex].subgoals[subgoalIndex].rating = value;
                                              form.setValue("performanceAssessments", newAssessments);
                                            }}
                                            label="Performance Rating"
                                            description="Rate progress on this subgoal"
                                          />
                                          
                                          {/* Strategies */}
                                          <div className="mt-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <Label>Strategies</Label>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openStrategyDialog(assessment.goalId, subgoal.subgoalId)}
                                                disabled={subgoal.strategies.length >= 5}
                                              >
                                                <Plus className="h-3 w-3 mr-1" />
                                                {subgoal.strategies.length >= 5 ? 'Max (5)' : 'Add'}
                                              </Button>
                                            </div>
                                            
                                            {subgoal.strategies.length > 0 ? (
                                              <div className="flex flex-wrap gap-2 mt-1">
                                                {subgoal.strategies.map((strategy: string) => (
                                                  <Badge 
                                                    key={strategy} 
                                                    variant="secondary"
                                                    className="px-2 py-1 gap-1"
                                                  >
                                                    {strategy}
                                                    <X 
                                                      className="h-3 w-3 cursor-pointer" 
                                                      onClick={() => removeStrategyFromSubgoal(assessment.goalId, subgoal.subgoalId, strategy)} 
                                                    />
                                                  </Badge>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-sm text-muted-foreground mt-1">
                                                No strategies selected
                                              </p>
                                            )}
                                          </div>
                                          
                                          {/* Notes */}
                                          <div className="mt-4">
                                            <Label htmlFor={`subgoal-notes-${subgoal.subgoalId}`}>
                                              Notes
                                            </Label>
                                            <Textarea
                                              id={`subgoal-notes-${subgoal.subgoalId}`}
                                              placeholder="Enter notes about progress on this subgoal..."
                                              value={subgoal.notes || ""}
                                              onChange={(e) => {
                                                const newAssessments = [...performanceAssessments];
                                                newAssessments[goalIndex].subgoals[subgoalIndex].notes = e.target.value;
                                                form.setValue("performanceAssessments", newAssessments);
                                              }}
                                              className="mt-1"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Include dialog components */}
                        <SubgoalSelectionDialog />
                        <StrategySelectionDialog />
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div className="flex justify-between px-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {isEdit ? "Update Session" : "Create Session"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
            
            {/* Right Side - Session Summary */}
            <div className="md:w-1/5 h-full overflow-y-auto bg-gray-50 p-4">
              <div className="sticky top-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Session Summary</h2>
                  <Button variant="ghost" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {/* Client Info */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Client</h3>
                      {selectedClient ? (
                        <div className="space-y-2">
                          {/* Name with identifier */}
                          <div className="grid grid-cols-[80px_1fr] gap-1">
                            <div className="text-muted-foreground text-xs">Name:</div>
                            <div className="font-medium">
                              {clientData?.originalName && clientData?.uniqueIdentifier 
                                ? `${clientData.originalName} (${clientData.uniqueIdentifier})`
                                : selectedClient.name
                              }
                            </div>
                          </div>
                          
                          {/* Date of birth with age */}
                          <div className="grid grid-cols-[80px_1fr] gap-1">
                            <div className="text-muted-foreground text-xs">Date of Birth:</div>
                            <div className="text-sm">
                              {clientData?.dateOfBirth
                                ? (() => {
                                    const dob = new Date(clientData.dateOfBirth);
                                    const age = new Date().getFullYear() - dob.getFullYear();
                                    return `${dob.toLocaleDateString()} (${age} years)`;
                                  })()
                                : "Not provided"
                              }
                            </div>
                          </div>
                          
                          {/* Funds management type */}
                          <div className="grid grid-cols-[80px_1fr] gap-1">
                            <div className="text-muted-foreground text-xs">Funds Type:</div>
                            <div className="text-sm">{clientData?.fundsManagement || "Not specified"}</div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No client information available</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Date & Time */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Date & Time</h3>
                      {sessionValues.sessionDate ? (
                        <>
                          <p>{format(sessionValues.sessionDate, "d MMM yyyy")}</p>
                          <p className="text-muted-foreground">
                            {sessionValues.timeFrom} - {sessionValues.timeTo}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">No date selected</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Products */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Products</h3>
                      {sessionNoteValues.products.length > 0 ? (
                        <div>
                          <ul className="space-y-1">
                            {sessionNoteValues.products.map((product: any, i: number) => (
                              <li key={i} className="text-sm">
                                {product.productDescription} (x{product.quantity})
                              </li>
                            ))}
                          </ul>
                          <p className="text-sm font-medium mt-2">
                            Total: ${totalProductCost.toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No products added</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Assessments */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Assessments</h3>
                      {performanceAssessments.length > 0 ? (
                        <div>
                          <ul className="space-y-1">
                            {performanceAssessments.map((assessment: any) => (
                              <li key={assessment.goalId} className="text-sm">
                                {assessment.goalTitle} ({assessment.subgoals.length} subgoals)
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No goal assessments added</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      <AttendeeSelectionDialog />
      <ProductSelectionDialog />
      <GoalSelectionDialog />
      <SubgoalSelectionDialog />
      <StrategySelectionDialog />
    </div>
  );
}