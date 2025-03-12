import React, { useState } from 'react';
import { BudgetItem } from './BudgetFeatureContext';
import { useBudgetFeature } from './BudgetFeatureContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, Trash2, X } from 'lucide-react';
import { exceedsBudget } from './BudgetFormSchema';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface BudgetItemRowProps {
  item: BudgetItem;
  onDelete?: (item: BudgetItem) => void;
}

/**
 * Component for displaying and editing a single budget item
 */
export function BudgetItemRow({ item, onDelete }: BudgetItemRowProps) {
  const { toast } = useToast();
  const { totalAllocated, budgetItems, setBudgetItems, refreshData } = useBudgetFeature();
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const [unitPrice, setUnitPrice] = useState(item.unitPrice);
  
  // Format total price
  const totalPrice = item.quantity * item.unitPrice;
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      return apiRequest('DELETE', `/api/budget-items/${item.id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Budget item deleted successfully'
      });
      // Remove item from local state
      const updatedItems = budgetItems.filter(i => i.id !== item.id);
      setBudgetItems(updatedItems);
      refreshData();
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', item.clientId, 'budget-items'] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete budget item',
        variant: 'destructive'
      });
      console.error('Failed to delete budget item:', error);
    }
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { quantity: number, unitPrice: number }) => {
      return apiRequest('PUT', `/api/budget-items/${item.id}`, data);
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Budget item updated successfully'
      });
      
      // Update item in local state
      const updatedItems = budgetItems.map(i => 
        i.id === item.id ? { ...i, quantity, unitPrice } : i
      );
      setBudgetItems(updatedItems);
      refreshData();
      setIsEditing(false);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', item.clientId, 'budget-items'] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update budget item',
        variant: 'destructive'
      });
      console.error('Failed to update budget item:', error);
    }
  });
  
  // Handle edit save
  const handleSave = () => {
    // Calculate the new total excluding this item
    const totalExcludingThis = totalAllocated - (item.quantity * item.unitPrice);
    
    // Check if new values exceed budget
    if (exceedsBudget(totalExcludingThis, unitPrice, quantity)) {
      toast({
        title: 'Budget Exceeded',
        description: 'This change would exceed the total budget allocation',
        variant: 'destructive'
      });
      return;
    }
    
    updateMutation.mutate({ quantity, unitPrice });
  };
  
  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete(item);
    } else {
      deleteMutation.mutate();
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    setQuantity(item.quantity);
    setUnitPrice(item.unitPrice);
    setIsEditing(false);
  };
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
      <div className="flex-1">
        <h4 className="font-medium">{item.name || item.description}</h4>
        <p className="text-sm text-gray-500">{item.itemCode}</p>
      </div>
      
      {isEditing ? (
        <>
          <div className="flex items-center gap-2 w-32">
            <Label htmlFor={`quantity-${item.id}`} className="sr-only">Quantity</Label>
            <Input
              id={`quantity-${item.id}`}
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-20"
            />
          </div>
          
          <div className="flex items-center gap-2 w-32">
            <Label htmlFor={`price-${item.id}`} className="sr-only">Unit Price</Label>
            <Input
              id={`price-${item.id}`}
              type="number"
              min={0.01}
              step={0.01}
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className="w-24"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              size="icon" 
              variant="outline" 
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="outline" 
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="w-20 text-center">
            <span>{item.quantity}</span>
          </div>
          
          <div className="w-24 text-center">
            <span>{formatCurrency(item.unitPrice)}</span>
          </div>
          
          <div className="w-24 text-center">
            <span>{formatCurrency(totalPrice)}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}