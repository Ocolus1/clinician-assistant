import React from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign, PlusCircle } from 'lucide-react';
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
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">Budget Items ({budgetItems.length})</h4>
        <Button 
          size="sm"
          onClick={onAddItem}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Budget Item
        </Button>
      </div>
      
      {budgetItems.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg py-10 text-center">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Budget Items</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            No budget items have been added yet. Add items to track expenses related to therapy services.
          </p>
          <Button onClick={onAddItem}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add First Budget Item
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
}