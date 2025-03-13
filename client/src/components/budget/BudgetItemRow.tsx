import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Edit2, X, Check, Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RowBudgetItem } from './BudgetTypes';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetItemRowProps {
  item: RowBudgetItem;
  index: number;
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  onDelete: (index: number) => void;
}

/**
 * Component that displays a single budget item row with edit capability
 * Edits are automatically applied to the form but are only saved to the database
 * when the user clicks the "Save All Changes" button on the main form
 */
export function BudgetItemRow({ 
  item, 
  index, 
  onUpdateQuantity, 
  onDelete 
}: BudgetItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Update local quantity when prop changes
  useEffect(() => {
    setQuantity(item.quantity);
  }, [item.quantity]);
  
  // Start editing the item
  const handleStartEdit = () => {
    setIsEditing(true);
  };
  
  // Cancel editing (revert to original quantity)
  const handleCancelEdit = () => {
    setQuantity(item.quantity);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };
  
  // Apply the edited quantity to the form (but don't save to database)
  const handleApplyEdit = () => {
    onUpdateQuantity(index, quantity);
    setIsEditing(false);
    setHasUnsavedChanges(true);
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
      item.isNew && "border-green-300 bg-green-50",
      hasUnsavedChanges && !isEditing && "border-amber-300 bg-amber-50"
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{item.description}</div>
            {item.isNew && <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">New</Badge>}
            {hasUnsavedChanges && !isEditing && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">Unsaved Change</Badge>
            )}
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0" 
                    onClick={handleApplyEdit}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply changes (click Save All Changes to save)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0" 
                      onClick={handleStartEdit}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit quantity</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100" 
                      onClick={() => onDelete(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove item</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>
      {hasUnsavedChanges && !isEditing && (
        <div className="mt-2 text-xs text-amber-600">
          Changes will only be saved when you click "Save All Changes" at the bottom
        </div>
      )}
    </div>
  );
}