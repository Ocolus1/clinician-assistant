import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import "./session-form.css";
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
  UserCheck,
  ChevronsUpDown,
  Package,
  BarChart
} from "lucide-react";

// Extracted components
import { ThreeColumnLayout } from "./ThreeColumnLayout";
import { GoalSelectionDialog } from "./dialogs/GoalSelectionDialog";
import { MilestoneSelectionDialog } from "./dialogs/MilestoneSelectionDialog";
import { ProductSelectionDialog } from "./dialogs/ProductSelectionDialog";
import { StrategySelectionDialog } from "./StrategySelectionDialog";
import { RatingSlider } from "./RatingSlider";

// Custom hooks and types
import { useToast } from "@/hooks/use-toast";
import { useSessionForm, integratedSessionFormSchema } from "@/hooks/sessions/useSessionForm";
import { Ally, BudgetItem, BudgetSettings, Client, Goal, Session, Subgoal, Strategy } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

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

interface IntegratedSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClient?: Client;
  isFullScreen?: boolean;
}

/**
 * Integrated session form component that combines session creation with notes and assessments
 */
export function IntegratedSessionFormRefactored({ 
  open, 
  onOpenChange,
  initialClient,
  isFullScreen = false
}: IntegratedSessionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use our custom hook for session form state management
  const sessionForm = useSessionForm();
  
  // Destructure values and handlers from our custom hook
  const {
    activeTab,
    setActiveTab,
    goalSelectionOpen,
    setGoalSelectionOpen,
    milestoneSelectionOpen,
    setMilestoneSelectionOpen,
    strategySelectionOpen,
    setStrategySelectionOpen,
    productSelectionOpen,
    setProductSelectionOpen,
    currentGoalIndex,
    setCurrentGoalIndex,
    currentMilestoneIndex,
    setCurrentMilestoneIndex,
    selectedGoalIds,
    selectedMilestoneIds,
    performanceAssessments,
    setPerformanceAssessments,
    handleGoalSelection,
    handleMilestoneSelection,
    handleStrategySelection,
    handleRemoveGoal,
    handleRemoveMilestone,
    handleRemoveStrategy,
    handleUpdateMilestoneRating,
    handleUpdateMilestoneNotes
  } = sessionForm;

  // Form setup using react-hook-form
  const form = useForm({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues: {
      session: {
        clientId: initialClient?.id || 0,
        title: "Therapy Session",
        description: "",
        sessionDate: new Date(),
        duration: 60,
        status: "scheduled",
        location: "Clinic - Room 101"
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
        status: "draft"
      },
      performanceAssessments: []
    }
  });

  // Initialize form with client ID if provided
  useEffect(() => {
    if (initialClient) {
      form.setValue("session.clientId", initialClient.id);
      
      // Store in query client for access by dialog components
      queryClient.setQueryData(['formState'], { 
        clientId: initialClient.id,
        performanceAssessments,
        currentGoalIndex
      });
    }
  }, [initialClient, form, queryClient, performanceAssessments, currentGoalIndex]);

  // Update form when performanceAssessments state changes
  useEffect(() => {
    form.setValue("performanceAssessments", performanceAssessments);
    
    // Update formState in queryClient for access by dialogs
    queryClient.setQueryData(['formState'], {
      ...queryClient.getQueryData(['formState']),
      performanceAssessments,
      currentGoalIndex
    });
  }, [performanceAssessments, currentGoalIndex, form, queryClient]);

  // Fetch client data if not provided
  const { data: client } = useQuery({
    queryKey: ['/api/clients', form.watch("session.clientId")],
    queryFn: () => apiRequest('GET', `/api/clients/${form.watch("session.clientId")}`),
    enabled: !!form.watch("session.clientId") && !initialClient,
    staleTime: 60000 // Cache for 1 minute
  });

  // Only fetch related data when needed
  const { data: allies = [] } = useQuery({
    queryKey: ['/api/clients', form.watch("session.clientId"), 'allies'],
    queryFn: () => apiRequest('GET', `/api/clients/${form.watch("session.clientId")}/allies`),
    enabled: !!form.watch("session.clientId") && open && (activeTab === "notes" || activeTab === "present"),
    staleTime: 60000
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['/api/clients', form.watch("session.clientId"), 'goals'],
    queryFn: () => apiRequest('GET', `/api/clients/${form.watch("session.clientId")}/goals`),
    enabled: !!form.watch("session.clientId") && open && (activeTab === "goals" || goalSelectionOpen),
    staleTime: 60000
  });

  const { data: budgetItems = [] } = useQuery({
    queryKey: ['/api/clients', form.watch("session.clientId"), 'budget-items'],
    queryFn: () => apiRequest('GET', `/api/clients/${form.watch("session.clientId")}/budget-items`),
    enabled: !!form.watch("session.clientId") && open && (activeTab === "products" || productSelectionOpen),
    staleTime: 60000
  });

  const { data: budgetSettings } = useQuery({
    queryKey: ['/api/clients', form.watch("session.clientId"), 'budget-settings'],
    queryFn: () => apiRequest('GET', `/api/clients/${form.watch("session.clientId")}/budget-settings`),
    enabled: !!form.watch("session.clientId") && open && (activeTab === "products" || productSelectionOpen),
    staleTime: 60000
  });

  const { data: strategies = [] } = useQuery({
    queryKey: ['/api/strategies'],
    queryFn: () => apiRequest('GET', `/api/strategies`),
    enabled: open && (activeTab === "goals" || strategySelectionOpen),
    staleTime: 300000 // Cache for 5 minutes
  });

  // Track if a client has been selected
  const [clientSelected, setClientSelected] = useState(!!initialClient);

  // Client selection
  const handleClientChange = (clientId: number) => {
    form.setValue("session.clientId", clientId);
    setClientSelected(true);
    
    // Update formState in queryClient
    queryClient.setQueryData(['formState'], { 
      ...queryClient.getQueryData(['formState']),
      clientId
    });
  };

  // Product-related state
  const [productItems, setProductItems] = useState<(BudgetItem & { availableQuantity: number })[]>([]);
  
  // Calculate products with available quantities
  useEffect(() => {
    if (budgetItems && budgetItems.length > 0) {
      // Filter out items already in the session
      const products = form.watch("sessionNote.products") || [];
      const selectedIds = products.length > 0 ? products.map((p: any) => p.budgetItemId) : [];
      
      // Calculate available quantities
      const productsWithQuantity = budgetItems
        .filter((item: any) => !selectedIds.includes(item.id))
        .map((item: any) => ({
          ...item,
          availableQuantity: item.quantity || 0
        }))
        .filter((item: any) => item.availableQuantity > 0);
      
      setProductItems(productsWithQuantity);
    }
  }, [budgetItems, form]);

  // Handle product selection
  const handleProductSelection = (product: BudgetItem & { availableQuantity: number }, quantity: number) => {
    const currentProducts = form.getValues("sessionNote.products") || [];
    
    form.setValue("sessionNote.products", [
      ...currentProducts,
      {
        budgetItemId: product.id,
        productCode: product.itemCode || "",
        productDescription: product.description,
        quantity,
        unitPrice: product.unitPrice,
        availableQuantity: product.availableQuantity // For reference only
      }
    ]);
  };

  // Remove product
  const removeProduct = (index: number) => {
    const currentProducts = form.getValues("sessionNote.products");
    currentProducts.splice(index, 1);
    form.setValue("sessionNote.products", [...currentProducts]);
  };

  // Handle ally selection
  const handleAllySelection = (allyId: number) => {
    const currentAllies = form.getValues("sessionNote.presentAllyIds") || [];
    const currentAllyNames = form.getValues("sessionNote.presentAllies") || [];
    
    // Find the ally to get their name
    const allyObj = allies.find((a: any) => a.id === allyId);
    
    if (currentAllies.includes(allyId)) {
      // Remove ally
      form.setValue("sessionNote.presentAllyIds", currentAllies.filter(id => id !== allyId));
      if (allyObj) {
        form.setValue("sessionNote.presentAllies", currentAllyNames.filter(name => name !== allyObj.name));
      }
    } else {
      // Add ally
      form.setValue("sessionNote.presentAllyIds", [...currentAllies, allyId]);
      if (allyObj) {
        form.setValue("sessionNote.presentAllies", [...currentAllyNames, allyObj.name]);
      }
    }
  };

  // Submission handling
  const createSession = useMutation({
    mutationFn: async (data: any) => {
      // Step 1: Create the session
      const sessionResponse = await apiRequest('POST', '/api/sessions', data.session);
      const sessionId = sessionResponse.id;
      
      // Step 2: Create the session note
      const sessionNoteData = {
        ...data.sessionNote,
        sessionId
      };
      const sessionNoteResponse = await apiRequest('POST', '/api/session-notes', sessionNoteData);
      const sessionNoteId = sessionNoteResponse.id;
      
      // Step 3: Create performance assessments
      const assessmentPromises = data.performanceAssessments.map(async (assessment: any) => {
        const assessmentData = {
          sessionNoteId,
          goalId: assessment.goalId,
          notes: assessment.notes || ""
        };
        
        const assessmentResponse = await apiRequest('POST', '/api/performance-assessments', assessmentData);
        const assessmentId = assessmentResponse.id;
        
        // Step 4: Create milestone assessments for each performance assessment
        const milestonePromises = assessment.milestones.map(async (milestone: any) => {
          const milestoneData = {
            performanceAssessmentId: assessmentId,
            subgoalId: milestone.milestoneId,
            rating: milestone.rating || 5,
            notes: milestone.notes || "",
            strategies: milestone.strategies.join(", ")
          };
          
          return apiRequest('POST', '/api/milestone-assessments', milestoneData);
        });
        
        return Promise.all(milestonePromises);
      });
      
      await Promise.all(assessmentPromises);
      
      return {
        sessionId,
        sessionNoteId
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({
        title: "Session created",
        description: "Session has been successfully created with notes and assessments.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "There was a problem creating the session. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: any) => {
    // Update performanceAssessments in the data
    data.performanceAssessments = performanceAssessments;
    console.log("Form submission data:", data);
    createSession.mutate(data);
  };

  // Fix calendar rendering issues
  useEffect(() => {
    if (open) {
      const timer = setTimeout(hideUnwantedCalendars, 100);
      return () => clearTimeout(timer);
    }
  }, [open, activeTab]);

  // Reset form state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveTab("details");
      setPerformanceAssessments([]);
      setCurrentGoalIndex(null);
      setCurrentMilestoneIndex(null);
    }
  }, [open, setActiveTab, setPerformanceAssessments, setCurrentGoalIndex, setCurrentMilestoneIndex]);

  // Section renders
  const renderClientSelection = () => (
    <div className="space-y-4 mb-4">
      <div className="space-y-2">
        <Label htmlFor="client-selection">Client</Label>
        <Select 
          value={form.watch("session.clientId").toString()} 
          onValueChange={(value) => handleClientChange(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {/* This would typically use data from an API */}
            <SelectItem value="37">Gabriel</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderSessionDetails = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="session.title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Session Title</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="session.sessionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <div data-calendar-container="true" className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal flex justify-between items-center"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Select a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4" />
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
              </div>
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
                  {...field} 
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={form.control}
        name="session.location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="session.description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                className="resize-none" 
                rows={4}
                placeholder="Brief description of the session goals and focus areas"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderPresentSection = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Present at Session</h3>
        <div className="border rounded-md p-4">
          <div className="space-y-3">
            {allies.length === 0 ? (
              <p className="text-muted-foreground text-sm">No allies found for this client</p>
            ) : (
              allies.map((ally: any) => (
                <div key={ally.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`ally-${ally.id}`} 
                    checked={form.watch("sessionNote.presentAllyIds")?.includes(ally.id)}
                    onCheckedChange={() => handleAllySelection(ally.id)}
                  />
                  <Label htmlFor={`ally-${ally.id}`}>{ally.name} ({ally.role})</Label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Session Ratings</h3>
        
        <div className="space-y-6 py-2">
          <FormField
            control={form.control}
            name="sessionNote.moodRating"
            render={({ field }) => (
              <FormItem>
                <RatingSlider 
                  label="Mood"
                  value={field.value}
                  onChange={field.onChange}
                  description="Client's overall mood during the session"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="sessionNote.focusRating"
            render={({ field }) => (
              <FormItem>
                <RatingSlider 
                  label="Focus"
                  value={field.value}
                  onChange={field.onChange}
                  description="Client's ability to maintain attention"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="sessionNote.cooperationRating"
            render={({ field }) => (
              <FormItem>
                <RatingSlider 
                  label="Cooperation"
                  value={field.value}
                  onChange={field.onChange}
                  description="Client's willingness to engage in activities"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="sessionNote.physicalActivityRating"
            render={({ field }) => (
              <FormItem>
                <RatingSlider 
                  label="Physical Activity"
                  value={field.value}
                  onChange={field.onChange}
                  description="Client's energy and physical engagement level"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );

  const renderGoalsSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Goal Assessments</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setGoalSelectionOpen(true)}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Add Goal
        </Button>
      </div>
      
      <div>
        {performanceAssessments.length === 0 ? (
          <div className="border rounded-md p-8 text-center">
            <div className="mx-auto mb-4 bg-muted w-12 h-12 rounded-full flex items-center justify-center">
              <BarChart className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Goals Selected</h3>
            <p className="text-muted-foreground mb-4">Add goals to track progress during this session</p>
            <Button onClick={() => setGoalSelectionOpen(true)}>Select Goals</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {performanceAssessments.map((assessment, index) => (
              <Card key={`goal-${index}`}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{assessment.goalTitle}</CardTitle>
                    <CardDescription>
                      {assessment.milestones.length} milestone{assessment.milestones.length !== 1 ? 's' : ''} selected
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveGoal(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setCurrentGoalIndex(index);
                        setMilestoneSelectionOpen(true);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> Add Milestone
                    </Button>
                    
                    {assessment.milestones.length > 0 ? (
                      <div className="space-y-3 mt-2">
                        {assessment.milestones.map((milestone, mIndex) => (
                          <div key={`milestone-${index}-${mIndex}`} className="border rounded-md p-3">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-medium">{milestone.milestoneTitle}</h4>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleRemoveMilestone(index, mIndex)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs mb-1 block">Progress Rating</Label>
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="range" 
                                    min="0" 
                                    max="10" 
                                    value={milestone.rating || 5} 
                                    onChange={(e) => handleUpdateMilestoneRating(index, mIndex, parseInt(e.target.value))}
                                    className="flex-1"
                                  />
                                  <span className="text-sm font-medium">{milestone.rating || 5}/10</span>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <Label className="text-xs">Strategies</Label>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 py-0 px-2 text-xs"
                                    onClick={() => {
                                      setCurrentGoalIndex(index);
                                      setCurrentMilestoneIndex(mIndex);
                                      setStrategySelectionOpen(true);
                                    }}
                                  >
                                    + Add
                                  </Button>
                                </div>
                                
                                <div className="flex flex-wrap gap-1">
                                  {milestone.strategies && milestone.strategies.length > 0 ? (
                                    milestone.strategies.map((strategy, sIndex) => (
                                      <Badge 
                                        key={`strategy-${index}-${mIndex}-${sIndex}`}
                                        variant="outline" 
                                        className="gap-1 pl-2 pr-1 py-0 h-6"
                                      >
                                        {strategy}
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-4 w-4 ml-1"
                                          onClick={() => handleRemoveStrategy(index, mIndex, sIndex)}
                                        >
                                          <X className="h-2 w-2" />
                                        </Button>
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No strategies added</span>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs mb-1 block">Notes</Label>
                                <Textarea 
                                  placeholder="Add specific notes about this milestone..."
                                  value={milestone.notes || ""}
                                  onChange={(e) => handleUpdateMilestoneNotes(index, mIndex, e.target.value)}
                                  className="text-sm min-h-[60px]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">
                        No milestones selected for this goal yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderProductsSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Products Used</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setProductSelectionOpen(true)}
          className="flex items-center gap-1"
          disabled={productItems.length === 0}
        >
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>
      
      {!budgetSettings || !budgetSettings.planName ? (
        <div className="border rounded-md p-8 text-center">
          <div className="mx-auto mb-4 bg-muted w-12 h-12 rounded-full flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Funding Plan</h3>
          <p className="text-muted-foreground">This client doesn't have an active funding plan</p>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <div className="bg-muted/30 border rounded-md p-3">
              <div className="flex justify-between">
                <div>
                  <h4 className="text-sm font-medium">{budgetSettings.planName}</h4>
                  <p className="text-xs text-muted-foreground">{budgetSettings.planCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    Available: ${Number(budgetSettings.availableFunds).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {(() => {
              const products = form.watch("sessionNote.products") || [];
              
              if (products.length === 0) {
                return (
                  <div className="border rounded-md p-6 text-center">
                    <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <h4 className="text-base font-medium mb-1">No Products Added</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Add products that were used during this session
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setProductSelectionOpen(true)}
                      disabled={productItems.length === 0}
                    >
                      Browse Products
                    </Button>
                  </div>
                );
              }
              
              return (
                <div>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="py-2 px-3 text-left">Product</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Price</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {products.map((product: any, index: number) => (
                          <tr key={`product-${index}`}>
                            <td className="py-3 px-3">
                              <div>
                                <div className="font-medium">{product.productDescription}</div>
                                <div className="text-xs text-muted-foreground">{product.productCode}</div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">{product.quantity}</td>
                            <td className="py-3 px-3 text-right">${product.unitPrice.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-medium">${(product.quantity * product.unitPrice).toFixed(2)}</td>
                            <td className="py-3 px-3">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeProduct(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        
                        <tr className="bg-muted/30">
                          <td colSpan={3} className="py-3 px-3 text-right font-medium">Total:</td>
                          <td className="py-3 px-3 text-right font-bold">
                            ${products.reduce((total: number, product: any) => {
                              return total + (product.quantity * product.unitPrice);
                            }, 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );

  const renderNotesSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Session Notes</h3>
      
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="sessionNote.notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Enter detailed session notes here..."
                  minHeight="300px"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  // Dialogs
  return (
    <div className={isFullScreen ? "fullscreen-form" : ""}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className={cn(
            "p-0 overflow-hidden w-[95vw] h-[90vh] max-w-none scrollable-content",
            isFullScreen && "fullscreen-dialog"
          )}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ThreeColumnLayout
                leftColumn={
                  <div className="p-4 h-full flex flex-col">
                    <DialogHeader className="px-1 mb-6">
                      <DialogTitle>New Session</DialogTitle>
                      <DialogDescription>
                        Create a new therapy session with notes and assessments
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!clientSelected && renderClientSelection()}
                    
                    <Tabs 
                      value={activeTab} 
                      onValueChange={setActiveTab}
                      className="flex-1 flex flex-col session-form-tabs"
                    >
                      <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-4 overflow-x-auto flex-wrap">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="present">Present</TabsTrigger>
                        <TabsTrigger value="goals">Goals</TabsTrigger>
                        <TabsTrigger value="products">Products</TabsTrigger>
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                      </TabsList>
                      
                      <div className="overflow-auto flex-1 scrollable-content session-form-content">
                        <TabsContent value="details" className="mt-0 h-full">
                          {renderSessionDetails()}
                        </TabsContent>
                        
                        <TabsContent value="present" className="mt-0 h-full">
                          {renderPresentSection()}
                        </TabsContent>
                        
                        <TabsContent value="goals" className="mt-0 h-full">
                          {renderGoalsSection()}
                        </TabsContent>
                        
                        <TabsContent value="products" className="mt-0 h-full">
                          {renderProductsSection()}
                        </TabsContent>
                        
                        <TabsContent value="notes" className="mt-0 h-full">
                          {renderNotesSection()}
                        </TabsContent>
                      </div>
                    </Tabs>
                    
                    <DialogFooter className="px-1 mt-4 session-form-footer">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => onOpenChange(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createSession.isPending}>
                        {createSession.isPending ? 
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : 
                          <Check className="h-4 w-4 mr-2" />
                        }
                        Create Session
                      </Button>
                    </DialogFooter>
                  </div>
                }
                middleColumn={
                  <div className="bg-muted/20 p-6 flex flex-col items-center justify-center">
                    <div className="text-center mb-4">
                      <UserCheck className="h-16 w-16 mx-auto text-primary/20 mb-2" />
                      <h2 className="text-xl font-semibold">Session Preview</h2>
                      <p className="text-muted-foreground">
                        {clientSelected && initialClient ? initialClient.name : "Select a client to continue"}
                      </p>
                    </div>
                    
                    {clientSelected && (
                      <div className="w-full max-w-md space-y-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{form.watch("session.title")}</CardTitle>
                            <CardDescription className="text-xs">
                              {format(form.watch("session.sessionDate"), "PPP")} • {form.watch("session.duration")} mins
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-3">
                            {form.watch("session.description") ? (
                              <p className="text-sm">{form.watch("session.description")}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No description provided</p>
                            )}
                          </CardContent>
                        </Card>
                        
                        <div className="border rounded-md p-3">
                          <h3 className="text-sm font-medium mb-2">Goal Assessments</h3>
                          {performanceAssessments.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No goals have been added for assessment</p>
                          ) : (
                            <div className="space-y-2">
                              {performanceAssessments.map((assessment, index) => (
                                <div key={`preview-goal-${index}`} className="text-sm">
                                  <div className="font-medium">{assessment.goalTitle}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {assessment.milestones.length} milestone{assessment.milestones.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="border rounded-md p-3">
                          <h3 className="text-sm font-medium mb-2">Products Used</h3>
                          {(() => {
                            const products = form.watch("sessionNote.products") || [];
                            return products.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">No products have been added</p>
                            ) : (
                              <div className="space-y-1">
                                {products.map((product: any, index: number) => (
                                  <div key={`preview-product-${index}`} className="flex justify-between text-sm">
                                    <span>{product.productDescription} (x{product.quantity})</span>
                                    <span className="font-medium">${(product.quantity * product.unitPrice).toFixed(2)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm pt-1 border-t">
                                  <span className="font-medium">Total</span>
                                  <span className="font-bold">
                                    ${products.reduce((total: number, product: any) => total + (product.quantity * product.unitPrice), 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                }
                rightColumn={
                  <div className="bg-muted/10 p-6 flex flex-col">
                    <h2 className="text-xl font-semibold mb-4">Session Progress</h2>
                    
                    <div className="space-y-6 flex-1">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium">Completion Status</h3>
                          <span className="text-xs text-muted-foreground">
                            {calculateProgressPercentage()}%
                          </span>
                        </div>
                        <Progress value={calculateProgressPercentage()} className="h-2" />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${checkStep(0) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {checkStep(0) ? <Check className="h-3 w-3" /> : 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className={`text-sm ${activeTab === 'details' ? 'font-medium' : ''}`}>Session Details</span>
                              {checkStep(0) && <Check className="h-4 w-4 text-green-600" />}
                            </div>
                            <Progress value={checkStep(0) ? 100 : stepProgress(0)} className="h-1 mt-1" />
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${checkStep(1) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {checkStep(1) ? <Check className="h-3 w-3" /> : 2}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className={`text-sm ${activeTab === 'present' ? 'font-medium' : ''}`}>Present & Ratings</span>
                              {checkStep(1) && <Check className="h-4 w-4 text-green-600" />}
                            </div>
                            <Progress value={checkStep(1) ? 100 : stepProgress(1)} className="h-1 mt-1" />
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${checkStep(2) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {checkStep(2) ? <Check className="h-3 w-3" /> : 3}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className={`text-sm ${activeTab === 'goals' ? 'font-medium' : ''}`}>Goal Assessments</span>
                              {checkStep(2) && <Check className="h-4 w-4 text-green-600" />}
                            </div>
                            <Progress value={checkStep(2) ? 100 : stepProgress(2)} className="h-1 mt-1" />
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${checkStep(3) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {checkStep(3) ? <Check className="h-3 w-3" /> : 4}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className={`text-sm ${activeTab === 'products' ? 'font-medium' : ''}`}>Products</span>
                              {checkStep(3) && <Check className="h-4 w-4 text-green-600" />}
                            </div>
                            <Progress value={checkStep(3) ? 100 : stepProgress(3)} className="h-1 mt-1" />
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${checkStep(4) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {checkStep(4) ? <Check className="h-3 w-3" /> : 5}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className={`text-sm ${activeTab === 'notes' ? 'font-medium' : ''}`}>Session Notes</span>
                              {checkStep(4) && <Check className="h-4 w-4 text-green-600" />}
                            </div>
                            <Progress value={checkStep(4) ? 100 : stepProgress(4)} className="h-1 mt-1" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium">Navigation</h3>
                        <div className="flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={goToPreviousStep}
                            disabled={!canGoPrevious()}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={goToNextStep}
                            disabled={!canGoNext()}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-6">
                      <h3 className="text-sm font-medium mb-2">Quick Tips</h3>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Complete all sections for a comprehensive session record</p>
                        <p>• Add at least one goal assessment for tracking progress</p>
                        <p>• Use the products section to record any items used</p>
                        <p>• The notes section supports rich text formatting</p>
                      </div>
                    </div>
                  </div>
                }
              />
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Goal selection dialog */}
      <GoalSelectionDialog
        open={goalSelectionOpen}
        onOpenChange={setGoalSelectionOpen}
        goals={goals || []}
        selectedGoalIds={selectedGoalIds}
        onSelectGoal={handleGoalSelection}
      />
      
      {/* Milestone selection dialog */}
      <MilestoneSelectionDialog
        open={milestoneSelectionOpen}
        onOpenChange={setMilestoneSelectionOpen}
        subgoals={goals?.find((g: any) => g.id === performanceAssessments[currentGoalIndex || 0]?.goalId)?.subgoals || []}
        selectedMilestoneIds={selectedMilestoneIds}
        onSelectMilestone={handleMilestoneSelection}
      />
      
      {/* Strategy selection dialog */}
      <StrategySelectionDialog
        open={strategySelectionOpen}
        onOpenChange={setStrategySelectionOpen}
        selectedStrategies={performanceAssessments[currentGoalIndex || 0]?.milestones[currentMilestoneIndex || 0]?.strategies || []}
        milestoneId={currentMilestoneIndex || 0}
        onSelectStrategy={handleStrategySelection}
      />
      
      {/* Product selection dialog */}
      <ProductSelectionDialog
        open={productSelectionOpen}
        onOpenChange={setProductSelectionOpen}
        products={productItems}
        onSelectProduct={handleProductSelection}
      />
    </div>
  );
  
  // Helper functions for progress tracking and navigation
  function calculateProgressPercentage(): number {
    const steps = [
      Boolean(form.watch("session.title") && form.watch("session.sessionDate")),
      true, // Present step is optional
      performanceAssessments.length > 0,
      true, // Products step is optional
      Boolean(form.watch("sessionNote.notes"))
    ];
    
    const completedSteps = steps.filter(step => step).length;
    return Math.round((completedSteps / steps.length) * 100);
  }
  
  function checkStep(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0: return Boolean(form.watch("session.title") && form.watch("session.sessionDate"));
      case 1: return true; // Always mark as complete since it's optional
      case 2: return performanceAssessments.length > 0;
      case 3: return true; // Always mark as complete since it's optional
      case 4: return Boolean(form.watch("sessionNote.notes"));
      default: return false;
    }
  }
  
  function stepProgress(stepIndex: number): number {
    switch (stepIndex) {
      case 0:
        return form.watch("session.title") ? 50 : 0;
      case 1:
        const presentAllies = form.watch("sessionNote.presentAllyIds") || [];
        return presentAllies.length > 0 ? 50 : 0;
      case 2:
        return performanceAssessments.length > 0 ? performanceAssessments.length * 20 : 0;
      case 3:
        const products = form.watch("sessionNote.products") || [];
        return products.length > 0 ? 50 : 0;
      case 4:
        const notes = form.watch("sessionNote.notes") || '';
        return notes ? (notes.length > 50 ? 100 : 50) : 0;
      default:
        return 0;
    }
  }
  
  function canGoPrevious(): boolean {
    const tabOrder = ["details", "present", "goals", "products", "notes"];
    const currentIndex = tabOrder.indexOf(activeTab);
    return currentIndex > 0;
  }
  
  function canGoNext(): boolean {
    const tabOrder = ["details", "present", "goals", "products", "notes"];
    const currentIndex = tabOrder.indexOf(activeTab);
    return currentIndex < tabOrder.length - 1;
  }
  
  function goToPreviousStep() {
    const tabOrder = ["details", "present", "goals", "products", "notes"];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  }
  
  function goToNextStep() {
    const tabOrder = ["details", "present", "goals", "products", "notes"];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  }
}