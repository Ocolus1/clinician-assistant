import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Edit, 
  Eye, 
  FileArchive, 
  PlusCircle, 
  RefreshCcw, 
  Star,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { EditBudgetPlanDialog } from "./EditBudgetPlanDialog";
import BudgetPlanToggleCard from "../budget/BudgetPlanToggleCard";

interface BudgetPlan {
  // Original BudgetSettings properties
  id: number;
  clientId: number;
  planSerialNumber: string | null;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endOfPlan: string | null;
  createdAt: Date | null;
  
  // Additional properties for UI display
  active: boolean;
  archived: boolean;
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
  
  // Mapped properties for consistent UI naming
  planName: string;
  fundingSource: string;
  startDate: string | null;
  endDate: string | null;
}

// Type for enhanced budget item with usage data
type EnhancedBudgetItem = BudgetItem & {
  usedQuantity: number;
  balanceQuantity: number;
  // Include other properties that might be added during enhancement
  name?: string | null;
  description?: string;
  category?: string | null;
}

interface BudgetPlansViewProps {
  budgetSettings: BudgetSettings | undefined;
  budgetItems: BudgetItem[];
  onCreatePlan: () => void;
  onEditPlan: (plan: BudgetPlan) => void;
  onArchivePlan: (plan: BudgetPlan) => void;
  onSetActivePlan: (plan: BudgetPlan) => void;
}

export default function BudgetPlansView({
  budgetSettings,
  budgetItems,
  onCreatePlan,
  onEditPlan,
  onArchivePlan,
  onSetActivePlan
}: BudgetPlansViewProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<BudgetPlan | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  
  // Fetch budget item catalog for reference data 
  const catalogItems = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-catalog'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch sessions for the client to calculate actual used funds
  const { data: clientSessions = [] } = useQuery<any[]>({
    queryKey: ['/api/clients', budgetSettings?.clientId, 'sessions'],
    // Only fetch if we have a client ID
    enabled: !!budgetSettings?.clientId,
  });

  // Enhance budget items with catalog details and calculate used quantities
  const enhancedBudgetItems = React.useMemo(() => {
    const catalogData = catalogItems.data as BudgetItemCatalog[] | undefined;
    if (!catalogData) {
      // Initialize with default values for usedQuantity and balanceQuantity
      return budgetItems.map(item => ({
        ...item,
        usedQuantity: 0,
        balanceQuantity: typeof item.quantity === 'string'
          ? parseInt(item.quantity) || 0
          : item.quantity || 0
      })) as EnhancedBudgetItem[];
    }
    
    return budgetItems.map(item => {
      // Find matching catalog item
      const catalogItem = catalogData.find(
        (catalog) => catalog.itemCode === item.itemCode
      );
      
      // Calculate used quantity from sessions
      const usedQuantity = clientSessions.reduce((total: number, session: any) => {
        if (!session.products || !Array.isArray(session.products)) return total;
        
        // Sum up used quantities for this specific item
        return total + session.products.reduce((itemTotal: number, product: any) => {
          if (product.productCode === item.itemCode || product.itemCode === item.itemCode) {
            return itemTotal + (typeof product.quantity === 'string' 
              ? parseInt(product.quantity) || 0 
              : product.quantity || 0);
          }
          return itemTotal;
        }, 0);
      }, 0);
      
      // Calculate balance quantity
      const totalQuantity = typeof item.quantity === 'string'
        ? parseInt(item.quantity) || 0
        : item.quantity || 0;
      
      const balanceQuantity = Math.max(0, totalQuantity - usedQuantity);
      
      // Return enhanced item with catalog details and usage data
      return {
        ...item,
        name: item.name || (catalogItem ? catalogItem.description : null),
        description: item.description || (catalogItem ? catalogItem.description : ''),
        category: item.category || (catalogItem ? catalogItem.category : null),
        usedQuantity,
        balanceQuantity
      } as EnhancedBudgetItem;
    });
  }, [budgetItems, catalogItems.data, clientSessions]);
  
  // Convert budget settings to budget plan with additional properties
  const budgetPlans = React.useMemo(() => {
    if (!budgetSettings) return [];
    
    // Calculate total available funds from budget items (sum of all budget item rows)
    const availableFunds = budgetItems.reduce((total, item) => {
      const unitPrice = typeof item.unitPrice === 'string'
        ? parseFloat(item.unitPrice) || 0
        : item.unitPrice || 0;
        
      const quantity = typeof item.quantity === 'string'
        ? parseInt(item.quantity) || 0
        : item.quantity || 0;
        
      return total + (unitPrice * quantity);
    }, 0);
    
    // Calculate used funds based on session usage
    const totalUsed = clientSessions.reduce((total: number, session: any) => {
      // Skip sessions without products
      if (!session.products || !Array.isArray(session.products)) return total;
      
      // Sum up all products used in this session
      return total + session.products.reduce((sessionTotal: number, product: any) => {
        const unitPrice = typeof product.unitPrice === 'string'
          ? parseFloat(product.unitPrice) || 0
          : product.unitPrice || 0;
          
        const quantity = typeof product.quantity === 'string'
          ? parseInt(product.quantity) || 0
          : product.quantity || 0;
          
        return sessionTotal + (unitPrice * quantity);
      }, 0);
    }, 0);
    
    const percentUsed = availableFunds > 0 ? (totalUsed / availableFunds) * 100 : 0;
    
    // Log the budget calculations to help with debugging
    console.log("Creating budget plan from settings:", budgetSettings);
    console.log("Budget items count:", budgetItems.length);
    console.log("Available funds (sum of all budget items):", availableFunds);
    console.log("Total used (from sessions):", totalUsed);
    console.log("Percent used:", percentUsed.toFixed(2) + "%");
    
    // Create the budget plan with all the properties we need
    const plan: BudgetPlan = {
      ...budgetSettings,
      active: budgetSettings.isActive !== undefined ? !!budgetSettings.isActive : true,
      archived: false, // This will be added to the schema later
      totalUsed,
      availableFunds, // Override with calculated value
      itemCount: budgetItems.length,
      percentUsed,
      // Map database fields to the fields used in UI with improved fallbacks
      planName: budgetSettings.planCode || `Plan ${budgetSettings.planSerialNumber?.substr(-6) || ''}`.trim() || 'Default Plan',
      fundingSource: 'NDIS', // Default until we add this to schema
      startDate: budgetSettings.createdAt?.toString() || null,
      endDate: budgetSettings.endOfPlan || null
    };
    
    return [plan];
  }, [budgetSettings, budgetItems, clientSessions]);
  
  // Handle view details click
  const handleViewDetails = (plan: BudgetPlan) => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
  };
  
  // Format date to display in a more user-friendly way
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-AU', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Calculate status of plan based on dates and usage
  const getPlanStatus = (plan: BudgetPlan) => {
    if (plan.archived) return { label: 'Archived', color: 'gray' };
    
    if (!plan.active) return { label: 'Inactive', color: 'gray' };
    
    // Check if plan is expired
    if (plan.endDate) {
      const endDate = new Date(plan.endDate);
      if (endDate < new Date()) {
        return { label: 'Expired', color: 'red' };
      }
    }
    
    // Check usage level
    if (plan.percentUsed >= 100) {
      return { label: 'Depleted', color: 'red' };
    } else if (plan.percentUsed >= 90) {
      return { label: 'Critical', color: 'amber' };
    } else if (plan.percentUsed >= 70) {
      return { label: 'High Usage', color: 'yellow' };
    }
    
    return { label: 'Active', color: 'green' };
  };
  
  // If no budget plans, show empty state
  if (budgetPlans.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-10 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Budget Plans</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              No budget plans have been created for this client yet. You'll need to set up a budget plan to track funding and expenses.
            </p>
            <Button onClick={onCreatePlan}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Budget Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Budget Plans</h3>
        <Button size="sm" onClick={onCreatePlan}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Budget Plan
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetPlans.map((plan) => (
          <BudgetPlanToggleCard
            key={plan.id}
            plan={plan}
            onView={() => handleViewDetails(plan)}
            onEdit={() => {
              setSelectedPlan(plan);
              setEditDialogOpen(true);
            }}
            onArchive={() => onArchivePlan(plan)}
            onToggleActive={(isActive) => {
              if (isActive !== plan.active) {
                // Only call the API if there's an actual status change
                console.log(`Toggle plan ${plan.id} active status to: ${isActive}`);
                onSetActivePlan(plan);
              }
            }}
          />
        ))}
      </div>
      
      {/* Edit Budget Plan Dialog */}
      {selectedPlan && budgetSettings && (
        <EditBudgetPlanDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          plan={selectedPlan}
          clientId={budgetSettings.clientId}
        />
      )}

      {/* Plan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan?.planName || 'Budget Plan Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedPlan?.planSerialNumber ? (
                <>
                  {selectedPlan.planSerialNumber.substr(-6) || ''} 
                  {(selectedPlan.startDate || selectedPlan.endDate) && ' • '}
                  {selectedPlan.startDate && formatDate(selectedPlan.startDate)}
                  {selectedPlan.startDate && selectedPlan.endDate && ' - '}
                  {selectedPlan.endDate && formatDate(selectedPlan.endDate)}
                </>
              ) : 'No plan details available'}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 p-1">
              {/* Plan Overview */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Funding Source</h4>
                  <p className="font-medium">{selectedPlan?.fundingSource || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Available Funds</h4>
                  <p className="font-medium">
                    ${typeof selectedPlan?.availableFunds === 'string' 
                      ? parseFloat(selectedPlan.availableFunds).toFixed(2) 
                      : selectedPlan?.availableFunds?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Used</h4>
                  <p className="font-medium">
                    ${budgetPlans.find(p => p.id === selectedPlan?.id)?.totalUsed.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Start Date</h4>
                  <p className="font-medium">{formatDate(selectedPlan?.startDate || null)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">End Date</h4>
                  <p className="font-medium">{formatDate(selectedPlan?.endDate || null)}</p>
                </div>
              </div>
              
              {/* Budget Items */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Budget Items</h4>
                
                {enhancedBudgetItems.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No budget items added to this plan yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-3 border-b font-medium text-sm text-gray-500">Item Code</th>
                          <th className="text-left p-3 border-b font-medium text-sm text-gray-500">Description</th>
                          <th className="text-left p-3 border-b font-medium text-sm text-gray-500">Category</th>
                          <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Unit Price</th>
                          <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Quantity</th>
                          <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Items Used</th>
                          <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Balance</th>
                          <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enhancedBudgetItems.map((item) => {
                          const unitPrice = typeof item.unitPrice === 'string'
                            ? parseFloat(item.unitPrice) || 0
                            : item.unitPrice || 0;
                            
                          const quantity = typeof item.quantity === 'string'
                            ? parseInt(item.quantity) || 0
                            : item.quantity || 0;
                            
                          const total = unitPrice * quantity;
                          
                          return (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 whitespace-nowrap">
                                <Badge variant="outline" className="font-mono">
                                  {item.itemCode || 'unknown'}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="font-medium">
                                  {item.name || item.description || 'Unnamed Item'}
                                </div>
                                {item.description && item.name !== item.description && (
                                  <div className="text-xs text-gray-500">{item.description}</div>
                                )}
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className="font-normal">
                                  {item.category || 'Uncategorized'}
                                </Badge>
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">${unitPrice.toFixed(2)}</td>
                              <td className="p-3 text-right">{quantity}</td>
                              <td className="p-3 text-right">
                                {item.usedQuantity}
                              </td>
                              <td className="p-3 text-right">
                                {item.balanceQuantity}
                              </td>
                              <td className="p-3 text-right font-medium whitespace-nowrap">${total.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="p-3 text-right font-medium">Total</td>
                          <td className="p-3 text-right font-bold">
                            ${enhancedBudgetItems.reduce((total, item) => {
                              const unitPrice = typeof item.unitPrice === 'string'
                                ? parseFloat(item.unitPrice) || 0
                                : item.unitPrice || 0;
                              
                              const quantity = typeof item.quantity === 'string'
                                ? parseInt(item.quantity) || 0
                                : item.quantity || 0;
                              
                              return total + (unitPrice * quantity);
                            }, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex justify-center">
            <Button onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}