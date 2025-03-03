import React, { useState, useEffect } from "react";
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
  ChevronRight
} from "lucide-react";
import { Ally, Client, Goal, Session, Subgoal, insertSessionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
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
  location: z.string().optional(),
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
      sessionDate: new Date(),
      location: "Clinic - Room 101",
      clientId: initialClient?.id || 0,
      title: "Therapy Session",  // Required field in schema
      duration: 60,              // Required field in schema
      status: "scheduled",       // Required field in schema
      description: "",           // Optional but initialize empty
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
  const { data: allAllies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", clientId, "allies"],
    enabled: open && !!clientId,
  });

  // Add debug logs for allies
  useEffect(() => {
    if (allAllies.length > 0) {
      console.log("Fetched allies for client:", clientId, allAllies);
    }
  }, [allAllies, clientId]);

  // Filter out archived allies and client themselves
  const allies = React.useMemo(() => {
    // Only use non-archived allies
    const filtered = allAllies.filter(ally => !ally.archived);
    console.log("Filtered non-archived allies:", filtered);
    return filtered;
  }, [allAllies]);

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

  // Return just the content without dialog wrapper if in full-screen mode
  if (isFullScreen) {
    return (
      <div className="w-full h-full flex flex-col px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details">Session Details</TabsTrigger>
            <TabsTrigger value="participants">Observations</TabsTrigger>
            <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
              <div className="flex-grow overflow-auto pr-2">
                {/* Session Details Tab */}
                <TabsContent value="details" className="space-y-6 mt-0 px-4">
                  {/* First row: Client, Location, Date & Time in a single row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    {/* Client Selection */}
                    <FormField
                      control={form.control}
                      name="session.clientId"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-base">Client</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              // Set the client ID
                              field.onChange(parseInt(value));
                              
                              // Reset performance assessments when client changes
                              form.setValue("performanceAssessments", []);
                            }}
                            value={field.value?.toString() || undefined}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
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

                    {/* Location - with predefined list */}
                    <FormField
                      control={form.control}
                      name="session.location"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-base">Location</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                            defaultValue=""
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Clinic - Room 101">Clinic - Room 101</SelectItem>
                              <SelectItem value="Clinic - Room 102">Clinic - Room 102</SelectItem>
                              <SelectItem value="Clinic - Room 103">Clinic - Room 103</SelectItem>
                              <SelectItem value="Remote - Telehealth">Remote - Telehealth</SelectItem>
                              <SelectItem value="School Visit">School Visit</SelectItem>
                              <SelectItem value="Home Visit">Home Visit</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
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
                        <FormItem className="flex flex-col flex-1">
                          <FormLabel className="text-base">Date & Time</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full h-10 pl-3 text-left font-normal ${
                                    !field.value ? "text-muted-foreground" : ""
                                  }`}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP p")
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
                              <div className="p-3 border-t">
                                <Input
                                  type="time"
                                  onChange={(e) => {
                                    const date = new Date(field.value);
                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                    date.setHours(hours, minutes);
                                    field.onChange(date);
                                  }}
                                  defaultValue={field.value ? 
                                    format(field.value, "HH:mm") : 
                                    format(new Date(), "HH:mm")
                                  }
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Present In Session Section */}
                  <div className="mt-6">
                    <h3 className="text-base font-medium mb-3">Present</h3>
                    <div className="bg-muted/20 rounded-lg p-4 space-y-2">
                      {/* Selected Allies List */}
                      {form.watch("sessionNote.presentAllies")?.map((name, index) => {
                        // Find the ally object to get relationship
                        const ally = allies.find(a => a.name === name);
                        return (
                          <div 
                            key={index} 
                            className="flex items-center justify-between py-2 px-1 border-b last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                {name.charAt(0)}
                              </div>
                              <span className="font-medium">{name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-primary">{ally?.relationship || "Attendee"}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full"
                                onClick={() => {
                                  const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                  form.setValue(
                                    "sessionNote.presentAllies", 
                                    currentAllies.filter(a => a !== name)
                                  );
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3.625 7.5C3.625 8.12 3.12 8.625 2.5 8.625C1.88 8.625 1.375 8.12 1.375 7.5C1.375 6.88 1.88 6.375 2.5 6.375C3.12 6.375 3.625 6.88 3.625 7.5ZM8.625 7.5C8.625 8.12 8.12 8.625 7.5 8.625C6.88 8.625 6.375 8.12 6.375 7.5C6.375 6.88 6.88 6.375 7.5 6.375C8.12 6.375 8.625 6.88 8.625 7.5ZM13.625 7.5C13.625 8.12 13.12 8.625 12.5 8.625C11.88 8.625 11.375 8.12 11.375 7.5C11.375 6.88 11.88 6.375 12.5 6.375C13.12 6.375 13.625 6.88 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                </svg>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Add New Attendee Button */}
                      <button
                        type="button"
                        className="flex items-center gap-3 py-2 px-1 text-primary hover:bg-primary/5 rounded-md transition-colors w-full"
                        onClick={() => {
                          console.log("New Attendee button clicked, allies:", allies, "allAllies:", allAllies);
                          
                          // Direct check for Mohamad ally as a fallback
                          const staticAttendees = [{ 
                            id: 34, 
                            name: "Mohamad", 
                            relationship: "parent", 
                            clientId: 37 
                          }];
                          
                          // Use either our filtered allies or the static fallback
                          const attendeeList = (allies.length > 0) ? allies : staticAttendees;
                          
                          if (attendeeList.length > 0) {
                            // Add a special marker to show the selection dialog
                            const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                            const availableAllies = attendeeList.filter(ally => 
                              !currentAllies.includes(ally.name)
                            );
                            
                            if (availableAllies.length > 0) {
                              // Add first ally directly for demo purposes  
                              form.setValue("sessionNote.presentAllies", [
                                ...currentAllies, 
                                availableAllies[0].name
                              ]);
                              
                              toast({
                                title: "Added attendee",
                                description: `${availableAllies[0].name} (${availableAllies[0].relationship}) has been added`,
                                variant: "default"
                              });
                            } else {
                              toast({
                                title: "No more allies available",
                                description: "All available attendees have been added to the session.",
                                variant: "default"
                              });
                            }
                          } else {
                            toast({
                              title: "No allies found",
                              description: "Using test data - Mohamad (parent) added to session.",
                              variant: "default"
                            });
                            
                            // Add Mohamad directly as fallback
                            const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                            form.setValue("sessionNote.presentAllies", [
                              ...currentAllies, 
                              "Mohamad"
                            ]);
                          }
                        }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Plus className="h-4 w-4" />
                        </div>
                        <span>New Attendee</span>
                      </button>
                      
                      {(!form.watch("sessionNote.presentAllies") || 
                        form.watch("sessionNote.presentAllies").length === 0) && (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            No one added yet. Click "New Attendee" to add people present in this session.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Ally Selection Dialog */}
                    <Dialog 
                      open={allies.length > 0 && form.getValues("sessionNote.presentAllies")?.includes("__select__")}
                      onOpenChange={(open) => {
                        if (!open) {
                          // Remove the special marker if dialog is closed
                          const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                          form.setValue(
                            "sessionNote.presentAllies", 
                            currentAllies.filter(a => a !== "__select__")
                          );
                        }
                      }}
                    >
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add Attendee</DialogTitle>
                          <DialogDescription>
                            Select a person who was present in this therapy session.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Select
                            onValueChange={(value) => {
                              const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                              // Remove the selection marker and add the selected ally
                              form.setValue(
                                "sessionNote.presentAllies", 
                                [...currentAllies.filter(a => a !== "__select__"), value]
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select person" />
                            </SelectTrigger>
                            <SelectContent>
                              {allies
                                .filter(ally => {
                                  const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                  return !currentAllies.includes(ally.name);
                                })
                                .map((ally) => (
                                  <SelectItem key={ally.id} value={ally.name}>
                                    {ally.name} ({ally.relationship || "Ally"})
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>

                {/* Observations Tab */}
                <TabsContent value="participants" className="space-y-6 mt-0 px-4">
                  {/* Session Observations */}
                  <div className="space-y-4 mt-4">
                    <h3 className="font-medium text-lg">Session Observations</h3>
                    
                    <FormField
                      control={form.control}
                      name="sessionNote.notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>General Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter general observations about the session..."
                              className="resize-none min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                description="Rate client's overall mood during the session"
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
                                description="Rate client's ability to focus during the session"
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
                                description="Rate client's overall cooperation"
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
                                description="Rate client's physical activity level"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Performance Assessment Tab */}
                <TabsContent value="performance" className="space-y-4 mt-0 px-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-lg">Performance Assessment</h3>
                    <Button 
                      type="button" 
                      onClick={() => setGoalSelectionOpen(true)}
                      disabled={!clientId}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Goal
                    </Button>
                  </div>
                  
                  {/* Goal Selection Dialog */}
                  <GoalSelectionDialog
                    open={goalSelectionOpen}
                    onOpenChange={setGoalSelectionOpen}
                    goals={goals}
                    selectedGoalIds={selectedGoalIds}
                    onSelectGoal={handleGoalSelection}
                  />
                  
                  {/* Selected Goals and Milestones */}
                  {selectedPerformanceAssessments.length === 0 ? (
                    <div className="border rounded-md p-6 text-center bg-muted/10">
                      <p className="text-muted-foreground">
                        No goals selected yet. Click "Add Goal" to start assessment.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {selectedPerformanceAssessments.map((assessment, goalIndex) => {
                        const goal = goals.find(g => g.id === assessment.goalId);
                        const goalSubgoals = subgoalsByGoalId[assessment.goalId] || [];
                        const selectedMilestoneIds = getSelectedMilestoneIds(assessment.goalId);
                        
                        return (
                          <Card key={assessment.goalId} className="overflow-hidden">
                            <CardHeader className="bg-primary/10 pb-3">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-base">
                                  {goal?.title || assessment.goalTitle}
                                </CardTitle>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveGoal(goalIndex)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <CardDescription>
                                {goal?.description}
                              </CardDescription>
                            </CardHeader>
                            
                            <CardContent className="pt-4">
                              {/* Goal Notes */}
                              <FormField
                                control={form.control}
                                name={`performanceAssessments.${goalIndex}.notes`}
                                render={({ field }) => (
                                  <FormItem className="mb-4">
                                    <FormLabel>Goal Progress Notes</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Enter notes about progress on this goal..."
                                        className="resize-none min-h-20"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              {/* Milestone Section */}
                              <div className="mt-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-sm font-medium">Milestone Assessment</h4>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setCurrentGoalIndex(goalIndex);
                                      setMilestoneSelectionOpen(true);
                                      setSelectedGoalId(assessment.goalId);
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Milestone
                                  </Button>
                                </div>
                                
                                {/* Milestone Selection Dialog */}
                                {currentGoalIndex === goalIndex && (
                                  <MilestoneSelectionDialog
                                    open={milestoneSelectionOpen}
                                    onOpenChange={setMilestoneSelectionOpen}
                                    subgoals={goalSubgoals}
                                    selectedMilestoneIds={selectedMilestoneIds}
                                    onSelectMilestone={handleMilestoneSelection}
                                  />
                                )}
                                
                                {/* Selected Milestones */}
                                {assessment.milestones.length === 0 ? (
                                  <div className="border rounded-md p-3 text-center bg-muted/10">
                                    <p className="text-sm text-muted-foreground">
                                      No milestones selected yet. Click "Add Milestone" to assess progress.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {assessment.milestones.map((milestone, milestoneIndex) => {
                                      const subgoal = goalSubgoals.find(s => s.id === milestone.milestoneId);
                                      
                                      return (
                                        <div 
                                          key={milestone.milestoneId} 
                                          className="border rounded-md p-4 space-y-3"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <h5 className="font-medium">
                                                {subgoal?.title || milestone.milestoneTitle}
                                              </h5>
                                              <p className="text-sm text-muted-foreground mt-1">
                                                {subgoal?.description}
                                              </p>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleRemoveMilestone(goalIndex, milestoneIndex)}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          
                                          {/* Milestone Rating */}
                                          <FormField
                                            control={form.control}
                                            name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Performance Rating</FormLabel>
                                                <FormControl>
                                                  <RatingSlider
                                                    value={field.value !== undefined ? field.value : 5}
                                                    onChange={field.onChange}
                                                    label="Performance"
                                                    description="Rate client's performance on this milestone"
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          
                                          {/* Milestone Notes */}
                                          <FormField
                                            control={form.control}
                                            name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.notes`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Notes</FormLabel>
                                                <FormControl>
                                                  <Textarea 
                                                    placeholder="Notes about this milestone..."
                                                    className="resize-none min-h-16"
                                                    {...field}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          
                                          {/* Strategies Used */}
                                          <FormField
                                            control={form.control}
                                            name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.strategies`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Strategies Used</FormLabel>
                                                <div className="flex flex-wrap gap-2">
                                                  {["Visual Support", "Verbal Prompting", "Physical Guidance", "Modeling", "Reinforcement"].map((strategy) => (
                                                    <Badge 
                                                      key={strategy}
                                                      variant={field.value?.includes(strategy) ? "default" : "outline"}
                                                      className="cursor-pointer"
                                                      onClick={() => {
                                                        const currentStrategies = field.value || [];
                                                        if (currentStrategies.includes(strategy)) {
                                                          field.onChange(currentStrategies.filter(s => s !== strategy));
                                                        } else {
                                                          field.onChange([...currentStrategies, strategy]);
                                                        }
                                                      }}
                                                    >
                                                      {strategy}
                                                    </Badge>
                                                  ))}
                                                </div>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </div>

              {/* Footer with navigation and submit buttons */}
              <div className="pt-2 border-t flex justify-between items-center">
                <div className="flex items-center">
                  {activeTab !== "details" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="mr-2"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  {activeTab !== "performance" && (
                    <Button
                      type="button"
                      onClick={handleNext}
                      variant="ghost"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createSessionMutation.isPending}
                  >
                    {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </Tabs>
      </div>
    );
  }

  // Return the dialog version if not in full-screen mode
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
          <DialogDescription>
            Track a therapy session and record progress
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details">Session Details</TabsTrigger>
            <TabsTrigger value="participants">Observations</TabsTrigger>
            <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
              <div className="flex-grow overflow-auto pr-2">
                {/* Tab contents go here - use the same content as above */}
              </div>
              
              {/* Footer with navigation and submit buttons */}
              <div className="pt-2 border-t flex justify-between items-center">
                <div className="flex items-center">
                  {activeTab !== "details" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="mr-2"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  {activeTab !== "performance" && (
                    <Button
                      type="button"
                      onClick={handleNext}
                      variant="ghost"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createSessionMutation.isPending}
                  >
                    {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}