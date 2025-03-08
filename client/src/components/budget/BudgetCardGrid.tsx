import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Edit, 
  Eye, 
  FileArchive, 
  PlusCircle, 
  Star,
  ChevronLeft,
  RotateCcw,
  InfoIcon,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Clock,
  BadgeDollarSign,
  Save,
  ChevronDown, 
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// BudgetPlan interface for enhanced budget plans with UI display properties
export interface BudgetPlan {
  // Original BudgetSettings properties
  id: number;
  clientId: number;
  planSerialNumber: string | null;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endOfPlan: string | null;
  createdAt: Date | null;
  
  // Additional properties for UI display
  active: boolean;
  archived: boolean;
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
  
  // Mapped properties for consistent UI naming
  planName: string;
  fundingSource: string;
  startDate: string | null;
  endDate: string | null;
}

// Enhanced budget item with usage data
export interface EnhancedBudgetItem extends BudgetItem {
  catalogItem?: BudgetItemCatalog;
  usedQuantity: number;
  balanceQuantity: number;
  itemName: string;
  isActive: boolean;
  totalPrice: number;
  originalQuantity: number;
}

// History tracking for undo functionality
type HistoryEntry = {
  itemId: number;
  fieldName: 'quantity' | 'isActive';
  oldValue: number | boolean;
  newValue: number | boolean;
  timestamp: Date;
};

// Schema for budget item updates
type BudgetItemUpdate = {
  id: number;
  quantity: number;
  isActive: boolean;
};

// Props for the edit side panel
interface BudgetEditSidePanelProps {
  plan: BudgetPlan;
  budgetItems: EnhancedBudgetItem[];
  onClose: () => void;
}

// Budget Edit Side Panel Component
function BudgetEditSidePanel({ plan, budgetItems, onClose }: BudgetEditSidePanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for budget items management
  const [editItems, setEditItems] = useState<EnhancedBudgetItem[]>([]);
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
    if (budgetItems.length > 0) {
      setEditItems(budgetItems);
      setOriginalItems(JSON.parse(JSON.stringify(budgetItems))); // Deep copy
      
      // Calculate total budget
      const total = budgetItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      setTotalBudget(total);
      setOriginalTotalBudget(total);
      
      // Initialize filtered items
      setFilteredItems(budgetItems);
    }
  }, [budgetItems]);

  // Update filtered items when search or filters change
  useEffect(() => {
    let filtered = [...editItems];
    
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
  }, [searchTerm, filterActive, editItems]);
  
  // Check for changes in budget items
  useEffect(() => {
    if (originalItems.length > 0) {
      const itemsChanged = editItems.some((item) => {
        const originalItem = originalItems.find(o => o.id === item.id);
        if (!originalItem) return true;
        return item.quantity !== originalItem.quantity || 
               item.isActive !== originalItem.isActive;
      });
      setHasChanges(itemsChanged);
    }
  }, [editItems, originalItems]);

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
    
    setEditItems(prev => {
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
    setEditItems(prev => {
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
    setEditItems(prev => {
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
    setEditItems(JSON.parse(JSON.stringify(originalItems))); // Deep copy
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
      const itemsToUpdate = editItems.filter(item => {
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
      setOriginalItems(JSON.parse(JSON.stringify(editItems)));
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
    <div className="w-1/3 border rounded-lg shadow-sm overflow-hidden transition-all duration-300 flex flex-col">
      {/* Header area */}
      <div className="p-4 bg-muted flex justify-between items-center border-b">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="p-1 h-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h4 className="font-medium">
          {plan.planName || 'Plan Details'}
        </h4>
        <div className="w-8" /> {/* Empty div for flex spacing */}
      </div>
      
      {/* Top control area with actions */}
      <div className="p-4 border-b flex justify-between items-center gap-2">
        <div className="flex-1">
          <div className="text-sm font-medium">Budget Total: <span className="text-lg">${totalBudget.toFixed(2)}</span></div>
          <div className="text-xs text-muted-foreground">
            {editItems.length} items • {editItems.filter(i => i.isActive).length} active
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
                            <Switch
                              checked={item.isActive}
                              onCheckedChange={() => handleToggleActive(item.id)}
                            />
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

interface BudgetCardGridProps {
  budgetSettings: BudgetSettings | undefined;
  budgetItems: BudgetItem[];
  onCreatePlan: () => void;
  onArchivePlan: (plan: BudgetPlan) => void;
  onSetActivePlan: (plan: BudgetPlan) => void;
}

export default function BudgetCardGrid({
  budgetSettings,
  budgetItems,
  onCreatePlan,
  onArchivePlan,
  onSetActivePlan
}: BudgetCardGridProps) {
  const [selectedPlan, setSelectedPlan] = useState<BudgetPlan | null>(null);
  const [showSidePanel, setShowSidePanel] = useState<boolean>(false);
  
  // Fetch budget item catalog for reference data 
  const catalogItems = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-catalog'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch sessions for the client to calculate actual used funds
  const { data: clientSessions = [] } = useQuery<any[]>({
    queryKey: ['/api/clients', budgetSettings?.clientId, 'sessions'],
    // Only fetch if we have a client ID
    enabled: !!budgetSettings?.clientId,
  });

  // Enhance budget items with catalog details and calculate used quantities
  const enhancedBudgetItems = React.useMemo(() => {
    const catalogData = catalogItems.data as BudgetItemCatalog[] | undefined;
    if (!catalogData) {
      // Initialize with default values for usedQuantity and balanceQuantity
      return budgetItems.map(item => ({
        ...item,
        usedQuantity: 0,
        balanceQuantity: typeof item.quantity === 'string'
          ? parseInt(item.quantity) || 0
          : item.quantity || 0,
        itemName: item.name || 'Unknown Item',
        isActive: true,
        totalPrice: 0,
        originalQuantity: 0
      })) as EnhancedBudgetItem[];
    }
    
    return budgetItems.map(item => {
      // Find matching catalog item
      const catalogItem = catalogData.find(
        (catalog) => catalog.itemCode === item.itemCode
      );
      
      // Calculate used quantity from sessions
      const usedQuantity = clientSessions.reduce((total: number, session: any) => {
        if (!session.products || !Array.isArray(session.products)) return total;
        
        // Sum up used quantities for this specific item
        return total + session.products.reduce((itemTotal: number, product: any) => {
          if (product.productCode === item.itemCode || product.itemCode === item.itemCode) {
            return itemTotal + (typeof product.quantity === 'string' 
              ? parseInt(product.quantity) || 0 
              : product.quantity || 0);
          }
          return itemTotal;
        }, 0);
      }, 0);
      
      // Calculate balance quantity
      const totalQuantity = typeof item.quantity === 'string'
        ? parseInt(item.quantity) || 0
        : item.quantity || 0;
      
      const balanceQuantity = Math.max(0, totalQuantity - usedQuantity);
      
      // Convert unit price to number
      const unitPrice = typeof item.unitPrice === 'string'
        ? parseFloat(item.unitPrice) || 0
        : item.unitPrice || 0;
      
      // Return enhanced item with catalog details and usage data
      return {
        ...item,
        name: item.name || (catalogItem ? catalogItem.description : null),
        description: item.description || (catalogItem ? catalogItem.description : ''),
        category: item.category || (catalogItem ? catalogItem.category : null),
        usedQuantity,
        balanceQuantity,
        itemName: item.name || (catalogItem ? catalogItem.description : 'Unknown Item'),
        isActive: true,
        totalPrice: totalQuantity * unitPrice,
        originalQuantity: totalQuantity,
        unitPrice
      } as EnhancedBudgetItem;
    });
  }, [budgetItems, catalogItems.data, clientSessions]);
  
  // Convert budget settings to budget plan with additional properties
  const budgetPlans = React.useMemo(() => {
    if (!budgetSettings) return [];
    
    // Calculate total available funds from budget items (sum of all budget item rows)
    const availableFunds = budgetItems.reduce((total, item) => {
      const unitPrice = typeof item.unitPrice === 'string'
        ? parseFloat(item.unitPrice) || 0
        : item.unitPrice || 0;
        
      const quantity = typeof item.quantity === 'string'
        ? parseInt(item.quantity) || 0
        : item.quantity || 0;
        
      return total + (unitPrice * quantity);
    }, 0);
    
    // Calculate used funds based on session usage
    const totalUsed = clientSessions.reduce((total: number, session: any) => {
      // Skip sessions without products
      if (!session.products || !Array.isArray(session.products)) return total;
      
      // Sum up all products used in this session
      return total + session.products.reduce((sessionTotal: number, product: any) => {
        const unitPrice = typeof product.unitPrice === 'string'
          ? parseFloat(product.unitPrice) || 0
          : product.unitPrice || 0;
          
        const quantity = typeof product.quantity === 'string'
          ? parseInt(product.quantity) || 0
          : product.quantity || 0;
          
        return sessionTotal + (unitPrice * quantity);
      }, 0);
    }, 0);
    
    const percentUsed = availableFunds > 0 ? (totalUsed / availableFunds) * 100 : 0;
    
    // Create the budget plan with all the properties we need
    const plan: BudgetPlan = {
      ...budgetSettings,
      active: budgetSettings.isActive !== undefined ? !!budgetSettings.isActive : true,
      archived: false, // This will be added to the schema later
      totalUsed,
      availableFunds, // Override with calculated value
      itemCount: budgetItems.length,
      percentUsed,
      // Map database fields to the fields used in UI with improved fallbacks
      planName: budgetSettings.planCode || `Plan ${budgetSettings.planSerialNumber?.substr(-6) || ''}`.trim() || 'Default Plan',
      fundingSource: 'NDIS', // Default until we add this to schema
      startDate: budgetSettings.createdAt?.toString() || null,
      endDate: budgetSettings.endOfPlan || null
    };
    
    return [plan];
  }, [budgetSettings, budgetItems, clientSessions]);
  
  // Handle card selection
  const handleSelectPlan = (plan: BudgetPlan) => {
    setSelectedPlan(plan);
    setShowSidePanel(true);
  };
  
  // Close the side panel
  const handleCloseSidePanel = () => {
    setShowSidePanel(false);
    // Keep the selected plan for a moment for a smooth transition
    setTimeout(() => setSelectedPlan(null), 300);
  };
  
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
  
  // Calculate status of plan based on dates and usage
  const getPlanStatus = (plan: BudgetPlan) => {
    if (plan.archived) return { label: 'Archived', color: 'gray' };
    
    if (!plan.active) return { label: 'Inactive', color: 'gray' };
    
    // Check if plan is expired
    if (plan.endDate) {
      const endDate = new Date(plan.endDate);
      if (endDate < new Date()) {
        return { label: 'Expired', color: 'red' };
      }
    }
    
    // Check usage level
    if (plan.percentUsed >= 100) {
      return { label: 'Depleted', color: 'red' };
    } else if (plan.percentUsed >= 90) {
      return { label: 'Critical', color: 'amber' };
    } else if (plan.percentUsed >= 70) {
      return { label: 'High Usage', color: 'yellow' };
    }
    
    return { label: 'Active', color: 'green' };
  };
  
  // If no budget plans, show empty state
  if (budgetPlans.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-10 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Budget Plans</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              No budget plans have been created for this client yet. You'll need to set up a budget plan to track funding and expenses.
            </p>
            <Button onClick={onCreatePlan}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Budget Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Budget Plans</h3>
        <Button size="sm" onClick={onCreatePlan}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Budget Plan
        </Button>
      </div>
      
      {/* Main content area with card grid and optional side panel */}
      <div className="flex gap-4 min-h-[500px]">
        {/* Card Grid - shrinks when side panel is visible */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300 ${
          showSidePanel ? 'w-2/3' : 'w-full'
        }`}>
          {budgetPlans.map((plan) => {
            const status = getPlanStatus(plan);
            const availableFunds = typeof plan.availableFunds === 'string'
              ? parseFloat(plan.availableFunds) || 0
              : plan.availableFunds || 0;
            
            // Determine if this card is selected
            const isSelected = selectedPlan?.id === plan.id;
            
            return (
              <Card 
                key={plan.id} 
                className={`
                  transition-all duration-200
                  ${plan.active ? 'border-2 border-primary' : ''} 
                  ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                  hover:shadow-md cursor-pointer
                `}
                onClick={() => handleSelectPlan(plan)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {plan.active && <Star className="h-4 w-4 text-amber-500 mr-1" />}
                        {plan.planName || 'Unnamed Plan'}
                      </CardTitle>
                      <CardDescription>
                        {plan.planSerialNumber ? (
                          <>
                            {plan.planSerialNumber?.substr(-6) || ''} 
                            {(plan.startDate || plan.endDate) && ' • '}
                            {plan.startDate && formatDate(plan.startDate)}
                            {plan.startDate && plan.endDate && ' - '}
                            {plan.endDate && formatDate(plan.endDate)}
                          </>
                        ) : 'No plan details available'}
                      </CardDescription>
                    </div>
                    <Badge 
                      className={`
                        ${status.color === 'green' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                        ${status.color === 'amber' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : ''}
                        ${status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : ''}
                        ${status.color === 'red' ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}
                        ${status.color === 'gray' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' : ''}
                      `}
                    >
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Available Funds</div>
                      <div className="text-xl font-bold">${availableFunds.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Used</div>
                      <div className="text-xl font-bold">${plan.totalUsed.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Budget Utilization</span>
                      <span>{Math.min(100, plan.percentUsed).toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(100, plan.percentUsed)} 
                      className="h-2"
                      indicatorClassName={
                        plan.percentUsed > 100 ? "bg-red-500" :
                        plan.percentUsed > 90 ? "bg-amber-500" :
                        plan.percentUsed > 70 ? "bg-yellow-500" :
                        "bg-green-500"
                      }
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {plan.itemCount} budget items • {plan.fundingSource || 'Unknown source'}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-center">
                  <Button size="sm" variant="outline">
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Manage Budget Items
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        
        {/* Side Panel - only shows when a plan is selected */}
        {showSidePanel && selectedPlan && (
          <BudgetEditSidePanel 
            plan={selectedPlan}
            budgetItems={enhancedBudgetItems.filter(
              item => item.budgetSettingsId === selectedPlan.id
            )}
            onClose={handleCloseSidePanel}
          />
        )}
      </div>
    </div>
  );
}