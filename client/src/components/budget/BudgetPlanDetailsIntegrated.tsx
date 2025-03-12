import React, { useState } from "react";
import { format } from "date-fns";
import { 
  BudgetPlan,
  BudgetItem, 
  useBudgetFeature 
} from "./BudgetFeatureContext";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BudgetItemForm } from "./BudgetItemForm";
import { AddItemDialog } from "./AddItemDialog";
import { UnifiedBudgetManager } from "./UnifiedBudgetManager";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// Icons
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Plus, 
  Trash2,
  Check,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Info as InfoIcon
} from "lucide-react";

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
 * Implements controlled workflow for budget allocation editing:
 * 1. User clicks "Edit Allocations"
 * 2. User can freely edit values AND/OR add items
 * 3. Save triggers budget validation
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
  // State for managing the UI flow
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [itemToDelete, setItemToDelete] = useState<BudgetItem | null>(null);
  const [editedItems, setEditedItems] = useState<Record<number, BudgetItem>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  
  // State for confirmation dialogs
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
  
  // Hooks
  const { toast } = useToast();
  const { deleteBudgetItem, updateBudgetItem } = useBudgetFeature();
  
  // Function to save the edited items
  const saveChanges = async () => {
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
  };
  
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
  
  // Function to handle quantity changes
  const handleQuantityChange = (item: BudgetItem, newQuantity: number) => {
    const safeQuantity = Math.max(
      newQuantity, 
      item.usedQuantity || 0
    );
    
    // Create a new edited item with updated quantity
    const updatedItem = {
      ...item,
      quantity: safeQuantity,
      balanceQuantity: safeQuantity - (item.usedQuantity || 0)
    };
    
    // Update the edited items record
    setEditedItems({
      ...editedItems,
      [item.id]: updatedItem
    });
    
    // Calculate the new total budget in real-time
    const newTotalBudget = items.reduce((total, currentItem) => {
      if (currentItem.id === item.id) {
        return total + (currentItem.unitPrice * safeQuantity);
      }
      const edited = editedItems[currentItem.id];
      const qty = edited ? edited.quantity : currentItem.quantity;
      return total + (currentItem.unitPrice * qty);
    }, 0);
    
    // Clear any previous error
    setBudgetError(null);
    
    // Add validation rule as needed
    if (safeQuantity < (item.usedQuantity || 0)) {
      setBudgetError(`You cannot allocate less than the already used quantity (${item.usedQuantity}) for ${item.description}.`);
    }
    
    setHasUnsavedChanges(true);
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
          {/* "Edit Plan" button removed as requested */}
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
      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      {/* Budget Items Section - Unified Budget Manager Implementation */}
      <UnifiedBudgetManager 
        plan={plan} 
        budgetItems={items} 
        onBudgetChange={() => {
          // Trigger a refresh by setting state values
          setIsEditing(false);
          setEditedItems({});
          setHasUnsavedChanges(false);
          // No need to worry about explicit refetching since parent component 
          // will handle refreshing data when needed
        }} 
      />      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget Item</DialogTitle>
            <DialogDescription>
              This will permanently remove the item from the budget plan.
              Type <span className="font-semibold">delete</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Type 'delete' to confirm"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmationText !== "delete"}
              onClick={handleConfirmDelete}
            >
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation dialog for budget validations */}
      <Dialog 
        open={confirmationDialogProps.open} 
        onOpenChange={(open) => setConfirmationDialogProps(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmationDialogProps.title}</DialogTitle>
            <DialogDescription>
              {confirmationDialogProps.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            {!confirmationDialogProps.cancelHidden && (
              <Button
                variant="outline"
                onClick={confirmationDialogProps.cancelAction}
              >
                {confirmationDialogProps.cancelLabel || "Cancel"}
              </Button>
            )}
            <Button onClick={confirmationDialogProps.confirmAction}>
              {confirmationDialogProps.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}