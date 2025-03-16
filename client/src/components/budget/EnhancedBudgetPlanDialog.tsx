import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription,
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { budgetPlanSchema } from "./BudgetFormSchema";
import { useBudgetFeature } from "./BudgetFeatureContext";
import { FUNDS_MANAGEMENT_OPTIONS } from "@shared/schema";
import type { BudgetPlanFormValues } from "./BudgetFormSchema";
import type { BudgetSettings } from "@shared/schema";

interface EnhancedBudgetPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
}

export function EnhancedBudgetPlanDialog({
  open,
  onOpenChange,
  clientId
}: EnhancedBudgetPlanDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  // Get context values
  const { 
    generatePlanCode, 
    selectedPlanId, 
    isEditMode,
    setIsEditMode
  } = useBudgetFeature();
  
  // Fetch budget plan data if in edit mode
  const { data: budgetPlan } = useQuery<BudgetSettings>({
    queryKey: ['/api/budget-settings', selectedPlanId],
    queryFn: async () => {
      if (!selectedPlanId) throw new Error("No plan selected");
      const response = await fetch(`/api/budget-settings/${selectedPlanId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch budget plan");
      }
      return response.json();
    },
    enabled: !!selectedPlanId && isEditMode && open,
  });
  
  // Initialize form with generated plan code for new plans
  const form = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      planCode: generatePlanCode(),
      ndisFunds: 0,
      endOfPlan: undefined,
      isActive: true,
      fundsManagement: "Self-Managed"
    }
  });
  
  // Update form when editing an existing plan
  useEffect(() => {
    if (isEditMode && budgetPlan) {
      // Set form values from the budget plan
      form.reset({
        planCode: budgetPlan.planCode || generatePlanCode(),
        ndisFunds: budgetPlan.ndisFunds,
        endOfPlan: budgetPlan.endOfPlan || undefined,
        isActive: budgetPlan.isActive !== null ? budgetPlan.isActive : true,
        fundsManagement: "Self-Managed" // Default since not in schema
      });
      
      // Set the date state for the date picker
      if (budgetPlan.endOfPlan) {
        setDate(new Date(budgetPlan.endOfPlan));
      }
    } else {
      // Reset form for new plan creation
      form.reset({
        planCode: generatePlanCode(),
        ndisFunds: 0,
        endOfPlan: undefined,
        isActive: true,
        fundsManagement: "Self-Managed"
      });
      
      // Reset date
      setDate(undefined);
    }
  }, [isEditMode, budgetPlan, form, generatePlanCode, open]);
  
  // Mutation for creating a new budget plan
  const createPlanMutation = useMutation({
    mutationFn: async (data: BudgetPlanFormValues) => {
      return apiRequest('POST', `/api/clients/${clientId}/budget-settings`, data);
    },
    onSuccess: () => {
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget/plans'] });
      
      // Show success message
      toast({
        title: "Success",
        description: "Budget plan has been created successfully.",
      });
      
      // Close the dialog and reset form
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error('Error creating budget plan:', error);
      toast({
        title: "Error",
        description: "Failed to create budget plan. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating an existing budget plan
  const updatePlanMutation = useMutation({
    mutationFn: async (data: BudgetPlanFormValues) => {
      if (!selectedPlanId) throw new Error("No plan selected");
      return apiRequest('PUT', `/api/budget-settings/${selectedPlanId}`, data);
    },
    onSuccess: () => {
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget-settings', selectedPlanId] });
      
      // Show success message
      toast({
        title: "Success",
        description: "Budget plan has been updated successfully.",
      });
      
      // Close the dialog and reset form
      onOpenChange(false);
      form.reset();
      setIsEditMode(false);
    },
    onError: (error) => {
      console.error('Error updating budget plan:', error);
      toast({
        title: "Error",
        description: "Failed to update budget plan. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = (data: BudgetPlanFormValues) => {
    // Format the date properly if present
    if (date) {
      data.endOfPlan = format(date, 'yyyy-MM-dd');
    }
    
    // Submit either to create or update based on isEditMode
    if (isEditMode && selectedPlanId) {
      updatePlanMutation.mutate(data);
    } else {
      createPlanMutation.mutate(data);
    }
  };
  
  // Handle dialog close - reset edit mode
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setIsEditMode(false);
    }
    onOpenChange(isOpen);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Budget Plan" : "Create New Budget Plan"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Modify the details of the existing budget plan."
              : "Create a new budget plan with unique plan code and funding details."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Plan Code */}
              <FormField
                control={form.control}
                name="planCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., BP-2025-ABC1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* NDIS Funds */}
              <FormField
                control={form.control}
                name="ndisFunds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NDIS Funds</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* End of Plan Date */}
              <FormField
                control={form.control}
                name="endOfPlan"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End of Plan Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Funds Management */}
              <FormField
                control={form.control}
                name="fundsManagement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funds Management</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type of funds management" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FUNDS_MANAGEMENT_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Active Status - Only show in edit mode */}
              {isEditMode && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active Plan</FormLabel>
                        <FormDescription>
                          Mark this plan as active or inactive
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
              >
                {createPlanMutation.isPending || updatePlanMutation.isPending
                  ? "Saving..."
                  : isEditMode ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}