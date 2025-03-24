import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, 
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGoalSchema, insertSubgoalSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { apiRequest } from "@/lib/queryClient";
import { Goal } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash } from "lucide-react";

// Helper component to hide form messages but maintain spacing
function FormMessageHidden() {
  return <div className="min-h-[20px]"></div>;
}

interface GoalsFormProps {
  clientId: number;
  onComplete: () => void;
  onPrevious: () => void;
}

export default function GoalsForm({ clientId, onComplete, onPrevious }: GoalsFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [showSubgoalForm, setShowSubgoalForm] = useState(false);
  const [showGoalDeleteDialog, setShowGoalDeleteDialog] = useState(false);
  const [showSubgoalDeleteDialog, setShowSubgoalDeleteDialog] = useState(false);
  const [showGoalEditDialog, setShowGoalEditDialog] = useState(false);
  const [showSubgoalEditDialog, setShowSubgoalEditDialog] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<number | null>(null);
  const [subgoalToDelete, setSubgoalToDelete] = useState<number | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<any | null>(null);
  const [subgoalToEdit, setSubgoalToEdit] = useState<any | null>(null);


  // Enhanced goal form schema with required fields and character limits
  const enhancedGoalSchema = insertGoalSchema.extend({
    title: z.string().min(1, "Goal title is required"),
    description: z.string()
      .min(1, "Description is required")
      .max(200, "Description must be 200 characters or less"),
    priority: z.string().min(1, "Priority is required"),
  });

  const goalForm = useForm({
    resolver: zodResolver(enhancedGoalSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium Priority",
    },
  });

  const subgoalForm = useForm({
    resolver: zodResolver(insertSubgoalSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["/api/clients", clientId, "goals"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/clients/${clientId}/goals`);
      return res.json();
    }
  });

  const { data: subgoals = [] } = useQuery({
    queryKey: ["/api/goals", selectedGoalId, "subgoals"],
    enabled: !!selectedGoalId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/goals/${selectedGoalId}/subgoals`);
      return res.json();
    }
  });

  const createGoal = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/goals`, data);
      return res.json();
    },
    onSuccess: (data) => {
      goalForm.reset();
      setSelectedGoalId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      toast({
        title: "Success",
        description: "Goal added successfully",
      });
    },
  });

  const createSubgoal = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedGoalId) return;
      const res = await apiRequest("POST", `/api/goals/${selectedGoalId}/subgoals`, data);
      return res.json();
    },
    onSuccess: () => {
      subgoalForm.reset();
      setShowSubgoalForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/goals", selectedGoalId, "subgoals"] });
      
      // Force refresh all goals' subgoals for validation
      goals.forEach((goal: Goal) => {
        queryClient.invalidateQueries({ queryKey: ["/api/goals", goal.id, "subgoals"] });
      });
      
      toast({
        title: "Success",
        description: "Milestone added successfully",
      });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: number) => {
      const res = await apiRequest("DELETE", `/api/goals/${goalId}`);
      return res.json();
    },
    onSuccess: () => {
      setShowGoalDeleteDialog(false);
      setGoalToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      toast({
        title: "Success",
        description: "Goal deleted successfully",
      });
    },
  });

  const editGoal = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/goals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setShowGoalEditDialog(false);
      setGoalToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      toast({
        title: "Success",
        description: "Goal updated successfully",
      });
    },
  });

  const deleteSubgoal = useMutation({
    mutationFn: async (subgoalId: number) => {
      try {
        const res = await apiRequest("DELETE", `/api/subgoals/${subgoalId}`);
        return res.json();
      } catch (error) {
        console.error("Error deleting subgoal:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setShowSubgoalDeleteDialog(false);
      setSubgoalToDelete(null);
      if (selectedGoalId) {
        queryClient.invalidateQueries({ queryKey: ["/api/goals", selectedGoalId, "subgoals"] });
      }
      toast({
        title: "Success",
        description: "Milestone deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: "Failed to delete milestone. Please try again.",
        variant: "destructive",
      });
      setShowSubgoalDeleteDialog(false);
      setSubgoalToDelete(null);
    },
  });

  const editSubgoal = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/subgoals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setShowSubgoalEditDialog(false);
      setSubgoalToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["/api/goals", selectedGoalId, "subgoals"] });
      toast({
        title: "Success",
        description: "Subgoal updated successfully",
      });
    },
  });

  const canAddMoreGoals = goals.length < 5;
  const canAddMoreSubgoals = subgoals.length < 5;
  
  // State to track whether we can proceed to the next step
  const [canProceed, setCanProceed] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  
  // Check if we have at least one goal with at least one milestone
  useEffect(() => {
    if (goals.length === 0) {
      setCanProceed(false);
      setValidationMessage("You need to add at least one goal before proceeding");
      return;
    }
    
    // Fetch all subgoals for all goals
    const checkSubgoals = async () => {
      console.log("Validating goals and milestones...");
      let hasAnySubgoals = false;
      
      // Check each goal for subgoals
      for (const goal of goals) {
        try {
          // Force a fresh fetch to ensure we have the latest data
          const res = await apiRequest("GET", `/api/goals/${goal.id}/subgoals`);
          const subgoalData = await res.json();
          
          // Update the cache
          queryClient.setQueryData(["/api/goals", goal.id, "subgoals"], subgoalData);
          
          // Check if this goal has any subgoals
          if (Array.isArray(subgoalData) && subgoalData.length > 0) {
            console.log(`Goal ${goal.id} has ${subgoalData.length} milestones`);
            hasAnySubgoals = true;
            break; // We found at least one goal with subgoals, that's enough
          }
        } catch (error) {
          console.error("Error checking subgoals for goal", goal.id, error);
        }
      }
      
      if (!hasAnySubgoals) {
        console.log("No goals with milestones found - cannot proceed");
        setCanProceed(false);
        setValidationMessage("You need to add at least one milestone (subgoal) to a goal before proceeding");
      } else {
        console.log("Found goals with milestones - can proceed");
        setCanProceed(true);
        setValidationMessage("");
      }
    };
    
    checkSubgoals();
  }, [
    goals, 
    // Re-run this effect when any of these mutations complete
    createSubgoal.isSuccess, 
    deleteSubgoal.isSuccess, 
    editSubgoal.isSuccess,
    deleteGoal.isSuccess
  ]);

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Goals ({goals.length}/5)</h3>
        <div className="space-y-4">
          {goals.map((goal: any) => (
            <Card 
              key={goal.id} 
              className={`cursor-pointer ${selectedGoalId === goal.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedGoalId(goal.id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{goal.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                    <div className="text-sm text-muted-foreground mt-2">
                      Priority: {goal.priority}
                    </div>
                    {subgoals.length > 0 && selectedGoalId === goal.id && (
                      <div className="mt-4 space-y-2 pl-4 border-l-2 border-muted">
                        {subgoals.map((subgoal: any) => (
                          <div key={subgoal.id} className="group relative">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium text-sm">{subgoal.title}</h5>
                                <p className="text-xs text-muted-foreground">{subgoal.description}</p>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSubgoalToEdit(subgoal);
                                    subgoalForm.reset({
                                      title: subgoal.title,
                                      description: subgoal.description,
                                    });
                                    setShowSubgoalEditDialog(true);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSubgoalToDelete(subgoal.id);
                                    setShowSubgoalDeleteDialog(true);
                                  }}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGoalToEdit(goal);
                        goalForm.reset({
                          title: goal.title,
                          description: goal.description,
                          priority: goal.priority
                        });
                        setShowGoalEditDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGoalToDelete(goal.id);
                        setShowGoalDeleteDialog(true);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                    {selectedGoalId === goal.id && canAddMoreSubgoals && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSubgoalForm(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {canAddMoreGoals && !showSubgoalForm && (
          <Form {...goalForm}>
            <form onSubmit={goalForm.handleSubmit((data) => createGoal.mutate(data))}>
              <FormField
                control={goalForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Goal Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <FormField
                control={goalForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          // Re-validate on change to show character limit message if needed
                          goalForm.trigger("description");
                        }}
                        maxLength={200}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <FormMessage />
                      <div>{field.value?.length || 0}/200 characters</div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={goalForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <select 
                        className="w-full p-2 border rounded-md"
                        {...field}
                      >
                        <option value="High Priority">High Priority</option>
                        <option value="Medium Priority">Medium Priority</option>
                        <option value="Low Priority">Low Priority</option>
                      </select>
                    </FormControl>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                variant="secondary"
                disabled={createGoal.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </form>
          </Form>
        )}



        <Dialog open={showSubgoalForm} onOpenChange={setShowSubgoalForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subgoal</DialogTitle>
            </DialogHeader>
            <Form {...subgoalForm}>
              <form onSubmit={subgoalForm.handleSubmit((data) => createSubgoal.mutate(data))}>
                <FormField
                  control={subgoalForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Subgoal Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />

                <FormField
                  control={subgoalForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowSubgoalForm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="ml-auto"
                    disabled={createSubgoal.isPending}
                  >
                    Add Subgoal
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={showGoalDeleteDialog} onOpenChange={setShowGoalDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Goal</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Are you sure you want to delete this goal? This action cannot be undone.
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowGoalDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="ml-auto"
                onClick={() => {
                  if (goalToDelete) {
                    deleteGoal.mutate(goalToDelete);
                  }
                }}
                disabled={deleteGoal.isPending}
              >
                Delete Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSubgoalDeleteDialog} onOpenChange={setShowSubgoalDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Subgoal</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Are you sure you want to delete this subgoal? This action cannot be undone.
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowSubgoalDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="ml-auto"
                onClick={() => {
                  if (subgoalToDelete) {
                    deleteSubgoal.mutate(subgoalToDelete);
                  }
                }}
                disabled={deleteSubgoal.isPending}
              >
                Delete Subgoal
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showGoalEditDialog} onOpenChange={setShowGoalEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
            </DialogHeader>
            <Form {...goalForm}>
              <form onSubmit={goalForm.handleSubmit((data) => {
                if (goalToEdit) {
                  editGoal.mutate({ id: goalToEdit.id, data });
                }
              })}>
                <FormField
                  control={goalForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Goal Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />

                <FormField
                  control={goalForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            // Re-validate on change to show character limit message if needed
                            goalForm.trigger("description");
                          }}
                          maxLength={200}
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <FormMessage />
                        <div>{field.value?.length || 0}/200 characters</div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={goalForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <select 
                          className="w-full p-2 border rounded-md"
                          {...field}
                        >
                          <option value="High Priority">High Priority</option>
                          <option value="Medium Priority">Medium Priority</option>
                          <option value="Low Priority">Low Priority</option>
                        </select>
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowGoalEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="ml-auto"
                    disabled={editGoal.isPending}
                  >
                    Update Goal
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={showSubgoalEditDialog} onOpenChange={setShowSubgoalEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subgoal</DialogTitle>
            </DialogHeader>
            <Form {...subgoalForm}>
              <form onSubmit={subgoalForm.handleSubmit((data) => {
                if (subgoalToEdit) {
                  editSubgoal.mutate({ id: subgoalToEdit.id, data });
                }
              })}>
                <FormField
                  control={subgoalForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Subgoal Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />

                <FormField
                  control={subgoalForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowSubgoalEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="ml-auto"
                    disabled={editSubgoal.isPending}
                  >
                    Update Subgoal
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="col-span-2 flex justify-between">
        <Button onClick={onPrevious}>Previous</Button>
        <Button 
          onClick={onComplete}
          disabled={!canProceed}
        >
          Next
        </Button>
      </div>

      {!canProceed && validationMessage && (
        <div className="col-span-2">
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Required</AlertTitle>
            <AlertDescription>
              {validationMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}