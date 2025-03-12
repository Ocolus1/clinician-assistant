import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unifiedBudgetFormSchema, FIXED_BUDGET_AMOUNT, type UnifiedBudgetFormValues } from "./BudgetFormSchema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Save, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

import { BudgetValidation } from "./BudgetValidation";
import { BudgetItemRow } from "./BudgetItemRow";
import { BudgetCatalogSelector } from "./BudgetCatalogSelector";

interface BudgetPlan {
  id: number;
  clientId: number;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
}

interface BudgetItem {
  id: number;
  clientId: number;
  budgetSettingsId: number;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  name: string | null;
  category: string | null;
}

interface UnifiedBudgetManagerProps {
  plan: BudgetPlan;
  budgetItems: BudgetItem[];
  onBudgetChange?: () => void;
}

/**
 * A unified component for managing budget items with a single form context
 * to eliminate form conflicts while maintaining validation.
 */
export function UnifiedBudgetManager({
  plan,
  budgetItems,
  onBudgetChange
}: UnifiedBudgetManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [itemToRemoveIndex, setItemToRemoveIndex] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  
  // Create form with Zod validation
  const form = useForm<UnifiedBudgetFormValues>({
    resolver: zodResolver(unifiedBudgetFormSchema),
    defaultValues: {
      items: [],
      totalBudget: FIXED_BUDGET_AMOUNT,
      totalAllocated: 0,
      remainingBudget: FIXED_BUDGET_AMOUNT
    }
  });
  
  // Setup field array for items
  const { fields, append, remove, update } = useFieldArray({
    name: "items",
    control: form.control
  });
  
  // Watch items to calculate totals
  const watchedItems = form.watch("items");
  
  // Calculate budget totals
  const totalAllocated = useMemo(() => {
    return watchedItems.reduce((total, item) => {
      return total + (Number(item.quantity) * Number(item.unitPrice));
    }, 0);
  }, [watchedItems]);
  
  const remainingBudget = FIXED_BUDGET_AMOUNT - totalAllocated;
  
  // Initialize form when budget items change or edit mode is toggled
  useEffect(() => {
    if (isEditing) {
      // When entering edit mode, reset the form with current items
      form.reset({
        items: budgetItems.map(item => ({
          id: item.id,
          itemCode: item.itemCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          name: item.name,
          category: item.category
        })),
        totalBudget: FIXED_BUDGET_AMOUNT,
        totalAllocated,
        remainingBudget
      });
    }
  }, [budgetItems, isEditing, form, totalAllocated, remainingBudget]);
  
  // API Mutations for add/update/delete
  const addItemMutation = useMutation({
    mutationFn: async (newItem: Omit<BudgetItem, "id">) => {
      const response = await fetch(`/api/clients/${plan.clientId}/budget-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      
      if (!response.ok) {
        throw new Error("Failed to add budget item");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${plan.clientId}/budget-items`] });
    }
  });
  
  const updateItemMutation = useMutation({
    mutationFn: async (updatedItem: BudgetItem) => {
      const response = await fetch(`/api/budget-items/${updatedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update budget item");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${plan.clientId}/budget-items`] });
    }
  });
  
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/budget-items/${itemId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete budget item");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${plan.clientId}/budget-items`] });
    }
  });
  
  // Handler for adding items
  const handleAddItem = (item: { 
    itemCode: string; 
    description: string; 
    unitPrice: number; 
    quantity: number;
    name: string | null;
    category: string | null;
  }) => {
    append({
      ...item,
      isNew: true
    });
  };
  
  // Handler for removing items
  const handleRemoveItem = (index: number) => {
    const item = fields[index];
    
    if (item.id) {
      // Existing item - show confirmation dialog
      setItemToRemoveIndex(index);
      setIsConfirmDialogOpen(true);
    } else {
      // New item - remove directly
      remove(index);
    }
  };
  
  // Confirm item removal
  const confirmRemoveItem = async () => {
    if (itemToRemoveIndex !== null) {
      const item = fields[itemToRemoveIndex];
      
      if (item.id) {
        try {
          await deleteItemMutation.mutateAsync(item.id);
        } catch (error) {
          console.error("Error deleting item:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete budget item."
          });
        }
      }
      
      remove(itemToRemoveIndex);
      setIsConfirmDialogOpen(false);
      setItemToRemoveIndex(null);
    }
  };
  
  // Cancel item removal
  const cancelRemoveItem = () => {
    setIsConfirmDialogOpen(false);
    setItemToRemoveIndex(null);
  };
  
  // Form submission
  const onSubmit = async (data: UnifiedBudgetFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Process each item
      for (const item of data.items) {
        if (item.isNew) {
          // New items need to be created
          const newItem = {
            clientId: plan.clientId,
            budgetSettingsId: plan.id,
            itemCode: item.itemCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            name: item.name,
            category: item.category
          };
          await addItemMutation.mutateAsync(newItem);
        } else if (item.id) {
          // Existing items need to be updated
          const updatedItem = {
            id: item.id,
            clientId: plan.clientId,
            budgetSettingsId: plan.id,
            itemCode: item.itemCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            name: item.name,
            category: item.category
          };
          await updateItemMutation.mutateAsync(updatedItem);
        }
      }
      
      // Success notification
      toast({
        title: "Budget Updated",
        description: "Your budget changes have been saved successfully.",
      });
      
      // Exit edit mode
      setIsEditing(false);
      
      // Notify parent of changes if callback provided
      if (onBudgetChange) {
        onBudgetChange();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Saving Budget",
        description: "There was a problem saving your changes. Please try again.",
      });
      console.error("Error saving budget changes:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Cancel editing and revert to initial state
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset will happen in useEffect when isEditing changes
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Budget Items and Usage</CardTitle>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Budget
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Budget validation summary */}
          <BudgetValidation
            totalBudget={FIXED_BUDGET_AMOUNT}
            totalAllocated={totalAllocated}
            remainingBudget={remainingBudget}
            hasItems={fields.length > 0}
          />
          
          {/* Budget items table */}
          <div className="rounded-md border">
            <Table>
              <TableCaption>Current budget allocation for this plan</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No budget items added yet.
                    </TableCell>
                  </TableRow>
                )}
                
                {fields.map((field, index) => (
                  <BudgetItemRow
                    key={field.id}
                    index={index}
                    control={form.control}
                    onRemove={handleRemoveItem}
                    disabled={!isEditing || isSubmitting}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Add item section */}
          {isEditing && (
            <div className="pt-4">
              <BudgetCatalogSelector
                onSelectItem={handleAddItem}
                clientId={plan.clientId}
                budgetSettingsId={plan.id}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Confirmation dialog for deleting items */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this item from your budget? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelRemoveItem}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveItem}>
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}