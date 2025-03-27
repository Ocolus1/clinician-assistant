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
  
  // Function to add a goal assessment
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
    
    // Add goal assessment with subgoals
    const goalSubgoals = subgoalsByGoal[goalId] || [];
    
    const newAssessment = {
      goalId,
      goalTitle: goal.title,
      notes: "",
      subgoals: goalSubgoals.map(subgoal => ({
        subgoalId: subgoal.id,
        subgoalTitle: subgoal.title,
        rating: 5, // Default rating
        strategies: [],
        notes: "",
      })),
    };
    
    form.setValue("performanceAssessments", [
      ...performanceAssessments,
      newAssessment
    ]);
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
      
      // Close the dialog after selecting an attendee
      setAttendeeDialogOpen(false);
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
    // Get currently selected ally IDs
    const selectedAllyIds = form.getValues("sessionNote.presentAllyIds");
    
    // Filter allies to only show those not already selected
    const availableAllies = allies.filter((ally: Ally) => 
      !selectedAllyIds.includes(ally.id)
    );
    
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
                <Input placeholder="Search by name..." />
              </div>
            </div>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {alliesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : availableAllies.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-2">No additional allies available</p>
                ) : (
                  availableAllies.map((ally: Ally) => (
                    <div 
                      key={ally.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => addAttendee(ally)}
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
                          addAttendee(ally);
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
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Product Selection Dialog
  const ProductSelectionDialog = () => (
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
              <Input placeholder="Search by name or code..." />
            </div>
          </div>
          
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {budgetItemsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : budgetItems.length === 0 ? (
                <p className="text-muted-foreground text-sm p-2">No budget items found</p>
              ) : (
                budgetItems.map((item: BudgetItem) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => addProduct(item)}
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
                        addProduct(item);
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
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  // Goal Selection Dialog
  const GoalSelectionDialog = () => (
    <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Goal Assessment</DialogTitle>
          <DialogDescription>
            Select a goal to assess for this session
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {goalsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : goals.length === 0 ? (
                <p className="text-muted-foreground text-sm p-2">No goals found</p>
              ) : (
                goals.map((goal: Goal) => {
                  const isAlreadyAdded = performanceAssessments.some(
                    a => a.goalId === goal.id
                  );
                  
                  return (
                    <div 
                      key={goal.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{goal.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {(subgoalsByGoal[goal.id]?.length || 0)} subgoals
                        </p>
                      </div>
                      {isAlreadyAdded ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeGoalAssessment(goal.id);
                          }}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            addGoalAssessment(goal.id);
                          }}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setGoalDialogOpen(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Check if form is in a loading state
  const isDataLoading = clientLoading || 
    alliesLoading || 
    goalsLoading || 
    budgetItemsLoading || 
    budgetSettingsLoading ||
    cliniciansLoading;
  
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="container mx-auto h-full flex flex-col px-4 py-4 md:px-6">
        {/* Form Header */}
        <div className="flex justify-between items-center py-4 border-b">
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
        
        {/* Form content would go here - this is a shortened version */}
        {/* Add all your form content as needed */}
        
        {/* Dialogs */}
        <AttendeeSelectionDialog />
        <ProductSelectionDialog />
        <GoalSelectionDialog />
      </div>
    </div>
  );
}