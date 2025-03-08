import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { BudgetSettings, insertBudgetSettingsSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

// Interface for BudgetPlan which extends BudgetSettings with UI display properties
interface BudgetPlan extends BudgetSettings {
  planName: string;
  fundingSource: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  archived: boolean;
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
}

// Create a form schema for budget plan editing
const editBudgetPlanSchema = z.object({
  planCode: z.string().min(1, { message: "Plan code is required" }),
  availableFunds: z.coerce.number().min(0, { message: "Available funds must be a positive number" }),
  endOfPlan: z.string().optional(),
  isActive: z.boolean().default(true),
});

type EditBudgetPlanFormValues = z.infer<typeof editBudgetPlanSchema>;

interface EditBudgetPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BudgetPlan;
  clientId: number;
}

export function EditBudgetPlanDialog({ 
  open, 
  onOpenChange, 
  plan, 
  clientId 
}: EditBudgetPlanDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format date for the form input
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd");
    } catch (e) {
      console.error("Error formatting date for input:", e);
      return "";
    }
  };

  // Initialize form with plan data
  const form = useForm<EditBudgetPlanFormValues>({
    resolver: zodResolver(editBudgetPlanSchema),
    defaultValues: {
      planCode: plan.planCode || "",
      availableFunds: typeof plan.availableFunds === 'string' 
        ? parseFloat(plan.availableFunds) 
        : plan.availableFunds || 0,
      endOfPlan: plan.endOfPlan || formatDateForInput(plan.endDate),
      isActive: typeof plan.isActive === 'boolean' 
        ? plan.isActive 
        : plan.isActive === null ? true : plan.isActive === 'true',
    },
  });

  // Mutation for updating budget plan
  const updateBudgetPlan = useMutation({
    mutationFn: async (data: EditBudgetPlanFormValues) => {
      return apiRequest("PUT", `/api/clients/${clientId}/budget-settings/${plan.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget plan updated successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      onOpenChange(false);
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error("Error updating budget plan:", error);
      toast({
        title: "Error",
        description: "Failed to update budget plan. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: EditBudgetPlanFormValues) => {
    setIsSubmitting(true);
    updateBudgetPlan.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Budget Plan</DialogTitle>
          <DialogDescription>
            Update budget plan details for {plan.planName || `Plan ${plan.planCode || 'Unknown'}`}
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
                    <Input 
                      placeholder="Enter plan code" 
                      {...field} 
                    />
                  </FormControl>
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
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        type="number"
                        placeholder="0.00" 
                        className="pl-9"
                        step="0.01"
                        min="0"
                        {...field} 
                        value={field.value || 0}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endOfPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      placeholder="Select end date" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
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