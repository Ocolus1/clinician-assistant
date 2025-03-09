import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, DollarSign } from 'lucide-react';
import { BudgetItemCard } from './BudgetItemCard';
import type { BudgetItem } from '@shared/schema';

interface BudgetItemGridProps {
  budgetItems: BudgetItem[];
  onAddItem: () => void;
  onEditItem: (item: BudgetItem) => void;
  onDeleteItem: (item: BudgetItem) => void;
}

export function BudgetItemGrid({ 
  budgetItems, 
  onAddItem, 
  onEditItem, 
  onDeleteItem 
}: BudgetItemGridProps) {
  
  // If no budget items, show empty state
  if (budgetItems.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <h4 className="text-lg font-medium text-gray-500 mb-2">No budget items added</h4>
        <p className="text-gray-500 mb-4">Add items to track expenses related to therapy services.</p>
        <Button onClick={onAddItem}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add First Budget Item
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium">Budget Items ({budgetItems.length})</h4>
        <Button 
          size="sm" 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={onAddItem}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Budget Item
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {budgetItems.map(item => (
          <BudgetItemCard
            key={item.id}
            item={item}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
          />
        ))}
      </div>
    </div>
  );
}