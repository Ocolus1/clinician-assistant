import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useBudgetFeature } from "./BudgetFeatureContext";
import type { BudgetPlan } from "./BudgetFeatureContext";

// Define the form schema
const editPlanSchema = z.object({
  planName: z.string().min(1, "Plan name is required").max(100),
  planCode: z.string().min(1, "Plan code is required").max(50),
  availableFunds: z.coerce
    .number()
    .min(0, "Available funds must be greater than 0")
    .refine((val) => !isNaN(val), {
      message: "Available funds must be a valid number",
    }),
  endDate: z.date().optional(),
  isActive: z.boolean(),
});

type EditPlanFormValues = z.infer<typeof editPlanSchema>;

// Props for the edit dialog
interface BudgetPlanEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BudgetPlan;
}

export function BudgetPlanEditDialog({ 
  open, 
  onOpenChange, 
  plan 
}: BudgetPlanEditDialogProps) {
  const { toast } = useToast();
  const { updatePlan, activeBudgetPlan } = useBudgetFeature();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with current plan values
  const form = useForm<EditPlanFormValues>({
    resolver: zodResolver(editPlanSchema),
    defaultValues: {
      planName: plan.planName,
      planCode: plan.planCode || "",
      availableFunds: plan.availableFunds,
      endDate: plan.endDate ? new Date(plan.endDate) : undefined,
      isActive: plan.isActive === true,
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: EditPlanFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Map form values to the budget plan structure
      const updatedPlan = {
        planName: values.planName,
        planCode: values.planCode,
        availableFunds: values.availableFunds,
        endDate: values.endDate ? values.endDate.toISOString() : null,
        isActive: values.isActive,
      };
      
      // Update the plan
      await updatePlan(plan.id, updatedPlan);
      
      // Show success toast
      toast({
        title: "Budget Plan Updated",
        description: `Successfully updated ${values.planName}`,
      });
      
      // Close the dialog
      onOpenChange(false);
    } catch (error: any) {
      // Show error toast
      toast({
        title: "Error Updating Budget Plan",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if there's an active plan that would be deactivated
  const willDeactivateActive = form.watch("isActive") && !!activeBudgetPlan && activeBudgetPlan.id !== plan.id;
  
  // Current active status for warning message
  const isCurrentlyActive = plan.isActive === true;
  const willDeactivate = isCurrentlyActive && !form.watch("isActive");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Budget Plan</DialogTitle>
          <DialogDescription>
            Update the details for {plan.planName}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="planName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this budget plan
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
                  <FormLabel>Plan Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique code for identifying this plan
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
                  <FormLabel>Available Funds</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="pl-7" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    The total amount of funds available for this plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When this budget plan expires (optional)
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
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      {willDeactivateActive
                        ? "This will deactivate the current active plan"
                        : willDeactivate
                        ? "Deactivating will prevent using this plan for sessions"
                        : "Active plans can be used for session notes and billing"}
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
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}