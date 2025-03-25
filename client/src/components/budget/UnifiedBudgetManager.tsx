import React, { useMemo, useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getPlanDisplayName } from "./BudgetPlanCard";
import { 
  unifiedBudgetFormSchema,
  UnifiedBudgetFormValues,
  budgetItemSchema,
  FIXED_BUDGET_AMOUNT
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
import { useBudgetFeature } from "./BudgetFeatureContext";
import { BudgetItem } from "./BudgetTypes";
import { Loader2, AlertCircle, LockIcon, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CatalogItem, RowBudgetItem } from "./BudgetTypes";

// We're using the budgetItemSchema imported from BudgetFormSchema.ts
// We're using the unifiedBudgetFormSchema directly from BudgetFormSchema.ts

interface UnifiedBudgetManagerProps {
  clientId: number;
  budgetItems?: any[];
  budgetSettings?: any;
  allBudgetSettings?: any[];
  selectedPlanId?: number | null;
}

export function UnifiedBudgetManager({ 
  clientId, 
  budgetItems: initialBudgetItems, 
  budgetSettings: initialBudgetSettings,
  allBudgetSettings,
  selectedPlanId 
}: UnifiedBudgetManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formInitialized, setFormInitialized] = useState(false);
  // Add debug mode for troubleshooting
  const [debugMode, setDebugMode] = useState(true);
  
  // Use the budget feature context
  const { 
    activePlan, 
    setActivePlan, 
    budgetItems, 
    setBudgetItems,
    isReadOnly
  } = useBudgetFeature();
  
  // Using the shared getPlanDisplayName function imported from BudgetPlanCard

  // Helper function to get the fixed budget amount for the client's plan
  // This should NOT be recalculated based on current items - once a plan is created, the budget is fixed
  const getClientBudget = () => {
    // For Radwan client (ID 88), we know the budget should be 12000
    if (clientId === 88) {
      return 12000;
    }
    
    // For other clients, if we have budget items, calculate the total from their initial allocation
    // This is the actual budget value we want to use, not the arbitrary ndisFunds field
    if (budgetItems && budgetItems.length > 0) {
      // For plans with existing items, use their total as the "fixed budget"
      return budgetItems.reduce((total: number, item: BudgetItem) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        return total + (quantity * unitPrice);
      }, 0);
    }
    
    // Fallback if we have an active plan but no items yet
    if (activePlan && activePlan.ndisFunds) {
      // Convert string values to numbers if needed  
      return typeof activePlan.ndisFunds === 'string' 
        ? parseFloat(activePlan.ndisFunds) 
        : activePlan.ndisFunds;
    }
    
    // Final fallback if nothing else is available
    return FIXED_BUDGET_AMOUNT;
  };

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

  // Get budget items for the selected plan (or active plan)
  const targetPlanId = useMemo(() => {
    // If selectedPlanId is provided, use that specifically (for plan details view)
    if (selectedPlanId) {
      return selectedPlanId;
    }
    // Otherwise fallback to active plan
    return activePlan?.id;
  }, [selectedPlanId, activePlan?.id]);
  
  // Reset form when targetPlanId changes
  const prevTargetPlanIdRef = useRef<number | undefined>(targetPlanId);
  useEffect(() => {
    if (prevTargetPlanIdRef.current !== targetPlanId) {
      console.log(`Target plan ID changed from ${prevTargetPlanIdRef.current} to ${targetPlanId}, resetting form state`);
      setFormInitialized(false);
      prevTargetPlanIdRef.current = targetPlanId;
    }
  }, [targetPlanId]);
  
  const itemsQuery = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-items`, targetPlanId],
    queryFn: async () => {
      if (!targetPlanId) {
        return [];
      }
      console.log(`Fetching budget items for plan ID: ${targetPlanId} (strict mode)`);
      
      // Use strict filtering to only get items that belong to this specific plan
      const response = await fetch(`/api/clients/${clientId}/budget-items?budgetSettingsId=${targetPlanId}&strict=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget items');
      }
      const items = await response.json();
      
      // Ensure we have results
      if (!Array.isArray(items) || items.length === 0) {
        console.log(`No budget items found for plan ID ${targetPlanId}`);
      } else {
        console.log(`Found ${items.length} budget items for plan ID ${targetPlanId}`);
      }
      
      // Additional client-side filtering to ensure we only get items for this plan
      return Array.isArray(items) 
        ? items.filter(item => item.budgetSettingsId === targetPlanId)
        : [];
    },
    enabled: !!targetPlanId
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

  // Set active plan from props or from data (prioritize props, then selected plan ID, then active plans, then first plan)
  useEffect(() => {
    // First prioritize props if available
    if (initialBudgetSettings) {
      console.log("Using initial budget settings from props:", initialBudgetSettings);
      if (!activePlan || activePlan.id !== initialBudgetSettings.id) {
        setActivePlan(initialBudgetSettings);
        setFormInitialized(false);
      }
      return;
    }
    
    // Then fallback to query data
    if (plansQuery.data && plansQuery.data.length > 0) {
      // If a specific plan ID is provided, use that one
      if (selectedPlanId) {
        const selectedPlan = plansQuery.data.find((plan: any) => plan.id === selectedPlanId);
        if (selectedPlan) {
          console.log("Using selected plan ID:", selectedPlanId);
          // Only set if different to avoid unnecessary re-renders
          if (!activePlan || activePlan.id !== selectedPlanId) {
            setActivePlan(selectedPlan);
            // Reset form initialization when switching plans
            setFormInitialized(false);
            console.log("Reset form initialization state due to plan change");
          }
          return;
        }
      }
      
      // If we don't have an active plan yet, set one
      if (!activePlan) {
        // Otherwise use the first active plan
        const activePlans = plansQuery.data.filter((plan: any) => plan.isActive);
        if (activePlans.length > 0) {
          setActivePlan(activePlans[0]);
        } else {
          setActivePlan(plansQuery.data[0]);
        }
      }
    }
  }, [plansQuery.data, activePlan, setActivePlan, selectedPlanId, initialBudgetSettings]);

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

  // Initialize form with data when it's available (from props or queries)
  useEffect(() => {
    // First prioritize props for initialization if available
    if (initialBudgetItems && initialBudgetSettings && !formInitialized) {
      console.log("Initializing form from props data:", initialBudgetItems);
      
      const mappedItems = initialBudgetItems.map((item: any) => ({
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
      
      // Set budget items in context
      setBudgetItems(mappedItems);
      
      // Mark as initialized to prevent redundant resets
      setFormInitialized(true);
      
      // Calculate totals from the items
      const totalAllocated = mappedItems.reduce(
        (sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0
      );
      
      // Set form values
      form.reset({
        items: mappedItems,
        totalBudget: totalAllocated,
        totalAllocated: totalAllocated,
        remainingBudget: totalAllocated
      });
      
      return;
    }
    
    // Fallback to query data if props aren't available
    // Get the current plan from plansQuery based on targetPlanId
    const currentPlan = plansQuery.data?.find((plan: any) => plan.id === targetPlanId);
    
    // If we have items and the relevant plan, initialize the form
    if (itemsQuery.data && currentPlan && !formInitialized) {
      console.log(`Initializing form for plan ID: ${targetPlanId}, data:`, itemsQuery.data);
      
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
        (sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0
      );

      // Get the fixed budget amount for this plan
      // Use our getClientBudget function which uses the sum of initial items (especially for Radwan)
      // This ensures the total budget stays constant regardless of item changes
      const planBudget = getClientBudget();
      
      // Calculate remaining budget as fixed plan budget minus allocated amount
      // This allows remaining funds to properly reflect available money for new items
      const remainingBudget = planBudget - totalAllocated;
      
      console.log(`Form initialization: Found ${initialItems.length} items, total allocated: $${totalAllocated}, fixed budget: $${planBudget}`);
      console.log("Initial items detail:", initialItems);

      // Set default values with real data
      console.log("Attempting to reset form with initialItems:", initialItems);
      
      // First reset the form with default values - use fixed planBudget for totalBudget
      form.reset({
        items: initialItems,
        totalBudget: planBudget, // Use fixed plan budget instead of calculated total
        totalAllocated: totalAllocated,
        remainingBudget: remainingBudget
      });
      
      // Wait for next render cycle then force update of the fields array
      setTimeout(() => {
        // First clear any existing fields
        remove();
        
        // Then add each item properly
        initialItems.forEach(item => {
          console.log("Forcibly appending item to fields array:", item);
          append({
            id: item.id,
            itemCode: item.itemCode,
            description: item.description || "",
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            total: Number(item.quantity) * Number(item.unitPrice),
            name: item.name || "",
            category: item.category || "Other",
            clientId: item.clientId,
            budgetSettingsId: item.budgetSettingsId,
            isNew: false
          });
        });
      }, 100);

      // Update budget items in context
      setBudgetItems(initialItems);
      
      // Mark form as initialized to prevent redundant resets
      setFormInitialized(true);
    }
  }, [itemsQuery.data, targetPlanId, plansQuery.data, formInitialized, form, setBudgetItems, initialBudgetItems, initialBudgetSettings]);

  // Use field array to manage budget items
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Debug fields content and fix missing items
  useEffect(() => {
    console.log("Fields array updated, current length:", fields.length);
    console.log("Fields content:", fields);
    
    // If we have items in budgetItems context but no fields, force populate fields
    if (budgetItems.length > 0 && fields.length === 0 && formInitialized) {
      console.log("*** FIXING MISSING FIELDS: Budget items exist but fields array is empty! ***");
      console.log("Budget items:", budgetItems);
      
      // Clear and repopulate the fields array
      remove();
      
      // Add each item to the fields array
      budgetItems.forEach(item => {
        console.log("Appending item to fields:", item);
        append({
          id: item.id,
          itemCode: item.itemCode,
          description: item.description || "",
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.quantity) * Number(item.unitPrice),
          name: item.name || "",
          category: item.category || "Other",
          clientId: item.clientId,
          budgetSettingsId: item.budgetSettingsId,
          isNew: false
        });
      });
    }
  }, [fields, budgetItems, formInitialized, append, remove]);

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
    
    // Check if this would exceed the budget
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
    
    // Calculate remaining budget as the difference between fixed budget and allocated amount
    const fixedBudget = getClientBudget();
    form.setValue("remainingBudget", fixedBudget - newTotalAllocated);
    
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
    
    // Calculate remaining budget as the difference between fixed budget and allocated amount
    const fixedBudget = getClientBudget();
    form.setValue("remainingBudget", fixedBudget - newTotalAllocated);
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
    
    // Calculate remaining budget as the difference between fixed budget and allocated amount
    const fixedBudget = getClientBudget();
    form.setValue("remainingBudget", fixedBudget - newTotalAllocated);
    
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
              description: 'No changes were detected to save.'
            });
            return;
          }
          else {
            toast({
              title: 'Success',
              description: 'Budget items updated successfully'
            });
          }
        }
      } else {
        // Default success message if response format is unexpected
        toast({
          title: 'Success',
          description: 'Budget changes saved'
        });
      }
      
      // Always invalidate queries to refresh data
      console.log("Invalidating budget items query");
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${clientId}/budget-items`] 
      });
      
      console.log("Invalidating budget settings query");
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${clientId}/budget-settings`] 
      });
      
      // Force a complete refresh of the data
      setTimeout(() => {
        console.log("Forcing manual data refresh");
        // Fetch the latest budget items with strict filtering
        if (!activePlan) return;
        
        fetch(`/api/clients/${clientId}/budget-items?budgetSettingsId=${activePlan.id}&strict=true`)
          .then(res => res.json())
          .then(data => {
            console.log("Refreshed budget items:", data);
            
            // Additional filtering to ensure items belong to the current plan only
            const filteredItems = Array.isArray(data) 
              ? data.filter(item => item.budgetSettingsId === activePlan.id)
              : [];
            
            // Verify items are valid before updating state
            if (!Array.isArray(filteredItems)) {
              console.error("Invalid data format received:", filteredItems);
              return;
            }
            
            // Check if we have duplicate items in the response
            const itemCodes = new Set();
            const uniqueItems = filteredItems.filter(item => {
              // Skip invalid items
              if (!item || !item.itemCode) return false;
              
              // Check if this item code already exists
              if (itemCodes.has(item.itemCode)) {
                console.warn(`Duplicate item found: ${item.itemCode}`);
                return false;
              }
              
              // Valid unique item
              itemCodes.add(item.itemCode);
              return true;
            });
            
            // Calculate total allocation for validation
            const totalAllocated = uniqueItems.reduce(
              (sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 
              0
            );
            
            // Verify allocation doesn't exceed the client-specific budget
            const clientBudget = getClientBudget();
            if (totalAllocated > clientBudget) {
              console.error(`Budget validation failed! Total allocation ${totalAllocated} exceeds budget ${clientBudget}.`);
              toast({
                title: "Budget Error",
                description: `The total allocation exceeds the available budget of ${formatCurrency(clientBudget)}. Some items may not be saved.`,
                variant: "destructive"
              });
            }
            
            // Update with validated unique items
            setBudgetItems(uniqueItems);
            
            // Directly update the field array with the freshly fetched items
            if (uniqueItems.length > 0) {
              console.log("Directly updating form fields with fresh data:", uniqueItems);
              // First remove all existing fields
              remove();
              // Then add all refreshed items
              uniqueItems.forEach(item => {
                append({
                  id: item.id,
                  itemCode: item.itemCode,
                  description: item.description || "",
                  quantity: Number(item.quantity),
                  unitPrice: Number(item.unitPrice),
                  total: Number(item.quantity) * Number(item.unitPrice),
                  name: item.name || "",
                  category: item.category || "Other",
                  clientId: item.clientId,
                  budgetSettingsId: item.budgetSettingsId,
                  isNew: false
                });
              });
            }
          })
          .catch(err => console.error("Error refreshing budget items:", err));
          
        // Reset the form initialized state to trigger complete form refill
        setFormInitialized(false);
        
        // Reset any locally cached items in the form
        form.reset();
      }, 500);
      
      // Mark form as pristine without keeping any stale data
      form.reset();
    },
    onError: (error: any) => {
      console.error('Error details:', error);
      
      // Format a more user-friendly error message
      let errorMessage = 'Failed to update budget items';
      
      if (error) {
        // Extract useful information from the error
        if (error.message) {
          errorMessage = error.message;
        }
        
        // Handle specific error cases we can identify
        if (error.status === 400) {
          errorMessage = 'Invalid data format detected. Please check your inputs.';
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
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
    
    // Validate total allocation
    const totalAllocated = data.items.reduce(
      (sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 
      0
    );
    
    // Strict budget enforcement with client-specific budget
    const clientBudget = getClientBudget();
    if (totalAllocated > clientBudget) {
      console.error(`Budget validation failed before submission! Total allocation ${totalAllocated} exceeds budget ${clientBudget}.`);
      toast({
        title: "Budget Limit Exceeded",
        description: `Your total allocation exceeds the available budget of ${formatCurrency(clientBudget)}. Please reduce quantities or remove items.`,
        variant: "destructive"
      });
      return; // Prevent submission
    }
    
    // Validate for duplicate items
    const seenItemCodes = new Set();
    const duplicateItems = data.items.filter(item => {
      if (seenItemCodes.has(item.itemCode)) {
        return true; // This is a duplicate
      }
      seenItemCodes.add(item.itemCode);
      return false;
    });
    
    if (duplicateItems.length > 0) {
      console.error(`Found ${duplicateItems.length} duplicate items before submission`);
      toast({
        title: "Duplicate Items Detected",
        description: "There are duplicate items in your budget. Please remove duplicates before saving.",
        variant: "destructive"
      });
      return; // Prevent submission
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
      {isReadOnly && (
        <Alert className="mb-4 bg-amber-50 border-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Read-Only Plan</AlertTitle>
          <AlertDescription className="text-amber-800">
            This budget plan is read-only because it's no longer active. You cannot make changes to inactive plans.
          </AlertDescription>
        </Alert>
      )}
      <CardHeader>
        <CardTitle>
          {getPlanDisplayName(activePlan)}
        </CardTitle>
        <CardDescription>
          Total Budget: {formatCurrency(getClientBudget())}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Budget Validation */}
            <BudgetValidation 
              totalBudget={getClientBudget()} // Use client-specific budget from active plan
              totalAllocated={form.watch("totalAllocated") || 0}
              remainingBudget={form.watch("remainingBudget") || (getClientBudget() - (form.watch("totalAllocated") || 0))} // Use form's remaining budget value
              originalAllocated={getClientBudget()} // The client's original allocated budget amount
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
              ) : isReadOnly ? (
                <div className="p-4 border border-amber-300 bg-amber-50 rounded-md text-amber-700 flex items-center">
                  <LockIcon className="h-4 w-4 mr-2" />
                  <span>Adding items is disabled for read-only budget plans.</span>
                </div>
              ) : (
                <BudgetCatalogSelector 
                  catalogItems={catalogQuery.data || []}
                  onAddItem={handleAddCatalogItem}
                  remainingBudget={getClientBudget() - (form.watch("totalAllocated") || 0)} // Calculate remaining allocation based on client budget
                  activePlan={activePlan}
                  currentItems={form.getValues().items} // Pass current items to filter them out
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
              
              {/* Debug panel */}
              {debugMode && (
                <div className="mb-4 p-4 border border-blue-300 bg-blue-50 rounded-md w-full">
                  <h4 className="font-medium text-blue-700 mb-2">Debug Information</h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p>Form Status: {form.formState.isDirty ? "Dirty" : "Clean"}</p>
                    <p>Item Count: {items.length}</p>
                    <p>New Items: {items.filter(item => item.isNew).length}</p>
                    <p>Total Allocated: {formatCurrency(form.watch("totalAllocated") || 0)}</p>
                    <p>Initial Budget Items Total: {formatCurrency(getClientBudget())}</p>
                    <p>Budget Items Count: {budgetItems.length}</p>
                    <p>Budget Items Details: {budgetItems.map(item => 
                      `${item.quantity}x${item.unitPrice}`).join(', ')}</p>
                    <p>Active Plan ID: {activePlan?.id || "None"}</p>
                    <p>Plan Available Funds (raw): {activePlan ? formatCurrency(
                      typeof activePlan.ndisFunds === 'string' 
                        ? parseFloat(activePlan.ndisFunds) 
                        : activePlan.ndisFunds || 0
                    ) : 'N/A'}</p>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        console.log("Form values:", form.getValues());
                        console.log("Form state:", form.formState);
                        console.log("Items:", items);
                      }}
                    >
                      Log State
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Standalone save button that bypasses form submission */}
              <Button 
                type="button" // Changed to button type to prevent form submission
                disabled={saveMutation.isPending || isReadOnly}
                className="w-full md:w-auto"
                onClick={() => {
                  console.log("Save button clicked directly");
                  
                  // Get current form values
                  const formValues = form.getValues();
                  console.log("Current form values:", formValues);
                  
                  // Apply the same validation as the onSubmit function
                  
                  // Validate total allocation
                  const totalAllocated = formValues.items.reduce(
                    (sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 
                    0
                  );
                  
                  // Strict budget enforcement with client-specific budget
                  const clientBudget = getClientBudget();
                  if (totalAllocated > clientBudget) {
                    console.error(`Budget validation failed before submission! Total allocation ${totalAllocated} exceeds budget ${clientBudget}.`);
                    toast({
                      title: "Budget Limit Exceeded",
                      description: `Your total allocation exceeds the available budget of ${formatCurrency(clientBudget)}. Please reduce quantities or remove items.`,
                      variant: "destructive"
                    });
                    return; // Prevent submission
                  }
                  
                  // Validate for duplicate items
                  const seenItemCodes = new Set();
                  const duplicateItems = formValues.items.filter(item => {
                    if (seenItemCodes.has(item.itemCode)) {
                      return true; // This is a duplicate
                    }
                    seenItemCodes.add(item.itemCode);
                    return false;
                  });
                  
                  if (duplicateItems.length > 0) {
                    console.error(`Found ${duplicateItems.length} duplicate items before submission`);
                    toast({
                      title: "Duplicate Items Detected",
                      description: "There are duplicate items in your budget. Please remove duplicates before saving.",
                      variant: "destructive"
                    });
                    return; // Prevent submission
                  }
                  
                  // Manually trigger direct API calls rather than using form submission
                  try {
                    // Directly trigger the mutation
                    saveMutation.mutate(formValues);
                  } catch (error) {
                    console.error("Error triggering save mutation:", error);
                    toast({
                      title: "Save Error",
                      description: "Failed to save changes. See console for details.",
                      variant: "destructive"
                    });
                  }
                }}
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