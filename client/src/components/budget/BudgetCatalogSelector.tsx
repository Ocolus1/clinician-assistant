import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBudgetFeature } from './BudgetFeatureContext';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { calculateMaxQuantity, budgetCatalogSelectionSchema, BudgetCatalogSelectionValues } from './BudgetFormSchema';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Catalog item type
interface CatalogItem {
  id: number;
  itemCode: string;
  description: string;
  defaultUnitPrice: number;
  category: string | null;
  isActive: boolean | null;
}

/**
 * Component for selecting items from the budget catalog
 */
export function BudgetCatalogSelector() {
  const { toast } = useToast();
  const { 
    activePlan, 
    totalAllocated, 
    totalBudget, 
    budgetItems, 
    setBudgetItems,
    refreshData
  } = useBudgetFeature();
  
  // Get catalog items
  const catalogQuery = useQuery({
    queryKey: ['/api/budget-item-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/budget-item-catalog');
      if (!response.ok) {
        throw new Error('Failed to fetch catalog items');
      }
      return response.json() as Promise<CatalogItem[]>;
    }
  });
  
  // Form
  const form = useForm<BudgetCatalogSelectionValues>({
    resolver: zodResolver(budgetCatalogSelectionSchema),
    defaultValues: {
      catalogItemId: '',
      quantity: 1
    }
  });
  
  // Get selected catalog item details
  const selectedItemId = form.watch('catalogItemId');
  const selectedItem = selectedItemId 
    ? catalogQuery.data?.find(item => item.id.toString() === selectedItemId) 
    : undefined;
  
  // Calculate max quantity based on remaining budget
  const maxQuantity = selectedItem 
    ? calculateMaxQuantity(totalAllocated, selectedItem.defaultUnitPrice) 
    : 0;
  
  // Add budget item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: BudgetCatalogSelectionValues) => {
      if (!activePlan) {
        throw new Error('No active budget plan selected');
      }
      
      const selectedCatalogItem = catalogQuery.data?.find(
        item => item.id.toString() === data.catalogItemId
      );
      
      if (!selectedCatalogItem) {
        throw new Error('Selected catalog item not found');
      }
      
      // Create new budget item
      return apiRequest('POST', `/api/clients/${activePlan.clientId}/budget/${activePlan.id}/items`, {
        clientId: activePlan.clientId,
        budgetSettingsId: activePlan.id,
        itemCode: selectedCatalogItem.itemCode,
        description: selectedCatalogItem.description,
        quantity: data.quantity,
        unitPrice: selectedCatalogItem.defaultUnitPrice,
        name: selectedCatalogItem.description,
        category: selectedCatalogItem.category
      });
    },
    onSuccess: (newItem) => {
      toast({
        title: 'Success',
        description: 'Budget item added successfully'
      });
      
      // Refresh data to get the new item from the server
      refreshData();
      
      // Reset form
      form.reset();
      
      // Invalidate related queries
      if (activePlan) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/clients', activePlan.clientId, 'budget-items'] 
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add budget item',
        variant: 'destructive'
      });
      console.error('Failed to add budget item:', error);
    }
  });
  
  // Submit handler
  const onSubmit = (data: BudgetCatalogSelectionValues) => {
    addItemMutation.mutate(data);
  };
  
  // Disable if no active plan
  const isDisabled = !activePlan;
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Add Budget Item</h3>
      
      {catalogQuery.isPending ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : catalogQuery.isError ? (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-700">
          Failed to load catalog items. Please try again.
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="catalogItemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catalog Item</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value} 
                    disabled={isDisabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an item from the catalog" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {catalogQuery.data
                        ?.filter(item => item.isActive !== false)
                        .map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.description} ({formatCurrency(item.defaultUnitPrice)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedItem && (
              <>
                <div className="text-sm text-gray-500">
                  Unit Price: {formatCurrency(selectedItem.defaultUnitPrice)}
                </div>
                
                <div className="text-sm text-gray-500">
                  Maximum Quantity: {maxQuantity} {maxQuantity === 0 && '(Budget limit reached)'}
                </div>
              </>
            )}
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number"
                      min={1}
                      max={selectedItem ? maxQuantity : undefined}
                      disabled={isDisabled || !selectedItem || maxQuantity === 0}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedItem && (
              <div className="text-sm font-medium">
                Total: {formatCurrency(selectedItem.defaultUnitPrice * form.watch('quantity'))}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={
                isDisabled || 
                addItemMutation.isPending || 
                !selectedItem || 
                maxQuantity === 0 ||
                form.watch('quantity') > maxQuantity
              }
            >
              {addItemMutation.isPending ? 'Adding...' : 'Add to Budget'}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}