import React, { useState, useEffect } from "react";
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
  ChevronRight
} from "lucide-react";
import { Ally, Client, Goal, Session, Subgoal, insertSessionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

// Session form schema
const sessionFormSchema = insertSessionSchema.extend({
  sessionDate: z.coerce.date({
    required_error: "Session date is required",
  }),
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  therapistId: z.coerce.number().optional(),
  duration: z.coerce.number({
    required_error: "Duration is required",
  }).min(1, "Duration must be at least 1 minute"),
  status: z.string({
    required_error: "Status is required",
  }),
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

// Session notes schema
const sessionNoteSchema = z.object({
  presentAllies: z.array(z.string()).default([]),
  moodRating: z.number().min(0).max(10).default(5),
  focusRating: z.number().min(0).max(10).default(5),
  cooperationRating: z.number().min(0).max(10).default(5),
  physicalActivityRating: z.number().min(0).max(10).default(5),
  notes: z.string().optional(),
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
          <DialogTitle>Select Goal</DialogTitle>
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
                    <CardTitle className="text-base">{goal.title}</CardTitle>
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
          <DialogTitle>Select Milestone</DialogTitle>
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
                    <CardTitle className="text-base">{subgoal.title}</CardTitle>
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

  // Fetch clients for client dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });

  // Default form values
  const defaultValues: Partial<IntegratedSessionFormValues> = {
    session: {
      title: "",
      description: "",
      sessionDate: new Date(),
      duration: 60,
      status: "scheduled",
      location: "Clinic - Room 101",
      notes: "",
      clientId: initialClient?.id || 0,
    },
    sessionNote: {
      presentAllies: [],
      moodRating: 5,
      focusRating: 5,
      cooperationRating: 5,
      physicalActivityRating: 5,
      notes: "",
      status: "draft",
    },
    performanceAssessments: [],
  };

  // Create form
  const form = useForm<IntegratedSessionFormValues>({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues,
  });

  // Watch clientId to update related data
  const clientId = form.watch("session.clientId");
  
  // Fetch allies for therapist dropdown and participant selection
  const { data: allies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", clientId, "allies"],
    enabled: open && !!clientId,
  });

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
  
  // Create a simple lookup object for subgoals by goal ID
  const subgoalsByGoalId = React.useMemo(() => {
    const result: Record<number, Subgoal[]> = {};
    if (selectedGoalId) {
      result[selectedGoalId] = subgoals;
    }
    return result;
  }, [selectedGoalId, subgoals]);

  // Update form when client is changed
  useEffect(() => {
    if (initialClient?.id && initialClient.id !== clientId) {
      form.setValue("session.clientId", initialClient.id);
    }
  }, [initialClient, form, clientId]);

  // Get selected goals from form values
  const selectedPerformanceAssessments = form.watch("performanceAssessments") || [];
  const selectedGoalIds = selectedPerformanceAssessments.map(pa => pa.goalId);

  // Helper to get selected milestone IDs for a specific goal
  const getSelectedMilestoneIds = (goalId: number): number[] => {
    const assessment = selectedPerformanceAssessments.find(pa => pa.goalId === goalId);
    return assessment?.milestones?.map(m => m.milestoneId) || [];
  };

  // Handle goal selection
  const handleGoalSelection = (goal: Goal) => {
    const updatedAssessments = [...selectedPerformanceAssessments];
    updatedAssessments.push({
      goalId: goal.id,
      goalTitle: goal.title,
      notes: "",
      milestones: []
    });
    
    form.setValue("performanceAssessments", updatedAssessments);
    
    // Set the selected goal ID to fetch its subgoals
    setSelectedGoalId(goal.id);
  };

  // Handle milestone selection
  const handleMilestoneSelection = (subgoal: Subgoal) => {
    if (currentGoalIndex === null) return;
    
    const updatedAssessments = [...selectedPerformanceAssessments];
    const milestones = [...(updatedAssessments[currentGoalIndex].milestones || [])];
    
    milestones.push({
      milestoneId: subgoal.id,
      milestoneTitle: subgoal.title,
      rating: 5,
      strategies: [],
      notes: ""
    });
    
    updatedAssessments[currentGoalIndex].milestones = milestones;
    form.setValue("performanceAssessments", updatedAssessments);
    
    // Ensure we have the goal ID to fetch subgoals
    if (selectedGoalId === null && updatedAssessments[currentGoalIndex]) {
      setSelectedGoalId(updatedAssessments[currentGoalIndex].goalId);
    }
  };

  // Handle removing a goal assessment
  const handleRemoveGoal = (index: number) => {
    const updatedAssessments = [...selectedPerformanceAssessments];
    updatedAssessments.splice(index, 1);
    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Handle removing a milestone assessment
  const handleRemoveMilestone = (goalIndex: number, milestoneIndex: number) => {
    const updatedAssessments = [...selectedPerformanceAssessments];
    const milestones = [...updatedAssessments[goalIndex].milestones];
    milestones.splice(milestoneIndex, 1);
    updatedAssessments[goalIndex].milestones = milestones;
    form.setValue("performanceAssessments", updatedAssessments);
  };

  // Create session and session note mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      // Step 1: Create the session
      const sessionResponse = await apiRequest("POST", "/api/sessions", data.session);
      const sessionData = sessionResponse as any;
      
      // Step 2: Create the session note with the new session ID
      const noteData = {
        ...data.sessionNote,
        sessionId: sessionData.id,
        clientId: data.session.clientId
      };
      
      const noteResponse = await apiRequest("POST", `/api/sessions/${sessionData.id}/notes`, noteData);
      const noteResponseData = noteResponse as any;
      
      // Step 3: Create performance assessments
      if (data.performanceAssessments.length > 0) {
        await Promise.all(
          data.performanceAssessments.map(assessment => 
            apiRequest("POST", `/api/session-notes/${noteResponseData.id}/performance`, {
              goalId: assessment.goalId,
              notes: assessment.notes,
              milestones: assessment.milestones
            })
          )
        );
      }
      
      return sessionData;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session and notes created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      form.reset(defaultValues);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create session and notes",
        variant: "destructive",
      });
      console.error("Error creating session:", error);
    },
  });

  // Form submission handler
  function onSubmit(data: IntegratedSessionFormValues) {
    createSessionMutation.mutate(data);
  }

  // Handle navigation between tabs
  const handleNext = () => {
    if (activeTab === "details") setActiveTab("participants");
    else if (activeTab === "participants") setActiveTab("performance");
  };

  const handleBack = () => {
    if (activeTab === "performance") setActiveTab("participants");
    else if (activeTab === "participants") setActiveTab("details");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={isFullScreen ? "max-w-[95vw] h-[95vh] flex flex-col" : "max-w-[900px]"}
        onInteractOutside={(e) => {
          // Prevent closing when interacting with date picker
          if ((e.target as HTMLElement).closest('.rdp')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Create Session with Notes</DialogTitle>
          <DialogDescription>
            Create a new therapy session with detailed notes
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={isFullScreen ? "flex-1 overflow-hidden flex flex-col" : ""}>
            <div className={isFullScreen ? "flex-1 overflow-auto" : ""}>
              <Tabs 
                defaultValue="details" 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="details">Session Details</TabsTrigger>
                  <TabsTrigger value="participants">Observations</TabsTrigger>
                  <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
                </TabsList>

                {/* Session Details Tab */}
                <TabsContent value="details" className="space-y-4">
                  {/* Client, Location, Date & Time row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Client */}
                    <FormField
                      control={form.control}
                      name="session.clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
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
                    
                    {/* Location */}
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
                    
                    {/* Date & Time */}
                    <FormField
                      control={form.control}
                      name="session.sessionDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date & Time</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "MMMM dd, yyyy 'at' h:mm a")
                                  ) : (
                                    <span>Pick a date and time</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <div data-calendar-container="true">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </div>
                              <div className="p-3 border-t border-border">
                                <div className="grid gap-2">
                                  <Label htmlFor="time">Time</Label>
                                  <Input
                                    id="time"
                                    type="time"
                                    value={format(field.value || new Date(), "HH:mm")}
                                    onChange={(e) => {
                                      const date = new Date(field.value || new Date());
                                      const [hours, minutes] = e.target.value.split(':');
                                      date.setHours(parseInt(hours));
                                      date.setMinutes(parseInt(minutes));
                                      field.onChange(date);
                                    }}
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </TabsContent>

                {/* Participant Observations Tab */}
                <TabsContent value="participants" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Present Allies Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Present</h3>
                      
                      <div className="space-y-2">
                        {allies.length === 0 ? (
                          <div className="text-muted-foreground text-sm italic">
                            No allies found for this client
                          </div>
                        ) : (
                          allies.map((ally) => (
                            <div key={ally.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`ally-${ally.id}`}
                                checked={form.watch("sessionNote.presentAllies").includes(ally.name)}
                                onCheckedChange={(checked) => {
                                  const currentAllies = [...form.watch("sessionNote.presentAllies")];
                                  
                                  if (checked) {
                                    // Add ally to the list
                                    if (!currentAllies.includes(ally.name)) {
                                      currentAllies.push(ally.name);
                                    }
                                  } else {
                                    // Remove ally from the list
                                    const index = currentAllies.indexOf(ally.name);
                                    if (index !== -1) {
                                      currentAllies.splice(index, 1);
                                    }
                                  }
                                  
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
                    
                    {/* Observation Ratings Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Observation Ratings</h3>
                      
                      <div className="space-y-6">
                        <RatingSlider
                          label="Mood"
                          value={form.watch("sessionNote.moodRating")}
                          onChange={(value) => form.setValue("sessionNote.moodRating", value)}
                          description="Overall mood during the session"
                        />
                        
                        <RatingSlider
                          label="Focus"
                          value={form.watch("sessionNote.focusRating")}
                          onChange={(value) => form.setValue("sessionNote.focusRating", value)}
                          description="Ability to maintain attention"
                        />
                        
                        <RatingSlider
                          label="Cooperation"
                          value={form.watch("sessionNote.cooperationRating")}
                          onChange={(value) => form.setValue("sessionNote.cooperationRating", value)}
                          description="Willingness to participate in activities"
                        />
                        
                        <RatingSlider
                          label="Physical Activity"
                          value={form.watch("sessionNote.physicalActivityRating")}
                          onChange={(value) => form.setValue("sessionNote.physicalActivityRating", value)}
                          description="Energy level and physical engagement"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Observation Notes */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notes</h3>
                    <FormField
                      control={form.control}
                      name="sessionNote.notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Add detailed observations about the session..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Performance Assessment Tab */}
                <TabsContent value="performance" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Goal Assessments</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setGoalSelectionOpen(true)}
                      disabled={!clientId}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Goal
                    </Button>
                  </div>
                  
                  {/* Goal Assessments List */}
                  {selectedPerformanceAssessments.length === 0 ? (
                    <div className="text-center py-8 border rounded-md bg-muted/20">
                      <h4 className="font-medium mb-2">No goals selected</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add goals to assess progress during this session
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setGoalSelectionOpen(true)}
                        disabled={!clientId}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Goal
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {selectedPerformanceAssessments.map((assessment, goalIndex) => (
                        <Card key={assessment.goalId}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-base">
                                {assessment.goalTitle}
                              </CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground"
                                onClick={() => handleRemoveGoal(goalIndex)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            {/* Milestones Section */}
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium">Milestones</h4>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => {
                                    setCurrentGoalIndex(goalIndex);
                                    setSelectedGoalId(assessment.goalId);
                                    setMilestoneSelectionOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              </div>
                              
                              {assessment.milestones.length === 0 ? (
                                <div className="text-sm text-muted-foreground italic">
                                  No milestones selected
                                </div>
                              ) : (
                                <div className="space-y-4 pl-4">
                                  {assessment.milestones.map((milestone, milestoneIndex) => (
                                    <div key={milestone.milestoneId} className="space-y-2">
                                      <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                          <h5 className="text-sm font-medium">
                                            {milestone.milestoneTitle}
                                          </h5>
                                          <div className="flex items-center">
                                            <Label htmlFor={`rating-${goalIndex}-${milestoneIndex}`} className="mr-2 text-xs">
                                              Rating:
                                            </Label>
                                            <Select
                                              value={milestone.rating?.toString() || "5"}
                                              onValueChange={(value) => {
                                                const updatedAssessments = [...selectedPerformanceAssessments];
                                                updatedAssessments[goalIndex].milestones[milestoneIndex].rating = parseInt(value);
                                                form.setValue("performanceAssessments", updatedAssessments);
                                              }}
                                            >
                                              <SelectTrigger id={`rating-${goalIndex}-${milestoneIndex}`} className="h-7 w-20">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                                                  <SelectItem key={rating} value={rating.toString()}>
                                                    {rating}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-muted-foreground"
                                          onClick={() => handleRemoveMilestone(goalIndex, milestoneIndex)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      
                                      <Textarea
                                        placeholder="Add notes for this milestone..."
                                        className="text-sm min-h-[60px]"
                                        value={milestone.notes || ""}
                                        onChange={(e) => {
                                          const updatedAssessments = [...selectedPerformanceAssessments];
                                          updatedAssessments[goalIndex].milestones[milestoneIndex].notes = e.target.value;
                                          form.setValue("performanceAssessments", updatedAssessments);
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Goal Notes */}
                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-medium">Goal Notes</h4>
                              </div>
                              <Textarea
                                placeholder="Add overall notes for this goal..."
                                className="text-sm min-h-[80px]"
                                value={assessment.notes || ""}
                                onChange={(e) => {
                                  const updatedAssessments = [...selectedPerformanceAssessments];
                                  updatedAssessments[goalIndex].notes = e.target.value;
                                  form.setValue("performanceAssessments", updatedAssessments);
                                }}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            
            <DialogFooter className="pt-4 flex justify-between">
              {activeTab !== "details" ? (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <div></div> // Empty div to maintain flex alignment
              )}
              
              {activeTab !== "performance" ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={createSessionMutation.isPending}>
                  {createSessionMutation.isPending ? (
                    <>Creating...</>
                  ) : (
                    <>Create Session</>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      
      {/* Goal Selection Dialog */}
      <GoalSelectionDialog
        open={goalSelectionOpen}
        onOpenChange={setGoalSelectionOpen}
        goals={goals}
        selectedGoalIds={selectedGoalIds}
        onSelectGoal={handleGoalSelection}
      />
      
      {/* Milestone Selection Dialog */}
      <MilestoneSelectionDialog
        open={milestoneSelectionOpen}
        onOpenChange={setMilestoneSelectionOpen}
        subgoals={subgoals}
        selectedMilestoneIds={getSelectedMilestoneIds(selectedPerformanceAssessments[currentGoalIndex]?.goalId || 0)}
        onSelectMilestone={handleMilestoneSelection}
      />
    </Dialog>
  );
}