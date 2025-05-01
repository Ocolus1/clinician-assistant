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
import { z } from "zod";
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
  clientId: number; // Keeping this for backward compatibility
  patientId?: number; // Adding this for new code
  onComplete: () => void;
  onPrevious: () => void;
}

export default function GoalsForm({ clientId, patientId, onComplete, onPrevious }: GoalsFormProps) {
  // Use patientId if provided, otherwise fall back to clientId for backward compatibility
  const effectivePatientId = patientId || clientId;
  
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
  
  // Enhanced subgoal form schema with required fields and 100-character limit
  const enhancedSubgoalSchema = insertSubgoalSchema.extend({
    title: z.string().min(1, "Subgoal title is required"),
    description: z.string()
      .min(1, "Description is required")
      .max(100, "Description must be 100 characters or less"),
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
    resolver: zodResolver(enhancedSubgoalSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["/api/patients", effectivePatientId, "goals"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/patients/${effectivePatientId}/goals`);
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
      const res = await apiRequest("POST", `/api/patients/${effectivePatientId}/goals`, data);
      return res.json();
    },
    onSuccess: (data) => {
      goalForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/patients", effectivePatientId, "goals"] });
      toast({
        title: "Success",
        description: "Goal added successfully",
      });
    },
  });

  const createSubgoal = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/goals/${selectedGoalId}/subgoals`, {
        ...data,
        goalId: selectedGoalId,
      });
      return res.json();
    },
    onSuccess: () => {
      subgoalForm.reset();
      setShowSubgoalForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/goals", selectedGoalId, "subgoals"] });
      // Also update the goals list to get the updated subgoal count
      queryClient.invalidateQueries({ queryKey: ["/api/patients", effectivePatientId, "goals"] });
      toast({
        title: "Success",
        description: "Subgoal added successfully",
      });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: number) => {
      await apiRequest("DELETE", `/api/goals/${goalId}`);
    },
    onSuccess: () => {
      setShowGoalDeleteDialog(false);
      setGoalToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/patients", effectivePatientId, "goals"] });
      toast({
        title: "Success",
        description: "Goal deleted successfully",
      });
    },
  });

  const editGoal = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PUT", `/api/goals/${id}`, data);
    },
    onSuccess: () => {
      setShowGoalEditDialog(false);
      setGoalToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["/api/patients", effectivePatientId, "goals"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/goals", selectedGoalId, "subgoals"] });
      // Also update the goals list to get the updated subgoal count
      queryClient.invalidateQueries({ queryKey: ["/api/patients", effectivePatientId, "goals"] });
      toast({
        title: "Success",
        description: "Subgoal deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error in deleteSubgoal mutation:", error);
      toast({
        title: "Error",
        description: "Failed to delete subgoal",
        variant: "destructive",
      });
    },
  });

  const editSubgoal = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PUT", `/api/subgoals/${id}`, data);
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

  // Reset subgoal form when selectedGoalId changes
  useEffect(() => {
    subgoalForm.reset();
    setShowSubgoalForm(false);
  }, [selectedGoalId, subgoalForm]);

  // Reset edit forms when dialogs close
  useEffect(() => {
    if (!showGoalEditDialog) {
      goalForm.reset();
    }
    if (!showSubgoalEditDialog) {
      subgoalForm.reset();
    }
  }, [showGoalEditDialog, showSubgoalEditDialog, goalForm, subgoalForm]);

  // Set form values when editing
  useEffect(() => {
    if (goalToEdit) {
      goalForm.reset(goalToEdit);
    }
    if (subgoalToEdit) {
      subgoalForm.reset(subgoalToEdit);
    }
  }, [goalToEdit, subgoalToEdit, goalForm, subgoalForm]);

  // Check if all goals have at least one subgoal
  const checkSubgoals = () => {
    const goalsWithoutSubgoals = goals.filter((goal: Goal) => goal.subgoalCount === 0);
    return goalsWithoutSubgoals.length === 0;
  };

  // Validation for proceeding to the next step
  const canProceed = goals.length > 0 && checkSubgoals();
  const validationMessage = goals.length === 0 
    ? "Please add at least one goal before proceeding." 
    : !checkSubgoals()
      ? "All goals must have at least one subgoal. Please add subgoals to all goals."
      : "All requirements met. You can proceed to the next step.";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Therapeutic Goals</h2>
      <p className="text-gray-500 mb-6">
        Set therapeutic goals and subgoals for the patient. Each goal should have at least one subgoal.
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Goals</h3>
          <Form {...goalForm}>
            <form onSubmit={goalForm.handleSubmit((data) => createGoal.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={goalForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter goal title" />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />

                <FormField
                  control={goalForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Select priority</option>
                          <option value="High Priority">High Priority</option>
                          <option value="Medium Priority">Medium Priority</option>
                          <option value="Low Priority">Low Priority</option>
                        </select>
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={goalForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter goal description"
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

              <Button 
                type="submit" 
                className="w-full"
                disabled={createGoal.isPending}
              >
                {createGoal.isPending ? "Adding..." : "Add Goal"}
              </Button>
            </form>
          </Form>
        </div>

        {goals.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Manage Goals and Subgoals</h3>
            <div className="space-y-4">
              {goals.map((goal: Goal) => (
                <Card key={goal.id} className={`border ${selectedGoalId === goal.id ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{goal.title}</h4>
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                        <div className="flex items-center mt-1">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                            {goal.priority}
                          </span>
                          <span className="text-xs ml-2">
                            {goal.subgoalCount} subgoal{goal.subgoalCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setGoalToEdit(goal);
                            setShowGoalEditDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setGoalToDelete(goal.id);
                            setShowGoalDeleteDialog(true);
                          }}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button
                        variant={selectedGoalId === goal.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedGoalId(selectedGoalId === goal.id ? null : goal.id)}
                      >
                        {selectedGoalId === goal.id ? "Hide Subgoals" : "Manage Subgoals"}
                      </Button>
                    </div>

                    {selectedGoalId === goal.id && (
                      <div className="mt-4 pl-4 border-l-2 border-gray-200">
                        <div className="mb-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowSubgoalForm(!showSubgoalForm)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {showSubgoalForm ? "Cancel" : "Add Subgoal"}
                          </Button>
                        </div>

                        {showSubgoalForm && (
                          <div className="mb-4 p-4 border rounded-md bg-gray-50">
                            <Form {...subgoalForm}>
                              <form onSubmit={subgoalForm.handleSubmit((data) => createSubgoal.mutate(data))} className="space-y-4">
                                <FormField
                                  control={subgoalForm.control}
                                  name="title"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Subgoal Title</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Enter subgoal title" />
                                      </FormControl>
                                      <FormMessageHidden />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={subgoalForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          {...field} 
                                          placeholder="Enter subgoal description"
                                          onChange={(e) => {
                                            field.onChange(e);
                                            // Re-validate on change to show character limit message if needed
                                            subgoalForm.trigger("description");
                                          }}
                                          maxLength={100}
                                        />
                                      </FormControl>
                                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <FormMessage />
                                        <div>{field.value?.length || 0}/100 characters</div>
                                      </div>
                                    </FormItem>
                                  )}
                                />

                                <div className="flex justify-end">
                                  <Button 
                                    type="submit" 
                                    size="sm"
                                    disabled={createSubgoal.isPending}
                                  >
                                    {createSubgoal.isPending ? "Adding..." : "Add Subgoal"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </div>
                        )}

                        {subgoals.length > 0 ? (
                          <div className="space-y-2">
                            {subgoals.map((subgoal: any) => (
                              <div key={subgoal.id} className="p-3 border rounded-md bg-white flex justify-between items-start">
                                <div>
                                  <h5 className="font-medium text-sm">{subgoal.title}</h5>
                                  <p className="text-xs text-muted-foreground">{subgoal.description}</p>
                                </div>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSubgoalToEdit(subgoal);
                                      setShowSubgoalEditDialog(true);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSubgoalToDelete(subgoal.id);
                                      setShowSubgoalDeleteDialog(true);
                                    }}
                                  >
                                    <Trash className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No subgoals added yet.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Delete Goal Dialog */}
        <Dialog open={showGoalDeleteDialog} onOpenChange={setShowGoalDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Goal</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete this goal? This will also delete all associated subgoals.</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowGoalDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => goalToDelete && deleteGoal.mutate(goalToDelete)}
                disabled={deleteGoal.isPending}
              >
                {deleteGoal.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Subgoal Dialog */}
        <Dialog open={showSubgoalDeleteDialog} onOpenChange={setShowSubgoalDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Subgoal</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete this subgoal?</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowSubgoalDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => subgoalToDelete && deleteSubgoal.mutate(subgoalToDelete)}
                disabled={deleteSubgoal.isPending}
              >
                {deleteSubgoal.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Goal Dialog */}
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
                          {...field}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Select priority</option>
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
                    Save Changes
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
                        <Textarea 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            // Re-validate on change to show character limit message if needed
                            subgoalForm.trigger("description");
                          }}
                          maxLength={100}
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <FormMessage />
                        <div>{field.value?.length || 0}/100 characters</div>
                      </div>
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
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <div className="space-y-4 mt-6">
          {validationMessage && (
            <Alert variant={canProceed ? "default" : "destructive"}>
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>Validation</AlertTitle>
              <AlertDescription>
                {validationMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 mt-4 justify-end">
            <Button onClick={onPrevious} variant="outline">
              Previous
            </Button>
            <Button 
              onClick={onComplete} 
              disabled={!canProceed}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
