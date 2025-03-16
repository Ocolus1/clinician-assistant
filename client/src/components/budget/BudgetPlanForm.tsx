import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Zod schema for form validation
const budgetPlanFormSchema = z.object({
  planCode: z.string().min(1, "Plan code is required"),
  planSerialNumber: z.string().optional(),
  ndisFunds: z
    .number({ 
      required_error: "Amount is required", 
      invalid_type_error: "Amount must be a number" 
    })
    .min(0, "Amount must be at least 0"),
  endOfPlan: z.date().optional(),
});

type BudgetPlanFormValues = z.infer<typeof budgetPlanFormSchema>;

interface BudgetPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onSuccess?: () => void;
  initialValues?: Partial<BudgetPlanFormValues>;
}

export function BudgetPlanForm({ 
  open, 
  onOpenChange, 
  clientId, 
  onSuccess,
  initialValues
}: BudgetPlanFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialValues?.endOfPlan ? new Date(initialValues.endOfPlan) : undefined
  );
  
  // Initialize form with default values
  const form = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanFormSchema),
    defaultValues: {
      planCode: initialValues?.planCode || "",
      planSerialNumber: initialValues?.planSerialNumber || "",
      ndisFunds: initialValues?.ndisFunds || 0,
      endOfPlan: initialValues?.endOfPlan,
    },
  });
  
  // Create the mutation for creating a new budget plan
  const createPlanMutation = useMutation({
    mutationFn: async (data: BudgetPlanFormValues) => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          clientId,
          isActive: false, // New plans are not active by default
          endOfPlan: data.endOfPlan ? format(data.endOfPlan, "yyyy-MM-dd") : null,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create budget plan");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Budget Plan Created",
        description: "The budget plan has been created successfully.",
      });
      
      // Invalidate the budget settings query to refresh the data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${clientId}/budget-settings`] 
      });
      
      // Close the dialog
      onOpenChange(false);
      
      // Execute the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset the form
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating budget plan:", error);
      toast({
        title: "Error",
        description: "There was an error creating the budget plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(data: BudgetPlanFormValues) {
    createPlanMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Budget Plan</DialogTitle>
          <DialogDescription>
            Add a new budget plan for this client. All fields are required.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="planCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NDIS-2024-01" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique identifier for this budget plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="planSerialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Serial Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NDIS-123456789" {...field} />
                  </FormControl>
                  <FormDescription>
                    The official serial number for this plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="ndisFunds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Budget Amount</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
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
              name="endOfPlan"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Plan End Date (Optional)</FormLabel>
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
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setEndDate(date);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date when this budget plan expires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createPlanMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createPlanMutation.isPending}
              >
                {createPlanMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Plan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}