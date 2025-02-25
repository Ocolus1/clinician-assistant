import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus } from "lucide-react";
import { insertGoalSchema, insertSubgoalSchema } from "@shared/schema";
import { apiRequest } from "@/lib/utils";

interface GoalsFormProps {
  clientId: number;
  onComplete: () => void;
}

export default function GoalsForm({ clientId, onComplete }: GoalsFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [showSubgoalForm, setShowSubgoalForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<number | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<any | null>(null);

  const goalForm = useForm({
    resolver: zodResolver(insertGoalSchema),
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
      toast({
        title: "Success",
        description: "Subgoal added successfully",
      });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: number) => {
      const res = await apiRequest("DELETE", `/api/goals/${goalId}`);
      return res.json();
    },
    onSuccess: () => {
      setShowDeleteDialog(false);
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
      setShowEditDialog(false);
      setGoalToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      toast({
        title: "Success",
        description: "Goal updated successfully",
      });
    },
  });

  const canAddMoreGoals = goals.length < 5;
  const canAddMoreSubgoals = subgoals.length < 5;

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
                          <div key={subgoal.id}>
                            <h5 className="font-medium text-sm">{subgoal.title}</h5>
                            <p className="text-xs text-muted-foreground">{subgoal.description}</p>
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
                        setShowEditDialog(true);
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
                        setShowDeleteDialog(true);
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
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGoalToEdit(goal);
                        setShowEditDialog(true);
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
                        setShowDeleteDialog(true);
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
                    <FormMessage />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
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
                      <FormMessage />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowSubgoalForm(false)}
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createSubgoal.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subgoal
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the goal and all its subgoals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (goalToDelete) {
                  deleteGoal.mutate(goalToDelete);
                }
              }}
            >
              {deleteGoal.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
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
                    <FormMessage />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={editGoal.isPending}
              >
                {editGoal.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

        <Button 
          className="w-full mt-6" 
          onClick={onComplete}
          variant="default"
        >
          Continue to Budget
        </Button>
      </div>
    </div>
  );
}