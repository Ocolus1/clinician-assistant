import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  CheckIcon, 
  Plus, 
  Search, 
  Tag, 
  DollarSign, 
  AlertCircle,
  CreditCard,
  Trash2,
  ArrowLeft,
  Calculator
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBudgetFeature } from "./BudgetFeatureContext";
import type { BudgetItemCatalog } from "@shared/schema";

// Define schema for the form with ndisFunds instead of availableFunds
const budgetPlanSchema = z.object({
  planCode: z
    .string()
    .min(3, { message: "Plan code must be at least 3 characters" })
    .max(50, { message: "Plan code must be at most 50 characters" }),
  planSerialNumber: z.string().optional(),
  ndisFunds: z
    .number()
    .min(0, { message: "NDIS funds must be a positive number" }),
  endOfPlan: z.string().optional(),
  isActive: z.boolean().default(false),
});

// Type for budget plan form values
type BudgetPlanFormValues = z.infer<typeof budgetPlanSchema>;

// Type for catalog item with quantity
type CatalogItemWithQuantity = BudgetItemCatalog & { quantity: number };

// Props for the wizard
interface EnhancedBudgetPlanCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onSuccess?: () => void;
}

/**
 * Enhanced Budget Plan Creation Wizard
 * A comprehensive form for creating new budget plans that matches the onboarding flow's design
 */
export function EnhancedBudgetPlanCreateWizard({
  open,
  onOpenChange,
  clientId,
  onSuccess
}: EnhancedBudgetPlanCreateWizardProps) {
  const { toast } = useToast();
  const { createPlan, budgetPlans, refreshData } = useBudgetFeature();
  
  // State for wizard
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<CatalogItemWithQuantity[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Find if there's an active plan
  const hasActivePlan = budgetPlans.some(plan => plan.isActive);
  
  // Generate unique plan serial number
  function generatePlanSerialNumber() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `PLAN-${timestamp}-${random}`;
  }
  
  // Initialize form with validation
  const form = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      planCode: "",
      planSerialNumber: generatePlanSerialNumber(),
      ndisFunds: 0,
      endOfPlan: undefined,
      isActive: !hasActivePlan, // Default to active if no active plan exists
    },
  });
  
  // Fetch catalog items
  const { data: catalogItems = [] } = useQuery<BudgetItemCatalog[]>({
    queryKey: ["/api/budget-catalog"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/budget-catalog`);
        return res.json();
      } catch (error) {
        console.error("Error fetching catalog items:", error);
        return [];
      }
    },
  });
  
  // Get unique categories from catalog items
  const categories = catalogItems
    ? Array.from(new Set(catalogItems.map(item => item.category).filter(Boolean) as string[]))
    : [];
  
  // Filter catalog items based on search term and selected category
  const filteredCatalogItems = catalogItems.filter(item => {
    const matchesSearch = searchTerm
      ? item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesCategory = selectedCategory 
      ? item.category === selectedCategory 
      : true;
    return matchesSearch && matchesCategory && item.isActive;
  });
  
  // Reset form and state when the dialog opens/closes
  useEffect(() => {
    if (open) {
      // Reset form state
      form.reset({
        planCode: "",
        planSerialNumber: generatePlanSerialNumber(),
        ndisFunds: 0,
        endOfPlan: undefined,
        isActive: !hasActivePlan,
      });
      
      // Reset other state
      setDate(undefined);
      setSelectedCatalogItems([]);
      setSearchTerm("");
      setSelectedCategory(null);
      setIsSubmitting(false);
    }
  }, [open, form, hasActivePlan]);
  
  // Helper function to select a catalog item
  const selectCatalogItem = (item: BudgetItemCatalog) => {
    // Check if this item is already in the selected items
    const itemIndex = selectedCatalogItems.findIndex(selected => selected.id === item.id);
    
    if (itemIndex >= 0) {
      // Item already exists, increment quantity
      const newItems = [...selectedCatalogItems];
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        quantity: newItems[itemIndex].quantity + 1
      };
      setSelectedCatalogItems(newItems);
    } else {
      // Add new item with quantity 1
      setSelectedCatalogItems([
        ...selectedCatalogItems,
        { ...item, quantity: 1 }
      ]);
    }
  };
  
  // Function to update item quantity
  const updateItemQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      // Remove item if quantity is zero or negative
      setSelectedCatalogItems(
        selectedCatalogItems.filter(item => item.id !== itemId)
      );
    } else {
      // Update quantity
      setSelectedCatalogItems(
        selectedCatalogItems.map(item => 
          item.id === itemId 
            ? { ...item, quantity } 
            : item
        )
      );
    }
  };
  
  // Function to remove an item
  const removeItem = (itemId: number) => {
    setSelectedCatalogItems(
      selectedCatalogItems.filter(item => item.id !== itemId)
    );
  };
  
  // Calculate the total budget
  const calculateTotalBudget = () => {
    return selectedCatalogItems.reduce((total, item) => {
      return total + (item.defaultUnitPrice * item.quantity);
    }, 0);
  };
  
  // Calculate remaining budget
  const calculateRemainingBudget = () => {
    const availableFunds = form.watch("ndisFunds") || 0;
    const totalAllocated = calculateTotalBudget();
    return availableFunds - totalAllocated;
  };
  
  // Convert date to string format for the form
  const formatDateForForm = (date: Date) => {
    return format(date, "yyyy-MM-dd");
  };
  
  // Handle form submission
  const onSubmit = async (values: BudgetPlanFormValues) => {
    if (isSubmitting) return;
    
    // Check if setting as active plan and there's already an active plan
    if (values.isActive && hasActivePlan) {
      // Show confirmation dialog
      setShowConfirmation(true);
      return;
    }
    
    // Otherwise proceed with submission
    submitPlan(values);
  };
  
  // Handle submission of the form
  const submitPlan = async (values: BudgetPlanFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Prepare budget items from selected catalog items
      const budgetItems = selectedCatalogItems.map(item => ({
        itemCode: item.itemCode,
        description: item.description,
        unitPrice: item.defaultUnitPrice,
        quantity: item.quantity,
        category: item.category
      }));
      
      // Prepare the complete plan data
      const planData = {
        planCode: values.planCode,
        planSerialNumber: values.planSerialNumber || generatePlanSerialNumber(),
        ndisFunds: values.ndisFunds,
        endOfPlan: values.endOfPlan,
        isActive: values.isActive,
        budgetItems: budgetItems
      };
      
      // Create the plan using the context function
      await createPlan(planData);
      
      // Close the dialog
      onOpenChange(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Show success toast
      toast({
        title: "Success",
        description: "Budget plan created successfully",
      });
      
      // Refresh the data
      refreshData();
    } catch (error) {
      console.error("Error creating budget plan:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create budget plan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Create New Budget Plan</DialogTitle>
            <DialogDescription>
              Set up a new budget plan for tracking therapy funding and expenses.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Budget Settings Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center">
                  <CreditCard className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-lg font-semibold">Plan Settings</h3>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form className="space-y-4">
                      <FormField
                        control={form.control}
                        name="planCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              <Tag className="h-3.5 w-3.5" />
                              Plan Code
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., NDIS-2025" 
                                {...field} 
                              />
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
                        name="ndisFunds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              NDIS Funds
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  placeholder="0.00"
                                  className="pl-9"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Total available funds for this plan
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
                            <FormLabel className="flex items-center gap-1">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              End Date
                            </FormLabel>
                            <Popover
                              onOpenChange={(open) => {
                                setIsPickingDate(open);
                              }}
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !date && "text-muted-foreground"
                                    )}
                                  >
                                    {date ? (
                                      format(date, "PPP")
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
                                  selected={date}
                                  onSelect={(selectedDate) => {
                                    if (selectedDate) {
                                      setDate(selectedDate);
                                      field.onChange(formatDateForForm(selectedDate));
                                    } else {
                                      setDate(undefined);
                                      field.onChange(undefined);
                                    }
                                  }}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              When this plan expires (leave blank if no expiration)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Set as Active Plan</FormLabel>
                              <FormDescription>
                                {hasActivePlan 
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
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              {/* Budget Summary */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center">
                  <Calculator className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-lg font-semibold">Budget Summary</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total NDIS Funds:</span>
                      <span className="font-semibold">{formatCurrency(form.watch("ndisFunds") || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total Allocated:</span>
                      <span className="font-semibold">{formatCurrency(calculateTotalBudget())}</span>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Remaining Funds:</span>
                        <span 
                          className={cn(
                            "font-semibold",
                            calculateRemainingBudget() < 0 ? "text-red-500" : "text-green-600"
                          )}
                        >
                          {formatCurrency(calculateRemainingBudget())}
                        </span>
                      </div>
                    </div>
                    
                    {calculateRemainingBudget() < 0 && (
                      <div className="mt-2 text-xs text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        The budget allocation exceeds available funds
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column - Budget Items */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div className="flex items-center">
                    <Tag className="h-5 w-5 text-primary mr-2" />
                    <h3 className="text-lg font-semibold">Budget Items</h3>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {selectedCatalogItems.length} items selected
                  </Badge>
                </CardHeader>
                <CardContent>
                  {/* Selected Items */}
                  <div className="space-y-4">
                    {selectedCatalogItems.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCatalogItems.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3 border rounded-md"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.description}</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.itemCode}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-500">
                                Unit Price: {formatCurrency(item.defaultUnitPrice)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-r-none"
                                  onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                >
                                  -
                                </Button>
                                <Input
                                  className="h-8 w-16 rounded-none text-center"
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-l-none"
                                  onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                >
                                  +
                                </Button>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        No budget items selected yet
                      </div>
                    )}
                    
                    {/* Item Selection */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2">Add Budget Items</h4>
                      
                      <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            placeholder="Search catalog..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        
                        <Select
                          value={selectedCategory || ""}
                          onValueChange={(value) => setSelectedCategory(value || null)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Categories</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="max-h-[250px] overflow-y-auto border rounded-md p-1">
                        {filteredCatalogItems.length > 0 ? (
                          <div className="space-y-1">
                            {filteredCatalogItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => selectCatalogItem(item)}
                              >
                                <div>
                                  <div className="font-medium">{item.description}</div>
                                  <div className="text-xs text-gray-500">
                                    {item.itemCode} - {formatCurrency(item.defaultUnitPrice)}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            No matching catalog items found
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting || calculateRemainingBudget() < 0}
            >
              {isSubmitting ? "Creating Plan..." : "Create Budget Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog for Active Plan */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Active Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the current active budget plan. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => submitPlan(form.getValues())}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Plan..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}