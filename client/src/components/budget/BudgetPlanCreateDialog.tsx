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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Calendar } from "../ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { 
  Calendar as CalendarIcon, 
  DollarSign, 
  Tag,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { Switch } from "../ui/switch";
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
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isPickingDate, setIsPickingDate] = useState(false);

  // Generate unique plan serial number
  function generatePlanSerialNumber() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `PLAN-${timestamp}-${random}`;
  }

  const form = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      planCode: "",
      planSerialNumber: generatePlanSerialNumber(),
      availableFunds: 0,
      isActive: !hasActivePlan, // Default to active if no active plan exists
      endOfPlan: undefined,
    },
  });
  
  function handleSubmit(values: CreatePlanValues) {
    onSubmit(values);
    onOpenChange(false);
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Budget Plan</DialogTitle>
          <DialogDescription>
            Add a new budget plan to track funding and expenses.
          </DialogDescription>
        </DialogHeader>
        
        <Card className="border-gray-200 shadow-sm">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-md font-semibold text-gray-700">Budget Settings</h3>
              {form.watch("planSerialNumber") && (
                <div className="text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                  Plan ID: {form.watch("planSerialNumber")}
                </div>
              )}
            </div>
          </div>
          <CardContent className="p-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 mb-4">
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            disabled={hasActivePlan}
                          />
                          <FormLabel className="text-sm font-medium cursor-pointer">
                            Plan Status: <span className={field.value ? "text-green-600" : "text-gray-500"}>
                              {field.value ? "Active" : "Inactive"}
                            </span>
                            {hasActivePlan && <span className="text-amber-600 text-xs ml-2">(Another plan is currently active)</span>}
                          </FormLabel>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="planCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" />
                          Plan Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="E.g., NDIS 2025" 
                            {...field} 
                            className="border-gray-300"
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
                        <FormLabel className="text-sm font-medium flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          Total Available Funds
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field}
                            className="border-gray-300"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="endOfPlan"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        End of Plan Date
                      </FormLabel>
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1">
                          <FormControl>
                            <Popover onOpenChange={(open) => {
                              // Set the isPickingDate flag when opening the date picker
                              if (open) {
                                setIsPickingDate(true);
                              } else {
                                // Reset the flag after a delay when closing
                                setTimeout(() => {
                                  setIsPickingDate(false);
                                }, 300);
                              }
                            }}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal border-gray-300",
                                    !date && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {date ? format(date, "PPP") : <span>Select end date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={date}
                                  onSelect={(newDate) => {
                                    setDate(newDate);
                                    
                                    if (newDate) {
                                      // Format for field
                                      const formattedDate = format(newDate, "yyyy-MM-dd");
                                      
                                      // Set the value in the form
                                      field.onChange(newDate);
                                    } else {
                                      field.onChange(undefined);
                                    }
                                  }}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Plan"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}