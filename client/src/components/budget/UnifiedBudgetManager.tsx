import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Edit, X, AlertCircle } from "lucide-react";
import { BudgetItem, BudgetItemCatalog, BudgetSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BudgetItemRow } from "./BudgetItemRow";
import { BudgetCatalogSelector } from "./BudgetCatalogSelector";
import { BudgetValidation } from "./BudgetValidation";
import {
  UnifiedBudgetFormValues,
  BudgetItemFormValues,
  unifiedBudgetFormSchema,
  mapBudgetItemsToFormItems,
  calculateTotalAllocation,
} from "./BudgetFormSchema";

interface UnifiedBudgetManagerProps {
  plan: BudgetSettings;
  budgetItems: BudgetItem[];
  onBudgetChange?: () => void;
}

export function UnifiedBudgetManager({
  plan,
  budgetItems: initialBudgetItems,
  onBudgetChange,
}: UnifiedBudgetManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for UI controls
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingItemToRemove, setPendingItemToRemove] = useState<number | null>(null);
  
  // Fixed budget amount for validation
  const FIXED_BUDGET_AMOUNT = 375;
  
  // Setup the form with useForm and useFieldArray
  const form = useForm<UnifiedBudgetFormValues>({
    resolver: zodResolver(unifiedBudgetFormSchema),
    defaultValues: {
      items: mapBudgetItemsToFormItems(initialBudgetItems, plan.clientId, plan.id),
      totalBudget: FIXED_BUDGET_AMOUNT,
      totalAllocated: calculateTotalAllocation(initialBudgetItems),
      remainingBudget: FIXED_BUDGET_AMOUNT - calculateTotalAllocation(initialBudgetItems),
    },
  });
  
  // Setup field array for dynamic items management
  const { fields, append, remove, update } = useFieldArray({
    name: "items",
    control: form.control,
  });
  
  // Watch all items to calculate totals
  const watchedItems = form.watch("items");
  
  // Calculate budget totals
  const { totalAllocated, remainingBudget } = useMemo(() => {
    const total = calculateTotalAllocation(watchedItems);
    return {
      totalAllocated: total,
      remainingBudget: FIXED_BUDGET_AMOUNT - total,
    };
  }, [watchedItems, FIXED_BUDGET_AMOUNT]);
  
  // Update form values when watchedItems change
  useEffect(() => {
    form.setValue("totalAllocated", totalAllocated);
    form.setValue("remainingBudget", remainingBudget);
  }, [totalAllocated, remainingBudget, form]);
  
  // Reset form to initial state when not editing
  useEffect(() => {
    if (!isEditing) {
      form.reset({
        items: mapBudgetItemsToFormItems(initialBudgetItems, plan.clientId, plan.id),
        totalBudget: FIXED_BUDGET_AMOUNT,
        totalAllocated: calculateTotalAllocation(initialBudgetItems),
        remainingBudget: FIXED_BUDGET_AMOUNT - calculateTotalAllocation(initialBudgetItems),
      });
    }
  }, [isEditing, initialBudgetItems, plan.clientId, plan.id, form, FIXED_BUDGET_AMOUNT]);
  
  // Mutation for updating budget items
  const updateItemMutation = useMutation({
    mutationFn: async (item: BudgetItem) => {
      return apiRequest("PUT", `/api/budget-items/${item.id}`, item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${plan.clientId}/budget-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${plan.clientId}/budget-settings`] });
    },
  });
  
  // Mutation for adding new budget items
  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<BudgetItem, "id">) => {
      return apiRequest("POST", `/api/clients/${plan.clientId}/budget-items/${plan.id}`, item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${plan.clientId}/budget-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${plan.clientId}/budget-settings`] });
    },
  });
  
  // Mutation for deleting budget items
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest("DELETE", `/api/budget-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${plan.clientId}/budget-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${plan.clientId}/budget-settings`] });
    },
  });
  
  // Handler for updating an item's quantity
  const handleQuantityChange = (index: number, newQuantity: number) => {
    const item = form.getValues(`items.${index}`);
    if (item) {
      // Calculate new total
      const newTotal = newQuantity * item.unitPrice;
      
      // Update the item in the form
      update(index, {
        ...item,
        quantity: newQuantity,
        total: newTotal,
      });
    }
  };
  
  // Handler for adding a new item from catalog
  const handleAddItem = (newItem: BudgetItemFormValues) => {
    // Add the new item to the form
    append({
      ...newItem,
      // Calculate initial total
      total: newItem.quantity * newItem.unitPrice,
    });
    
    // Set to editing mode if not already
    if (!isEditing) {
      setIsEditing(true);
    }
  };
  
  // Handler for removing an item
  const handleRemoveItem = (index: number) => {
    const item = form.getValues(`items.${index}`);
    
    // If it's a new item (not saved to database yet), remove immediately
    if (item.isNew) {
      remove(index);
      return;
    }
    
    // Otherwise confirm before removing existing items
    setPendingItemToRemove(index);
    setIsConfirmDialogOpen(true);
  };
  
  // Confirm item removal
  const confirmRemoveItem = () => {
    if (pendingItemToRemove !== null) {
      const item = form.getValues(`items.${pendingItemToRemove}`);
      
      // If it has an ID, it's an existing item that needs to be deleted from DB
      if (item.id !== undefined) {
        deleteItemMutation.mutate(item.id);
      }
      
      // Remove from form state
      remove(pendingItemToRemove);
      setPendingItemToRemove(null);
      setIsConfirmDialogOpen(false);
    }
  };
  
  // Cancel item removal
  const cancelRemoveItem = () => {
    setPendingItemToRemove(null);
    setIsConfirmDialogOpen(false);
  };
  
  // Form submission handler
  const onSubmit = async (data: UnifiedBudgetFormValues) => {
    // Validate if we're over budget
    if (data.remainingBudget < 0) {
      toast({
        variant: "destructive",
        title: "Budget Exceeded",
        description: "Please adjust quantities to stay within budget before saving.",
      });
      return;
    }
    
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