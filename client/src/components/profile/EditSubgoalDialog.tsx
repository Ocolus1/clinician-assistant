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
// Removed status field as it's not needed in the therapy context
const editSubgoalSchema = insertSubgoalSchema;

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
  // Removed status field as it's not needed in the therapy context
  const form = useForm<EditSubgoalFormValues>({
    resolver: zodResolver(editSubgoalSchema),
    defaultValues: {
      title: subgoal.title,
      description: subgoal.description || "",
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
        title: "Measurement Point updated",
        description: "The measurement point has been successfully updated.",
      });
      
      // Invalidate relevant queries to refetch data
      // First invalidate the specific subgoals query
      queryClient.invalidateQueries({ queryKey: ['/api/goals', subgoal.goalId, 'subgoals'] });
      // Also invalidate the client goals query to ensure everything is updated
      queryClient.invalidateQueries({ queryKey: ['/api/clients', 'goals'] });
    },
    onError: (error) => {
      console.error("Error updating measurement point:", error);
      toast({
        title: "Error",
        description: "There was an error updating the measurement point. Please try again.",
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
          <DialogTitle>Edit Measurement Point</DialogTitle>
          <DialogDescription>
            Update the measurement point details for progress tracking.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Measurement Point Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter measurement point title" {...field} />
                  </FormControl>
                  <FormDescription>
                    A clear, specific description of this measurement point.
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
                      placeholder="Describe the measurement point in detail" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Provide details about what this measurement point is tracking.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Status field removed as it's not needed in the therapy context */}
            
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