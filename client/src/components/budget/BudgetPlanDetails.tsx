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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  X
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BudgetPlan, BudgetItem, useBudgetFeature } from "./BudgetFeatureContext";
import { BudgetItemTable } from "./BudgetItemTable";
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
  const [selectedTabValue, setSelectedTabValue] = useState("items");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [itemToDelete, setItemToDelete] = useState<BudgetItem | null>(null);
  const { toast } = useToast();
  const { deleteBudgetItem } = useBudgetFeature();
  
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
      
      {/* Tabs for different views */}
      <Tabs value={selectedTabValue} onValueChange={setSelectedTabValue}>
        <TabsList className="mb-4">
          <TabsTrigger value="items">Budget Items</TabsTrigger>
          <TabsTrigger value="transactions">Usage History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Budget Items</h3>
            <Button onClick={() => setIsAddItemDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
          
          <BudgetItemTable 
            items={items} 
            onEdit={onEditItem} 
            onDelete={handleDeleteClick} 
          />
        </TabsContent>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                Track when and how budget items were used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="mb-1 text-lg font-medium">No usage records</h3>
                <p className="mb-4 max-w-md mx-auto">
                  Usage records will appear here when sessions are recorded against this budget plan.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Plan Notes</CardTitle>
              <CardDescription>
                Add notes and comments about this budget plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="mb-1 text-lg font-medium">No notes added</h3>
                <p className="mb-4 max-w-md mx-auto">
                  Add notes to keep track of important information about this budget plan.
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
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