import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Edit2, X, Check, Plus, Minus, AlertTriangle, Archive, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RowBudgetItem } from './BudgetTypes';
import { 
  getUsedQuantity,
  validateUsedQuantity,
  getQuantityValidationError
} from './BudgetFormSchema';
import { useBudgetFeature } from './BudgetFeatureContext';
import { LockIcon } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription
} from "@/components/ui/alert";
import { SegmentedProgressBar } from './SegmentedProgressBar';

interface BudgetItemRowProps {
  item: RowBudgetItem;
  index: number;
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  onDelete: (index: number) => void;
  allItems: RowBudgetItem[]; // All budget items for validation
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
  onDelete,
  allItems
}: BudgetItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Get client-specific budget through context
  const { budgetItems, isReadOnly } = useBudgetFeature();
  
  // Calculate client-specific budget total
  const getClientBudget = () => {
    if (budgetItems && budgetItems.length > 0) {
      return budgetItems.reduce((total, item) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        return total + (quantity * unitPrice);
      }, 0);
    }
    return 0;
  };
  
  // Update local quantity when prop changes
  useEffect(() => {
    setQuantity(item.quantity);
  }, [item.quantity]);
  
  // Calculate total budget with current quantities (excluding this item)
  const calculateTotalWithoutCurrentItem = () => {
    return allItems.reduce((total, currentItem, idx) => {
      // Skip the current item being edited
      if (idx === index) return total;
      return total + (currentItem.quantity * currentItem.unitPrice);
    }, 0);
  };
  
  // Validate that the new quantity doesn't exceed budget
  const validateQuantity = (newQuantity: number): boolean => {
    // Always allow decreasing the quantity
    if (newQuantity <= item.quantity) {
      setValidationError(null);
      return true;
    }

    // For increases, check against client-specific budget limits
    const totalWithoutCurrentItem = calculateTotalWithoutCurrentItem();
    const newItemTotal = newQuantity * item.unitPrice;
    const newGrandTotal = totalWithoutCurrentItem + newItemTotal;
    
    // Get client-specific budget total
    const clientBudget = getClientBudget();
    
    if (newGrandTotal > clientBudget) {
      const overage = newGrandTotal - clientBudget;
      setValidationError(
        `This quantity would exceed the budget limit by ${formatCurrency(overage)}. ` +
        `Maximum allowed for this item is ${Math.floor((clientBudget - totalWithoutCurrentItem) / item.unitPrice)} units.`
      );
      return false;
    }
    
    setValidationError(null);
    return true;
  };
  
  // Start editing the item
  const handleStartEdit = () => {
    // If in read-only mode, don't allow editing
    if (isReadOnly) return;
    
    setIsEditing(true);
    setValidationError(null);
    
    // Re-validate with current quantity to ensure the UI is consistent
    validateQuantity(quantity);
  };
  
  // Handle clicking on the item card to toggle editing
  const handleCardClick = () => {
    // If in read-only mode, don't allow editing
    if (isReadOnly) return;
    
    // Only start editing if not already editing
    if (!isEditing) {
      handleStartEdit();
    }
  };
  
  // Cancel editing (revert to original quantity)
  const handleCancelEdit = () => {
    setQuantity(item.quantity);
    setIsEditing(false);
    setHasUnsavedChanges(false);
    setValidationError(null);
  };
  
  // Apply the edited quantity to the form (but don't save to database)
  const handleApplyEdit = () => {
    const usedQty = getUsedQuantity(item.itemCode);
    
    // First check that quantity isn't less than used quantity
    if (quantity < usedQty) {
      setValidationError(`Cannot set quantity less than ${usedQty} unit(s) already used in sessions`);
      return;
    }
    
    // Then check budget constraints
    if (validateQuantity(quantity)) {
      // Only mark as unsaved if the quantity actually changed
      const hasChanged = quantity !== item.quantity;
      
      // Update the form state
      onUpdateQuantity(index, quantity);
      setIsEditing(false);
      
      // Only show "unsaved changes" badge if something actually changed
      if (hasChanged) {
        setHasUnsavedChanges(true);
      }
    }
  };
  
  // Handle quantity increment/decrement
  const incrementQuantity = () => {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    validateQuantity(newQuantity);
  };
  
  const decrementQuantity = () => {
    // Get used quantity for this item
    const usedQty = getUsedQuantity(item.itemCode);
    
    // Don't allow decreasing below used quantity
    if (quantity > usedQty && quantity > 0) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      validateQuantity(newQuantity);
    } else if (quantity <= usedQty) {
      setValidationError(`Cannot decrease below ${usedQty} unit(s) already used in sessions`);
    }
  };
  
  // Handle direct input change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value);
    const usedQty = getUsedQuantity(item.itemCode);
    
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      // Validate that quantity isn't less than what's already used
      if (newQuantity < usedQty) {
        setValidationError(`Cannot set quantity less than ${usedQty} unit(s) already used in sessions`);
        // Still update the display value but don't apply changes
        setQuantity(newQuantity);
      } else {
        setQuantity(newQuantity);
        validateQuantity(newQuantity);
      }
    }
  };
  
  return (
    <div 
      className={cn(
        "border rounded-md p-3 transition-all duration-200",
        isEditing ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md cursor-pointer",
        item.isNew && "border-green-300 bg-green-50",
        hasUnsavedChanges && !isEditing && "border-amber-300 bg-amber-50",
        !isEditing && !isReadOnly && "hover:scale-[1.01]" // Subtle scale effect on hover for non-editing state
      )}
      onClick={!isEditing ? handleCardClick : undefined}
    >
      {isEditing ? (
        <div className="flex flex-col gap-4">
          {/* Item Header in Edit Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="font-medium">{item.description}</div>
                {item.isNew && <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">New</Badge>}
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">Unsaved Change</Badge>
                )}
                {item.category && (
                  <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                )}
              </div>
              <div className="text-sm text-gray-500">{item.itemCode}</div>
            </div>
            
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
          </div>
          
          {/* Edit Quantity Controls */}
          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm">
              <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
              <span className="text-gray-500"> per unit</span>
            </div>
            
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
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Combined Header and Progress Bar on the same row */}
          <div>
            {/* Title and Cost */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{item.description}</div>
                  {item.isNew && <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">New</Badge>}
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">Unsaved Change</Badge>
                  )}
                  {item.category && (
                    <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500">{item.itemCode}</div>
              </div>
              
              <div className="font-medium text-right">
                {formatCurrency(item.total)}
                <div className="text-xs text-gray-500">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </div>
              </div>
            </div>
            
            {/* Progress Bar and Action Buttons on same row */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1">
                <SegmentedProgressBar 
                  total={item.quantity}
                  used={getUsedQuantity(item.itemCode)}
                  colors={{
                    used: '#2563EB', // Blue for used
                    total: '#D1D5DB', // Gray for balance
                    background: '#F3F4F6', // Light gray background
                  }}
                  height={12}
                  className="w-full"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={cn(
                          "h-6 w-6 p-0",
                          isReadOnly && "text-gray-400 cursor-not-allowed"
                        )}
                        onClick={handleStartEdit}
                        disabled={isReadOnly}
                      >
                        {isReadOnly ? <LockIcon className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit quantity</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {isReadOnly ? (
                  // In read-only mode, show lock icon for second button
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-gray-400 cursor-not-allowed"
                          disabled
                        >
                          <LockIcon className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cannot modify - plan is inactive</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : item.isNew ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100" 
                          onClick={() => onDelete(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove item</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : getUsedQuantity(item.itemCode) > 0 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-gray-400 cursor-not-allowed"
                          disabled
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cannot archive - item has used units</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-amber-500 hover:text-amber-700 hover:bg-amber-100" 
                          onClick={() => {
                            onUpdateQuantity(index, 0);
                          }}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Archive item (sets quantity to 0)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {hasUnsavedChanges && !isEditing && (
        <div className="mt-2 text-xs text-amber-600">
          Changes will only be saved when you click "Save All Changes" at the bottom
        </div>
      )}
      
      {validationError && isEditing && (
        <Alert variant="destructive" className="mt-2 py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {validationError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}