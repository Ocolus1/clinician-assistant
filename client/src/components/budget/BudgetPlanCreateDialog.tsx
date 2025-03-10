import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Calendar } from "../ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BudgetSettings } from "@shared/schema";

// Form schema
const createPlanSchema = z.object({
  planCode: z.string().min(1, "Plan code is required"),
  planSerialNumber: z.string().optional(),
  availableFunds: z.number().positive("Available funds must be positive"),
  isActive: z.boolean().default(false),
  endOfPlan: z.date().optional(),
});

type CreatePlanValues = z.infer<typeof createPlanSchema>;

interface BudgetPlanCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  existingPlans: BudgetSettings[];
  hasActivePlan: boolean;
  isLoading?: boolean;
}

export function BudgetPlanCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  existingPlans,
  hasActivePlan,
  isLoading = false
}: BudgetPlanCreateDialogProps) {
  const form = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      planCode: "",
      planSerialNumber: "",
      availableFunds: 0,
      isActive: !hasActivePlan, // Default to active if no active plan exists
      endOfPlan: undefined,
    },
  });
  
  function handleSubmit(values: CreatePlanValues) {
    onSubmit(values);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Budget Plan</DialogTitle>
          <DialogDescription>
            Add a new budget plan to track funding and expenses.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="planCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Code/Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., NDIS 2025" {...field} />
                  </FormControl>
                  <FormDescription>
                    A short code or name to identify this budget plan
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
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional serial or reference number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional reference number for this plan
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
                  <FormLabel>Total Available Funds</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    The total budget amount available in this plan
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
                    The date when this budget plan expires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      disabled={hasActivePlan}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Set as Active Plan
                      {hasActivePlan && " (Another plan is currently active)"}
                    </FormLabel>
                    <FormDescription>
                      The active plan is the primary budget used for new items and sessions
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}