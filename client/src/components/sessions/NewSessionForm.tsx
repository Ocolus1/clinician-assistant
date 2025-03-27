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
  const AttendeeSelectionDialog = () => (
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
              ) : allies.length === 0 ? (
                <p className="text-muted-foreground text-sm p-2">No allies found</p>
              ) : (
                allies.map((ally: Ally) => (
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
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col md:flex-row">
            {/* Left Side - Form */}
            <div className="md:w-3/4 h-full overflow-y-auto p-4">
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
                                {sessionNoteValues.products.map((product, index) => (
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
                                {performanceAssessments.map((assessment, goalIndex) => (
                                  <div key={assessment.goalId} className="border rounded-md p-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <h3 className="font-medium">{assessment.goalTitle}</h3>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeGoalAssessment(assessment.goalId)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    <div className="space-y-6">
                                      {assessment.subgoals.map((subgoal, subgoalIndex) => (
                                        <div key={subgoal.subgoalId} className="border-t pt-4">
                                          <h4 className="font-medium mb-3">{subgoal.subgoalTitle}</h4>
                                          
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
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div className="flex justify-between">
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
            <div className="md:w-1/4 h-full overflow-y-auto bg-gray-50 p-4">
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
                        <>
                          <p>{selectedClient.originalName || selectedClient.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Raw client data available: {clientData ? "Yes" : "No"}
                          </p>
                        </>
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
                            {sessionNoteValues.products.map((product, i) => (
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
                            {performanceAssessments.map((assessment) => (
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
    </div>
  );
}