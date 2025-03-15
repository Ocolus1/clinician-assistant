import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Edit, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";
// Import our new Card Grid component
import BudgetCardGrid from '../budget/BudgetCardGrid';

interface ClientBudgetProps {
  budgetSettings?: BudgetSettings;
  budgetItems: BudgetItem[];
  catalogItems?: BudgetItemCatalog[];
  onEditSettings?: () => void;
  onAddItem?: () => void;
  onEditItem?: (item: BudgetItem) => void;
  onDeleteItem?: (item: BudgetItem) => void;
}

export default function ClientBudget({ 
  budgetSettings, 
  budgetItems = [],
  catalogItems,
  onEditSettings,
  onAddItem,
  onEditItem,
  onDeleteItem
}: ClientBudgetProps) {
  const [itemToDelete, setItemToDelete] = React.useState<BudgetItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  
  // Calculate total budget
  const totalBudget = React.useMemo(() => {
    if (!budgetItems || budgetItems.length === 0) return 0;
    
    return budgetItems.reduce((acc, item) => {
      if (!item) return acc;
      
      // Handle unitPrice
      let unitPrice = 0;
      if (item.unitPrice !== undefined && item.unitPrice !== null) {
        unitPrice = typeof item.unitPrice === 'string' 
          ? parseFloat(item.unitPrice) || 0 
          : item.unitPrice;
      }
      
      // Handle quantity
      let quantity = 0;
      if (item.quantity !== undefined && item.quantity !== null) {
        quantity = typeof item.quantity === 'string' 
          ? parseInt(item.quantity) || 0 
          : item.quantity;
      }
      
      return acc + (unitPrice * quantity);
    }, 0);
  }, [budgetItems]);
  
  // Parse NDIS funds safely
  const ndisFunds = React.useMemo(() => {
    if (!budgetSettings) return 0;
    
    const fundsValue = budgetSettings.ndisFunds;
    if (fundsValue === undefined || fundsValue === null) return 0;
    
    return typeof fundsValue === 'string' 
      ? parseFloat(fundsValue) || 0 
      : fundsValue;
  }, [budgetSettings]);
  
  // Calculate budget percentage
  const budgetPercentage = React.useMemo(() => {
    if (!budgetSettings || ndisFunds <= 0) return 0;
    return (totalBudget / ndisFunds) * 100;
  }, [totalBudget, budgetSettings, ndisFunds]);
  
  // Calculate remaining funds
  const remainingFunds = ndisFunds - totalBudget;
  
  // Handle delete click
  const handleDeleteClick = (item: BudgetItem) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };
  
  // Handle delete confirm
  const handleDeleteConfirm = () => {
    if (itemToDelete && onDeleteItem) {
      onDeleteItem(itemToDelete);
    }
    setShowDeleteDialog(false);
    setItemToDelete(null);
  };
  
  // State for view mode (enhanced card grid view or classic item view)
  const [viewMode, setViewMode] = React.useState<'card' | 'item'>('card');
  
  // Handle plan actions
  const handleCreatePlan = () => {
    if (onEditSettings) {
      onEditSettings();
    }
  };
  
  const handleArchivePlan = (plan: any) => {
    // To be implemented: Archive plan logic
    console.log('Archive plan:', plan);
  };
  
  const handleSetActivePlan = (plan: any) => {
    // To be implemented: Set active plan logic
    console.log('Set active plan:', plan);
  };
  
  // Switch between view modes
  const toggleView = () => {
    setViewMode(viewMode === 'card' ? 'item' : 'card');
  };
  
  // Check if budget settings exist
  if (!budgetSettings) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-10 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Budget Settings Not Found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Budget settings haven't been created for this client yet. You'll need to set up the budget first.
            </p>
            {onEditSettings && (
              <Button onClick={onEditSettings}>
                <Plus className="h-4 w-4 mr-2" />
                Create Budget Settings
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* View Toggle Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleView}
        >
          {viewMode === 'card' ? 'Show Budget Items Table' : 'Show Budget Cards'}
        </Button>
      </div>
      
      {/* Show either Card Grid View or Traditional Item Table View */}
      {viewMode === 'card' ? (
        <BudgetCardGrid 
          budgetSettings={budgetSettings ? [budgetSettings] : []}
          budgetItems={budgetItems}
          catalogItems={[]} // Provide an empty array as it's a required prop
          clientSessions={[]} // Provide an empty array as it's a required prop
          onCreatePlan={handleCreatePlan}
          onUpdatePlan={() => {}} // Placeholder function
          onUpdateItems={() => {}} // Placeholder function
          onArchivePlan={handleArchivePlan}
          onSetActivePlan={handleSetActivePlan}
        />
      ) : (
        <>
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Budget Overview</CardTitle>
                {onEditSettings && (
                  <Button variant="outline" size="sm" onClick={onEditSettings}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Budget Settings
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">NDIS Funds</h4>
                  <p className="text-2xl font-bold">${ndisFunds.toFixed(2)}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    {budgetSettings && budgetSettings.planCode 
                      ? `Plan: ${budgetSettings.planCode}` 
                      : ''}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Used</h4>
                  <p className="text-2xl font-bold">${totalBudget.toFixed(2)}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    ({budgetItems ? budgetItems.length : 0} budget items)
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Remaining</h4>
                  <p className={`text-2xl font-bold ${remainingFunds < 0 ? 'text-red-600' : ''}`}>
                    ${remainingFunds.toFixed(2)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    {remainingFunds < 0 ? 'Over budget' : 'Under budget'}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Budget Utilization</span>
                  <span>{Math.min(100, budgetPercentage).toFixed(0)}%</span>
                </div>
                <Progress 
                  value={Math.min(100, budgetPercentage)} 
                  className="h-2"
                  indicatorClassName={
                    budgetPercentage > 100 ? "bg-red-500" :
                    budgetPercentage > 90 ? "bg-amber-500" :
                    budgetPercentage > 50 ? "bg-green-500" :
                    "bg-blue-500"
                  }
                />
                {budgetPercentage > 100 && ndisFunds > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    Budget exceeded by ${(totalBudget - ndisFunds).toFixed(2)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
      
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Budget Items</h4>
              {onAddItem && (
                <Button size="sm" onClick={onAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget Item
                </Button>
              )}
            </div>
            
            {!budgetItems || budgetItems.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-500 mb-2">No budget items added</h4>
                <p className="text-gray-500 mb-4">Add items to track expenses related to therapy services.</p>
                {onAddItem && (
                  <Button onClick={onAddItem}>Add First Budget Item</Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 border-b font-medium text-sm text-gray-500">Item</th>
                      <th className="text-left p-3 border-b font-medium text-sm text-gray-500">Category</th>
                      <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Unit Price</th>
                      <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Quantity</th>
                      <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Total</th>
                      <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetItems.map((item) => {
                      if (!item) return null;
                      
                      // Handle null/undefined values
                      const unitPrice = typeof item.unitPrice === 'string' 
                        ? parseFloat(item.unitPrice) || 0 
                        : (item.unitPrice || 0);
                        
                      const quantity = typeof item.quantity === 'string' 
                        ? parseInt(item.quantity) || 0 
                        : (item.quantity || 0);
                        
                      const total = unitPrice * quantity;
                      
                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium">{item.name || 'Unnamed Item'}</div>
                            {item.description && (
                              <div className="text-xs text-gray-500">{item.description}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="font-normal">
                              {item.category || 'Uncategorized'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">${unitPrice.toFixed(2)}</td>
                          <td className="p-3 text-right">{quantity}</td>
                          <td className="p-3 text-right font-medium">${total.toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              {onEditItem && (
                                <Button variant="ghost" size="sm" onClick={() => onEditItem(item)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {onDeleteItem && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteClick(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="p-3 text-right font-medium">Total</td>
                      <td className="p-3 text-right font-bold">${totalBudget.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}