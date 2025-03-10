import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import type { BudgetItem, BudgetItemCatalog } from "@shared/schema";
import { BudgetPlan } from "./BudgetPlanFullView";
import { 
  PlusCircle, 
  Trash2, 
  Package, 
  DollarSign,
  InfoIcon,
  Save,
  AlertTriangle
} from "lucide-react";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface BudgetPlanEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BudgetPlan | null;
  budgetItems: BudgetItem[];
  catalogItems?: BudgetItemCatalog[];
  onSave: (items: BudgetItem[]) => void;
  isLoading?: boolean;
}

/**
 * Dialog component for editing budget items within a plan
 */
export function BudgetPlanEditDialog({
  open,
  onOpenChange,
  plan,
  budgetItems,
  catalogItems = [],
  onSave,
  isLoading = false
}: BudgetPlanEditDialogProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [activeTab, setActiveTab] = useState<string>("existing");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Reset form state when dialog opens/closes or plan changes
  useEffect(() => {
    if (open && plan) {
      setItems([...budgetItems]);
      setSelectedItemCode("");
      setQuantity("1");
      setActiveTab("existing");
      setCategoryFilter("all");
    }
  }, [open, plan, budgetItems]);

  if (!plan) return null;

  // Get the sum of all items' total costs
  const totalCost = items.reduce((sum, item) => {
    const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) || 0 : item.quantity || 0;
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice || 0;
    return sum + (quantity * unitPrice);
  }, 0);

  // Get unique categories from catalog items
  const uniqueCategories = Array.from(
    new Set(catalogItems.map(item => item.category || 'Uncategorized'))
  );

  // Filter catalog items by category
  const filteredCatalogItems = catalogItems.filter(item => 
    categoryFilter === 'all' || (item.category || 'Uncategorized') === categoryFilter
  );
  
  // Add an item from the catalog
  const handleAddItemFromCatalog = () => {
    if (!selectedItemCode || !plan) return;
    
    const selectedCatalogItem = catalogItems.find(item => item.itemCode === selectedItemCode);
    
    if (!selectedCatalogItem) {
      toast({
        title: "Error",
        description: "Selected item not found in catalog",
        variant: "destructive",
      });
      return;
    }
    
    const parsedQuantity = parseInt(quantity) || 0;
    
    if (parsedQuantity <= 0) {
      toast({
        title: "Error",
        description: "Quantity must be greater than zero",
        variant: "destructive",
      });
      return;
    }
    
    // Check if item already exists
    const existingItemIndex = items.findIndex(item => item.itemCode === selectedItemCode);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items];
      const existingItem = updatedItems[existingItemIndex];
      const existingQuantity = typeof existingItem.quantity === 'string' 
        ? parseInt(existingItem.quantity) || 0 
        : existingItem.quantity || 0;
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: existingQuantity + parsedQuantity
      };
      
      setItems(updatedItems);
      toast({
        title: "Success",
        description: `Added ${parsedQuantity} more of ${selectedCatalogItem.description} to existing item`,
        variant: "default",
      });
    } else {
      // Create new item
      const newItem: BudgetItem = {
        id: -Date.now(), // Temporary negative ID until saved to database
        clientId: plan.clientId,
        budgetSettingsId: plan.id,
        itemCode: selectedCatalogItem.itemCode,
        name: selectedCatalogItem.description,
        description: selectedCatalogItem.description,
        unitPrice: selectedCatalogItem.defaultUnitPrice,
        quantity: parsedQuantity,
        category: selectedCatalogItem.category || null
      };
      
      setItems([...items, newItem]);
      toast({
        title: "Success",
        description: `Added ${parsedQuantity} ${selectedCatalogItem.description}`,
        variant: "default",
      });
    }
    
    // Reset input fields
    setSelectedItemCode("");
    setQuantity("1");
  };
  
  // Remove an item
  const handleRemoveItem = (itemId: number) => {
    setItems(items.filter(item => item.id !== itemId));
  };
  
  // Update item quantity
  const handleQuantityChange = (itemId: number, newQuantity: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: parseInt(newQuantity) || 0 };
      }
      return item;
    }));
  };
  
  // Save changes
  const handleSave = () => {
    onSave(items);
    toast({
      title: "Success",
      description: "Budget items saved successfully",
      variant: "default",
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Edit Budget Items
          </DialogTitle>
          <DialogDescription>
            Add, remove, or modify items in this budget plan. 
            Currently editing: <span className="font-medium">{plan.planName}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {/* Budget item list (5 columns) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Current Budget Items</h3>
              <div className="text-sm">
                Total: <span className="font-medium">${totalCost.toFixed(2)}</span>
              </div>
            </div>
            
            <ScrollArea className="h-[350px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px] text-right">Unit Price</TableHead>
                    <TableHead className="w-[80px] text-right">Qty</TableHead>
                    <TableHead className="w-[100px] text-right">Total</TableHead>
                    <TableHead className="w-[50px] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                        <p>No budget items in this plan yet. Add items below.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => {
                      const itemQuantity = typeof item.quantity === 'string' 
                        ? parseInt(item.quantity) || 0 
                        : item.quantity || 0;
                      
                      const itemUnitPrice = typeof item.unitPrice === 'string' 
                        ? parseFloat(item.unitPrice) || 0 
                        : item.unitPrice || 0;
                      
                      const totalPrice = itemQuantity * itemUnitPrice;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.itemCode}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{item.name || item.description}</span>
                              {item.category && (
                                <Badge variant="outline" className="w-fit mt-1">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            ${itemUnitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-16 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${totalPrice.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          
          {/* Add item form (2 columns) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Add Items</CardTitle>
                <CardDescription>
                  Select items from the catalog
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="existing" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="existing">Catalog Items</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="existing" className="space-y-4 mt-3">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="categoryFilter">Category</Label>
                        <Select
                          value={categoryFilter}
                          onValueChange={(value) => setCategoryFilter(value)}
                        >
                          <SelectTrigger id="categoryFilter">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {uniqueCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="itemSelect">Item</Label>
                        <Select
                          value={selectedItemCode}
                          onValueChange={(value) => setSelectedItemCode(value)}
                        >
                          <SelectTrigger id="itemSelect">
                            <SelectValue placeholder="Select an item" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCatalogItems.map((item) => (
                              <SelectItem key={item.id} value={item.itemCode}>
                                {item.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                        />
                      </div>
                      
                      {selectedItemCode && (
                        <div className="text-sm p-2 bg-gray-50 rounded-md">
                          <p className="text-gray-600">
                            Unit Price: $
                            {(catalogItems.find(item => item.itemCode === selectedItemCode)?.defaultUnitPrice || 0).toFixed(2)}
                          </p>
                          <p className="text-gray-600">
                            Total: $
                            {((catalogItems.find(item => item.itemCode === selectedItemCode)?.defaultUnitPrice || 0) * 
                              (parseInt(quantity) || 0)).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  disabled={!selectedItemCode || parseInt(quantity) <= 0 || isLoading}
                  onClick={handleAddItemFromCatalog}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
        
        <DialogFooter>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mr-auto text-sm text-gray-500 flex items-center">
                  <InfoIcon className="h-4 w-4 mr-1" />
                  <span>Available Funds: ${plan.availableFunds.toFixed(2)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total allocated budget for this plan</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}