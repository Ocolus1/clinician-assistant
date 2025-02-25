import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const { toast } = useToast();
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [showSubgoalForm, setShowSubgoalForm] = useState(false);

  const goalForm = useForm({
    resolver: zodResolver(insertGoalSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: 1,
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
  });

  const createGoal = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/goals`, data);
      return res.json();
    },
    onSuccess: (data) => {
      goalForm.reset();
      setSelectedGoalId(data.id);
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
      toast({
        title: "Success",
        description: "Subgoal added successfully",
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
                  <div>
                    <h4 className="font-medium">{goal.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                    <div className="text-sm text-muted-foreground mt-2">
                      Priority: {goal.priority}
                    </div>
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
                    <FormLabel>Priority (1-5)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={5} 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
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

        {selectedGoalId && canAddMoreSubgoals && !showSubgoalForm && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowSubgoalForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Subgoal
          </Button>
        )}

        {showSubgoalForm && (
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
        )}

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