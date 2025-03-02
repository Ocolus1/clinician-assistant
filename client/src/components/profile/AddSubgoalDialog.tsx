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
import { insertSubgoalSchema } from "@shared/schema";

// Create a schema for adding a new subgoal
const newSubgoalSchema = insertSubgoalSchema
  .extend({
    status: z.enum(["pending", "in-progress", "completed"]).optional().default("pending"),
  });

// Type based on the schema
type NewSubgoalFormValues = z.infer<typeof newSubgoalSchema>;

interface AddSubgoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: number;
  goalTitle: string;
}

export default function AddSubgoalDialog({
  open,
  onOpenChange,
  goalId,
  goalTitle
}: AddSubgoalDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form
  const form = useForm<NewSubgoalFormValues>({
    resolver: zodResolver(newSubgoalSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
    },
  });

  // Mutation for creating a new subgoal
  const createSubgoalMutation = useMutation({
    mutationFn: (data: NewSubgoalFormValues) => {
      return apiRequest('POST', `/api/goals/${goalId}/subgoals`, data);
    },
    onSuccess: () => {
      // Reset form
      form.reset();
      
      // Close the dialog
      onOpenChange(false);
      
      // Show success toast
      toast({
        title: "Milestone created",
        description: "The milestone has been successfully created.",
      });
      
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/goals', goalId, 'subgoals'] });
    },
    onError: (error) => {
      console.error("Error creating milestone:", error);
      toast({
        title: "Error",
        description: "There was an error creating the milestone. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewSubgoalFormValues) => {
    createSubgoalMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Milestone</DialogTitle>
          <DialogDescription>
            Create a new milestone for the goal: {goalTitle}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Milestone Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter milestone title" {...field} />
                  </FormControl>
                  <FormDescription>
                    A clear, specific description of this milestone.
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
                      placeholder="Describe the milestone in detail" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Provide details about what this milestone represents.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Not Started</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Initial status of this milestone.
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
                disabled={createSubgoalMutation.isPending}
              >
                {createSubgoalMutation.isPending ? "Adding..." : "Add Milestone"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}