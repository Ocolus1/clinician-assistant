import React, { useMemo, useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  unifiedBudgetFormSchema,
  UnifiedBudgetFormValues,
  budgetItemSchema
} from "./BudgetFormSchema";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BudgetValidation } from "./BudgetValidation";
import { BudgetItemRow } from "./BudgetItemRow";
import { BudgetCatalogSelector } from "./BudgetCatalogSelector";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useBudgetFeature, BudgetPlan, BudgetItem } from "./BudgetFeatureContext";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CatalogItem, RowBudgetItem } from "./BudgetTypes";

// We're using the budgetItemSchema imported from BudgetFormSchema.ts
// We're using the unifiedBudgetFormSchema directly from BudgetFormSchema.ts

interface UnifiedBudgetManagerProps {
  clientId: number;
}

export function UnifiedBudgetManager({ clientId }: UnifiedBudgetManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fixed budget constant - set to 2000 which is the fixed total value of items added when client was created
  const FIXED_BUDGET_AMOUNT = 2000;
  const [formInitialized, setFormInitialized] = useState(false);
  
  // Use the budget feature context
  const { 
    activePlan, 
    setActivePlan, 
    budgetItems, 
    setBudgetItems
  } = useBudgetFeature();

  // Get active budget plan
  const plansQuery = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-settings`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget plans');
      }
      const data = await response.json();
      // Handle both array and single object responses
      return Array.isArray(data) ? data : [data];
    }
  });

  // Get budget items for the active plan
  const itemsQuery = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-items`, activePlan?.id],
    queryFn: async () => {
      if (!activePlan) {
        return [];
      }
      const response = await fetch(`/api/clients/${clientId}/budget-items?budgetSettingsId=${activePlan.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget items');
      }
      return response.json();
    },
    enabled: !!activePlan
  });

  // Get catalog items
  const catalogQuery = useQuery({
    queryKey: ['/api/budget-catalog'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/budget-catalog');
        if (!response.ok) {
          throw new Error('Failed to fetch catalog items');
        }
        const data = await response.json();
        // Return empty array if data is not valid
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching catalog items:', error);
        return []; // Return empty array on error for graceful degradation
      }
    },
    retry: 2 // Add retry logic to handle temporary network issues
  });

  // Set active plan from data (first active plan by default)
  useEffect(() => {
    if (plansQuery.data && plansQuery.data.length > 0 && !activePlan) {
      const activePlans = plansQuery.data.filter((plan: any) => plan.isActive);
      if (activePlans.length > 0) {
        setActivePlan(activePlans[0]);
      } else {
        setActivePlan(plansQuery.data[0]);
      }
    }
  }, [plansQuery.data, activePlan, setActivePlan]);

  // Form setup with budget items
  const form = useForm<UnifiedBudgetFormValues>({
    resolver: zodResolver(unifiedBudgetFormSchema),
    defaultValues: {
      items: [],
      totalBudget: 0, // Will be updated with client-specific budget
      totalAllocated: 0,
      remainingBudget: 0 // Will be updated with client-specific budget
    }
  });

  // Initialize form with data when it's available
  useEffect(() => {
    if (itemsQuery.data && activePlan && !formInitialized) {
      const initialItems = itemsQuery.data.map((item: any) => ({
        id: item.id,
        itemCode: item.itemCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity,
        name: item.name,
        category: item.category,
        budgetSettingsId: item.budgetSettingsId,
        clientId: item.clientId
      }));

      // Calculate total allocated from items
      const totalAllocated = initialItems.reduce(
        (sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0
      );

      // Get available funds from active plan or default to the fixed budget
      const availableFunds = FIXED_BUDGET_AMOUNT; // Always use the fixed budget amount of 2000

      // Calculate remaining budget - unused amount for now
      const remainingBudget = availableFunds; // Remaining budget is total budget - used (not allocated)

      // Set default values with real data
      form.reset({
        items: initialItems,
        totalBudget: availableFunds,
        totalAllocated: totalAllocated,
        remainingBudget: remainingBudget
      });

      // Update budget items in context
      setBudgetItems(initialItems);
      
      // Mark form as initialized to prevent redundant resets
      setFormInitialized(true);
    }
  }, [itemsQuery.data, activePlan, formInitialized, form, setBudgetItems]);

  // Use field array to manage budget items
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Items from form state
  const items = form.watch("items") || [];

  // Add a new catalog item to the form
  const handleAddCatalogItem = (catalogItem: CatalogItem, quantity: number) => {
    // Get current allocated total
    const currentTotal = form.getValues().totalAllocated || 0;
    
    // Calculate new item cost
    const itemCost = catalogItem.defaultUnitPrice * quantity;
    
    // Use fixed budget amount
    
    // Check if this would exceed the budget
    if (currentTotal + itemCost > FIXED_BUDGET_AMOUNT) {
      toast({
        title: "Budget Exceeded",
        description: `Adding this item would exceed the available budget of ${formatCurrency(FIXED_BUDGET_AMOUNT)}`,
        variant: "destructive"
      });
      return;
    }
    
    // Create new item
    const newItem = {
      id: -1 * (Date.now()), // Temporary negative ID to identify as new
      itemCode: catalogItem.itemCode,
      description: catalogItem.description,
      quantity: quantity,
      unitPrice: catalogItem.defaultUnitPrice,
      total: catalogItem.defaultUnitPrice * quantity,
      isNew: true,
      name: catalogItem.description,
      category: catalogItem.category || "Other"
    };
    
    // Add to field array
    append(newItem);
    
    // Update totals
    const newTotalAllocated = currentTotal + itemCost;
    
    // Update the allocated total
    form.setValue("totalAllocated", newTotalAllocated);
    
    // Remaining budget stays at FIXED_BUDGET_AMOUNT since it's calculated as total budget - used (not allocated)
    form.setValue("remainingBudget", FIXED_BUDGET_AMOUNT);
    
    // Show success notification
    toast({
      title: "Item Added",
      description: `Added ${quantity} x ${catalogItem.itemCode} to budget.`
    });
  };

  // Handle updating item quantity
  const handleUpdateItemQuantity = (index: number, newQuantity: number) => {
    const item = form.getValues().items[index];
    const oldQuantity = item.quantity;
    const unitPrice = item.unitPrice;
    
    // Skip if no change
    if (oldQuantity === newQuantity) return;
    
    // Calculate difference in allocated amount
    const oldTotal = oldQuantity * unitPrice;
    const newTotal = newQuantity * unitPrice;
    const difference = newTotal - oldTotal;
    
    // Get current totals
    const currentAllocated = form.getValues().totalAllocated || 0;
    const currentRemaining = form.getValues().remainingBudget || 0;
    
    // Check if this would exceed the budget
    if (difference > 0 && difference > currentRemaining) {
      toast({
        title: "Budget Exceeded",
        description: `Increasing this quantity would exceed the available budget.`,
        variant: "destructive"
      });
      return;
    }
    
    // Update item
    const updatedItem = {
      ...item,
      quantity: newQuantity,
      total: newTotal
    };
    
    // Update in field array
    update(index, updatedItem);
    
    // Update totals
    const newTotalAllocated = currentAllocated + difference;
    form.setValue("totalAllocated", newTotalAllocated);
    
    // Remaining budget stays at FIXED_BUDGET_AMOUNT since it's calculated as total budget - used (not allocated)
    form.setValue("remainingBudget", FIXED_BUDGET_AMOUNT);
  };

  // Handle deleting an item
  const handleDeleteItem = (index: number) => {
    const item = form.getValues().items[index];
    const itemTotal = item.quantity * item.unitPrice;
    
    // Get current totals
    const currentAllocated = form.getValues().totalAllocated || 0;
    const currentRemaining = form.getValues().remainingBudget || 0;
    
    // Update totals
    const newTotalAllocated = currentAllocated - itemTotal;
    form.setValue("totalAllocated", newTotalAllocated);
    
    // Remaining budget stays at FIXED_BUDGET_AMOUNT since it's calculated as total budget - used (not allocated)
    form.setValue("remainingBudget", FIXED_BUDGET_AMOUNT);
    
    // Remove from field array
    remove(index);
    
    // Show success notification
    toast({
      title: "Item Removed",
      description: `Removed ${item.itemCode} from budget.`
    });
  };

  // Save changes mutation
  const saveMutation = useMutation({
    mutationFn: async (data: UnifiedBudgetFormValues) => {
      // Ensure items is not undefined
      const items = data.items || [];
      
      // Filter items to update (existing items) and items to create (new items)
      const itemsToUpdate = items.filter(item => !item.isNew && item.id);
      const itemsToCreate = items.filter(item => item.isNew);
      
      // Debug log
      console.log("Items to update:", itemsToUpdate);
      console.log("Items to create:", itemsToCreate);
      
      try {
        const allPromises = [];
        
        // Update existing items
        if (itemsToUpdate.length > 0) {
          const updatePromises = itemsToUpdate.map(item => 
            apiRequest('PUT', `/api/budget-items/${item.id}`, {
              quantity: item.quantity,
              unitPrice: item.unitPrice
            })
          );
          allPromises.push(...updatePromises);
        }
        
        // Create new items
        if (itemsToCreate.length > 0 && activePlan) {
          const createPromises = itemsToCreate.map(item => 
            apiRequest('POST', `/api/budget-items`, {
              clientId: clientId,
              budgetSettingsId: activePlan.id,
              itemCode: item.itemCode,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              name: item.name || item.description,
              category: item.category
            })
          );
          allPromises.push(...createPromises);
        }
        
        // We no longer need to update budget settings as we're using the client-specific values
        // Removed the automatic budget settings update to maintain client budget settings integrity
        
        // Execute all promises or return empty array if no changes
        if (allPromises.length === 0) {
          return [];
        }
        
        const results = await Promise.all(allPromises);
        return results;
      } catch (error) {
        console.error("Error during save operation:", error);
        throw error; // Re-throw to trigger onError handler
      }
    },
    onSuccess: (results) => {
      // If no results returned (no changes made), show different message
      if (results && results.length === 0) {
        toast({
          title: 'No Changes',
          description: 'No changes were detected to save.'
        });
        return;
      }
      
      toast({
        title: 'Success',
        description: 'Budget items updated successfully'
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${clientId}/budget-items`] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${clientId}/budget-settings`] 
      });
      
      // Reset the form initialized state to trigger form refill with fresh data
      setFormInitialized(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update budget items',
        variant: 'destructive'
      });
      console.error('Failed to update budget items:', error);
    }
  });

  // Submit handler
  const onSubmit = (data: UnifiedBudgetFormValues) => {
    console.log("Submit handler called with data:", data);
    
    // Prevent double submission
    if (saveMutation.isPending) {
      console.log("Save mutation is already pending, ignoring submission");
      return;
    }
    
    // Log form state for debugging
    console.log("Form state:", {
      isDirty: form.formState.isDirty,
      isSubmitting: form.formState.isSubmitting,
      errors: form.formState.errors
    });
    
    // Log items that will be updated/created
    console.log("Items to save:", {
      total: data.items.length,
      new: data.items.filter(item => item.isNew).length,
      existing: data.items.filter(item => !item.isNew).length
    });
    
    // Perform the save operation
    console.log("Triggering save mutation");
    saveMutation.mutate(data);
  };

  // Loading state
  if (plansQuery.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Loading budget information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (plansQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Error loading budget data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              An error occurred while loading budget data. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No plans state
  if (plansQuery.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>No budget plans available</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              There are no budget plans created for this client. 
              Please create a new budget plan to manage budget items.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Budget Plan: {activePlan?.planCode || 'Default Plan'}
        </CardTitle>
        <CardDescription>
          Available Funds: {formatCurrency(
            activePlan && activePlan.availableFunds
              ? (typeof activePlan.availableFunds === 'string' 
                  ? parseFloat(activePlan.availableFunds) 
                  : activePlan.availableFunds)
              : 0
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Budget Validation */}
            <BudgetValidation 
              totalBudget={FIXED_BUDGET_AMOUNT} // Set to fixed budget amount which was added when client was created
              totalAllocated={form.watch("totalAllocated") || 0}
              remainingBudget={FIXED_BUDGET_AMOUNT} // Total remaining budget is total budget minus used (not allocated)
              originalAllocated={FIXED_BUDGET_AMOUNT} // The original allocated budget amount
            />
            
            {/* Current Budget Items */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Current Budget Allocations</h3>
              
              {fields.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No budget items added yet. Use the catalog selector below to add items.
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((item, index) => (
                    <BudgetItemRow 
                      key={item.id || index}
                      item={item as unknown as RowBudgetItem}
                      index={index}
                      onUpdateQuantity={handleUpdateItemQuantity}
                      onDelete={handleDeleteItem}
                      allItems={fields.map(field => field as unknown as RowBudgetItem)}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Catalog Item Selector */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Add New Budget Item</h3>
              
              {catalogQuery.isPending ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : catalogQuery.isError ? (
                <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-700">
                  Failed to load catalog items. Please try again.
                </div>
              ) : !catalogQuery.data ? (
                <div className="p-4 border border-amber-300 bg-amber-50 rounded-md text-amber-700">
                  No catalog items available. Please check your configuration.
                </div>
              ) : (
                <BudgetCatalogSelector 
                  catalogItems={catalogQuery.data || []}
                  onAddItem={handleAddCatalogItem}
                  remainingBudget={FIXED_BUDGET_AMOUNT - (form.watch("totalAllocated") || 0)} // Calculate remaining allocation
                  activePlan={activePlan}
                />
              )}
            </div>
            
            <Separator />
            
            {/* Form Submission */}
            <div className="flex flex-col items-end gap-2">
              {/* Show notification about unsaved changes */}
              {(items.some(item => item.isNew) || form.formState.isDirty) && !saveMutation.isPending ? (
                <div className="mb-2 text-sm text-amber-600 font-medium p-2 bg-amber-50 border border-amber-200 rounded-md w-full text-center">
                  You have unsaved changes. Click the button below to save all changes.
                </div>
              ) : null}
              
              {/* Show saving indicator when in progress */}
              {saveMutation.isPending && (
                <div className="mb-2 text-sm text-blue-600 font-medium p-2 bg-blue-50 border border-blue-200 rounded-md w-full text-center flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving your budget changes...
                </div>
              )}
              
              {/* Show success message after saving */}
              {saveMutation.isSuccess && !form.formState.isDirty && (
                <div className="mb-2 text-sm text-green-600 font-medium p-2 bg-green-50 border border-green-200 rounded-md w-full text-center">
                  All changes have been saved successfully.
                </div>
              )}
              
              {/* Check if we have any items to save or form is dirty before enabling save button */}
              <Button 
                type="submit" 
                disabled={
                  saveMutation.isPending || 
                  (!(form.formState.isDirty || items.some(item => item.isNew)))
                }
                className="w-full md:w-auto"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : "Save All Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}