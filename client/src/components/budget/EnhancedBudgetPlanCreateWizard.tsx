import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { FUNDS_MANAGEMENT_OPTIONS } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addYears } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, AlertCircle, DollarSign, Calendar, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

// Create schema for budget plan creation
const createPlanSchema = z.object({
  planSerialNumber: z.string().min(3, "Plan number must be at least 3 characters").max(50),
  planCode: z.string().optional(),
  ndisFunds: z.coerce.number().min(0, "Funds must be a positive number"),
  endOfPlan: z.date().optional(),
  isActive: z.boolean().default(true),
  fundsManagement: z.enum(FUNDS_MANAGEMENT_OPTIONS),
});

type CreatePlanFormValues = z.infer<typeof createPlanSchema>;

interface EnhancedBudgetPlanCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onSuccess?: () => void;
}

/**
 * Enhanced budget plan creation wizard that mimics the onboarding budget form
 * Multi-step form with validation and progress tracking
 */
export function EnhancedBudgetPlanCreateWizard({ 
  open, 
  onOpenChange, 
  clientId,
  onSuccess
}: EnhancedBudgetPlanCreateWizardProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<CreatePlanFormValues>>({
    isActive: true,
    fundsManagement: "Self-Managed" as const
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form setup with zod schema
  const form = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      planSerialNumber: "",
      planCode: "",
      ndisFunds: 0,
      isActive: true,
      fundsManagement: "Self-Managed" as const
    },
  });
  
  // Mutation for creating a budget plan
  const createPlanMutation = useMutation({
    mutationFn: async (data: CreatePlanFormValues) => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          clientId,
          // Format date to ISO string if present
          endOfPlan: data.endOfPlan ? data.endOfPlan.toISOString() : undefined
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create budget plan: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Budget Plan Created",
        description: "Your budget plan has been created successfully.",
      });
      
      // Invalidate budget settings queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings', 'all'] });
      
      // Reset the form and close the wizard
      form.reset();
      setStep(0);
      onOpenChange(false);
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create budget plan. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: CreatePlanFormValues) => {
    createPlanMutation.mutate(data);
  };
  
  // Get the current step's progress percentage
  const getStepProgress = () => {
    return ((step + 1) / 4) * 100;
  };
  
  // When dialog closes, reset the form and step
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setStep(0);
    }
    onOpenChange(open);
  };
  
  // Steps configuration
  const steps = [
    { title: "Plan Details", description: "Enter basic plan information" },
    { title: "Funding", description: "Set up funding sources and amounts" },
    { title: "Timeline", description: "Define plan duration and schedule" },
    { title: "Review", description: "Review and create your budget plan" }
  ];
  
  // Next button handler
  const handleNext = async () => {
    // Validate the current fields before proceeding
    const currentStepFields = {
      0: ["planSerialNumber", "planCode"],
      1: ["ndisFunds", "fundsManagement"],
      2: ["endOfPlan", "isActive"],
      3: [] // Review step - no specific fields to validate
    };
    
    // Get the fields for the current step
    const fieldsToValidate = currentStepFields[step as keyof typeof currentStepFields] || [];
    
    // Trigger validation only for the fields in the current step
    const isValid = await form.trigger(fieldsToValidate as any[]);
    
    if (isValid) {
      // Save current form data
      setFormData({ ...formData, ...form.getValues() });
      
      // If on the last step, submit the form
      if (step === 3) {
        form.handleSubmit(onSubmit)();
      } else {
        // Otherwise, go to the next step
        setStep((prev) => Math.min(prev + 1, 3));
      }
    }
  };
  
  // Back button handler
  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };
  
  // Calculate an estimated date one year from now
  const estimatedEndDate = addYears(new Date(), 1);
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Budget Plan</DialogTitle>
          <DialogDescription>
            Create a new budget plan to track funding and expenses
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Step {step + 1} of 4</span>
            <span>{steps[step].title}</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>
        
        <Form {...form}>
          <form className="space-y-6">
            {/* Step 1: Plan Details */}
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{steps[step].title}</h3>
                <p className="text-muted-foreground">{steps[step].description}</p>
                
                <FormField
                  control={form.control}
                  name="planSerialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. NDIS-2025-001" {...field} />
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
                  name="planCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Code (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. SPT-24-Q1" {...field} />
                      </FormControl>
                      <FormDescription>
                        An optional reference code for this plan
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Step 2: Funding */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{steps[step].title}</h3>
                <p className="text-muted-foreground">{steps[step].description}</p>
                
                <FormField
                  control={form.control}
                  name="ndisFunds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Available Funds</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        The total funds available for this budget plan
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fundsManagement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funds Management</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select funds management type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FUNDS_MANAGEMENT_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How the funds for this budget plan will be managed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Step 3: Timeline */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{steps[step].title}</h3>
                <p className="text-muted-foreground">{steps[step].description}</p>
                
                <FormField
                  control={form.control}
                  name="endOfPlan"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Plan End Date</FormLabel>
                      <FormControl>
                        <DatePicker 
                          date={field.value} 
                          setDate={field.onChange}
                          placeholder="Select end date"
                        />
                      </FormControl>
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Plan</FormLabel>
                        <FormDescription>
                          Mark this plan as the active budget plan
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
            )}
            
            {/* Step 4: Review */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">{steps[step].title}</h3>
                <p className="text-muted-foreground">{steps[step].description}</p>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{form.getValues().planSerialNumber}</CardTitle>
                    <CardDescription>
                      {form.getValues().planCode && `Code: ${form.getValues().planCode}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium">Total Funds</div>
                        <div className="text-2xl font-bold">${form.getValues().ndisFunds?.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{form.getValues().fundsManagement}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Plan Duration</div>
                        <div className="text-2xl font-bold">
                          {form.getValues().endOfPlan ? 
                            format(form.getValues().endOfPlan, 'MMM d, yyyy') : 
                            'No end date'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {form.getValues().isActive ? 'Active Plan' : 'Inactive Plan'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Confirmation</AlertTitle>
                  <AlertDescription>
                    Please review the budget plan information above before creating. You can always update the details later.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </form>
        </Form>
        
        <DialogFooter className="flex justify-between">
          {step > 0 ? (
            <Button variant="outline" onClick={handleBack} disabled={createPlanMutation.isPending}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}
          
          <Button 
            onClick={handleNext}
            disabled={createPlanMutation.isPending}
          >
            {createPlanMutation.isPending ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : step === 3 ? (
              <span className="flex items-center">
                <Check className="h-4 w-4 mr-2" />
                Create Plan
              </span>
            ) : (
              <span className="flex items-center">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}