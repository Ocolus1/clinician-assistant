import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  DollarSign, 
  Plus, 
  Calculator, 
  Trash, 
  CalendarIcon, 
  Search, 
  Tag,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";

// Import schema types
import type { 
  BudgetSettings, 
  BudgetItemCatalog, 
  BudgetItem,
  InsertBudgetSettings,
  InsertBudgetItem,
  InsertBudgetItemCatalog
} from "@shared/schema";

// Form schema for the plan creation
const createPlanSchema = z.object({
  planCode: z.string().min(1, "Plan code is required"),
  planSerialNumber: z.string().optional(),
  ndisFunds: z.coerce.number().positive("NDIS funds must be positive"),
  isActive: z.boolean().default(false),
  endOfPlan: z.string().optional(),
});

type CreatePlanValues = z.infer<typeof createPlanSchema>;

// Budget item catalog form schema
const catalogItemSchema = z.object({
  itemCode: z.string().min(1, "Item code is required"),
  description: z.string().min(1, "Description is required"),
  defaultUnitPrice: z.coerce.number().min(0.01, "Default unit price must be greater than 0"),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CatalogItemFormValues = z.infer<typeof catalogItemSchema>;

// Interface for the component props
interface EnhancedBudgetPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onSuccess?: () => void;
}

export function EnhancedBudgetPlanDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess
}: EnhancedBudgetPlanDialogProps) {
  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCatalogItemForm, setShowCatalogItemForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Budget items state management
  type SelectedItem = BudgetItemCatalog & { quantity: number };
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<SelectedItem[]>([]);

  // Generate unique plan serial number
  function generatePlanSerialNumber() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `PLAN-${timestamp}-${random}`;
  }

  // Fetch budget settings to check for active plans
  const { data: existingSettings = [] } = useQuery<BudgetSettings[]>({
    queryKey: ["/api/clients", clientId, "budget-settings", "all"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/clients/${clientId}/budget-settings?all=true`);
        return res.json();
      } catch (error) {
        console.error("Error fetching budget settings:", error);
        return [];
      }
    },
  });

  // Check if there's already an active plan
  const hasActivePlan = existingSettings.some(plan => plan.isActive);

  // Initialize form with default values
  const form = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      planCode: "",
      planSerialNumber: generatePlanSerialNumber(),
      ndisFunds: 0,
      isActive: !hasActivePlan, // Default to active if no active plan exists
      endOfPlan: undefined,
    },
  });

  // Initialize catalog item form with default values
  const catalogForm = useForm<CatalogItemFormValues>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      defaultUnitPrice: 0.01, // Set a valid minimum default price
      category: "",
      isActive: true
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

  // Create a new budget plan
  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      // Format data for API
      const planData = {
        planCode: data.planCode,
        planSerialNumber: data.planSerialNumber,
        ndisFunds: data.ndisFunds,
        isActive: data.isActive,
        endOfPlan: data.endOfPlan,
        clientId: clientId
      };
      
      // Create the plan
      const res = await apiRequest("POST", `/api/clients/${clientId}/budget-settings`, planData);
      const newPlan = await res.json();
      
      // Create budget items for the new plan
      if (data.budgetItems && data.budgetItems.length > 0) {
        for (const item of data.budgetItems) {
          await apiRequest("POST", `/api/clients/${clientId}/budget-items`, {
            ...item,
            clientId: clientId,
            budgetSettingsId: newPlan.id
          });
        }
      }
      
      return newPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-items"] });
      
      toast({
        title: "Success",
        description: "Budget plan created successfully",
      });
      
      // Close the dialog
      onOpenChange(false);
      
      // Reset state
      setSelectedCatalogItems([]);
      setSelectedDate(undefined);
      setShowConfirmation(false);
      form.reset();
      
      // Call onSuccess if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Error creating budget plan:", error);
      toast({
        title: "Error",
        description: "Failed to create budget plan. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Create a new catalog item
  const createCatalogItemMutation = useMutation({
    mutationFn: async (data: CatalogItemFormValues) => {
      const res = await apiRequest("POST", `/api/budget-catalog`, data);
      return res.json();
    },
    onSuccess: (data) => {
      catalogForm.reset();
      setShowCatalogItemForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/budget-catalog"] });
      
      // Add the new catalog item to selected items automatically
      setSelectedCatalogItems([
        ...selectedCatalogItems, 
        { ...data, quantity: 1 }
      ]);
      
      toast({
        title: "Success",
        description: "Catalog item added successfully",
      });
    },
    onError: (error) => {
      console.error("Error adding catalog item:", error);
      toast({
        title: "Error",
        description: "Failed to add catalog item. Please check the form and try again.",
        variant: "destructive",
      });
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

  // Helper function to select a catalog item
  const selectCatalogItem = (item: BudgetItemCatalog) => {
    if (!selectedCatalogItems.some(existingItem => existingItem.id === item.id)) {
      setSelectedCatalogItems([
        ...selectedCatalogItems, 
        { ...item, quantity: 1 }
      ]);
    }
  };
  
  // Function to update the quantity of a selected item
  const updateItemQuantity = (itemId: number, quantity: number) => {
    setSelectedCatalogItems(
      selectedCatalogItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: Math.max(1, quantity) } 
          : item
      )
    );
  };

  // Function to remove a selected item
  const removeSelectedItem = (itemId: number) => {
    setSelectedCatalogItems(
      selectedCatalogItems.filter(item => item.id !== itemId)
    );
  };

  // Calculate total budget from selected items
  const calculateTotalBudget = () => {
    return selectedCatalogItems.reduce((total, item) => {
      return total + (item.defaultUnitPrice * item.quantity);
    }, 0);
  };
  
  // Calculate row total for an item
  const calculateRowTotal = (item: SelectedItem) => {
    return item.defaultUnitPrice * item.quantity;
  };
  
  // Calculate remaining funds after allocated budget
  const calculateRemainingFunds = () => {
    const ndisFunds = form.watch("ndisFunds") || 0;
    const totalBudget = calculateTotalBudget();
    return ndisFunds - totalBudget;
  };
  
  // Check if budget exceeds NDIS funds
  const isBudgetExceeded = () => {
    return calculateRemainingFunds() < 0;
  };

  // Handle form submission
  function onSubmit(values: CreatePlanValues) {
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    // Validate if budget exceeds NDIS funds
    if (isBudgetExceeded()) {
      form.setError("ndisFunds", { 
        type: "manual", 
        message: "Total budget cannot exceed NDIS funds" 
      });
      return;
    }
    
    // Prepare the data
    const planData = {
      planSerialNumber: values.planSerialNumber || generatePlanSerialNumber(),
      planCode: values.planCode,
      ndisFunds: Number(parseFloat(values.ndisFunds.toString()).toFixed(2)),
      isActive: values.isActive,
      endOfPlan: values.endOfPlan || null,
      budgetItems: selectedCatalogItems.map(item => ({
        itemCode: item.itemCode,
        description: item.description,
        unitPrice: item.defaultUnitPrice,
        quantity: item.quantity,
        category: item.category
      }))
    };
    
    // If the plan is to be active and there's already an active plan
    if (values.isActive && hasActivePlan) {
      // Show confirmation dialog
      setShowConfirmation(true);
    } else {
      // Submit directly if no active plan exists or new plan won't be active
      setIsSubmitting(true);
      createPlanMutation.mutate(planData);
    }
  }

  // Function to handle confirmation and create plan
  function handleConfirmActivePlan() {
    const values = form.getValues();
    
    // Prepare the data
    const planData = {
      planSerialNumber: values.planSerialNumber || generatePlanSerialNumber(),
      planCode: values.planCode,
      ndisFunds: Number(parseFloat(values.ndisFunds.toString()).toFixed(2)),
      isActive: values.isActive,
      endOfPlan: values.endOfPlan || null,
      budgetItems: selectedCatalogItems.map(item => ({
        itemCode: item.itemCode,
        description: item.description,
        unitPrice: item.defaultUnitPrice,
        quantity: item.quantity,
        category: item.category
      }))
    };
    
    setIsSubmitting(true);
    createPlanMutation.mutate(planData);
    setShowConfirmation(false);
  }

  // Handle catalog item form submission
  function onCatalogItemSubmit(data: CatalogItemFormValues) {
    createCatalogItemMutation.mutate(data);
  }

  // Reset form when dialog is opened
  useEffect(() => {
    if (open) {
      const newSerialNumber = generatePlanSerialNumber();
      
      form.reset({
        planCode: "",
        planSerialNumber: newSerialNumber,
        ndisFunds: 0,
        isActive: !hasActivePlan,
        endOfPlan: undefined,
      });
      
      setSelectedCatalogItems([]);
      setSelectedDate(undefined);
      setIsSubmitting(false);
    }
  }, [open, form, hasActivePlan]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Create New Budget Plan</DialogTitle>
            <DialogDescription>
              Add a new budget plan to track funding and expenses.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 pt-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left column: Budget Items List */}
                  <div className="lg:col-span-7 space-y-6">
                    <Card className="border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-gray-50 p-3 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-700">Planned Budget Items</h3>
                          <div className="text-sm text-gray-700">
                            Total: <span className={cn(
                              "font-semibold",
                              isBudgetExceeded() ? "text-red-600" : "text-green-600"
                            )}>
                              {formatCurrency(calculateTotalBudget())}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        {selectedCatalogItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <Calculator className="h-12 w-12 text-gray-300 mb-3" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">No Items Added</h3>
                            <p className="text-gray-500 mb-4 max-w-sm">
                              Add budget items from the catalog to create your plan.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedCatalogItems.map((item) => (
                              <Card key={item.id} className="overflow-hidden border-gray-200 hover:border-gray-300 transition-colors">
                                <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
                                  <div className="flex items-center">
                                    <div className="font-medium text-gray-700">{item.itemCode}</div>
                                    {item.category && (
                                      <div className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                                        {item.category}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeSelectedItem(item.id)}
                                    className="h-8 w-8 text-gray-500 hover:text-red-600"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="p-4">
                                  <div className="text-sm text-gray-600 mb-3">
                                    {item.description}
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                      <div className="flex items-center">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 rounded-r-none"
                                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                          disabled={item.quantity <= 1}
                                        >
                                          -
                                        </Button>
                                        <Input
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                          className="h-8 w-16 text-center rounded-none"
                                          min={1}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 rounded-l-none"
                                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                        >
                                          +
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-gray-500">Total</div>
                                      <div className="font-medium text-gray-700">
                                        {formatCurrency(calculateRowTotal(item))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                  
                  {/* Right column: Budget Settings & Item Entry */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Budget Settings Card */}
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 p-4">
                        <CardTitle className="text-lg font-medium text-gray-700">Budget Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {/* Active Status Toggle */}
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={field.value === true}
                                    onCheckedChange={field.onChange}
                                  />
                                  <FormLabel className="text-sm font-medium cursor-pointer m-0">
                                    Plan Status: <span className={field.value ? "text-green-600" : "text-gray-500"}>
                                      {field.value ? "Active" : "Inactive"}
                                    </span>
                                    {hasActivePlan && field.value && <span className="text-amber-600 text-xs ml-2">(Another plan is currently active)</span>}
                                  </FormLabel>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* NDIS Funds Input */}
                        <FormField
                          control={form.control}
                          name="ndisFunds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5" />
                                NDIS Funds
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="pl-10"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value) || 0);
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                              {!form.formState.errors.ndisFunds && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Remaining: </span>
                                  <span className={isBudgetExceeded() ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                    {formatCurrency(calculateRemainingFunds())}
                                  </span>
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                        
                        {/* Plan Code Input */}
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
                                <Input placeholder="E.g., NDIS 2025" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* End of Plan Date Picker */}
                        <FormField
                          control={form.control}
                          name="endOfPlan"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="text-sm font-medium">End of Plan</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                      onClick={() => setIsPickingDate(true)}
                                      onBlur={() => setIsPickingDate(false)}
                                    >
                                      {field.value ? (
                                        format(new Date(field.value), "PPP")
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
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => {
                                      setSelectedDate(date);
                                      if (date) {
                                        field.onChange(format(date, "yyyy-MM-dd"));
                                      }
                                      setIsPickingDate(false);
                                    }}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                    
                    {/* Budget Item Catalog */}
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 p-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg font-medium text-gray-700">Add Budget Items</CardTitle>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCatalogItemForm(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" /> New Item
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Search and Filter */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1 relative">
                              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                              <Input
                                placeholder="Search items..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                            <Select
                              value={selectedCategory || ""}
                              onValueChange={(value) => setSelectedCategory(value || null)}
                            >
                              <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="All categories" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">All categories</SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Catalog Items */}
                          <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                            {filteredCatalogItems.length === 0 ? (
                              <div className="text-center py-6 text-gray-500">
                                No items found matching your search criteria
                              </div>
                            ) : (
                              filteredCatalogItems.map((item) => (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "flex justify-between items-center p-3 rounded-md cursor-pointer hover:bg-gray-50 transition-colors",
                                    selectedCatalogItems.some(selectedItem => selectedItem.id === item.id) 
                                      ? "border-2 border-primary bg-primary/5" 
                                      : "border border-gray-200"
                                  )}
                                  onClick={() => selectCatalogItem(item)}
                                >
                                  <div>
                                    <div className="font-medium text-gray-700">
                                      {item.itemCode}
                                      {item.category && (
                                        <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                                          {item.category}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{item.description}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-gray-700">{formatCurrency(item.defaultUnitPrice)}</div>
                                    <div className="text-xs text-gray-500">per unit</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={isSubmitting || form.formState.isSubmitting || createPlanMutation.isPending}
                        className="min-w-[120px]"
                      >
                        {(isSubmitting || form.formState.isSubmitting || createPlanMutation.isPending) 
                          ? "Creating..." 
                          : "Save & Continue"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog for Setting Active Plan */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Active Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Another plan is currently set as active. Making this new plan active will deactivate the current active plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmActivePlan}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Catalog Item Form Dialog */}
      <Dialog open={showCatalogItemForm} onOpenChange={setShowCatalogItemForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Catalog Item</DialogTitle>
            <DialogDescription>
              Add a new item to the catalog for future use in budgets.
            </DialogDescription>
          </DialogHeader>
          <Form {...catalogForm}>
            <form onSubmit={catalogForm.handleSubmit(onCatalogItemSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={catalogForm.control}
                  name="itemCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Code <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="SLP001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={catalogForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="Therapy Services" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={catalogForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Speech Therapy - 1 hour session" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={catalogForm.control}
                name="defaultUnitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Unit Price <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="pl-10"
                          step="0.01"
                          {...field}
                          onChange={(e) => {
                            field.onChange(parseFloat(e.target.value) || 0.01);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={catalogForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-medium cursor-pointer">
                      Active Item
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCatalogItemForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCatalogItemMutation.isPending}>
                  {createCatalogItemMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}