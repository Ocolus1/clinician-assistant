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
import { insertGoalSchema } from "@shared/schema";

// Create a schema for adding a new goal
const newGoalSchema = insertGoalSchema;

// Type based on the schema
type NewGoalFormValues = z.infer<typeof newGoalSchema>;

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
}

export default function AddGoalDialog({
  open,
  onOpenChange,
  clientId
}: AddGoalDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form
  const form = useForm<NewGoalFormValues>({
    resolver: zodResolver(newGoalSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium Priority",
    },
  });

  // Mutation for creating a new goal
  const createGoalMutation = useMutation({
    mutationFn: (data: NewGoalFormValues) => {
      return apiRequest('POST', `/api/clients/${clientId}/goals`, data);
    },
    onSuccess: () => {
      // Reset form
      form.reset();
      
      // Close the dialog
      onOpenChange(false);
      
      // Show success toast
      toast({
        title: "Goal created",
        description: "The goal has been successfully created.",
      });
      
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'goals'] });
    },
    onError: (error) => {
      console.error("Error creating goal:", error);
      toast({
        title: "Error",
        description: "There was an error creating the goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewGoalFormValues) => {
    createGoalMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Goal</DialogTitle>
          <DialogDescription>
            Create a new therapeutic goal for this client.
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
                disabled={createGoalMutation.isPending}
              >
                {createGoalMutation.isPending ? "Adding..." : "Add Goal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}