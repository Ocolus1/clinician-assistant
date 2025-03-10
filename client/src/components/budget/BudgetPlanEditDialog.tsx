import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { BudgetPlan, BudgetItemDetail } from "./BudgetPlanFullView";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Trash2, Plus } from "lucide-react";
import type { BudgetItemCatalog } from "@shared/schema";
import { Badge } from "../ui/badge";

// Form schema for budget items
const budgetItemSchema = z.object({
  id: z.number().optional(),
  clientId: z.number(),
  budgetSettingsId: z.number(),
  itemCode: z.string().min(1, "Item code is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().nullable().optional(),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

type BudgetItemFormValues = z.infer<typeof budgetItemSchema>;

// Form for adding a new budget item
interface AddItemFormProps {
  onAddItem: (item: BudgetItemFormValues) => void;
  catalogItems: BudgetItemCatalog[];
  clientId: number;
  budgetSettingsId: number;
}

function AddItemForm({ onAddItem, catalogItems, clientId, budgetSettingsId }: AddItemFormProps) {
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<BudgetItemCatalog | null>(null);
  
  const defaultValues: BudgetItemFormValues = {
    clientId,
    budgetSettingsId,
    itemCode: "",
    description: "",
    category: null,
    unitPrice: 0,
    quantity: 1,
  };
  
  const form = useForm<BudgetItemFormValues>({
    resolver: zodResolver(budgetItemSchema),
    defaultValues,
  });
  
  // Auto-populate fields when a catalog item is selected
  const handleCatalogItemSelect = (itemCode: string) => {
    const item = catalogItems.find(item => item.itemCode === itemCode) || null;
    setSelectedCatalogItem(item);
    
    if (item) {
      form.setValue("itemCode", item.itemCode);
      form.setValue("description", item.description);
      form.setValue("category", item.category);
      form.setValue("unitPrice", typeof item.defaultUnitPrice === 'string' 
        ? parseFloat(item.defaultUnitPrice) 
        : item.defaultUnitPrice);
    }
  };
  
  const onSubmit = (data: BudgetItemFormValues) => {
    onAddItem(data);
    form.reset(defaultValues);
    setSelectedCatalogItem(null);
  };
  
  return (
    <div className="border rounded-md p-4 mt-6">
      <h3 className="text-lg font-medium mb-4">Add Budget Item</h3>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="itemCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Code</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        handleCatalogItemSelect(e.target.value);
                      }}
                      value={field.value}
                    >
                      <option value="">Select an item</option>
                      {catalogItems.map((item) => (
                        <option key={item.id} value={item.itemCode}>
                          {item.itemCode} - {item.description}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Category"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Item description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface BudgetPlanEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BudgetPlan | null;
  budgetItems: BudgetItemDetail[];
  catalogItems: BudgetItemCatalog[];
  onSave: (items: any[]) => void;
}

export function BudgetPlanEditDialog({
  open,
  onOpenChange,
  plan,
  budgetItems,
  catalogItems,
  onSave,
}: BudgetPlanEditDialogProps) {
  const [items, setItems] = useState<BudgetItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize items from props
  useEffect(() => {
    setItems(budgetItems);
  }, [budgetItems]);
  
  // Handle adding a new item
  const handleAddItem = (newItem: BudgetItemFormValues) => {
    // Create a temporary ID for new items (will be replaced on server)
    const tempId = Math.min(...items.map(item => item.id), 0) - 1;
    
    // Create a copy without category if it's undefined
    const itemWithoutUndefinedFields = {...newItem};
    
    // Make a complete item with all required fields from BudgetItemDetail
    const enhancedItem: BudgetItemDetail = {
      id: newItem.id || tempId,
      clientId: newItem.clientId,
      budgetSettingsId: newItem.budgetSettingsId,
      itemCode: newItem.itemCode,
      name: null,
      description: newItem.description,
      unitPrice: newItem.unitPrice,
      quantity: newItem.quantity,
      category: newItem.category ?? null, // Ensure category is string | null, not undefined
      usedQuantity: 0,
      remainingQuantity: newItem.quantity,
      totalPrice: newItem.unitPrice * newItem.quantity,
      usedAmount: 0,
      remainingAmount: newItem.unitPrice * newItem.quantity,
      usagePercentage: 0
    };
    
    setItems(prev => [...prev, enhancedItem]);
  };
  
  // Handle removing an item
  const handleRemoveItem = (itemId: number) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };
  
  // Handle saving changes
  const handleSave = () => {
    setIsLoading(true);
    
    // Convert items to the format expected by the server
    const itemsForServer = items.map(item => ({
      id: item.id > 0 ? item.id : undefined, // Don't send temporary IDs
      clientId: item.clientId,
      budgetSettingsId: item.budgetSettingsId,
      itemCode: item.itemCode,
      description: item.description,
      category: item.category,
      unitPrice: item.unitPrice,
      quantity: item.quantity
    }));
    
    onSave(itemsForServer);
    setIsLoading(false);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // If plan is null, we'll still render the dialog but with minimal content
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Budget Plan: {plan?.planName || 'Unknown'}</DialogTitle>
          <DialogDescription>
            Add, edit or remove budget items for this plan.
          </DialogDescription>
        </DialogHeader>
        
        {plan ? (
          <>
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <Badge variant="outline" className="text-base font-medium">
                  Available Funds: {formatCurrency(plan.availableFunds)}
                </Badge>
                <Badge variant={plan.active ? "default" : "outline"} className="text-base">
                  {plan.active ? "Active Plan" : "Inactive Plan"}
                </Badge>
              </div>
              
              {/* Current items table */}
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No budget items added yet. Add items below.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.itemCode}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.category || "—"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Add new item form */}
              <AddItemForm 
                onAddItem={handleAddItem} 
                catalogItems={catalogItems}
                clientId={plan.clientId}
                budgetSettingsId={plan.id}
              />
              
              {/* Total calculation */}
              <div className="mt-6 text-right">
                <div className="text-sm text-gray-500 mb-1">Total Budget Value</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(items.reduce((sum, item) => sum + item.totalPrice, 0))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Loading plan details...
          </div>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !plan}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}