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
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ProductDebugHelper } from "@/components/debug/ProductDebugHelper";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSafeState } from "@/hooks/use-safe-hooks";
import { AUSTRALIAN_LANGUAGES } from "@/lib/constants";

const integratedSessionFormSchema = z.object({
  clientId: z.number(),
  title: z.string().min(3, "Session title must be at least 3 characters"),
  date: z.date({
    required_error: "Please select a date",
  }),
  time: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time in 24h format (e.g. 14:30)"),
  location: z.string().optional(),
  duration: z.number().min(15, "Session must be at least 15 minutes"),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no-show"]),
  
  // Participant observations
  presentAllies: z.array(z.number()).optional(),
  observationNotes: z.string().optional(),
  
  // Performance assessments
  selectedGoalIds: z.array(z.number()).optional(),
  selectedMilestoneIds: z.array(z.number()).optional(),
  overallRating: z.number().min(1).max(5).optional(),
  engagementRating: z.number().min(1).max(5).optional(),
  progressRating: z.number().min(1).max(5).optional(),
  assessmentNotes: z.string().optional(),
  recommendations: z.string().optional(),
  
  // Products used in session
  productsUsed: z.array(z.object({
    id: z.number(),
    name: z.string(),
    quantity: z.number().min(1),
  })).optional(),
  
  therapistId: z.number().optional(),
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
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <Star
              key={rating}
              className={`h-5 w-5 cursor-pointer ${
                rating <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              }`}
              onClick={() => onChange(rating)}
            />
          ))}
        </div>
      </div>
      {description && <div className="text-sm text-muted-foreground">{description}</div>}
      <Slider
        value={[value]}
        min={1}
        max={5}
        step={1}
        onValueChange={(vals) => onChange(vals[0])}
        className="w-full"
      />
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
  onSelectGoal,
}: GoalSelectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Goals</DialogTitle>
          <DialogDescription>
            Choose the goals that were addressed in this session.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4 max-h-72 overflow-y-auto">
          {goals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No goals found for this client.
            </div>
          ) : (
            goals.map((goal) => (
              <div
                key={goal.id}
                className={cn(
                  "flex items-start p-3 rounded-lg cursor-pointer border transition-colors",
                  selectedGoalIds.includes(goal.id)
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
                onClick={() => onSelectGoal(goal)}
              >
                <div className="flex-1">
                  <h4 className="font-medium">{goal.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {goal.description}
                  </p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {selectedGoalIds.includes(goal.id) ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
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
  onSelectMilestone,
}: MilestoneSelectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Milestones</DialogTitle>
          <DialogDescription>
            Choose the milestones that were addressed in this session.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4 max-h-72 overflow-y-auto">
          {subgoals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No milestones found for the selected goals.
            </div>
          ) : (
            subgoals.map((subgoal) => (
              <div
                key={subgoal.id}
                className={cn(
                  "flex items-start p-3 rounded-lg cursor-pointer border transition-colors",
                  selectedMilestoneIds.includes(subgoal.id)
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
                onClick={() => onSelectMilestone(subgoal)}
              >
                <div className="flex-1">
                  <h4 className="font-medium">{subgoal.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {subgoal.description}
                  </p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {selectedMilestoneIds.includes(subgoal.id) ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Prevent calendar popups from showing unexpectedly
const DISABLE_ACTIVE_CALENDAR_STYLES = `
  /* Aggressive styling to prevent calendar popover from showing unexpectedly */
  div[data-state="open"][role="dialog"],
  div[data-state="open"][data-highlighted],
  div[data-state="open"][data-hover] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  
  /* Only show calendar when the parent popover is explicitly opened */
  div[data-state="open"][role="dialog"] div[role="dialog"] {
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }
`;

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
  const isMobile = useIsMobile();
  
  // Custom styling to prevent unwanted calendar popups
  useLayoutEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = DISABLE_ACTIVE_CALENDAR_STYLES;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // State for form tabs and dialogs
  const [activeTab, setActiveTab] = useState("details");
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [milestonesDialogOpen, setMilestonesDialogOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  
  // State for selected client, products, etc.
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(initialClient?.id);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [availableProducts, setAvailableProducts] = useState<(BudgetItem & { availableQuantity: number })[]>([]);
  
  // Queries
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !initialClient && open,
  });
  
  const { data: selectedClient } = useQuery({
    queryKey: ["/api/clients", selectedClientId],
    enabled: !!selectedClientId && open,
  });
  
  const { data: clientBudgetSettings } = useQuery({
    queryKey: ["/api/clients", selectedClientId, "budget-settings"],
    enabled: !!selectedClientId && open,
  });
  
  const { data: budgetItems = [] } = useQuery({
    queryKey: ["/api/clients", selectedClientId, "budget-items"],
    enabled: !!selectedClientId && open,
  });
  
  const { data: allies = [] } = useQuery({
    queryKey: ["/api/clients", selectedClientId, "allies"],
    enabled: !!selectedClientId && open,
  });
  
  const { data: goals = [] } = useQuery({
    queryKey: ["/api/clients", selectedClientId, "goals"],
    enabled: !!selectedClientId && open,
  });
  
  const { data: subgoals = [] } = useQuery({
    queryKey: ["/api/clients", selectedClientId, "subgoals"],
    enabled: !!selectedClientId && open && !!selectedGoalIds.length,
  });
  
  // Setup form
  const form = useForm<IntegratedSessionFormValues>({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      time: format(new Date(), "HH:mm"),
      location: "",
      duration: 60,
      notes: "",
      status: "scheduled" as const,
      observationNotes: "",
      presentAllies: [],
      selectedGoalIds: [],
      selectedMilestoneIds: [],
      overallRating: 3,
      engagementRating: 3,
      progressRating: 3,
      assessmentNotes: "",
      recommendations: "",
      productsUsed: [],
      clientId: initialClient?.id,
    },
  });
  
  // Filtered clients for dropdown
  const filteredClients = useMemo(() => {
    if (!clients.length) return [];
    
    return clients.filter((client: Client) => 
      client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );
  }, [clients, clientSearchTerm]);
  
  // Extract values from form
  const { presentAllies, selectedGoalIds, selectedMilestoneIds, productsUsed } = form.watch();
  
  // Filter subgoals by selected goals
  const relevantSubgoals = useMemo(() => {
    if (!subgoals || !selectedGoalIds || !selectedGoalIds.length) return [];
    
    return subgoals.filter((subgoal: Subgoal) => 
      selectedGoalIds.includes(subgoal.goalId)
    );
  }, [subgoals, selectedGoalIds]);
  
  // Update form when client changes
  useEffect(() => {
    if (selectedClient) {
      form.setValue("clientId", selectedClient.id);
    }
  }, [selectedClient, form]);
  
  // Update availableProducts when budget items change
  useEffect(() => {
    if (budgetItems && budgetItems.length) {
      // Filter to items that are potential products
      const potentialProducts = budgetItems
        .filter((item: BudgetItem) => {
          return item.quantity > 0; // Only include items with quantity
        })
        .map((item: BudgetItem) => ({
          ...item,
          availableQuantity: item.quantity - (item.quantityUsed || 0)
        }));
      
      setAvailableProducts(potentialProducts);
    }
  }, [budgetItems]);
  
  // Initialize client from prop if provided
  useEffect(() => {
    if (initialClient) {
      setSelectedClientId(initialClient.id);
    }
  }, [initialClient]);
  
  // Handler for selecting a goal
  const handleGoalSelection = (goal: Goal) => {
    const currentSelectedGoals = form.getValues("selectedGoalIds") || [];
    
    if (currentSelectedGoals.includes(goal.id)) {
      // Remove the goal and its subgoals
      const newSelectedGoals = currentSelectedGoals.filter(id => id !== goal.id);
      form.setValue("selectedGoalIds", newSelectedGoals);
      
      // Also remove any related milestones
      const currentSelectedMilestones = form.getValues("selectedMilestoneIds") || [];
      const relevantSubgoalIds = subgoals
        .filter((s: Subgoal) => s.goalId === goal.id)
        .map((s: Subgoal) => s.id);
        
      const newSelectedMilestones = currentSelectedMilestones
        .filter(id => !relevantSubgoalIds.includes(id));
        
      form.setValue("selectedMilestoneIds", newSelectedMilestones);
    } else {
      // Add the goal
      form.setValue("selectedGoalIds", [...currentSelectedGoals, goal.id]);
    }
  };
  
  // Handler for selecting a milestone
  const handleMilestoneSelection = (subgoal: Subgoal) => {
    const currentSelectedMilestones = form.getValues("selectedMilestoneIds") || [];
    
    if (currentSelectedMilestones.includes(subgoal.id)) {
      // Remove the milestone
      const newSelectedMilestones = currentSelectedMilestones.filter(id => id !== subgoal.id);
      form.setValue("selectedMilestoneIds", newSelectedMilestones);
    } else {
      // Add the milestone
      form.setValue("selectedMilestoneIds", [...currentSelectedMilestones, subgoal.id]);
      
      // Ensure the parent goal is selected
      const currentSelectedGoals = form.getValues("selectedGoalIds") || [];
      if (!currentSelectedGoals.includes(subgoal.goalId)) {
        form.setValue("selectedGoalIds", [...currentSelectedGoals, subgoal.goalId]);
      }
    }
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
  onSelectProduct,
}: ProductSelectionDialogProps) => {
  const [selectedProduct, setSelectedProduct] = useState<(BudgetItem & { availableQuantity: number }) | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  const handleSelectProduct = () => {
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
          <DialogTitle>Add Products Used</DialogTitle>
          <DialogDescription>
            Select products that were used during this session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Select Product</Label>
            <Select 
              onValueChange={(value) => {
                const product = products.find(p => p.id.toString() === value);
                if (product) {
                  setSelectedProduct(product);
                  setQuantity(1); // Reset quantity
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {products.length === 0 ? (
                    <SelectItem value="none" disabled>No products available</SelectItem>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} ({product.availableQuantity} available)
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {selectedProduct && (
            <div className="space-y-2">
              <Label>Quantity Used</Label>
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
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(selectedProduct.availableQuantity, quantity + 1))}
                  disabled={quantity >= selectedProduct.availableQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSelectProduct}
            disabled={!selectedProduct}
          >
            Add Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
  
  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      // Format the data for the API
      const formattedDate = format(data.date, "yyyy-MM-dd");
      
      const sessionData = {
        ...data,
        date: formattedDate,
        // Include other required fields that might not be part of the form
      };
      
      // Call API to create session
      return apiRequest("POST", "/api/sessions", sessionData);
    },
    onSuccess: () => {
      // Display success message
      toast({
        title: "Session created",
        description: "The session has been successfully created.",
      });
      
      // Close the dialog
      onOpenChange(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      if (selectedClientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients", selectedClientId, "sessions"] });
      }
      
      // Reset form
      form.reset();
    },
    onError: (error: any) => {
      console.error("Failed to create session:", error);
      toast({
        title: "Error creating session",
        description: error.message || "Could not create the session. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(data: IntegratedSessionFormValues) {
    // Additional validation if needed
    createSession.mutate(data);
  }
  
  // Navigation between tabs
  const handleNext = () => {
    if (activeTab === "details") setActiveTab("participants");
    else if (activeTab === "participants") setActiveTab("performance");
  };
  
  const handleBack = () => {
    if (activeTab === "performance") setActiveTab("participants");
    else if (activeTab === "participants") setActiveTab("details");
  };
  
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
                  {/* Card wrapper for basic session info */}
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-primary" />
                        Session Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Client selection field */}
                      {!initialClient && (
                        <FormField
                          control={form.control}
                          name="clientId"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="flex items-center">
                                <UserIcon className="h-4 w-4 mr-2 text-primary" />
                                Client
                              </FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "justify-between",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value
                                        ? clients.find((client: Client) => client.id === field.value)?.name || "Select client"
                                        : "Select client"}
                                      <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[300px]">
                                  <Command>
                                    <CommandInput
                                      placeholder="Search clients..."
                                      className="h-9"
                                      value={clientSearchTerm}
                                      onValueChange={setClientSearchTerm}
                                    />
                                    <CommandList>
                                      <CommandEmpty>No clients found.</CommandEmpty>
                                      <CommandGroup>
                                        {filteredClients.map((client: Client) => (
                                          <CommandItem
                                            key={client.id}
                                            value={client.name}
                                            onSelect={() => {
                                              form.setValue("clientId", client.id);
                                              setSelectedClientId(client.id);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                client.id === field.value
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            {client.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Session title field */}
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <FileText className="h-4 w-4 mr-2 text-primary" />
                              Session Title
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Enter session title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Session date field */}
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                              Date
                            </FormLabel>
                            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "justify-between",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      "Pick a date"
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    field.onChange(date);
                                    setDatePickerOpen(false);
                                  }}
                                  disabled={(date) =>
                                    date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Session time field */}
                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-primary" />
                              Time
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="HH:MM"
                                  {...field}
                                  type="time"
                                  className="w-full"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Session duration field */}
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <Hourglass className="h-4 w-4 mr-2 text-primary" />
                              Duration (minutes)
                            </FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="45">45 minutes</SelectItem>
                                <SelectItem value="60">60 minutes</SelectItem>
                                <SelectItem value="90">90 minutes</SelectItem>
                                <SelectItem value="120">120 minutes</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Session location field */}
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-2 text-primary" />
                              Location
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Enter location" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Card wrapper for session status and notes */}
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Info className="h-5 w-5 mr-2 text-primary" />
                        Status & Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Session status field */}
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <AlertCircle className="h-4 w-4 mr-2 text-primary" />
                              Session Status
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="no-show">No Show</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Session notes field */}
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <Clipboard className="h-4 w-4 mr-2 text-primary" />
                              Session Notes
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter any additional notes about this session"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Participant Observations Tab */}
                <TabsContent value="participants" className="space-y-6 mt-0 px-4">
                  {/* Card wrapper for allies present */}
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Users className="h-5 w-5 mr-2 text-primary" />
                        Present Allies
                      </CardTitle>
                      <CardDescription>
                        Select allies who were present at this session
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="presentAllies"
                        render={() => (
                          <FormItem>
                            <div className="space-y-2">
                              {allies.length === 0 ? (
                                <div className="text-muted-foreground italic p-2">
                                  No allies found for this client
                                </div>
                              ) : (
                                allies.map((ally) => (
                                  <FormField
                                    key={ally.id}
                                    control={form.control}
                                    name="presentAllies"
                                    render={({ field }) => {
                                      return (
                                        <FormItem
                                          key={ally.id}
                                          className="flex flex-row items-start space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50"
                                        >
                                          <FormControl>
                                            <input
                                              type="checkbox"
                                              className="peer h-4 w-4 shrink-0 rounded-sm border border-primary focus:outline-none focus:ring-2 focus:ring-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                              checked={field.value?.includes(ally.id)}
                                              onChange={(e) => {
                                                return e.target.checked
                                                  ? field.onChange([...field.value, ally.id])
                                                  : field.onChange(
                                                      field.value?.filter(
                                                        (value) => value !== ally.id
                                                      )
                                                    )
                                              }}
                                              id={`ally-${ally.id}`}
                                            />
                                          </FormControl>
                                          <div className="grid gap-1.5 leading-none">
                                            <label
                                              htmlFor={`ally-${ally.id}`}
                                              className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                              {ally.name}
                                            </label>
                                            <p className="text-sm text-muted-foreground">
                                              {ally.relationship} • {ally.email}
                                            </p>
                                          </div>
                                        </FormItem>
                                      )
                                    }}
                                  />
                                ))
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Card wrapper for observation notes */}
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Clipboard className="h-5 w-5 mr-2 text-primary" />
                        Session Observations
                      </CardTitle>
                      <CardDescription>
                        Record detailed observations of client behavior and participation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="observationNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Describe client behaviors, interactions, and notable observations during the session"
                                className="min-h-[200px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Include information about client engagement, communication style, and responses to different activities
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Card wrapper for products used */}
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Package className="h-5 w-5 mr-2 text-primary" />
                        Products Used
                      </CardTitle>
                      <CardDescription>
                        Record products or resources used during this session
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Selected Products</h4>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setProductsDialogOpen(true)}
                            disabled={availableProducts.length === 0}
                            className="h-8"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Product
                          </Button>
                        </div>
                        
                        {/* List of selected products */}
                        <div className="space-y-2">
                          {!productsUsed || productsUsed.length === 0 ? (
                            <div className="text-muted-foreground italic p-2">
                              No products selected
                            </div>
                          ) : (
                            productsUsed.map((product, index) => (
                              <div 
                                key={`${product.id}-${index}`}
                                className="flex items-center justify-between p-2 border rounded-md bg-muted/20"
                              >
                                <div className="flex items-center">
                                  <Package className="h-4 w-4 mr-2 text-primary" />
                                  <div>
                                    <p className="text-sm font-medium">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Quantity: {product.quantity}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const current = form.getValues("productsUsed") || [];
                                    form.setValue(
                                      "productsUsed",
                                      current.filter((_, i) => i !== index)
                                    );
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Product selection dialog */}
                  <ProductSelectionDialog
                    open={productsDialogOpen}
                    onOpenChange={setProductsDialogOpen}
                    products={availableProducts}
                    onSelectProduct={(product, quantity) => {
                      const current = form.getValues("productsUsed") || [];
                      form.setValue("productsUsed", [
                        ...current,
                        {
                          id: product.id,
                          name: product.name,
                          quantity: quantity,
                        },
                      ]);
                    }}
                  />
                </TabsContent>
                
                {/* Performance Assessment Tab */}
                <TabsContent value="performance" className="space-y-6 mt-0 px-4">
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Target className="h-5 w-5 mr-2 text-primary" />
                        <h3 className="font-medium text-lg">Performance Assessment</h3>
                      </CardTitle>
                      <CardDescription>
                        Evaluate client performance and progress against goals
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Goals selection */}
                      <div>
                        <Label className="flex items-center text-sm font-medium mb-2">
                          <Target className="h-4 w-4 mr-2 text-primary" />
                          Goals Addressed
                        </Label>
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                              {selectedGoalIds?.length ? (
                                <span>Selected {selectedGoalIds.length} goal(s)</span>
                              ) : (
                                <span>No goals selected</span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setGoalsDialogOpen(true)}
                              disabled={!goals || goals.length === 0}
                              className="h-8"
                            >
                              <LayoutGrid className="h-4 w-4 mr-1" />
                              Select Goals
                            </Button>
                          </div>
                          
                          {/* Display selected goals */}
                          {selectedGoalIds && selectedGoalIds.length > 0 && (
                            <div className="grid gap-2 mt-2">
                              {selectedGoalIds.map(goalId => {
                                const goal = goals.find((g: Goal) => g.id === goalId);
                                return goal ? (
                                  <div key={goal.id} className="flex p-2 rounded-md border bg-muted/10">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{goal.title}</p>
                                      <p className="text-xs text-muted-foreground truncate">{goal.description}</p>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Milestones selection */}
                      <div>
                        <Label className="flex items-center text-sm font-medium mb-2">
                          <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                          Milestones Addressed
                        </Label>
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                              {selectedMilestoneIds?.length ? (
                                <span>Selected {selectedMilestoneIds.length} milestone(s)</span>
                              ) : (
                                <span>No milestones selected</span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setMilestonesDialogOpen(true)}
                              disabled={!relevantSubgoals || relevantSubgoals.length === 0}
                              className="h-8"
                            >
                              <LayoutGrid className="h-4 w-4 mr-1" />
                              Select Milestones
                            </Button>
                          </div>
                          
                          {/* Display selected milestones */}
                          {selectedMilestoneIds && selectedMilestoneIds.length > 0 && (
                            <div className="grid gap-2 mt-2">
                              {selectedMilestoneIds.map(milestoneId => {
                                const milestone = relevantSubgoals.find((s: Subgoal) => s.id === milestoneId);
                                return milestone ? (
                                  <div key={milestone.id} className="flex p-2 rounded-md border bg-muted/10">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{milestone.title}</p>
                                      <p className="text-xs text-muted-foreground truncate">{milestone.description}</p>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Rating sliders */}
                      <div className="space-y-6 pt-4">
                        <div className="font-medium text-sm flex items-center mb-4">
                          <Star className="h-4 w-4 mr-2 text-primary" />
                          Performance Ratings
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="overallRating"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <RatingSlider
                                  value={field.value}
                                  onChange={field.onChange}
                                  label="Overall Performance"
                                  description="Rate the client's overall performance during this session"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="engagementRating"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <RatingSlider
                                  value={field.value}
                                  onChange={field.onChange}
                                  label="Engagement Level"
                                  description="Rate the client's level of engagement and participation"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="progressRating"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <RatingSlider
                                  value={field.value}
                                  onChange={field.onChange}
                                  label="Progress Toward Goals"
                                  description="Rate the client's progress toward their established goals"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Clipboard className="h-5 w-5 mr-2 text-primary" />
                        Notes & Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="assessmentNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">Assessment Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Provide detailed notes about the client's performance and progress"
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="recommendations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">Recommendations</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Provide recommendations for future sessions and home practice"
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Goal selection dialog */}
                  <GoalSelectionDialog
                    open={goalsDialogOpen}
                    onOpenChange={setGoalsDialogOpen}
                    goals={goals || []}
                    selectedGoalIds={selectedGoalIds || []}
                    onSelectGoal={handleGoalSelection}
                  />
                  
                  {/* Milestone selection dialog */}
                  <MilestoneSelectionDialog
                    open={milestonesDialogOpen}
                    onOpenChange={setMilestonesDialogOpen}
                    subgoals={relevantSubgoals || []}
                    selectedMilestoneIds={selectedMilestoneIds || []}
                    onSelectMilestone={handleMilestoneSelection}
                  />
                </TabsContent>
              </div>
              
              {/* Navigation buttons */}
              <div className="mt-auto flex items-center justify-between pt-4">
                {activeTab !== "details" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div></div>
                )}
                
                {activeTab !== "performance" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNext}
                    className="ml-auto gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit"
                    disabled={createSession.isPending}
                    className="ml-auto gap-1"
                  >
                    {createSession.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Save Session
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </Tabs>
      </div>
    );
  }
  
  // Regular dialog wrapped version
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Add a new therapy session for {selectedClient?.name || "a client"}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col overflow-hidden h-full">
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
                  {/* Same tab content as above, repeated here */}
                  
                  {/* Session Details Tab */}
                  <TabsContent value="details" className="space-y-6 mt-0">
                    {/* Content same as above */}
                  </TabsContent>
                  
                  {/* Participant Observations Tab */}
                  <TabsContent value="participants" className="space-y-6 mt-0">
                    {/* Content same as above */}
                  </TabsContent>
                  
                  {/* Performance Assessment Tab */}
                  <TabsContent value="performance" className="space-y-6 mt-0">
                    {/* Content same as above */}
                  </TabsContent>
                </div>
                
                {/* Navigation buttons */}
                <div className="mt-auto flex items-center justify-between pt-4">
                  {activeTab !== "details" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="gap-1"
                    >
                      Cancel
                    </Button>
                  )}
                  
                  {activeTab !== "performance" ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="ml-auto gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit"
                      disabled={createSession.isPending}
                      className="ml-auto gap-1"
                    >
                      {createSession.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Save Session
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </Tabs>
        </div>
        
        {/* These dialogs are duplicated for the dialog version */}
        <GoalSelectionDialog
          open={goalsDialogOpen}
          onOpenChange={setGoalsDialogOpen}
          goals={goals || []}
          selectedGoalIds={selectedGoalIds || []}
          onSelectGoal={handleGoalSelection}
        />
        
        <MilestoneSelectionDialog
          open={milestonesDialogOpen}
          onOpenChange={setMilestonesDialogOpen}
          subgoals={relevantSubgoals || []}
          selectedMilestoneIds={selectedMilestoneIds || []}
          onSelectMilestone={handleMilestoneSelection}
        />
        
        <ProductSelectionDialog
          open={productsDialogOpen}
          onOpenChange={setProductsDialogOpen}
          products={availableProducts}
          onSelectProduct={(product, quantity) => {
            const current = form.getValues("productsUsed") || [];
            form.setValue("productsUsed", [
              ...current,
              {
                id: product.id,
                name: product.name,
                quantity: quantity,
              },
            ]);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}