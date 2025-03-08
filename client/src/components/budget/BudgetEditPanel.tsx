import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  ScrollArea, 
  ScrollBar 
} from "@/components/ui/scroll-area";
import { 
  InfoIcon, 
  PauseCircle, 
  PlayCircle, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  RotateCcw,
  Clock,
  BadgeDollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { BudgetPlan, EnhancedBudgetItem } from './BudgetCardGrid';

// Schema for budget item updates
type BudgetItemUpdate = {
  id: number;
  quantity: number;
  isActive: boolean;
};

// History tracking for undo functionality
type HistoryEntry = {
  itemId: number;
  fieldName: 'quantity' | 'isActive';
  oldValue: number | boolean;
  newValue: number | boolean;
  timestamp: Date;
};

interface BudgetEditPanelProps {
  plan: BudgetPlan;
  budgetItems: EnhancedBudgetItem[];
}

export default function BudgetEditPanel({ plan, budgetItems: initialBudgetItems }: BudgetEditPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for budget items management
  const [budgetItems, setBudgetItems] = useState<EnhancedBudgetItem[]>([]);
  const [originalItems, setOriginalItems] = useState<EnhancedBudgetItem[]>([]);
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [originalTotalBudget, setOriginalTotalBudget] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  
  // State for UI sections
  const [referenceOpen, setReferenceOpen] = useState<boolean>(true);
  const [budgetItemsOpen, setBudgetItemsOpen] = useState<boolean>(true);
  
  // State for history tracking (undo functionality)
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filteredItems, setFilteredItems] = useState<EnhancedBudgetItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Initialize state from props
  useEffect(() => {
    if (initialBudgetItems.length > 0) {
      setBudgetItems(initialBudgetItems);
      setOriginalItems(JSON.parse(JSON.stringify(initialBudgetItems))); // Deep copy
      
      // Calculate total budget
      const total = initialBudgetItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      setTotalBudget(total);
      setOriginalTotalBudget(total);
      
      // Initialize filtered items
      setFilteredItems(initialBudgetItems);
    }
  }, [initialBudgetItems]);

  // Update filtered items when search or filters change
  useEffect(() => {
    let filtered = [...budgetItems];
    
    // Apply search filter if there's a search term
    if (searchTerm.trim() !== '') {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item.itemName && item.itemName.toLowerCase().includes(lowercaseSearch)) ||
        (item.description && item.description.toLowerCase().includes(lowercaseSearch)) ||
        (item.itemCode && item.itemCode.toLowerCase().includes(lowercaseSearch)) ||
        (item.category && item.category.toLowerCase().includes(lowercaseSearch))
      );
    }
    
    // Apply active/inactive filter
    if (filterActive === 'active') {
      filtered = filtered.filter(item => item.isActive);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter(item => !item.isActive);
    }
    
    setFilteredItems(filtered);
  }, [searchTerm, filterActive, budgetItems]);
  
  // Check for changes in budget items
  useEffect(() => {
    if (originalItems.length > 0) {
      const itemsChanged = budgetItems.some((item) => {
        const originalItem = originalItems.find(o => o.id === item.id);
        if (!originalItem) return true;
        return item.quantity !== originalItem.quantity || 
               item.isActive !== originalItem.isActive;
      });
      setHasChanges(itemsChanged);
    }
  }, [budgetItems, originalItems]);

  // Format date to display in a more user-friendly way
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-AU', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Handle quantity change for a budget item
  const handleQuantityChange = (id: number, newQuantity: number) => {
    // Validate input
    if (newQuantity < 0 || isNaN(newQuantity)) return;
    
    setBudgetItems(prev => {
      // Find the current item
      const currentItem = prev.find(item => item.id === id);
      if (!currentItem) return prev;
      
      // Add to history
      setHistory(prevHistory => [
        ...prevHistory,
        {
          itemId: id,
          fieldName: 'quantity',
          oldValue: currentItem.quantity,
          newValue: newQuantity,
          timestamp: new Date()
        }
      ]);
      
      // Find the item to update
      const updatedItems = prev.map(item => {
        if (item.id === id) {
          const newItem = { 
            ...item, 
            quantity: newQuantity,
            totalPrice: newQuantity * item.unitPrice
          };
          return newItem;
        }
        return item;
      });
      
      // Calculate new total
      const newTotal = updatedItems.reduce((sum, item) => {
        return sum + (item.isActive ? item.totalPrice : 0);
      }, 0);
      
      setTotalBudget(newTotal);
      return updatedItems;
    });
  };
  
  // Handle toggling active status for a budget item
  const handleToggleActive = (id: number) => {
    setBudgetItems(prev => {
      // Find the current item
      const currentItem = prev.find(item => item.id === id);
      if (!currentItem) return prev;
      
      // Add to history
      setHistory(prevHistory => [
        ...prevHistory,
        {
          itemId: id,
          fieldName: 'isActive',
          oldValue: currentItem.isActive,
          newValue: !currentItem.isActive,
          timestamp: new Date()
        }
      ]);
      
      // Toggle active status for the item
      const updatedItems = prev.map(item => {
        if (item.id === id) {
          return { 
            ...item, 
            isActive: !item.isActive
          };
        }
        return item;
      });
      
      // Calculate new total for active items only
      const newTotal = updatedItems.reduce((sum, item) => {
        return sum + (item.isActive ? item.totalPrice : 0);
      }, 0);
      
      setTotalBudget(newTotal);
      return updatedItems;
    });
  };

  // Undo the last change
  const handleUndo = () => {
    if (history.length === 0) return;
    
    // Get the last action
    const lastAction = history[history.length - 1];
    
    // Apply the undo
    setBudgetItems(prev => {
      const updatedItems = prev.map(item => {
        if (item.id === lastAction.itemId) {
          if (lastAction.fieldName === 'quantity') {
            const oldQuantity = lastAction.oldValue as number;
            return {
              ...item,
              quantity: oldQuantity,
              totalPrice: oldQuantity * item.unitPrice
            };
          } else if (lastAction.fieldName === 'isActive') {
            return {
              ...item,
              isActive: lastAction.oldValue as boolean
            };
          }
        }
        return item;
      });
      
      // Recalculate total
      const newTotal = updatedItems.reduce((sum, item) => {
        return sum + (item.isActive ? item.totalPrice : 0);
      }, 0);
      
      setTotalBudget(newTotal);
      return updatedItems;
    });
    
    // Remove the last action from history
    setHistory(prev => prev.slice(0, -1));
  };

  // Reset budget items to original state
  const handleResetChanges = () => {
    setBudgetItems(JSON.parse(JSON.stringify(originalItems))); // Deep copy
    setTotalBudget(originalTotalBudget);
    setHasChanges(false);
    // Clear history when resetting
    setHistory([]);
  };

  // Mutation for updating budget items
  const updateBudgetItem = useMutation({
    mutationFn: async (data: BudgetItemUpdate) => {
      return apiRequest("PUT", `/api/budget-items/${data.id}`, {
        quantity: data.quantity,
        isActive: data.isActive
      });
    },
  });

  // Handle budget items updates submission
  const handleSaveItems = async () => {
    setIsSubmitting(true);
    
    try {
      // Only update items that have changes
      const itemsToUpdate = budgetItems.filter(item => {
        const originalItem = originalItems.find(o => o.id === item.id);
        return originalItem && (
          item.quantity !== originalItem.quantity ||
          item.isActive !== originalItem.isActive
        );
      });
      
      if (itemsToUpdate.length === 0) {
        toast({
          title: "No Changes",
          description: "No changes were made to budget items.",
          variant: "default",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Update items one by one
      const updates = itemsToUpdate.map(item => 
        updateBudgetItem.mutateAsync({
          id: item.id,
          quantity: item.quantity,
          isActive: item.isActive
        })
      );
      
      await Promise.all(updates);
      
      // On success
      toast({
        title: "Success",
        description: `Updated ${itemsToUpdate.length} budget items successfully`,
        variant: "default",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/clients', plan.clientId, 'budget-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', plan.clientId, 'budget-settings'] });
      
      setHasChanges(false);
      // Clear history after saving
      setHistory([]);
      // Update original items to match current state
      setOriginalItems(JSON.parse(JSON.stringify(budgetItems)));
      setOriginalTotalBudget(totalBudget);
    } catch (error) {
      console.error("Error updating budget items:", error);
      toast({
        title: "Error",
        description: "Failed to update budget items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header area with actions */}
      <div className="p-4 border-b flex justify-between items-center gap-2">
        <div className="flex-1">
          <div className="text-sm font-medium">Budget Total: <span className="text-lg">${totalBudget.toFixed(2)}</span></div>
          <div className="text-xs text-muted-foreground">
            {budgetItems.length} items • {budgetItems.filter(i => i.isActive).length} active
          </div>
        </div>
        <div className="flex gap-2">
          {history.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              disabled={isSubmitting}
              className="h-8"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Undo
            </Button>
          )}
          {hasChanges && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleResetChanges}
              disabled={isSubmitting}
              className="h-8"
            >
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveItems}
            disabled={!hasChanges || isSubmitting}
            className="h-8"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
      
      {/* Alert for budget changes */}
      {totalBudget !== originalTotalBudget && (
        <div className="px-4 pt-4">
          <Alert variant={totalBudget > originalTotalBudget ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Budget Change Alert</AlertTitle>
            <AlertDescription>
              {totalBudget > originalTotalBudget 
                ? `Your changes will increase the total budget by $${(totalBudget - originalTotalBudget).toFixed(2)}`
                : `Your changes will decrease the total budget by $${(originalTotalBudget - totalBudget).toFixed(2)}`
              }
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Content area with scrolling */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Reference Information - Read-only section */}
          <Collapsible open={referenceOpen} onOpenChange={setReferenceOpen} className="border rounded-md">
            <CollapsibleTrigger asChild>
              <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                <div className="flex items-center">
                  <InfoIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Reference Information</h4>
                </div>
                {referenceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 pt-0 text-sm bg-muted/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-muted-foreground">Plan Code:</span>
                      <div className="font-medium">{plan.planCode || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Serial Number:</span>
                      <div className="font-medium">{plan.planSerialNumber || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Funding Source:</span>
                      <div className="font-medium">{plan.fundingSource || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-muted-foreground">Start Date:</span>
                      <div className="font-medium">{plan.startDate ? formatDate(plan.startDate) : 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">End Date:</span>
                      <div className="font-medium">{plan.endDate ? formatDate(plan.endDate) : 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="font-medium">
                        <Badge variant={plan.active ? "default" : "secondary"}>
                          {plan.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground italic pt-2 border-t mt-3">
                  <InfoIcon className="h-3 w-3 inline mr-1" />
                  These plan details cannot be modified from this view.
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          {/* Budget Items Management Section */}
          <Collapsible open={budgetItemsOpen} onOpenChange={setBudgetItemsOpen} className="border rounded-md">
            <CollapsibleTrigger asChild>
              <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                <div className="flex items-center">
                  <BadgeDollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Budget Items Management</h4>
                </div>
                {budgetItemsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 pt-0">
                {/* Filter controls */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={filterActive === 'all' ? "default" : "outline"}
                      onClick={() => setFilterActive('all')}
                      className="h-8"
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={filterActive === 'active' ? "default" : "outline"}
                      onClick={() => setFilterActive('active')}
                      className="h-8"
                    >
                      Active
                    </Button>
                    <Button
                      size="sm"
                      variant={filterActive === 'inactive' ? "default" : "outline"}
                      onClick={() => setFilterActive('inactive')}
                      className="h-8"
                    >
                      Inactive
                    </Button>
                  </div>
                </div>
                
                {/* Budget items list */}
                <div className="space-y-3">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm || filterActive !== 'all' 
                        ? "No items match your filter criteria"
                        : "No budget items in this plan"
                      }
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <Card
                        key={item.id}
                        className={`border ${!item.isActive ? 'bg-muted/20 border-dashed' : ''}`}
                      >
                        <CardHeader className="py-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base flex items-center">
                                {item.itemName}
                                <Badge 
                                  variant="outline" 
                                  className="ml-2 text-xs"
                                >
                                  {item.itemCode}
                                </Badge>
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {item.category || 'Uncategorized'} • ${item.unitPrice.toFixed(2)} per unit
                              </CardDescription>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Switch
                                    checked={item.isActive}
                                    onCheckedChange={() => handleToggleActive(item.id)}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {item.isActive ? 'Deactivate item' : 'Activate item'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </CardHeader>
                        <CardContent className="py-0">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground text-xs">Used</span>
                              <div className="font-medium">{item.usedQuantity} units</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Available</span>
                              <div className="font-medium">{item.balanceQuantity} units</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Total</span>
                              <div className="font-medium">${item.totalPrice.toFixed(2)}</div>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="py-3 flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Quantity:</span>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                              min={0}
                              disabled={!item.isActive}
                              className="w-20 h-8"
                            />
                          </div>
                          {item.originalQuantity !== item.quantity && (
                            <Badge 
                              variant={item.quantity > item.originalQuantity ? "destructive" : "default"}
                              className="text-xs"
                            >
                              {item.quantity > item.originalQuantity 
                                ? `+${item.quantity - item.originalQuantity} units` 
                                : `-${item.originalQuantity - item.quantity} units`
                              }
                            </Badge>
                          )}
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
                
                {/* Help text */}
                <div className="mt-4 text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Toggle the switch to activate/deactivate budget items</li>
                    <li>Enter new quantities to adjust funding allocation</li>
                    <li>Used units indicate services already delivered</li>
                    <li>Changes will be highlighted before saving</li>
                  </ul>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
      
      {/* Footer with action buttons */}
      <div className="p-4 border-t bg-muted/10">
        <div className="flex justify-end gap-2">
          {history.length > 0 && (
            <Button
              variant="outline"
              onClick={handleUndo}
              disabled={isSubmitting}
              size="sm"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Undo Last Change
            </Button>
          )}
          <Button
            onClick={handleSaveItems}
            disabled={!hasChanges || isSubmitting}
            size="sm"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {isSubmitting ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}