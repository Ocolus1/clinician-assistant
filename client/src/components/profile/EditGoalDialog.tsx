import React from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal, insertGoalSchema } from "@shared/schema";

// Create a schema for editing a goal
const editGoalSchema = insertGoalSchema
  .extend({
    // Add any additional validation if needed
  });

// Type based on the schema
type EditGoalFormValues = z.infer<typeof editGoalSchema>;

interface EditGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
}

export default function EditGoalDialog({
  open,
  onOpenChange,
  goal
}: EditGoalDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form with the goal's current values
  const form = useForm<EditGoalFormValues>({
    resolver: zodResolver(editGoalSchema),
    defaultValues: {
      title: goal.title,
      description: goal.description,
      priority: goal.priority || "Medium Priority",
    },
  });

  // Mutation for updating the goal
  const updateGoalMutation = useMutation({
    mutationFn: (data: EditGoalFormValues) => {
      return apiRequest('PUT', `/api/goals/${goal.id}`, data);
    },
    onSuccess: () => {
      // Close the dialog
      onOpenChange(false);
      
      // Show success toast
      toast({
        title: "Goal updated",
        description: "The goal has been successfully updated.",
      });
      
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/clients', goal.clientId, 'goals'] });
    },
    onError: (error) => {
      console.error("Error updating goal:", error);
      toast({
        title: "Error",
        description: "There was an error updating the goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditGoalFormValues) => {
    updateGoalMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
          <DialogDescription>
            Update the goal details and settings.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter goal title" {...field} />
                  </FormControl>
                  <FormDescription>
                    A clear, concise title for the therapeutic goal.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the goal in detail" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Provide details about what this goal aims to accomplish.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority Level</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="High Priority">High Priority</SelectItem>
                      <SelectItem value="Medium Priority">Medium Priority</SelectItem>
                      <SelectItem value="Low Priority">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Set the importance of this goal in the therapy plan.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateGoalMutation.isPending}
              >
                {updateGoalMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}