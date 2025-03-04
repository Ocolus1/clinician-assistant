import React, { useState, useEffect } from "react";
import "./session-form.css";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/utils";
import { Check, HelpCircle, Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Ally, Goal, Session, Subgoal } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Form schema for session notes
const sessionNoteSchema = z.object({
  sessionId: z.number(),
  clientId: z.number(),
  presentAllies: z.array(z.string()).default([]),
  moodRating: z.number().min(0).max(10).optional(),
  physicalActivityRating: z.number().min(0).max(10).optional(),
  focusRating: z.number().min(0).max(10).optional(),
  cooperationRating: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "completed"]).default("draft"),
});

// Form schema for performance assessments
const performanceAssessmentSchema = z.object({
  goalId: z.number(),
  notes: z.string().optional(),
  milestones: z.array(z.object({
    milestoneId: z.number(),
    rating: z.number().min(0).max(10).optional(),
    strategies: z.array(z.string()).default([]),
    notes: z.string().optional(),
  })).optional(),
});

// Complete form schema
const sessionNoteFormSchema = z.object({
  sessionNote: sessionNoteSchema,
  performanceAssessments: z.array(performanceAssessmentSchema).optional(),
});

type SessionNoteFormValues = z.infer<typeof sessionNoteFormSchema>;

interface SessionNoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session & { clientName: string };
  initialData?: any; // Complete session note data if editing
}

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
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <FormLabel>{label}</FormLabel>
        <Badge variant="outline" className={getBadgeClass()}>{value}</Badge>
      </div>
      {description && <FormDescription>{description}</FormDescription>}
      <div className="relative">
        <Slider
          value={[value]}
          min={0}
          max={10}
          step={1}
          onValueChange={(vals) => onChange(vals[0])}
          className={`py-1 rating-slider color-slider ${getRangeClass()}`}
        />
      </div>
    </div>
  );
};

export function SessionNoteForm({ open, onOpenChange, session, initialData }: SessionNoteFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [savingDraft, setSavingDraft] = useState(false);

  // Fetch the client's allies
  const { data: allies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", session.clientId, "allies"],
    enabled: open,
  });

  // Fetch the client's goals
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/clients", session.clientId, "goals"],
    enabled: open,
  });

  // For each goal, fetch its subgoals
  const subgoalQueries = goals.map((goal) => ({
    queryKey: ["/api/goals", goal.id, "subgoals"],
    enabled: open && goals.length > 0,
  }));

  const subgoalsResults = subgoalQueries.map((query) => useQuery<Subgoal[]>(query));
  
  // Combine goals with their subgoals
  const goalsWithSubgoals = goals.map((goal, index) => ({
    ...goal,
    subgoals: subgoalsResults[index]?.data || [],
  }));

  // Prepare default values
  const defaultValues: SessionNoteFormValues = initialData
    ? {
        sessionNote: {
          sessionId: initialData.sessionId,
          clientId: initialData.clientId,
          presentAllies: initialData.presentAllies || [],
          moodRating: initialData.moodRating || 5,
          physicalActivityRating: initialData.physicalActivityRating || 5,
          focusRating: initialData.focusRating || 5,
          cooperationRating: initialData.cooperationRating || 5,
          notes: initialData.notes || "",
          status: initialData.status || "draft",
        },
        performanceAssessments: initialData.performanceAssessments?.map((pa: any) => ({
          goalId: pa.goalId,
          notes: pa.notes || "",
          milestones: pa.milestones?.map((m: any) => ({
            milestoneId: m.milestoneId,
            rating: m.rating || 5,
            strategies: m.strategies || [],
            notes: m.notes || "",
          })),
        })),
      }
    : {
        sessionNote: {
          sessionId: session.id,
          clientId: session.clientId,
          presentAllies: [],
          moodRating: 5,
          physicalActivityRating: 5,
          focusRating: 5,
          cooperationRating: 5,
          notes: "",
          status: "draft",
        },
        performanceAssessments: goals.map((goal) => ({
          goalId: goal.id,
          notes: "",
          milestones: [],
        })),
      };

  // Create form
  const form = useForm<SessionNoteFormValues>({
    resolver: zodResolver(sessionNoteFormSchema),
    defaultValues,
  });

  // Update form when initial data or dependencies change
  useEffect(() => {
    if (initialData) {
      form.reset(defaultValues);
    } else if (goals.length > 0) {
      form.setValue(
        "performanceAssessments",
        goals.map((goal) => ({
          goalId: goal.id,
          notes: "",
          milestones: [],
        }))
      );
    }
  }, [initialData, goals, form.reset]);

  // Create or update session note
  const saveNoteMutation = useMutation({
    mutationFn: async (data: SessionNoteFormValues) => {
      if (initialData) {
        // Update existing note
        const noteResponse = await apiRequest("PUT", `/api/session-notes/${initialData.id}`, data.sessionNote);
        
        // Update or create performance assessments
        if (data.performanceAssessments) {
          await Promise.all(
            data.performanceAssessments.map(async (pa) => {
              const existingPa = initialData.performanceAssessments?.find(
                (existing: any) => existing.goalId === pa.goalId
              );
              
              if (existingPa) {
                return apiRequest("PUT", `/api/performance-assessments/${existingPa.id}`, pa);
              } else {
                const responseData = await apiRequest("POST", `/api/session-notes/${initialData.id}/performance`, pa);
                return responseData;
              }
            })
          );
        }
        
        return noteResponse;
      } else {
        // Create new note
        const noteResponse = await apiRequest("POST", `/api/sessions/${session.id}/notes`, data.sessionNote);
        const noteData = noteResponse as any;
        
        // Create performance assessments
        if (data.performanceAssessments) {
          await Promise.all(
            data.performanceAssessments.map((pa) =>
              apiRequest("POST", `/api/session-notes/${noteData.id}/performance`, pa)
            )
          );
        }
        
        return noteResponse;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "notes"] });
      toast({
        title: initialData ? "Note Updated" : "Note Created",
        description: "Session note has been saved successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save session note",
        variant: "destructive",
      });
    },
  });

  // Handle draft saving
  const saveAsDraft = async () => {
    setSavingDraft(true);
    try {
      const values = form.getValues();
      values.sessionNote.status = "draft";
      await saveNoteMutation.mutateAsync(values);
      setSavingDraft(false);
    } catch (error) {
      setSavingDraft(false);
    }
  };

  // Handle form submission
  const onSubmit = (data: SessionNoteFormValues) => {
    data.sessionNote.status = "completed";
    saveNoteMutation.mutate(data);
  };
  
  // Create a temporary ID for milestone items
  const getMilestoneId = (goalId: number, subgoalId: number) => {
    return parseInt(`${goalId}${subgoalId}`, 10);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Session Notes for {session.title}</DialogTitle>
          <DialogDescription>
            Client: {session.clientName} | Date: {new Date(session.sessionDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="general">General Observations</TabsTrigger>
                <TabsTrigger value="present">Present in Session</TabsTrigger>
                <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
              </TabsList>

              {/* General Observations Tab */}
              <TabsContent value="general" className="flex-grow overflow-auto p-2">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="sessionNote.notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Notes</FormLabel>
                        <FormDescription>
                          Record general observations about the session
                        </FormDescription>
                        <FormControl>
                          <RichTextEditor 
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Enter general notes about the session..."
                            className="rich-text-editor-container" 
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
                              value={field.value || 5}
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
                      name="sessionNote.physicalActivityRating"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RatingSlider
                              value={field.value || 5}
                              onChange={field.onChange}
                              label="Physical Activity"
                              description="Rate client's physical activity level"
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
                              value={field.value || 5}
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
                              value={field.value || 5}
                              onChange={field.onChange}
                              label="Cooperation"
                              description="Rate client's overall cooperation"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Present in Session Tab */}
              <TabsContent value="present" className="flex-grow overflow-auto p-2">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="sessionNote.presentAllies"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Present in Session</FormLabel>
                          <FormDescription>
                            Select who was present during this therapy session
                          </FormDescription>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {["Parent", "Guardian", "Sibling", "Aide", "Teacher", "Other Professional"].map((role) => (
                            <FormField
                              key={role}
                              control={form.control}
                              name="sessionNote.presentAllies"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={role}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(role)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, role])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== role
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-sm font-medium leading-none">
                                        {role}
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        
                        <div className="mt-6">
                          <FormLabel>Present Allies</FormLabel>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {allies.map((ally) => (
                              <FormField
                                key={ally.id}
                                control={form.control}
                                name="sessionNote.presentAllies"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={ally.id}
                                      className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(ally.name)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, ally.name])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== ally.name
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-medium leading-none">
                                          {ally.name}
                                        </FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                          {ally.relationship || "Relationship not specified"}
                                        </p>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Performance Assessment Tab */}
              <TabsContent value="performance" className="flex-grow overflow-hidden flex flex-col">
                <ScrollArea className="flex-grow">
                  <div className="space-y-6 p-2">
                    {goalsWithSubgoals.length > 0 ? (
                      goalsWithSubgoals.map((goal, goalIndex) => (
                        <Card key={goal.id} className="mb-6">
                          <CardHeader>
                            <CardTitle className="text-lg font-medium">{goal.title}</CardTitle>
                            <CardDescription>{goal.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <FormField
                              control={form.control}
                              name={`performanceAssessments.${goalIndex}.notes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Goal Progress Notes</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Enter notes about progress on this goal..."
                                      className="min-h-20" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Subgoals as Milestones */}
                            {goal.subgoals && goal.subgoals.length > 0 && (
                              <div className="mt-4 space-y-4">
                                <h4 className="text-sm font-medium">Milestone Assessment</h4>
                                
                                {goal.subgoals.map((subgoal, subgoalIndex) => {
                                  const milestoneId = getMilestoneId(goal.id, subgoal.id);
                                  
                                  // Initialize milestone if it doesn't exist
                                  const existingMilestones = form.getValues()?.performanceAssessments?.[goalIndex]?.milestones || [];
                                  const milestoneExists = existingMilestones.some(m => m.milestoneId === milestoneId);
                                  
                                  if (!milestoneExists) {
                                    const currentMilestones = [...existingMilestones];
                                    currentMilestones.push({
                                      milestoneId,
                                      rating: 5,
                                      strategies: [],
                                      notes: ""
                                    });
                                    
                                    form.setValue(
                                      `performanceAssessments.${goalIndex}.milestones`,
                                      currentMilestones
                                    );
                                  }
                                  
                                  const milestoneIndex = form.getValues()?.performanceAssessments?.[goalIndex]?.milestones?.findIndex(
                                    m => m.milestoneId === milestoneId
                                  ) || 0;
                                  
                                  return (
                                    <div key={subgoal.id} className="border rounded-md p-4">
                                      <h5 className="font-medium mb-2">{subgoal.title}</h5>
                                      <p className="text-sm text-muted-foreground mb-4">{subgoal.description}</p>
                                      
                                      <div className="grid grid-cols-1 gap-4">
                                        <FormField
                                          control={form.control}
                                          name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <RatingSlider
                                                  value={field.value || 5}
                                                  onChange={field.onChange}
                                                  label="Progress Rating"
                                                  description="Rate progress on this milestone"
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        
                                        <FormField
                                          control={form.control}
                                          name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.notes`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Notes</FormLabel>
                                              <FormControl>
                                                <Textarea 
                                                  {...field} 
                                                  placeholder="Notes about this milestone..."
                                                  className="min-h-16" 
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        
                                        <FormField
                                          control={form.control}
                                          name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.strategies`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <div className="mb-4">
                                                <FormLabel>Strategies Used</FormLabel>
                                                <FormDescription>
                                                  Select strategies used for this milestone
                                                </FormDescription>
                                              </div>
                                              
                                              <div className="grid grid-cols-2 gap-2">
                                                {["Visual Cues", "Verbal Prompting", "Physical Prompting", "Modeling", "Positive Reinforcement", "Token Economy"].map((strategy) => (
                                                  <FormField
                                                    key={strategy}
                                                    control={form.control}
                                                    name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.strategies`}
                                                    render={({ field }) => {
                                                      return (
                                                        <FormItem
                                                          key={strategy}
                                                          className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-2"
                                                        >
                                                          <FormControl>
                                                            <Checkbox
                                                              checked={field.value?.includes(strategy)}
                                                              onCheckedChange={(checked) => {
                                                                return checked
                                                                  ? field.onChange([...field.value, strategy])
                                                                  : field.onChange(
                                                                      field.value?.filter(
                                                                        (value) => value !== strategy
                                                                      )
                                                                    );
                                                              }}
                                                            />
                                                          </FormControl>
                                                          <div className="space-y-1 leading-none">
                                                            <FormLabel className="text-sm leading-none">
                                                              {strategy}
                                                            </FormLabel>
                                                          </div>
                                                        </FormItem>
                                                      );
                                                    }}
                                                  />
                                                ))}
                                              </div>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 border rounded-md">
                        <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <h4 className="text-lg font-medium mb-2">No Goals Found</h4>
                        <p className="text-muted-foreground mb-4">
                          Add goals for this client to track their performance
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex justify-between items-center pt-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveAsDraft}
                  disabled={saveNoteMutation.isPending || savingDraft}
                >
                  {savingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Draft
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveNoteMutation.isPending}>
                  {saveNoteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Note
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}