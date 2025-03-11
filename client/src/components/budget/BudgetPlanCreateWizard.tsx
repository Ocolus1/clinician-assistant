import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Calendar } from "../ui/calendar";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarIcon,
  DollarSign,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  CheckCircle,
  Trash2,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { BudgetItemCatalog } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { FUNDS_MANAGEMENT_OPTIONS } from "@shared/schema";

// Define steps in the wizard
enum WizardStep {
  PLAN_INFO = 0,
  BUDGET_ALLOCATION = 1,
  REVIEW = 2,
}

// Define the schema for the plan creation form
const createPlanSchema = z.object({
  planSerialNumber: z.string().optional(),
  planCode: z.string().min(1, { message: "Plan code is required" }),
  availableFunds: z.coerce.number().min(1, { message: "Available funds must be greater than 0" }),
  endOfPlan: z.date({
    required_error: "End date is required",
    invalid_type_error: "End date is required",
  }).refine((date) => date > new Date(), {
    message: "End date must be in the future",
  }),
  isActive: z.boolean().default(true),
  fundingSource: z.string().optional(),
  budgetItems: z.array(
    z.object({
      itemCode: z.string(),
      description: z.string(),
      unitPrice: z.coerce.number().min(0.01),
      quantity: z.coerce.number().min(1),
      defaultUnitPrice: z.number().optional(),
      category: z.string().optional(),
    })
  ).optional(),
});

type CreatePlanFormValues = z.infer<typeof createPlanSchema>;

interface BudgetPlanCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  clientId: number;
  catalogItems: BudgetItemCatalog[];
  hasActivePlan: boolean;
}

export function BudgetPlanCreateWizard({
  open,
  onOpenChange,
  onSubmit,
  clientId,
  catalogItems,
  hasActivePlan,
}: BudgetPlanCreateWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.PLAN_INFO);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<BudgetItemCatalog | null>(null);
  
  // Initialize form with default values
  const form = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      planCode: `PLAN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      planSerialNumber: `SN-${new Date().getTime()}`,
      availableFunds: 0,
      isActive: true,
      budgetItems: [],
    },
  });
  
  // Reset form and step when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(WizardStep.PLAN_INFO);
      form.reset({
        planCode: `PLAN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        planSerialNumber: `SN-${new Date().getTime()}`,
        availableFunds: 0,
        isActive: true,
        budgetItems: [],
      });
    }
  }, [open, form]);
  
  // Group catalog items by category
  const catalogByCategory = catalogItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, BudgetItemCatalog[]>);
  
  // Calculate total allocated funds
  const budgetItems = form.watch('budgetItems') || [];
  const totalAllocated = budgetItems.reduce((total, item) => {
    return total + (item.unitPrice * item.quantity);
  }, 0);
  
  const availableFunds = form.watch('availableFunds') || 0;
  const remainingFunds = availableFunds - totalAllocated;
  const percentAllocated = availableFunds > 0 ? (totalAllocated / availableFunds) * 100 : 0;
  
  // Check if we've allocated too much
  const isOverAllocated = totalAllocated > availableFunds;
  
  // Handle adding a budget item
  const handleAddBudgetItem = (catalogItem: BudgetItemCatalog, quantity: number = 1) => {
    const currentItems = form.getValues('budgetItems') || [];
    
    // Check if item already exists
    const existingItemIndex = currentItems.findIndex(item => item.itemCode === catalogItem.itemCode);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex].quantity += quantity;
      form.setValue('budgetItems', updatedItems);
    } else {
      // Add new item
      form.setValue('budgetItems', [
        ...currentItems,
        {
          itemCode: catalogItem.itemCode,
          description: catalogItem.description,
          unitPrice: catalogItem.defaultUnitPrice,
          defaultUnitPrice: catalogItem.defaultUnitPrice,
          quantity,
          category: catalogItem.category || undefined,
        }
      ]);
    }
    
    setSelectedCatalogItem(null);
  };
  
  // Handle removing a budget item
  const handleRemoveBudgetItem = (index: number) => {
    const currentItems = form.getValues('budgetItems') || [];
    const updatedItems = currentItems.filter((_, i) => i !== index);
    form.setValue('budgetItems', updatedItems);
  };
  
  // Handle updating quantity for a budget item
  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const currentItems = form.getValues('budgetItems') || [];
    const updatedItems = [...currentItems];
    updatedItems[index].quantity = newQuantity;
    form.setValue('budgetItems', updatedItems);
  };
  
  // Handle updating unit price for a budget item
  const handleUpdateUnitPrice = (index: number, newPrice: number) => {
    if (newPrice < 0.01) return;
    
    const currentItems = form.getValues('budgetItems') || [];
    const updatedItems = [...currentItems];
    updatedItems[index].unitPrice = newPrice;
    form.setValue('budgetItems', updatedItems);
  };
  
  // Handle moving to next step
  const handleNextStep = async () => {
    if (currentStep === WizardStep.PLAN_INFO) {
      // Validate only the first step fields
      const result = await form.trigger(['planCode', 'availableFunds', 'endOfPlan']);
      if (result) {
        setCurrentStep(WizardStep.BUDGET_ALLOCATION);
      }
    } else if (currentStep === WizardStep.BUDGET_ALLOCATION) {
      setCurrentStep(WizardStep.REVIEW);
    }
  };
  
  // Handle moving to previous step
  const handlePrevStep = () => {
    if (currentStep === WizardStep.BUDGET_ALLOCATION) {
      setCurrentStep(WizardStep.PLAN_INFO);
    } else if (currentStep === WizardStep.REVIEW) {
      setCurrentStep(WizardStep.BUDGET_ALLOCATION);
    }
  };
  
  // Handle form submission
  const onFormSubmit: SubmitHandler<CreatePlanFormValues> = (data) => {
    onSubmit({
      ...data,
      clientId,
      endOfPlan: format(data.endOfPlan, 'yyyy-MM-dd'),
    });
  };
  
  // Animation variants
  const fadeVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Budget Plan</DialogTitle>
          <DialogDescription>
            Create a new budget plan for the client. You'll set up plan details and allocate budget items.
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress Indicator */}
        <div className="relative mt-2 mb-6">
          <div className="flex justify-between mb-2">
            <div className="text-sm font-medium">Plan Info</div>
            <div className="text-sm font-medium">Budget Allocation</div>
            <div className="text-sm font-medium">Review</div>
          </div>
          <div className="absolute left-0 top-[30px] w-full h-1 bg-muted rounded-full"></div>
          <div 
            className="absolute left-0 top-[30px] h-1 bg-primary rounded-full transition-all"
            style={{ 
              width: currentStep === 0 ? '5%' : currentStep === 1 ? '50%' : '100%' 
            }}
          ></div>
          <div className="flex justify-between">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm relative z-10
                ${currentStep >= WizardStep.PLAN_INFO ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
              `}
            >
              1
            </div>
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm relative z-10
                ${currentStep >= WizardStep.BUDGET_ALLOCATION ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
              `}
            >
              2
            </div>
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm relative z-10
                ${currentStep >= WizardStep.REVIEW ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
              `}
            >
              3
            </div>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Plan Information */}
              {currentStep === WizardStep.PLAN_INFO && (
                <motion.div
                  key="step1"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={fadeVariants}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="planCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-primary">Plan Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                      name="planSerialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Serial Number (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional reference number from funding source
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="availableFunds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-primary">Available Funds</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-2.5 h-5 w-5 text-muted-foreground" />
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="pl-9"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Total budget amount available for this plan
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="fundingSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Funding Source (Optional)</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select funding source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FUNDS_MANAGEMENT_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How funds are managed for this budget plan
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="endOfPlan"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-primary">End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value ? "text-muted-foreground" : ""
                                }`}
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
                                date < new Date()
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
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Make this plan active</FormLabel>
                          <FormDescription>
                            {hasActivePlan
                              ? "This will deactivate the currently active plan"
                              : "This plan will be used for new sessions"}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {hasActivePlan && form.watch('isActive') && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Active Plan Will Change</AlertTitle>
                      <AlertDescription>
                        Creating this as an active plan will deactivate the currently active plan.
                        Only one plan can be active at a time.
                      </AlertDescription>
                    </Alert>
                  )}
                </motion.div>
              )}
              
              {/* Step 2: Budget Allocation */}
              {currentStep === WizardStep.BUDGET_ALLOCATION && (
                <motion.div
                  key="step2"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={fadeVariants}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Budget Allocation</h3>
                      <div className="text-sm text-muted-foreground">
                        Total Available: {formatCurrency(availableFunds)}
                      </div>
                    </div>
                    
                    {/* Budget Visualization */}
                    <Card className="mb-6">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm text-muted-foreground">Budget Allocation:</div>
                          <div className="text-sm font-medium">
                            {formatCurrency(totalAllocated)} of {formatCurrency(availableFunds)}
                            {' '}({Math.round(percentAllocated)}%)
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 mb-4">
                          <div 
                            className={`h-2.5 rounded-full ${
                              isOverAllocated ? 'bg-destructive' : 
                              percentAllocated > 90 ? 'bg-amber-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, percentAllocated)}%` }}
                          ></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Items:</div>
                            <div className="text-lg font-medium">{budgetItems.length}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Remaining:</div>
                            <div className={`text-lg font-medium ${remainingFunds < 0 ? 'text-destructive' : ''}`}>
                              {formatCurrency(remainingFunds)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Alert if over-allocated */}
                    {isOverAllocated && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Budget Over-allocated</AlertTitle>
                        <AlertDescription>
                          The total allocation ({formatCurrency(totalAllocated)}) exceeds the available funds ({formatCurrency(availableFunds)}).
                          Please adjust the quantities or unit prices.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Add Items Section */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-base font-medium">Add Budget Items</h4>
                        <Select
                          onValueChange={(value) => {
                            const item = catalogItems.find(i => i.itemCode === value);
                            if (item) setSelectedCatalogItem(item);
                          }}
                          value={selectedCatalogItem?.itemCode || ""}
                        >
                          <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Select an item to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(catalogByCategory).map(([category, items]) => (
                              <React.Fragment key={category}>
                                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                                  {category}
                                </div>
                                {items.map(item => (
                                  <SelectItem key={item.itemCode} value={item.itemCode}>
                                    {item.description} - {formatCurrency(item.defaultUnitPrice)}
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedCatalogItem && (
                        <Card className="mb-4 border border-primary border-dashed">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{selectedCatalogItem.description}</div>
                                <div className="text-sm text-muted-foreground">
                                  Unit Price: {formatCurrency(selectedCatalogItem.defaultUnitPrice)}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddBudgetItem(selectedCatalogItem)}
                                >
                                  <PlusCircle className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    
                    {/* Current Budget Items */}
                    <div>
                      <h4 className="text-base font-medium mb-4">Current Budget Items</h4>
                      {budgetItems.length === 0 ? (
                        <div className="text-center py-8 border rounded-md text-muted-foreground">
                          No budget items added yet. Select items from the catalog to add them.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {budgetItems.map((item, index) => (
                            <Card key={`${item.itemCode}-${index}`}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium flex items-center">
                                      {item.description}
                                      {item.category && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {item.category}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">
                                          Unit Price:
                                        </div>
                                        <div className="flex items-center">
                                          <Input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => handleUpdateUnitPrice(index, parseFloat(e.target.value))}
                                            className="h-8 w-24"
                                          />
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">
                                          Quantity:
                                        </div>
                                        <div className="flex items-center">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                          >
                                            <MinusCircle className="h-3 w-3" />
                                          </Button>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value))}
                                            className="h-8 w-16 mx-1 text-center"
                                          />
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                                          >
                                            <PlusCircle className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col items-end">
                                    <div className="text-sm font-medium">
                                      {formatCurrency(item.unitPrice * item.quantity)}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => handleRemoveBudgetItem(index)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Step 3: Review */}
              {currentStep === WizardStep.REVIEW && (
                <motion.div
                  key="step3"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={fadeVariants}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <div className="text-lg font-medium mb-4">Review Budget Plan</div>
                    
                    {/* Review Summary */}
                    <Card className="mb-6">
                      <CardContent className="p-6 space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Plan Code:</div>
                          <div className="font-medium">{form.getValues('planCode')}</div>
                        </div>
                        
                        {form.getValues('planSerialNumber') && (
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Serial Number:</div>
                            <div className="font-medium">{form.getValues('planSerialNumber')}</div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Available Funds:</div>
                            <div className="font-medium">{formatCurrency(availableFunds)}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Status:</div>
                            <div className="font-medium">
                              {form.getValues('isActive') ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Active
                                </span>
                              ) : (
                                "Inactive"
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">End Date:</div>
                            <div className="font-medium">
                              {form.getValues('endOfPlan') 
                                ? format(form.getValues('endOfPlan'), 'MMM d, yyyy')
                                : 'Not set'}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Funding Source:</div>
                            <div className="font-medium">
                              {form.getValues('fundingSource') || 'Not specified'}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-muted-foreground mb-2">Budget Allocation:</div>
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-sm">Allocated:</div>
                            <div className="font-medium">{formatCurrency(totalAllocated)}</div>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-sm">Remaining:</div>
                            <div className={`font-medium ${remainingFunds < 0 ? 'text-destructive' : ''}`}>
                              {formatCurrency(remainingFunds)}
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                            <div 
                              className={`h-2.5 rounded-full ${
                                isOverAllocated ? 'bg-destructive' : 
                                percentAllocated > 90 ? 'bg-amber-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, percentAllocated)}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Budget Items Review */}
                    <div>
                      <h4 className="text-base font-medium mb-4">Budget Items ({budgetItems.length})</h4>
                      {budgetItems.length === 0 ? (
                        <div className="text-center py-8 border rounded-md text-muted-foreground">
                          No budget items added.
                        </div>
                      ) : (
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left p-3 text-sm font-medium">Description</th>
                                <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                                <th className="text-right p-3 text-sm font-medium">Quantity</th>
                                <th className="text-right p-3 text-sm font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {budgetItems.map((item, index) => (
                                <tr key={`${item.itemCode}-${index}`} className="border-t">
                                  <td className="p-3">
                                    <div className="font-medium">{item.description}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {item.itemCode}
                                      {item.category && ` • ${item.category}`}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    {formatCurrency(item.unitPrice)}
                                  </td>
                                  <td className="p-3 text-right">
                                    {item.quantity}
                                  </td>
                                  <td className="p-3 text-right font-medium">
                                    {formatCurrency(item.unitPrice * item.quantity)}
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t bg-muted">
                                <td colSpan={3} className="p-3 text-right font-medium">
                                  Total:
                                </td>
                                <td className="p-3 text-right font-medium">
                                  {formatCurrency(totalAllocated)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    
                    {/* Warnings and validation notices */}
                    {isOverAllocated && (
                      <Alert variant="destructive" className="mt-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Budget Over-allocated</AlertTitle>
                        <AlertDescription>
                          The total allocation ({formatCurrency(totalAllocated)}) exceeds the available funds ({formatCurrency(availableFunds)}).
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {hasActivePlan && form.getValues('isActive') && (
                      <Alert className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Active Plan Change</AlertTitle>
                        <AlertDescription>
                          This new plan will become the active plan, and the currently active plan will be deactivated.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <DialogFooter>
              {currentStep > WizardStep.PLAN_INFO && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              
              {currentStep < WizardStep.REVIEW && (
                <Button
                  type="button"
                  onClick={handleNextStep}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {currentStep === WizardStep.REVIEW && (
                <Button 
                  type="submit"
                  disabled={isOverAllocated}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Budget Plan
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}