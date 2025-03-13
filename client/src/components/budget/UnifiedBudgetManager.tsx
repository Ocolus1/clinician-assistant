import React, { useMemo, useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

// Schema for the unified budget form
export const unifiedBudgetFormSchema = z.object({
  items: z.array(z.object({
    id: z.number().optional(), // Optional for new items being added
    itemCode: z.string(),
    description: z.string(),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0),
    total: z.number(), // Calculated field
    isNew: z.boolean().optional(), // Flag to track newly added items
    name: z.string().optional(),
    category: z.string().optional(),
    budgetSettingsId: z.number().optional(),
    clientId: z.number().optional()
  })),
  // Meta fields for validation
  totalBudget: z.number(),
  totalAllocated: z.number(),
  remainingBudget: z.number()
});

export type UnifiedBudgetFormValues = z.infer<typeof unifiedBudgetFormSchema>;

interface UnifiedBudgetManagerProps {
  clientId: number;
}

export function UnifiedBudgetManager({ clientId }: UnifiedBudgetManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    queryKey: ['/api/budget-item-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/budget-item-catalog');
      if (!response.ok) {
        throw new Error('Failed to fetch catalog items');
      }
      return response.json();
    }
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
      totalBudget: 375, // Fixed budget amount
      totalAllocated: 0,
      remainingBudget: 375
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
      
      const totalCalculated = initialItems.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unitPrice), 0);
      
      form.reset({
        items: initialItems,
        totalBudget: activePlan.availableFunds,
        totalAllocated: totalCalculated,
        remainingBudget: activePlan.availableFunds - totalCalculated
      });
      
      setFormInitialized(true);
      setBudgetItems(itemsQuery.data);
    }
  }, [itemsQuery.data, activePlan, form, formInitialized, setBudgetItems]);

  // Field array for dynamic items management
  const { fields, append, remove, update } = useFieldArray({
    name: "items",
    control: form.control
  });

  // Watch values for real-time calculation
  const items = form.watch("items");
  const totalAllocated = useMemo(() => 
    items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
    [items]
  );
  
  // Update meta fields whenever items change
  useEffect(() => {
    if (activePlan && formInitialized) {
      form.setValue("totalAllocated", totalAllocated);
      form.setValue("remainingBudget", activePlan.availableFunds - totalAllocated);
    }
  }, [form, totalAllocated, activePlan, formInitialized]);

  // Handle updating an item's quantity
  const handleUpdateItemQuantity = (index: number, newQuantity: number) => {
    const item = items[index];
    if (item) {
      const updatedItem = {
        ...item,
        quantity: newQuantity,
        total: newQuantity * item.unitPrice
      };
      update(index, updatedItem);
    }
  };

  // Handle deleting an item
  const handleDeleteItem = (index: number) => {
    remove(index);
  };

  // Handle adding a catalog item
  const handleAddCatalogItem = (catalogItem: any, quantity: number) => {
    if (!activePlan) return;
    
    const newItem = {
      itemCode: catalogItem.itemCode,
      description: catalogItem.description,
      quantity: quantity,
      unitPrice: catalogItem.defaultUnitPrice,
      total: quantity * catalogItem.defaultUnitPrice,
      isNew: true,
      name: catalogItem.description,
      category: catalogItem.category,
      budgetSettingsId: activePlan.id,
      clientId: clientId
    };
    
    append(newItem);
  };

  // Mutation for saving all changes
  const saveMutation = useMutation({
    mutationFn: async (data: UnifiedBudgetFormValues) => {
      const itemsToUpdate = data.items.filter(item => !item.isNew && item.id);
      const itemsToCreate = data.items.filter(item => item.isNew);
      
      // Update existing items
      const updatePromises = itemsToUpdate.map(item => 
        apiRequest('PUT', `/api/budget-items/${item.id}`, {
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })
      );
      
      // Create new items
      const createPromises = itemsToCreate.map(item => 
        apiRequest('POST', `/api/budget-items`, {
          clientId: clientId,
          budgetSettingsId: activePlan?.id,
          itemCode: item.itemCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          name: item.name,
          category: item.category
        })
      );
      
      // Execute all promises
      const results = await Promise.all([...updatePromises, ...createPromises]);
      return results;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Budget items updated successfully'
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${clientId}/budget-items`] 
      });
      
      // Reset the form
      setFormInitialized(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update budget items',
        variant: 'destructive'
      });
      console.error('Failed to update budget items:', error);
    }
  });

  // Submit handler
  const onSubmit = (data: UnifiedBudgetFormValues) => {
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
          Available Funds: {formatCurrency(activePlan?.availableFunds || 0)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Budget Validation */}
            <BudgetValidation 
              totalBudget={form.watch("totalBudget")} 
              totalAllocated={form.watch("totalAllocated")}
              remainingBudget={form.watch("remainingBudget")}
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
                      item={item}
                      index={index}
                      onUpdateQuantity={handleUpdateItemQuantity}
                      onDelete={handleDeleteItem}
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
              ) : (
                <BudgetCatalogSelector 
                  catalogItems={catalogQuery.data}
                  onAddItem={handleAddCatalogItem}
                  remainingBudget={form.watch("remainingBudget")}
                  activePlan={activePlan}
                />
              )}
            </div>
            
            <Separator />
            
            {/* Form Submission */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={saveMutation.isPending || !formInitialized}
              >
                {saveMutation.isPending ? 'Saving Changes...' : 'Save All Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}