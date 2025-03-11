import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, CheckIcon, PlusCircle, X } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { Switch } from "../ui/switch";
import { useBudgetFeature } from "./BudgetFeatureContext";

// Define the form schema for budget plan creation
const budgetPlanSchema = z.object({
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
  isActive: z.boolean().default(false),
  setAsActive: z.boolean().default(false), // Flag to set this as the active plan (UI only)
});

// Define the type for our form values
type BudgetPlanFormValues = z.infer<typeof budgetPlanSchema>;

// Props for the BudgetPlanCreateWizard component
interface BudgetPlanCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
}

// Wizard steps
type WizardStep = "info" | "funding" | "review" | "result";

/**
 * A multi-step wizard for creating a new budget plan with visual feedback
 */
export function BudgetPlanCreateWizard({ 
  open, 
  onOpenChange, 
  clientId 
}: BudgetPlanCreateWizardProps) {
  // State for wizard steps
  const [currentStep, setCurrentStep] = useState<WizardStep>("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Access budget feature context
  const { createPlan, activeBudgetPlan } = useBudgetFeature();
  
  // Create form with validation
  const form = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      planCode: "",
      planName: "",
      availableFunds: "0",
      endDate: null,
      isActive: false,
      setAsActive: activeBudgetPlan === null, // Default to true if no active plan exists
    },
  });
  
  // Reset the form and wizard state when the dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form and state
      form.reset();
      setCurrentStep("info");
      setIsSubmitting(false);
      setIsSuccess(false);
      setError(null);
    }
    onOpenChange(open);
  };
  
  // Move to the next step
  const goToNextStep = () => {
    // Validate the current step before proceeding
    if (currentStep === "info") {
      form.trigger(["planCode", "planName"]);
      
      if (form.formState.errors.planCode || form.formState.errors.planName) {
        return;
      }
      
      setCurrentStep("funding");
    } else if (currentStep === "funding") {
      form.trigger(["availableFunds", "endDate"]);
      
      if (form.formState.errors.availableFunds || form.formState.errors.endDate) {
        return;
      }
      
      setCurrentStep("review");
    }
  };
  
  // Go back to the previous step
  const goToPreviousStep = () => {
    if (currentStep === "funding") {
      setCurrentStep("info");
    } else if (currentStep === "review") {
      setCurrentStep("funding");
    }
  };
  
  // Handle form submission
  const onSubmit = async (data: BudgetPlanFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Prepare the data for API call
      const planData = {
        planCode: data.planCode,
        planName: data.planName,
        availableFunds: parseFloat(data.availableFunds),
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : null,
        isActive: data.setAsActive, // Use the setAsActive flag for the isActive value
      };
      
      // Call the createPlan function from the context
      await createPlan(planData);
      
      // Set success state
      setIsSuccess(true);
      setCurrentStep("result");
    } catch (err) {
      console.error("Error creating budget plan:", err);
      setError(err instanceof Error ? err.message : "Failed to create budget plan");
      setCurrentStep("result");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render step indicators
  const renderStepIndicators = () => {
    const steps = [
      { id: "info", label: "Plan Info" },
      { id: "funding", label: "Funding" },
      { id: "review", label: "Review" },
    ];
    
    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div 
              className={cn(
                "flex flex-col items-center",
                currentStep === step.id && "text-primary",
                currentStep !== step.id && "text-muted-foreground"
              )}
            >
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border",
                  currentStep === step.id && "bg-primary text-primary-foreground border-primary",
                  currentStep !== step.id && "bg-background border-muted-foreground/30"
                )}
              >
                {index + 1}
              </div>
              <span className="text-xs mt-1">{step.label}</span>
            </div>
            
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "w-12 h-0.5 mx-1", 
                  steps.findIndex(s => s.id === currentStep) > index 
                    ? "bg-primary" 
                    : "bg-muted-foreground/30"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };
  
  // Render the form content based on the current step
  const renderStepContent = () => {
    switch (currentStep) {
      case "info":
        return (
          <>
            <div className="space-y-4">
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
            </div>
            
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={goToNextStep}>Continue</Button>
            </DialogFooter>
          </>
        );
        
      case "funding":
        return (
          <>
            <div className="space-y-4">
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Set as Active Plan</FormLabel>
                      <FormDescription>
                        {activeBudgetPlan 
                          ? "This will replace the current active plan" 
                          : "This will be the active plan for sessions"}
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
            </div>
            
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={goToPreviousStep}>Back</Button>
              <Button onClick={goToNextStep}>Continue</Button>
            </DialogFooter>
          </>
        );
        
      case "review":
        // Get the current form values
        const { planCode, planName, availableFunds, endDate, setAsActive } = form.getValues();
        
        return (
          <>
            <Card className="border-dashed mt-2 mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{planName}</CardTitle>
                <CardDescription>{planCode}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Available Funds:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(availableFunds))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">
                      {endDate ? format(endDate, "PPP") : "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium">
                      {setAsActive ? "Will be set as active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {activeBudgetPlan && setAsActive && (
              <div className="rounded-md bg-yellow-50 p-4 mb-6">
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
              <Button variant="outline" onClick={goToPreviousStep}>Back</Button>
              <Button 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Plan..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </>
        );
        
      case "result":
        return (
          <div className="py-6 text-center">
            {isSuccess ? (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium">Plan Created Successfully</h3>
                <p className="text-muted-foreground">
                  Your new budget plan has been created and is ready to use.
                </p>
                <Button onClick={() => handleOpenChange(false)} className="mt-4">
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium">Error Creating Plan</h3>
                <p className="text-muted-foreground">
                  {error || "There was an error creating your budget plan. Please try again."}
                </p>
                <div className="flex justify-center gap-4 mt-4">
                  <Button variant="outline" onClick={() => setCurrentStep("review")}>
                    Back
                  </Button>
                  <Button onClick={() => handleOpenChange(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Budget Plan</DialogTitle>
          <DialogDescription>
            Set up a new budget plan for tracking therapy funding and expenses.
          </DialogDescription>
        </DialogHeader>
        
        {currentStep !== "result" && renderStepIndicators()}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {renderStepContent()}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}