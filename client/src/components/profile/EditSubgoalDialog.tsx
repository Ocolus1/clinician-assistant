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
import { Subgoal, insertSubgoalSchema } from "@shared/schema";

// Create a schema for editing a subgoal
const editSubgoalSchema = insertSubgoalSchema
  .extend({
    status: z.enum(["pending", "in-progress", "completed"]).optional(),
  });

// Type based on the schema
type EditSubgoalFormValues = z.infer<typeof editSubgoalSchema>;

interface EditSubgoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subgoal: Subgoal;
}

export default function EditSubgoalDialog({
  open,
  onOpenChange,
  subgoal
}: EditSubgoalDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form with the subgoal's current values
  const form = useForm<EditSubgoalFormValues>({
    resolver: zodResolver(editSubgoalSchema),
    defaultValues: {
      title: subgoal.title,
      description: subgoal.description || "",
      status: (subgoal.status as "pending" | "in-progress" | "completed") || "pending",
    },
  });

  // Mutation for updating the subgoal
  const updateSubgoalMutation = useMutation({
    mutationFn: (data: EditSubgoalFormValues) => {
      return apiRequest('PUT', `/api/subgoals/${subgoal.id}`, data);
    },
    onSuccess: () => {
      // Close the dialog
      onOpenChange(false);
      
      // Show success toast
      toast({
        title: "Milestone updated",
        description: "The milestone has been successfully updated.",
      });
      
      // Invalidate relevant queries to refetch data
      // First invalidate the specific subgoals query
      queryClient.invalidateQueries({ queryKey: ['/api/goals', subgoal.goalId, 'subgoals'] });
      // Also invalidate the client goals query to ensure everything is updated
      queryClient.invalidateQueries({ queryKey: ['/api/clients', 'goals'] });
    },
    onError: (error) => {
      console.error("Error updating milestone:", error);
      toast({
        title: "Error",
        description: "There was an error updating the milestone. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditSubgoalFormValues) => {
    updateSubgoalMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Milestone</DialogTitle>
          <DialogDescription>
            Update the milestone details and progress status.
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
                    Track the progress of this milestone.
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
                disabled={updateSubgoalMutation.isPending}
              >
                {updateSubgoalMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}