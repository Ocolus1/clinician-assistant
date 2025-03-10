
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import { Button } from "../ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "../ui/form";
import {
  Input,
  Checkbox,
  Alert,
  AlertCircle
} from "../ui/index";
import { 
  Calendar,
  DollarSign,
  Save,
  InfoIcon,
  X
} from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BudgetPlan, BudgetSettings } from "../../types";

// Create schema for the form
const budgetPlanSchema = z.object({
  planCode: z.string().optional(),
  planSerialNumber: z.string().min(4, { message: "Plan ID must be at least 4 characters" }),
  availableFunds: z.coerce.number().min(0.01, { message: "Available funds must be greater than 0" }),
  endOfPlan: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof budgetPlanSchema>;

interface BudgetPlanCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => void;
  isLoading?: boolean;
  existingPlans: BudgetSettings[];
  hasActivePlan: boolean;
}

export function BudgetPlanCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  existingPlans,
  hasActivePlan
}: BudgetPlanCreateDialogProps) {
  // Generate a unique default serial number
  const generateSerialNumber = () => {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BP-${datePart}-${randomPart}`;
  };
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      planCode: '',
      planSerialNumber: generateSerialNumber(),
      availableFunds: 0,
      endOfPlan: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
      isActive: true,
    },
  });
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        planCode: '',
        planSerialNumber: generateSerialNumber(),
        availableFunds: 0,
        endOfPlan: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
        isActive: !hasActivePlan, // Default to inactive if there's already an active plan
      });
    }
  }, [open, form, hasActivePlan]);
  
  // Handle form submission
  const handleSubmit = (values: FormValues) => {
    // If trying to create an active plan when one already exists
    if (values.isActive && hasActivePlan) {
      // Show error
      form.setError("isActive", { 
        type: "manual", 
        message: "An active plan already exists. Please deactivate it first." 
      });
      return;
    }
    
    onSubmit(values);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Budget Plan</DialogTitle>
          <DialogDescription>
            Create a new budget plan to track funding and expenses
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Warnings if there's an active plan */}
            {hasActivePlan && (
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <InfoIcon className="h-4 w-4" />
                <span>
                  An active plan already exists. New plans will be created as inactive by default.
                </span>
              </Alert>
            )}
            
            {/* Plan code */}
            <FormField
              control={form.control}
              name="planCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NDIS-2023" {...field} />
                  </FormControl>
                  <FormDescription>
                    A user-friendly identifier for this plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Plan serial number */}
            <FormField
              control={form.control}
              name="planSerialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique identifier for this plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Available funds */}
            <FormField
              control={form.control}
              name="availableFunds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Funds</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        className="pl-8" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Total budget allocation for this plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* End of plan date */}
            <FormField
              control={form.control}
              name="endOfPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input 
                        type="date" 
                        className="pl-8" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    When this plan expires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Active status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={hasActivePlan}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Set as active plan
                    </FormLabel>
                    <FormDescription>
                      {hasActivePlan 
                        ? "Deactivate the current active plan first" 
                        : "This plan will be used for new expenses"}
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
