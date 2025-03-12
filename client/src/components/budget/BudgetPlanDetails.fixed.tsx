import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Edit, 
  FileText, 
  Plus, 
  Trash2,
  AlertCircle,
  Check,
  X,
  Save
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BudgetPlan, BudgetItem, useBudgetFeature } from "./BudgetFeatureContext";
import { BudgetItemForm } from "./BudgetItemForm";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";

interface BudgetPlanDetailsProps {
  plan: BudgetPlan;
  items: BudgetItem[];
  onBack: () => void;
  onAddItem?: () => void;
  onEditItem?: (item: BudgetItem) => void;
  onDeleteItem?: (item: BudgetItem) => void;
  onMakeActive?: (plan: BudgetPlan) => void;
}

/**
 * Detailed view of a budget plan including items, usage stats and actions
 */
export function BudgetPlanDetails({ 
  plan, 
  items, 
  onBack,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onMakeActive
}: BudgetPlanDetailsProps) {
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [pendingItemData, setPendingItemData] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [itemToDelete, setItemToDelete] = useState<BudgetItem | null>(null);
  const [editedItems, setEditedItems] = useState<Record<number, BudgetItem>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [confirmationDialogProps, setConfirmationDialogProps] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmAction: () => void;
    cancelLabel?: string;
    cancelAction?: () => void;
    cancelHidden?: boolean;
  }>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmAction: () => {},
  });
  const { toast } = useToast();
  const { deleteBudgetItem, updateBudgetItem } = useBudgetFeature();
  
  // Use form context for allocation quantities
  const allocationsForm = useForm({
    defaultValues: {
      allocations: items.reduce((acc, item) => {
        acc[item.id] = item.quantity;
        return acc;
      }, {} as Record<number, number>),
    },
  });
  
  // Calculate budget statistics
  const totalAllocation = items.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  const totalUsed = items.reduce((total, item) => total + (item.unitPrice * item.usedQuantity), 0);
  const totalBudgeted = plan.availableFunds || 0;
  const percentUsed = totalBudgeted > 0 ? Math.round((totalUsed / totalBudgeted) * 100) : 0;
  const remainingBudget = totalBudgeted - totalUsed;
  
  // Real-time budget validation during editing
  useEffect(() => {
    if (isEditing) {
      // Calculate the new total budget based on edited quantities
      const newTotalBudget = items.reduce((total, item) => {
        const editedItem = editedItems[item.id];
        const quantity = editedItem ? editedItem.quantity : item.quantity;
        return total + (item.unitPrice * quantity);
      }, 0);
      
      // Fixed budget constraint of $375
      const fixedTotalBudget = 375;
      
      // Validate against the budget constraint
      if (newTotalBudget > fixedTotalBudget) {
        setBudgetError(`Your allocation exceeds the budget by ${formatCurrency(newTotalBudget - fixedTotalBudget)}.`);
      } else if (newTotalBudget < fixedTotalBudget) {
        setBudgetError(`Your allocation is under budget by ${formatCurrency(fixedTotalBudget - newTotalBudget)}.`);
      } else {
        setBudgetError(null);
      }
    } else {
      setBudgetError(null);
    }
  }, [editedItems, isEditing, items]);
  
  // Handle quantity changes in edit mode
  const handleQuantityChange = (item: BudgetItem, newQuantity: number) => {
    // Ensure quantity is not less than what's already been used
    if (newQuantity < item.usedQuantity) {
      toast({
        title: "Invalid quantity",
        description: `Quantity cannot be less than the used amount (${item.usedQuantity}).`,
        variant: "destructive",
      });
      return;
    }
    
    // Update the edited item
    const updatedItem = { 
      ...item, 
      quantity: newQuantity,
      balanceQuantity: newQuantity - item.usedQuantity
    };
    
    setEditedItems((prev) => ({
      ...prev,
      [item.id]: updatedItem,
    }));
    
    setHasUnsavedChanges(true);
  };
  
  // Save changes to edited items
  const saveChanges = async () => {
    // Filter out items that haven't changed
    const changedItems = Object.values(editedItems).filter(
      (editedItem) => {
        const originalItem = items.find(item => item.id === editedItem.id);
        return originalItem && originalItem.quantity !== editedItem.quantity;
      }
    );
    
    if (changedItems.length === 0) {
      setIsEditing(false);
      setEditedItems({});
      return;
    }
    
    try {
      // Update each changed item
      for (const item of changedItems) {
        await updateBudgetItem(item);
      }
      
      toast({
        title: "Changes saved",
        description: `Successfully updated ${changedItems.length} budget item${changedItems.length > 1 ? 's' : ''}.`,
      });
      
      // Reset edit state
      setIsEditing(false);
      setEditedItems({});
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle delete item click
  const handleDeleteClick = (item: BudgetItem) => {
    setItemToDelete(item);
    setConfirmationText("");
    setIsDeleteDialogOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete || confirmationText !== "delete") return;
    
    try {
      await deleteBudgetItem(itemToDelete.id);
      
      toast({
        title: "Item deleted",
        description: `"${itemToDelete.description}" was successfully removed from the budget plan.`,
      });
      
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      setConfirmationText("");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to delete the item. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Budget Plan Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <Button 
            variant="ghost" 
            className="h-8 w-8 p-0 mb-2" 
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          
          <h2 className="text-2xl font-bold tracking-tight">
            {plan.planName || `Plan #${plan.planSerialNumber || plan.id}`}
          </h2>
          
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{plan.planCode || '-'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={plan.isActive ? "default" : "secondary"}>
            {plan.isActive ? "Active" : "Inactive"}
          </Badge>
          
          {!plan.isActive && onMakeActive && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onMakeActive(plan)}
            >
              Make Active
            </Button>
          )}
        </div>
      </div>
      
      {/* Budget Plan Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Funding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBudgeted)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {plan.endOfPlan ? (
                <span>Expires {format(new Date(plan.endOfPlan), "MMM d, yyyy")}</span>
              ) : (
                <span>No expiration date</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(totalUsed)}
            </div>
            <Progress value={percentUsed} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {percentUsed}% of total funds used
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(remainingBudget)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''} in plan
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Budget Items Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Budget Items and Usage</h3>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  className="space-x-2"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedItems({});
                    setHasUnsavedChanges(false);
                  }}
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                
                {/* Add Item button stays ENABLED in edit mode per UX requirements */}
                <Button 
                  onClick={() => setIsAddItemDialogOpen(true)}
                  variant="secondary"
                  className="space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </Button>

                <Button 
                  className="space-x-2"
                  disabled={!hasUnsavedChanges}
                  onClick={() => {
                    // Calculate the new total budget based on edited items
                    const newTotalBudget = items.reduce((total, item) => {
                      const editedItem = editedItems[item.id];
                      const quantity = editedItem ? editedItem.quantity : item.quantity;
                      return total + (item.unitPrice * quantity);
                    }, 0);
                    
                    // Check for any validation errors from real-time validation
                    if (budgetError) {
                      return;
                    }
                    
                    // Calculate difference from total budget (using fixed value for constraint)
                    const fixedTotalBudget = 375; // Fixed budget constraint
                    const difference = newTotalBudget - fixedTotalBudget;
                    
                    // If over budget, show warning dialog
                    if (difference > 0) {
                      setConfirmationDialogProps({
                        open: true,
                        title: "Budget Allocation Exceeds Available Funds",
                        message: `Your new allocation is above the available budget by ${formatCurrency(difference)}. Please adjust your reallocations accordingly.`,
                        confirmLabel: "Adjust Allocations",
                        confirmAction: () => {
                          // Reset to original values
                          setEditedItems({});
                          setConfirmationDialogProps((prev) => ({ ...prev, open: false }));
                        },
                        cancelHidden: true,
                      });
                      return;
                    }
                    
                    // If under budget, show confirmation dialog
                    if (difference < 0) {
                      setConfirmationDialogProps({
                        open: true,
                        title: "Budget Allocation Below Available Funds",
                        message: `Your new allocation is below the available budget by ${formatCurrency(Math.abs(difference))}. Do you want to proceed?`,
                        confirmLabel: "Yes, Save Changes",
                        confirmAction: async () => {
                          setConfirmationDialogProps((prev) => ({ ...prev, open: false }));
                          await saveChanges();
                        },
                        cancelLabel: "No, Adjust Allocations",
                        cancelAction: () => {
                          // Reset to original values
                          setEditedItems({});
                          setConfirmationDialogProps((prev) => ({ ...prev, open: false }));
                        },
                      });
                      return;
                    }
                    
                    // If exactly matching budget, proceed with save
                    saveChanges();
                  }}
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </Button>
              </>
            ) : (
              <>
                {/* Only show Edit Allocations in non-edit mode per UX requirements */}
                <Button 
                  variant="outline" 
                  className="space-x-2"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Allocations</span>
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Workflow guide card when in edit mode */}
        {isEditing && (
          <div className="rounded-md bg-blue-50 p-4 border border-blue-200 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Edit Mode Active</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>You're now in edit mode. The workflow is:</p>
                  <ol className="list-decimal ml-5 mt-1 space-y-1">
                    <li>Adjust quantities of existing items</li>
                    <li>Click "Add Item" to include new products from the catalog</li>
                    <li>Click "Save Changes" when ready - budget will be validated</li>
                  </ol>
                  <p className="mt-2">Total budget is fixed at $375. Changes will be validated against this amount before saving.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Enhanced error message for budget allocation issues */}
        {budgetError && (
          <div className="rounded-md bg-red-50 p-4 mb-4 border-2 border-red-300 animate-pulse">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Budget Allocation Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{budgetError}</p>
                </div>
                <div className="mt-3 text-xs text-red-600">
                  <p>Please adjust your allocations to continue.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Custom Budget Item Table with Allocation Controls */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md overflow-hidden">
              <FormProvider {...allocationsForm}>
                <form onSubmit={(e) => e.preventDefault()}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                        <TableHead className="text-right">Used</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        {!isEditing && <TableHead className="w-[100px]">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length > 0 ? (
                        items.map((item) => {
                          // Get edited version if it exists
                          const editedItem = editedItems[item.id] || item;
                          
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.itemCode}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.unitPrice)}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    min={item.usedQuantity}
                                    value={editedItem.quantity}
                                    className="w-20 text-right inline-block"
                                    onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 0)}
                                  />
                                ) : (
                                  item.quantity
                                )}
                              </TableCell>
                              <TableCell className="text-right">{item.usedQuantity}</TableCell>
                              <TableCell className="text-right">{editedItem.balanceQuantity}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.unitPrice * editedItem.quantity)}
                              </TableCell>
                              {!isEditing && (
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    {onEditItem && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8" 
                                        onClick={() => onEditItem(item)}
                                        title="Edit item"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-4 w-4"
                                        >
                                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                          <path d="m15 5 4 4" />
                                        </svg>
                                      </Button>
                                    )}
                                    {onDeleteItem && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" 
                                        onClick={() => handleDeleteClick(item)}
                                        title="Delete item"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-4 w-4"
                                        >
                                          <path d="M3 6h18" />
                                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                          <line x1="10" x2="10" y1="11" y2="17" />
                                          <line x1="14" x2="14" y1="11" y2="17" />
                                        </svg>
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={isEditing ? 7 : 8} className="text-center py-6 text-muted-foreground">
                            No budget items available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </form>
              </FormProvider>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Add Item Dialog */}
      {isAddItemDialogOpen && (
        <BudgetItemForm
          open={isAddItemDialogOpen}
          onOpenChange={setIsAddItemDialogOpen}
          clientId={plan.clientId}
          budgetSettingsId={plan.id}
          totalBudgeted={375} // Fixed budget constraint
          currentTotal={totalBudgeted}
          onSuccess={() => {
            // Make sure we stay in edit mode after adding an item
            setIsEditing(true);
            setHasUnsavedChanges(true);
          }}
          onValidationRequired={async (data, difference) => {
            // Store the pending item data temporarily
            setPendingItemData(data);
            
            // If over budget, show warning dialog
            if (difference > 0) {
              setConfirmationDialogProps({
                open: true,
                title: "Budget Allocation Exceeds Available Funds",
                message: `Adding this item would exceed the available budget by ${formatCurrency(difference)}. Please adjust your allocations accordingly.`,
                confirmLabel: "Adjust Allocations",
                confirmAction: () => {
                  // Close the confirmation dialog
                  setConfirmationDialogProps(prev => ({...prev, open: false}));
                  // Don't proceed with item creation
                  setPendingItemData(null);
                  return false;
                },
                cancelHidden: true,
              });
              return false;
            } 
            
            // If under budget, show confirmation dialog
            if (difference < 0) {
              return new Promise<boolean>((resolve) => {
                setConfirmationDialogProps({
                  open: true,
                  title: "Budget Allocation Below Available Funds",
                  message: `Adding this item would leave ${formatCurrency(Math.abs(difference))} unallocated in the budget. Do you want to proceed?`,
                  confirmLabel: "Yes, Add Item",
                  confirmAction: () => {
                    // Close the confirmation dialog
                    setConfirmationDialogProps(prev => ({...prev, open: false}));
                    // Proceed with item creation
                    resolve(true);
                  },
                  cancelLabel: "No, Adjust Allocations",
                  cancelAction: () => {
                    // Close the confirmation dialog
                    setConfirmationDialogProps(prev => ({...prev, open: false}));
                    // Don't proceed with item creation
                    setPendingItemData(null);
                    resolve(false);
                  },
                });
              });
            }
            
            // If exactly on budget, proceed without confirmation
            return true;
          }}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The budget item will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          
          {itemToDelete && (
            <div className="border rounded-md p-4 my-4">
              <div className="font-medium">{itemToDelete.description}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {itemToDelete.itemCode} - {formatCurrency(itemToDelete.unitPrice)} × {itemToDelete.quantity}
              </div>
              <div className="text-sm font-medium mt-2">
                Total: {formatCurrency(itemToDelete.unitPrice * itemToDelete.quantity)}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type "delete" to confirm
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="delete"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              disabled={confirmationText !== "delete"}
              onClick={handleConfirmDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Budget Allocation Confirmation Dialog */}
      <Dialog 
        open={confirmationDialogProps.open} 
        onOpenChange={(open) => {
          if (!open) {
            setConfirmationDialogProps(prev => ({...prev, open}));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmationDialogProps.title}</DialogTitle>
            <DialogDescription>
              {confirmationDialogProps.message}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex justify-between gap-2">
            {!confirmationDialogProps.cancelHidden && (
              <Button 
                variant="outline" 
                onClick={confirmationDialogProps.cancelAction}
              >
                {confirmationDialogProps.cancelLabel || "Cancel"}
              </Button>
            )}
            <Button 
              onClick={confirmationDialogProps.confirmAction}
              className={confirmationDialogProps.cancelHidden ? "w-full" : ""}
            >
              {confirmationDialogProps.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}