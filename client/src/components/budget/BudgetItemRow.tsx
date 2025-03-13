import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Edit2, X, Save, Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BudgetItem {
  id?: number;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isNew?: boolean;
  name?: string;
  category?: string;
}

interface BudgetItemRowProps {
  item: BudgetItem;
  index: number;
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  onDelete: (index: number) => void;
}

/**
 * Component that displays a single budget item row with edit capability
 */
export function BudgetItemRow({ 
  item, 
  index, 
  onUpdateQuantity, 
  onDelete 
}: BudgetItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  
  // Start editing the item
  const handleStartEdit = () => {
    setIsEditing(true);
  };
  
  // Cancel editing (revert to original quantity)
  const handleCancelEdit = () => {
    setQuantity(item.quantity);
    setIsEditing(false);
  };
  
  // Save the edited quantity
  const handleSaveEdit = () => {
    onUpdateQuantity(index, quantity);
    setIsEditing(false);
  };
  
  // Handle quantity increment/decrement
  const incrementQuantity = () => {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
    }
  };
  
  // Handle direct input change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      setQuantity(newQuantity);
    }
  };
  
  return (
    <div className={cn(
      "border rounded-md p-3 transition-colors",
      isEditing ? "border-blue-300 bg-blue-50" : "border-gray-200",
      item.isNew && "border-green-300 bg-green-50"
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{item.description}</div>
            {item.isNew && <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">New</Badge>}
            {item.category && (
              <Badge variant="secondary" className="text-xs">{item.category}</Badge>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {item.itemCode} • {formatCurrency(item.unitPrice)} per unit
          </div>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-r-none"
                onClick={decrementQuantity}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                className="h-8 w-16 rounded-none text-center"
                min={0}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-l-none"
                onClick={incrementQuantity}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={handleSaveEdit}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={handleCancelEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-medium">{formatCurrency(item.total)}</div>
                <div className="text-sm text-gray-500">{item.quantity} units</div>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0" 
                onClick={handleStartEdit}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100" 
                onClick={() => onDelete(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}