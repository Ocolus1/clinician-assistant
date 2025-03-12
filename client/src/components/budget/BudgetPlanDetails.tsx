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
} from "@/components/ui/dialog";

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [itemToDelete, setItemToDelete] = useState<BudgetItem | null>(null);
  const [editedItems, setEditedItems] = useState<Record<number, BudgetItem>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const { deleteBudgetItem, updateBudgetItem } = useBudgetFeature();
  
  // Format dates for display
  const formattedStartDate = plan.startDate 
    ? format(new Date(plan.startDate), "MMM d, yyyy") 
    : "Not specified";
    
  const formattedEndDate = plan.endDate 
    ? format(new Date(plan.endDate), "MMM d, yyyy") 
    : "Not specified";
  
  // Calculate total budgeted amount - this is the sum of all allocated items
  const totalBudgeted = items.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity), 
    0
  );
  
  // Total used in sessions - currently not implemented, will be 0
  const totalConsumed = 0; // This should later come from session records
  
  // Percentage used (consumed) from the budget
  const percentageUsed = totalBudgeted > 0 
    ? Math.min(Math.round((totalConsumed / totalBudgeted) * 100), 100) 
    : 0;
  
  // Since we're using the sum of all items as our "available funds",
  // and since we're currently not tracking any usage, the available balance
  // is equal to the total budgeted amount
  const availableBalance = totalBudgeted - totalConsumed;
  
  // Handle item deletion with confirmation
  const handleDeleteClick = (item: BudgetItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
    setConfirmationText("");
  };
  
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteBudgetItem(itemToDelete.id);
      toast({
        title: "Item Deleted",
        description: `${itemToDelete.description} has been deleted.`,
      });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item. Please try again.",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-semibold">Plan Details</h2>
        </div>
        
        <div className="flex gap-2">
          {!plan.isActive && onMakeActive && (
            <Button 
              variant="outline" 
              className="space-x-2" 
              onClick={() => onMakeActive(plan)}
            >
              <Check className="h-4 w-4" />
              <span>Make Active</span>
            </Button>
          )}
          <Button className="space-x-2">
            <Edit className="h-4 w-4" />
            <span>Edit Plan</span>
          </Button>
        </div>
      </div>
      
      {/* Plan Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-1">{plan.planName}</CardTitle>
              <CardDescription>
                {plan.planCode && (
                  <span className="font-medium text-foreground">{plan.planCode}</span>
                )}
                {plan.planCode && " - "}
                {plan.isActive 
                  ? <Badge variant="default">Active</Badge>
                  : <Badge variant="outline">Inactive</Badge>
                }
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Total Budget</div>
              <div className="text-2xl font-semibold">{formatCurrency(totalBudgeted)}</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date Information */}
            <div className="space-y-3">
              <div className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                Date Information
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Start Date:</div>
                <div>{formattedStartDate}</div>
                <div className="text-muted-foreground">End Date:</div>
                <div>{formattedEndDate}</div>
              </div>
            </div>
            
            {/* Usage Information */}
            <div className="space-y-3">
              <div className="text-sm font-medium flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                Budget Usage
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Budgeted:</div>
                <div>{formatCurrency(totalBudgeted)}</div>
                <div className="text-muted-foreground">Used:</div>
                <div>{formatCurrency(totalConsumed)}</div>
                <div className="text-muted-foreground">Available:</div>
                <div className={`font-medium ${availableBalance < 0 ? 'text-red-500' : ''}`}>
                  {formatCurrency(availableBalance)}
                </div>
              </div>
            </div>
            
            {/* Usage Progress */}
            <div className="space-y-3">
              <div className="text-sm font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                Funding Progress
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Usage</span>
                    <span>{percentageUsed}%</span>
                  </div>
                  <Progress value={percentageUsed} className="h-2" />
                </div>
                <div className="text-sm flex justify-between">
                  <span>{items.length} items</span>
                  <span className="text-green-600">
                    Within budget
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
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
                <Button 
                  className="space-x-2"
                  disabled={!hasUnsavedChanges}
                  onClick={async () => {
                    // Calculate the new total budget based on edited items
                    const newTotalBudget = items.reduce((total, item) => {
                      const editedItem = editedItems[item.id];
                      const quantity = editedItem ? editedItem.quantity : item.quantity;
                      return total + (item.unitPrice * quantity);
                    }, 0);
                    
                    // Check if the new budget exceeds the available funds
                    if (newTotalBudget > plan.availableFunds) {
                      toast({
                        variant: "destructive",
                        title: "Budget Exceeded",
                        description: "Your adjustments would result in a total that exceeds the available budget. Please reduce allocated quantities.",
                      });
                      return;
                    }
                    
                    // Save all edited items
                    try {
                      const promises = Object.values(editedItems).map(item => 
                        updateBudgetItem(item)
                      );
                      await Promise.all(promises);
                      
                      toast({
                        title: "Changes Saved",
                        description: "Budget item allocations have been updated.",
                      });
                      
                      setIsEditing(false);
                      setEditedItems({});
                      setHasUnsavedChanges(false);
                    } catch (error) {
                      toast({
                        variant: "destructive",
                        title: "Save Failed",
                        description: "Failed to save changes. Please try again.",
                      });
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="space-x-2"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Allocations</span>
                </Button>
                <Button onClick={() => setIsAddItemDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Add Item</span>
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Custom Budget Item Table with Allocation Controls */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md overflow-hidden">
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
                                onChange={(e) => {
                                  const newQuantity = Math.max(
                                    parseInt(e.target.value) || 0, 
                                    item.usedQuantity
                                  );
                                  
                                  // Create a new edited item with updated quantity
                                  const updatedItem = {
                                    ...item,
                                    quantity: newQuantity,
                                    balanceQuantity: newQuantity - item.usedQuantity
                                  };
                                  
                                  // Update the edited items record
                                  setEditedItems({
                                    ...editedItems,
                                    [item.id]: updatedItem
                                  });
                                  
                                  setHasUnsavedChanges(true);
                                }}
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
    </div>
  );
}