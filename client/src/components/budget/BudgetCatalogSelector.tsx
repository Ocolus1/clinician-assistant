import React, { useState, useMemo } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Plus } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { BudgetPlan } from './BudgetFeatureContext';
import { CatalogItem } from './BudgetTypes';

interface BudgetCatalogSelectorProps {
  catalogItems: CatalogItem[];
  onAddItem: (catalogItem: CatalogItem, quantity: number) => void;
  remainingBudget: number;
  activePlan: BudgetPlan | null;
}

/**
 * Component for selecting items from the catalog and adding them to the budget
 * This is designed to work with the unified budget form
 */
export function BudgetCatalogSelector({ 
  catalogItems, 
  onAddItem,
  remainingBudget,
  activePlan
}: BudgetCatalogSelectorProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  
  // Get the selected catalog item
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return catalogItems.find(item => item.id.toString() === selectedItemId) || null;
  }, [selectedItemId, catalogItems]);
  
  // Calculate max quantity based on remaining budget
  const maxQuantity = useMemo(() => {
    if (!selectedItem || remainingBudget <= 0) return 0;
    return Math.floor(remainingBudget / selectedItem.defaultUnitPrice);
  }, [selectedItem, remainingBudget]);
  
  // Handle selecting an item
  const handleSelectItem = (value: string) => {
    setSelectedItemId(value);
    // Reset quantity to 1 or max quantity if less than 1
    setQuantity(1);
  };
  
  // Handle quantity change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value);
    if (!isNaN(newQuantity) && newQuantity >= 1) {
      setQuantity(Math.min(newQuantity, maxQuantity));
    }
  };
  
  // Handle add item
  const handleAddItem = () => {
    if (selectedItem && quantity > 0 && quantity <= maxQuantity) {
      onAddItem(selectedItem, quantity);
      // Reset after adding
      setSelectedItemId('');
      setQuantity(1);
    }
  };
  
  // Disabled states
  const isDisabled = !activePlan;
  const isAddDisabled = !selectedItem || !quantity || quantity > maxQuantity || quantity < 1;
  
  // Filter active catalog items
  const activeItems = catalogItems.filter(item => item.isActive !== false);
  
  // Group items by category for better organization
  const groupedItems = activeItems.reduce((acc: Record<string, CatalogItem[]>, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="catalog-item">Select Item</Label>
          <Select 
            onValueChange={handleSelectItem} 
            value={selectedItemId} 
            disabled={isDisabled}
          >
            <SelectTrigger id="catalog-item">
              <SelectValue placeholder="Select a product or service" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-sm font-semibold text-gray-500">
                    {category}
                  </div>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.description} ({formatCurrency(item.defaultUnitPrice)})
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <div className="flex space-x-2">
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={handleQuantityChange}
              min={1}
              max={maxQuantity}
              disabled={isDisabled || !selectedItem || maxQuantity === 0}
              className="flex-1"
            />
            <Button 
              onClick={handleAddItem} 
              disabled={isAddDisabled}
              className="flex-shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </div>
      
      {selectedItem && (
        <div className="p-4 border rounded-md bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{selectedItem.description}</h4>
              <p className="text-sm text-gray-500">{selectedItem.itemCode}</p>
            </div>
            <div className="text-right">
              <div className="font-medium">{formatCurrency(selectedItem.defaultUnitPrice)}</div>
              <div className="text-sm text-gray-500">per unit</div>
            </div>
          </div>
          
          {selectedItem && quantity > 0 && (
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <div className="text-sm font-medium">Total for {quantity} units:</div>
              <div className="font-bold">{formatCurrency(selectedItem.defaultUnitPrice * quantity)}</div>
            </div>
          )}
          
          {maxQuantity === 0 && (
            <div className="mt-4 text-sm text-red-600">
              Budget limit reached. You cannot add more items without removing or reducing existing allocations.
            </div>
          )}
          
          {maxQuantity > 0 && selectedItem && (
            <div className="mt-4 text-sm text-gray-600">
              You can add up to {maxQuantity} units based on your remaining budget.
            </div>
          )}
        </div>
      )}
    </div>
  );
}