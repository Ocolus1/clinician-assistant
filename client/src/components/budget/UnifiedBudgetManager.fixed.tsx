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
  
  // The budget amount is now client-specific and should be pulled from the active plan
  const [formInitialized, setFormInitialized] = useState(false);
  // Add debug mode for troubleshooting
  const [debugMode, setDebugMode] = useState(true);
  
  // Use the budget feature context
  const { 
    activePlan, 
    setActivePlan, 
    budgetItems, 
    setBudgetItems
  } = useBudgetFeature();
  
  // Get client-specific budget amount from active plan
  const getClientBudget = () => activePlan?.availableFunds || 0;

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

      // Get available funds from the active plan - this is client-specific
      const availableFunds = activePlan?.availableFunds || 0;

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
    // Validate inputs first
    if (!catalogItem.itemCode) {
      toast({
        title: "Invalid Item",
        description: "The selected item is missing a required item code.",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure quantity is a positive number
    const validQuantity = Math.max(1, Number(quantity) || 1);
    
    // Ensure unit price is a valid number
    const unitPrice = Math.max(0, Number(catalogItem.defaultUnitPrice) || 0);
    
    // Get current allocated total
    const currentTotal = form.getValues().totalAllocated || 0;
    
    // Calculate new item cost with validated values
    const itemCost = unitPrice * validQuantity;
    
    // Check if this would exceed the budget (client-specific)
    const clientBudget = getClientBudget();
    if (currentTotal + itemCost > clientBudget) {
      toast({
        title: "Budget Exceeded",
        description: `Adding this item would exceed the available budget of ${formatCurrency(clientBudget)}`,
        variant: "destructive"
      });
      return;
    }
    
    // Create new item with explicit isNew flag and properly validated data
    const newItem = {
      id: -1 * (Date.now()), // Temporary negative ID to identify as new
      itemCode: catalogItem.itemCode,
      description: catalogItem.description || catalogItem.itemCode,
      quantity: validQuantity,
      unitPrice: unitPrice,
      total: unitPrice * validQuantity,
      isNew: true, // This flag is critical for identifying items to create
      name: catalogItem.description || catalogItem.itemCode,
      category: catalogItem.category || "Other",
      clientId: Number(clientId),
      budgetSettingsId: activePlan?.id ? Number(activePlan.id) : undefined
    };
    
    console.log("Created new budget item:", newItem);
    
    // Add to field array
    append(newItem);
    
    // Update totals
    const newTotalAllocated = currentTotal + itemCost;
    
    // Update the allocated total
    form.setValue("totalAllocated", newTotalAllocated);
    
    // Remaining budget is calculated from client-specific budget - used (not allocated)
    form.setValue("remainingBudget", getClientBudget());
    
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
    
    // Remaining budget is calculated from client-specific budget
    form.setValue("remainingBudget", getClientBudget());
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
    
    // Remaining budget is calculated from client-specific budget
    form.setValue("remainingBudget", getClientBudget());
    
    // Remove from field array
    remove(index);
    
    // Show success notification
    toast({
      title: "Item Removed",
      description: `Removed ${item.itemCode} from budget.`
    });
  };

  // Save changes mutation - improved implementation
  const saveMutation = useMutation({
    mutationFn: async (data: UnifiedBudgetFormValues) => {
      // Ensure items is not undefined
      const items = data.items || [];
      
      // Filter items to update (existing items) and items to create (new items)
      // Make sure we properly identify new items - they either have isNew=true OR negative ID (temporary)
      const itemsToUpdate = items.filter(item => !item.isNew && item.id && item.id > 0);
      const itemsToCreate = items.filter(item => item.isNew || !item.id || item.id < 0);
      
      console.log("Items check for creation - all items:", items);
      console.log("Items with isNew flag:", items.filter(item => item.isNew).length);
      console.log("Items with negative ID:", items.filter(item => item.id && item.id < 0).length);
      
      // Debug log
      console.log("Save mutation triggered");
      console.log("Form data:", data);
      console.log("Total items to save:", items.length);
      console.log("Items to update:", itemsToUpdate.length, itemsToUpdate);
      console.log("Items to create:", itemsToCreate.length, itemsToCreate);
      
      try {
        const allPromises = [];
        
        // Update existing items
        if (itemsToUpdate.length > 0) {
          console.log("Processing updates for existing items...");
          const updatePromises = itemsToUpdate.map(item => {
            console.log(`Updating item ID ${item.id} with quantity ${item.quantity} and unit price ${item.unitPrice}`);
            return apiRequest('PUT', `/api/budget-items/${item.id}`, {
              quantity: item.quantity,
              unitPrice: item.unitPrice
            });
          });
          allPromises.push(...updatePromises);
        }
        
        // Create new items
        if (itemsToCreate.length > 0 && activePlan) {
          console.log("Processing creation of new items...");
          const createPromises = itemsToCreate.map(item => {
            console.log(`Creating new item ${item.itemCode} with quantity ${item.quantity} for client ${clientId}`);
            // Ensure all values are of the correct type
            const payload = {
              budgetSettingsId: activePlan.id,
              itemCode: item.itemCode,
              description: item.description,
              // Ensure quantity is a number
              quantity: Number(item.quantity),
              // Ensure unitPrice is a number
              unitPrice: Number(item.unitPrice),
              name: item.name || item.description,
              category: item.category || "Other"
            };
            console.log("Sending formatted payload:", payload);
            return apiRequest('POST', `/api/clients/${clientId}/budget-items`, payload);
          });
          allPromises.push(...createPromises);
        }
        
        // Execute all promises or return empty array if no changes
        if (allPromises.length === 0) {
          console.log("No changes detected to save");
          return {
            success: true,
            message: "No changes detected to save",
            results: []
          };
        }
        
        console.log(`Executing ${allPromises.length} save operations...`);
        const results = await Promise.all(allPromises);
        console.log("Save operations completed successfully:", results);
        
        return {
          success: true,
          message: "Budget items saved successfully",
          results: results
        };
      } catch (error) {
        console.error("Error during save operation:", error);
        throw error; // Re-throw to trigger onError handler
      }
    },
    onSuccess: (response: any) => {
      console.log("Save mutation success handler called with response:", response);
      
      // Check the response shape to handle both formats (array or object)
      if (response && typeof response === 'object') {
        // Handle the new response format (object with success, message, results)
        if ('success' in response && 'results' in response) {
          toast({
            title: 'Success',
            description: response.message || 'Budget changes saved'
          });
          
          // Check if there were actual changes made
          const results = response.results || [];
          if (Array.isArray(results) && results.length === 0) {
            console.log("No changes were applied");
            return;
          }
        } 
        // Handle the old format (array of results)
        else if (Array.isArray(response)) {
          if (response.length === 0) {
            toast({
              title: 'No Changes',
              description: 'No budget changes were detected'
            });
          } else {
            toast({
              title: 'Success',
              description: 'Budget changes saved successfully'
            });
          }
        }
        // If response format is unknown, show a generic success message
        else {
          toast({
            title: 'Success',
            description: 'Budget changes saved successfully'
          });
        }
      } 
      // Default success message for any other response type
      else {
        toast({
          title: 'Success',
          description: 'Budget changes saved successfully'
        });
      }
      
      // Invalidate affected queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${clientId}/budget-items`],
      });
      
      // Show toast and log for debug mode
      if (debugMode) {
        console.log("Budget saved successfully. Response:", response);
      }
    },
    onError: (error: any) => {
      console.error("Save mutation error:", error);
      
      // Extract error message if available, otherwise use a generic message
      const errorMessage = error?.message || 'Failed to save budget changes';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      
      // Show detailed error trace in debug mode
      if (debugMode) {
        console.error("Detailed error:", error);
      }
    }
  });
  
  // Function to validate and save changes
  const handleSave = async () => {
    try {
      // Get form values
      const data = form.getValues();
      console.log("Form values before save:", data);
      
      // Validate the form first
      const valid = await form.trigger();
      if (!valid) {
        console.error("Form validation failed, cannot save");
        const errors = form.formState.errors;
        console.error("Form errors:", errors);
        
        // Show validation error toast
        toast({
          title: "Validation Failed",
          description: "Please fix the errors before saving",
          variant: "destructive"
        });
        return;
      }
      
      // Additional validation - check for budget overrun
      const totalAllocated = data.totalAllocated || 0;
      const clientBudget = getClientBudget();
      
      // Validate that total allocation doesn't exceed client-specific budget
      if (totalAllocated > clientBudget) {
        console.error(`Budget validation failed! Total allocation ${totalAllocated} exceeds budget ${clientBudget}.`);
        
        // Show budget error toast
        toast({
          title: "Budget Exceeded",
          description: `Total allocation (${formatCurrency(totalAllocated)}) exceeds available budget (${formatCurrency(clientBudget)})`,
          variant: "destructive"
        });
        return;
      }
      
      console.log("Validation passed, proceeding to save");
      
      // Call mutation to save
      await saveMutation.mutateAsync(data);
      
    } catch (error) {
      console.error("Error in save handler:", error);
      toast({
        title: "Error",
        description: "Failed to save budget changes",
        variant: "destructive"
      });
    }
  };
  
  // Cancel editing and reload data
  const handleCancel = () => {
    console.log("Cancelling budget edit");
    
    // Reset form with original values
    if (itemsQuery.data && activePlan) {
      const originalItems = itemsQuery.data.map((item: any) => ({
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
      
      // Calculate total allocated from original items
      const totalAllocated = originalItems.reduce(
        (sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0
      );
      
      // Reset form with original values
      form.reset({
        items: originalItems,
        totalBudget: getClientBudget(),
        totalAllocated: totalAllocated,
        remainingBudget: getClientBudget()
      });
      
      toast({
        title: "Changes Discarded",
        description: "Budget changes have been reverted"
      });
    }
  };
  
  // Handle form submission - mainly for validation, actual save is in handleSave
  const onSubmit = async (data: UnifiedBudgetFormValues) => {
    console.log("Form submitted with data:", data);
    
    // Validate budget
    const totalAllocated = data.totalAllocated || 0;
    const clientBudget = getClientBudget();
    
    // Use client-specific budget for validation
    if (totalAllocated > clientBudget) {
      console.error(`Budget validation failed before submission! Total allocation ${totalAllocated} exceeds budget ${clientBudget}.`);
      
      form.setError("totalAllocated", {
        type: "custom",
        message: `Total exceeds available budget of ${formatCurrency(clientBudget)}`
      });
      
      return;
    }
    
    // If valid, trigger save mutation
    await handleSave();
  };
  
  // Helper to determine if content is loading
  const isLoading = plansQuery.isLoading || itemsQuery.isLoading || catalogQuery.isLoading;
  
  // Load error states
  const loadError = plansQuery.error || itemsQuery.error || catalogQuery.error;
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <h3 className="text-lg font-medium">Loading Budget Information</h3>
          <p className="text-sm text-muted-foreground">Please wait while we fetch your budget data.</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (loadError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading budget data. Please try again later.
          {debugMode && <div className="mt-2 text-xs opacity-70">{String(loadError)}</div>}
        </AlertDescription>
      </Alert>
    );
  }
  
  // No active plan state
  if (!activePlan) {
    return (
      <Alert className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No active budget plan found for this client. Please create a budget plan first.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Budget Management</CardTitle>
                <CardDescription>
                  Manage budget items for plan {activePlan?.planCode || "Default"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* Budget validation component */}
              <BudgetValidation 
                // Use client-specific budget amount
                totalBudget={getClientBudget()} // Set to client-specific budget amount
                totalAllocated={form.watch("totalAllocated") || 0}
                remainingBudget={getClientBudget()} // Total remaining budget is total budget minus used (not allocated)
                originalAllocated={getClientBudget()} // The original allocated budget amount
              />
              
              <Separator className="my-4" />
              
              {/* Budget item catalog selector */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Add Items from Catalog</h3>
                <BudgetCatalogSelector 
                  catalogItems={catalogQuery.data || []}
                  onAddItem={handleAddCatalogItem}
                  disabled={saveMutation.isPending}
                />
              </div>
              
              <Separator className="my-4" />
              
              {/* Budget items list */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Budget Items</h3>
                
                {/* Show message if no items */}
                {fields.length === 0 ? (
                  <div className="text-center p-4 border rounded-md bg-muted/20">
                    <p className="text-muted-foreground">No budget items have been added yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Use the catalog above to add items.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Budget item header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 font-medium text-sm bg-muted/20 rounded-md">
                      <div className="col-span-4">Item</div>
                      <div className="col-span-2 text-right">Unit Price</div>
                      <div className="col-span-2 text-right">Quantity</div>
                      <div className="col-span-2 text-right">Total</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    
                    {/* Budget items */}
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <FormField
                          key={field.id}
                          control={form.control}
                          name={`items.${index}`}
                          render={() => (
                            <FormItem>
                              <BudgetItemRow
                                item={form.getValues().items[index]}
                                index={index}
                                onUpdateQuantity={handleUpdateItemQuantity}
                                onDelete={handleDeleteItem}
                                disabled={saveMutation.isPending}
                                validationError={undefined}
                              />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator className="my-4" />
              
              {/* Budget totals */}
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Allocated:</span>
                  <span className="font-semibold">
                    {formatCurrency(form.watch("totalAllocated") || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Remaining Budget:</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(getClientBudget() - (form.watch("totalAllocated") || 0))} {/* Calculate remaining allocation */}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="border-t p-6 flex justify-between">
            <div>
              {/* Debug toggle in development */}
              {process.env.NODE_ENV === 'development' && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDebugMode(!debugMode)}
                >
                  {debugMode ? 'Disable Debug' : 'Enable Debug'}
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending || form.formState.isSubmitting}
              >
                {saveMutation.isPending || form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        {/* Form validation errors */}
        {Object.keys(form.formState.errors).length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the form errors before submitting.
              {debugMode && (
                <pre className="mt-2 text-xs opacity-70">
                  {JSON.stringify(form.formState.errors, null, 2)}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Debug panel for development */}
        {debugMode && (
          <div className="mt-8 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
            <h3 className="text-sm font-semibold mb-2">Debug Information:</h3>
            <div className="space-y-2">
              <div className="text-xs">
                <strong>Active Plan:</strong> {JSON.stringify(activePlan)}
              </div>
              <div className="text-xs">
                <strong>Form Values:</strong> {JSON.stringify(form.getValues())}
              </div>
              <div className="text-xs">
                <strong>Client Budget:</strong> {getClientBudget()}
              </div>
              <div className="text-xs">
                <strong>Total Allocated:</strong> {form.watch("totalAllocated")}
              </div>
              <div className="text-xs">
                <strong>Form State:</strong> Dirty: {form.formState.isDirty.toString()}, Submitting: {form.formState.isSubmitting.toString()}
              </div>
              <div className="text-xs">
                <strong>Items Query Status:</strong> {itemsQuery.status}
              </div>
              <div className="text-xs">
                <strong>Plans Query Status:</strong> {plansQuery.status}
              </div>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}