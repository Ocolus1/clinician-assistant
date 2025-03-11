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
  DialogTitle,
  DialogTrigger
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import { Calendar } from "../ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useBudgetFeature } from "./BudgetFeatureContext";

// Define the form schema
const planFormSchema = z.object({
  planName: z.string().min(1, "Plan name is required").max(100),
  planCode: z.string().min(1, "Plan code is required").max(50),
  availableFunds: z.coerce
    .number()
    .min(0, "Available funds must be greater than 0")
    .refine((val) => !isNaN(val), {
      message: "Available funds must be a valid number",
    }),
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

// Define the wizard steps
enum WizardStep {
  BASIC_INFO = 0,
  FUNDING_INFO = 1,
  CONFIRM = 2,
}

// Prop interface for the wizard
interface BudgetPlanCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
}

export function BudgetPlanCreateWizard({ 
  open, 
  onOpenChange,
  clientId 
}: BudgetPlanCreateWizardProps) {
  const { toast } = useToast();
  const { createPlan, activeBudgetPlan } = useBudgetFeature();
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.BASIC_INFO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with default values
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      planName: "",
      planCode: "",
      availableFunds: 0,
      isActive: true,
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: PlanFormValues) => {
    if (currentStep !== WizardStep.CONFIRM) {
      // Move to next step
      setCurrentStep(currentStep + 1);
      return;
    }
    
    // Final submit
    setIsSubmitting(true);
    
    try {
      // Map form values to the budget plan structure
      const newPlan = {
        planName: values.planName,
        planCode: values.planCode,
        availableFunds: values.availableFunds,
        endDate: values.endDate ? values.endDate.toISOString() : null,
        isActive: values.isActive,
      };
      
      // Create the plan
      await createPlan(newPlan);
      
      // Show success toast
      toast({
        title: "Budget Plan Created",
        description: `Successfully created ${values.planName}`,
      });
      
      // Close the dialog
      onOpenChange(false);
      
      // Reset form and wizard
      form.reset();
      setCurrentStep(WizardStep.BASIC_INFO);
    } catch (error: any) {
      // Show error toast
      toast({
        title: "Error Creating Budget Plan",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle back button click
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset form and wizard when dialog closes
      form.reset();
      setCurrentStep(WizardStep.BASIC_INFO);
    }
    onOpenChange(open);
  };
  
  // Get the step title and description
  const getStepInfo = () => {
    switch (currentStep) {
      case WizardStep.BASIC_INFO:
        return {
          title: "Basic Information",
          description: "Enter the basic details for the new budget plan",
        };
      case WizardStep.FUNDING_INFO:
        return {
          title: "Funding Information",
          description: "Set the funding amount and expiration date",
        };
      case WizardStep.CONFIRM:
        return {
          title: "Confirm Plan Details",
          description: "Review and confirm the budget plan details",
        };
      default:
        return {
          title: "Create Budget Plan",
          description: "Enter the details for the new budget plan",
        };
    }
  };
  
  // Get current step info
  const { title, description } = getStepInfo();
  
  // Check if there's an active plan that would be deactivated
  const willDeactivateActive = form.watch("isActive") && !!activeBudgetPlan;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {currentStep === WizardStep.BASIC_INFO && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="planName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Speech Therapy 2025" {...field} />
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
                        <Input placeholder="e.g. NDIS-2025-01" {...field} />
                      </FormControl>
                      <FormDescription>
                        A unique code for identifying this plan
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {currentStep === WizardStep.FUNDING_INFO && (
              <div className="space-y-4">
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
              </div>
            )}
            
            {currentStep === WizardStep.CONFIRM && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Make this plan active
                        </FormLabel>
                        <FormDescription>
                          {willDeactivateActive
                            ? "This will deactivate the current active plan"
                            : "Activate this plan immediately upon creation"}
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
                
                <div className="rounded-md border p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Plan Summary</h4>
                    <Separator />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Plan Name:</p>
                      <p className="font-medium">{form.watch("planName")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Plan Code:</p>
                      <p className="font-medium">{form.watch("planCode")}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Available Funds:</p>
                      <p className="font-medium">
                        ${form.watch("availableFunds").toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date:</p>
                      <p className="font-medium">
                        {form.watch("endDate")
                          ? format(form.watch("endDate") as Date, "PPP")
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <p className="text-muted-foreground">Status:</p>
                    <p className="font-medium">
                      {form.watch("isActive") ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentStep < WizardStep.CONFIRM
                  ? "Next"
                  : "Create Budget Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}