import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "../ui/popover";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";
import { useBudgetFeature } from "./BudgetFeatureContext";
import { useToast } from "@/hooks/use-toast";

// Define the form schema for budget plan editing
const budgetPlanEditSchema = z.object({
  planCode: z
    .string()
    .min(3, { message: "Plan code must be at least 3 characters" })
    .max(50, { message: "Plan code must be at most 50 characters" }),
  planName: z
    .string()
    .min(3, { message: "Plan name must be at least 3 characters" })
    .max(100, { message: "Plan name must be at most 100 characters" }),
  availableFunds: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Available funds must be a positive number",
    }),
  endDate: z.date().nullable().optional(),
  setAsActive: z.boolean().default(false), // Flag to set this as the active plan (UI only)
});

// Define the type for our form values
type BudgetPlanEditValues = z.infer<typeof budgetPlanEditSchema>;

// Props for the BudgetPlanEditDialog component
interface BudgetPlanEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number | null;
}

/**
 * A dialog component for editing an existing budget plan
 */
export function BudgetPlanEditDialog({ 
  open, 
  onOpenChange, 
  planId 
}: BudgetPlanEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePlan, getBudgetPlanById, activeBudgetPlan } = useBudgetFeature();
  const { toast } = useToast();
  
  // Create form with validation
  const form = useForm<BudgetPlanEditValues>({
    resolver: zodResolver(budgetPlanEditSchema),
    defaultValues: {
      planCode: "",
      planName: "",
      availableFunds: "0",
      endDate: null,
      setAsActive: false,
    },
  });
  
  // Load plan data when the dialog opens and planId changes
  useEffect(() => {
    if (open && planId) {
      const plan = getBudgetPlanById(planId);
      
      if (plan) {
        // Convert date string to Date object if it exists
        const endDate = plan.endDate ? new Date(plan.endDate) : null;
        
        // Set form values
        form.reset({
          planCode: plan.planCode || "",
          planName: plan.planName || "",
          availableFunds: String(plan.availableFunds || 0),
          endDate,
          setAsActive: plan.isActive || false,
        });
      }
    }
  }, [open, planId, getBudgetPlanById, form]);
  
  // Handle dialog open/close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      form.reset();
    }
    onOpenChange(open);
  };
  
  // Handle form submission
  const onSubmit = async (data: BudgetPlanEditValues) => {
    if (!planId) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare the data for API call
      const planData = {
        id: planId,
        planCode: data.planCode,
        planName: data.planName,
        availableFunds: parseFloat(data.availableFunds),
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : null,
        isActive: data.setAsActive,
      };
      
      // Call the updatePlan function from the context
      await updatePlan(planData);
      
      // Show success toast
      toast({
        title: "Budget Plan Updated",
        description: "Your changes have been saved successfully.",
      });
      
      // Close the dialog
      handleOpenChange(false);
    } catch (err) {
      console.error("Error updating budget plan:", err);
      
      // Show error toast
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update budget plan",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const showActiveWarning = activeBudgetPlan && 
                          activeBudgetPlan.id !== planId && 
                          form.watch("setAsActive");
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Budget Plan</DialogTitle>
          <DialogDescription>
            Update the details of this budget plan.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="planCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., NDIS-2024" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique code to identify this budget plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="planName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., NDIS Funding 2024-2025" {...field} />
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
              name="availableFunds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Funds</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input
                        type="text"
                        placeholder="0.00"
                        className="pl-8"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    The total amount of funding available for this plan
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
                  <FormLabel>Plan End Date</FormLabel>
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
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When this funding plan expires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="setAsActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Set as Active Plan</FormLabel>
                    <FormDescription>
                      Make this the active plan for sessions and reporting
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
            
            {showActiveWarning && (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.873-1.037 2.157-1.037 3.03 0l6.28 7.45c.873 1.037.95 2.688.177 3.726l-6.28 7.45c-.873 1.037-2.157 1.037-3.03 0l-6.28-7.45c-.873-1.037-.95-2.688-.177-3.726l6.28-7.45z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Note</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        This will deactivate the current active plan: <strong>{activeBudgetPlan.planName}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}