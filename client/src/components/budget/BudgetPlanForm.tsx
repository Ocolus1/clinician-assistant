import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BudgetPlan } from "./BudgetFeatureContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BudgetPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  initialData?: Partial<BudgetPlan>; // For editing existing plan
  onSuccess?: () => void;
}

// Budget plan form schema with validation
const budgetPlanFormSchema = z.object({
  planSerialNumber: z.string().min(1, { message: "Plan name is required" }),
  planCode: z.string().optional(),
  availableFunds: z.coerce.number().min(0, { message: "Available funds must be a positive number" }),
  endOfPlan: z.date().optional(),
  isActive: z.boolean().default(false),
});

type BudgetPlanFormValues = z.infer<typeof budgetPlanFormSchema>;

/**
 * Form component for creating and editing budget plans
 */
export function BudgetPlanForm({ 
  open, 
  onOpenChange, 
  clientId, 
  initialData, 
  onSuccess 
}: BudgetPlanFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  // Initialize form with default values or existing plan data
  const form = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanFormSchema),
    defaultValues: {
      planSerialNumber: initialData?.planName || "",
      planCode: initialData?.planCode || "",
      availableFunds: initialData?.availableFunds || 0,
      endOfPlan: initialData?.endDate ? new Date(initialData.endDate) : undefined,
      isActive: initialData?.isActive || false,
    },
  });
  
  // Mutation for creating a new budget plan
  const createBudgetPlan = useMutation({
    mutationFn: async (data: BudgetPlanFormValues) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/budget-settings`, {
        ...data,
        clientId
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create budget plan");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      
      // Show success message
      toast({
        title: "Budget Plan Created",
        description: "New budget plan has been created successfully.",
      });
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      console.error("Error creating budget plan:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create budget plan. Please try again.",
      });
    },
  });
  
  // Mutation for updating an existing budget plan
  const updateBudgetPlan = useMutation({
    mutationFn: async (data: BudgetPlanFormValues) => {
      if (!initialData?.id) {
        throw new Error("Plan ID is required for updates");
      }
      
      const response = await apiRequest("PUT", `/api/clients/${clientId}/budget-settings/${initialData.id}`, {
        ...data,
        clientId
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update budget plan");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      
      // Show success message
      toast({
        title: "Budget Plan Updated",
        description: "Budget plan has been updated successfully.",
      });
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      console.error("Error updating budget plan:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update budget plan. Please try again.",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: BudgetPlanFormValues) => {
    if (initialData?.id) {
      // Update existing plan
      updateBudgetPlan.mutate(data);
    } else {
      // Create new plan
      createBudgetPlan.mutate(data);
    }
  };
  
  const isSubmitting = createBudgetPlan.isPending || updateBudgetPlan.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? "Edit Budget Plan" : "Create New Budget Plan"}
          </DialogTitle>
          <DialogDescription>
            {initialData?.id 
              ? "Update the details of this budget plan" 
              : "Set up a new budget plan for this client"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="planSerialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter a name for this budget plan"
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name to identify this budget plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="planCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Code or Reference Number</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ""}
                      placeholder="Enter a reference code (optional)"
                    />
                  </FormControl>
                  <FormDescription>
                    An optional code or reference number for this plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="availableFunds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Funds <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormDescription>
                    The total funds available for this budget plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endOfPlan"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>No end date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setEndDateOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Optional end date for this budget plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Plan</FormLabel>
                    <FormDescription>
                      Make this the active budget plan for this client
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialData?.id ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}