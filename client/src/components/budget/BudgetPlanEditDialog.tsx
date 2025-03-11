import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Save,
  AlertTriangle,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  Clock,
  Search,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { BudgetPlan, EnhancedBudgetItem } from "./BudgetFeatureContext";
import type { BudgetItemCatalog } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Progress } from "../ui/progress";

interface BudgetPlanEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BudgetPlan | null;
  budgetItems: EnhancedBudgetItem[];
  catalogItems: BudgetItemCatalog[];
  onSave: (items: EnhancedBudgetItem[]) => void;
}

export function BudgetPlanEditDialog({
  open,
  onOpenChange,
  plan,
  budgetItems: initialBudgetItems,
  catalogItems,
  onSave,
}: BudgetPlanEditDialogProps) {
  const [activeTab, setActiveTab] = useState("items");
  const [budgetItems, setBudgetItems] = useState<EnhancedBudgetItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<BudgetItemCatalog | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Reset state when dialog opens/closes or plan changes
  useEffect(() => {
    if (open && plan) {
      setBudgetItems(initialBudgetItems);
      setSearchTerm("");
      setSelectedCatalogItem(null);
      setHasChanges(false);
    }
  }, [open, plan, initialBudgetItems]);
  
  // Group catalog items by category
  const catalogByCategory = React.useMemo(() => {
    return catalogItems.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, BudgetItemCatalog[]>);
  }, [catalogItems]);
  
  // Filter budget items based on search term
  const filteredItems = React.useMemo(() => {
    if (!searchTerm) return budgetItems;
    
    const searchLower = searchTerm.toLowerCase();
    return budgetItems.filter(item => 
      item.itemCode.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      (item.category && item.category.toLowerCase().includes(searchLower))
    );
  }, [budgetItems, searchTerm]);
  
  // Calculate total allocated funds
  const totalAllocated = React.useMemo(() => {
    return budgetItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [budgetItems]);
  
  const remainingFunds = plan ? plan.availableFunds - totalAllocated : 0;
  const percentAllocated = plan && plan.availableFunds > 0 
    ? (totalAllocated / plan.availableFunds) * 100 
    : 0;
  
  // Check if we've allocated too much
  const isOverAllocated = plan ? totalAllocated > plan.availableFunds : false;
  
  // Handle adding a budget item
  const handleAddBudgetItem = (catalogItem: BudgetItemCatalog, quantity: number = 1) => {
    if (!plan) return;
    
    // Check if item already exists
    const existingItemIndex = budgetItems.findIndex(item => item.itemCode === catalogItem.itemCode);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...budgetItems];
      updatedItems[existingItemIndex].quantity += quantity;
      setBudgetItems(updatedItems);
    } else {
      // Add new item
      const newItem: EnhancedBudgetItem = {
        id: -Date.now(), // Temporary negative ID that will be replaced on save
        clientId: plan.clientId,
        budgetSettingsId: plan.id,
        itemCode: catalogItem.itemCode,
        name: catalogItem.description,
        description: catalogItem.description,
        unitPrice: catalogItem.defaultUnitPrice,
        quantity,
        category: catalogItem.category || null,
        
        // Additional fields for EnhancedBudgetItem
        usedQuantity: 0,
        remainingQuantity: quantity,
        totalPrice: catalogItem.defaultUnitPrice * quantity,
        usedAmount: 0,
        remainingAmount: catalogItem.defaultUnitPrice * quantity,
        usagePercentage: 0,
        itemName: catalogItem.description,
        catalogItem,
      };
      
      setBudgetItems([...budgetItems, newItem]);
    }
    
    setSelectedCatalogItem(null);
    setHasChanges(true);
  };
  
  // Handle removing a budget item
  const handleRemoveBudgetItem = (index: number) => {
    const updatedItems = budgetItems.filter((_, i) => i !== index);
    setBudgetItems(updatedItems);
    setHasChanges(true);
  };
  
  // Handle updating quantity for a budget item
  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    const updatedItems = [...budgetItems];
    const item = updatedItems[index];
    
    // Update quantity and derived values
    item.quantity = newQuantity;
    item.remainingQuantity = newQuantity - item.usedQuantity;
    item.totalPrice = item.unitPrice * newQuantity;
    item.remainingAmount = item.unitPrice * (newQuantity - item.usedQuantity);
    item.usagePercentage = newQuantity > 0 ? (item.usedQuantity / newQuantity) * 100 : 0;
    
    setBudgetItems(updatedItems);
    setHasChanges(true);
  };
  
  // Handle updating unit price for a budget item
  const handleUpdateUnitPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    
    const updatedItems = [...budgetItems];
    const item = updatedItems[index];
    
    // Update unit price and derived values
    item.unitPrice = newPrice;
    item.totalPrice = newPrice * item.quantity;
    item.usedAmount = newPrice * item.usedQuantity;
    item.remainingAmount = newPrice * (item.quantity - item.usedQuantity);
    
    setBudgetItems(updatedItems);
    setHasChanges(true);
  };
  
  // Handle save changes
  const handleSave = () => {
    onSave(budgetItems);
  };
  
  // Determine if active item
  const isItemActive = (item: EnhancedBudgetItem) => item.quantity > 0;
  
  if (!plan) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Budget Plan</DialogTitle>
          <DialogDescription>
            Modify budget items for <strong>{plan.planName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        {/* Budget Status Panel */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Available Funds</div>
                  <div className="text-2xl font-bold">{formatCurrency(plan.availableFunds)}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Allocated</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalAllocated)}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Remaining</div>
                  <div className={`text-2xl font-bold ${remainingFunds < 0 ? "text-destructive" : ""}`}>
                    {formatCurrency(remainingFunds)}
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Budget Allocation</span>
                  <span className="text-sm font-medium">{Math.round(percentAllocated)}%</span>
                </div>
                <Progress 
                  value={percentAllocated} 
                  className="h-2"
                  indicatorClassName={
                    isOverAllocated ? "bg-destructive" : 
                    percentAllocated > 90 ? "bg-amber-500" : 
                    "bg-green-500"
                  }
                />
              </div>
              
              {isOverAllocated && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Budget Over-allocated</AlertTitle>
                  <AlertDescription>
                    The total allocation ({formatCurrency(totalAllocated)}) exceeds the available funds ({formatCurrency(plan.availableFunds)}).
                    Please adjust the quantities or unit prices.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">Budget Items ({budgetItems.length})</TabsTrigger>
            <TabsTrigger value="add">Add Items</TabsTrigger>
          </TabsList>
          
          <TabsContent value="items" className="mt-4 space-y-4">
            {/* Search and filter */}
            <div className="flex items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search budget items..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Budget items list */}
            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm 
                    ? "No items match your search criteria"
                    : "No budget items in this plan"
                  }
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-12 gap-4 py-2 px-4 text-sm font-medium text-muted-foreground border-b">
                    <div className="col-span-5">Item</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-2 text-right">Quantity</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {filteredItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className={`overflow-hidden ${!isItemActive(item) ? 'bg-muted/20 border-dashed' : ''}`}>
                        <div className="grid grid-cols-12 gap-4 p-4 items-center">
                          <div className="col-span-5">
                            <div className="font-medium">{item.description}</div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Badge variant="outline" className="mr-2">
                                {item.itemCode}
                              </Badge>
                              {item.category && (
                                <span>{item.category}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <div className="flex items-center justify-end">
                              <span className="text-muted-foreground mr-1">$</span>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateUnitPrice(index, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right"
                              />
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <div className="flex items-center justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                                disabled={item.quantity <= 0}
                              >
                                <MinusCircle className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 0)}
                                className="w-14 mx-1 text-center"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                              >
                                <PlusCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="col-span-2 text-right font-medium">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </div>
                          
                          <div className="col-span-1 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveBudgetItem(index)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="add" className="mt-4 space-y-4">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-base font-medium">Add Budget Items</h4>
                <Select
                  onValueChange={(value) => {
                    const item = catalogItems.find(i => i.itemCode === value);
                    if (item) setSelectedCatalogItem(item);
                  }}
                  value={selectedCatalogItem?.itemCode || ""}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select an item to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(catalogByCategory).map(([category, items]) => (
                      <React.Fragment key={category}>
                        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                          {category}
                        </div>
                        {items.map(item => (
                          <SelectItem key={item.itemCode} value={item.itemCode}>
                            {item.description} - {formatCurrency(item.defaultUnitPrice)}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedCatalogItem && (
                <Card className="mb-4 border border-primary border-dashed">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{selectedCatalogItem.description}</div>
                        <div className="text-sm text-muted-foreground">
                          <Badge variant="outline" className="mr-2">
                            {selectedCatalogItem.itemCode}
                          </Badge>
                          Unit Price: {formatCurrency(selectedCatalogItem.defaultUnitPrice)}
                          {selectedCatalogItem.category && (
                            <span className="ml-2">Category: {selectedCatalogItem.category}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => handleAddBudgetItem(selectedCatalogItem)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add to Plan
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(catalogByCategory).map(([category, items]) => (
                  <Card key={category} className="overflow-hidden">
                    <div className="bg-primary/10 px-4 py-2 font-medium">
                      {category}
                    </div>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        {items.map(item => (
                          <div 
                            key={item.itemCode} 
                            className="p-2 border rounded-md flex justify-between items-center hover:bg-accent cursor-pointer"
                            onClick={() => setSelectedCatalogItem(item)}
                          >
                            <div>
                              <div className="font-medium text-sm">{item.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(item.defaultUnitPrice)}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddBudgetItem(item);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex items-center justify-between">
          <div>
            {hasChanges && (
              <span className="text-sm text-muted-foreground">
                You have unsaved changes.
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={isOverAllocated}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}