import React from 'react';
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
  Star 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BudgetSettings, BudgetItem } from "@shared/schema";

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
  
  // Convert budget settings to budget plan with additional properties
  const budgetPlans = React.useMemo(() => {
    if (!budgetSettings) return [];
    
    // For now, we only have one plan, but this will be extended to handle multiple plans
    const availableFunds = typeof budgetSettings.availableFunds === 'string'
      ? parseFloat(budgetSettings.availableFunds) || 0
      : budgetSettings.availableFunds || 0;
      
    const totalUsed = budgetItems.reduce((total, item) => {
      const unitPrice = typeof item.unitPrice === 'string'
        ? parseFloat(item.unitPrice) || 0
        : item.unitPrice || 0;
        
      const quantity = typeof item.quantity === 'string'
        ? parseInt(item.quantity) || 0
        : item.quantity || 0;
        
      return total + (unitPrice * quantity);
    }, 0);
    
    const percentUsed = availableFunds > 0 ? (totalUsed / availableFunds) * 100 : 0;
    
    // Create the budget plan with all the properties we need
    const plan: BudgetPlan = {
      ...budgetSettings,
      active: budgetSettings.isActive !== undefined ? !!budgetSettings.isActive : true,
      archived: false, // This will be added to the schema later
      totalUsed,
      itemCount: budgetItems.length,
      percentUsed,
      // Map database fields to the fields used in UI
      planName: budgetSettings.planCode || 'Default Plan',
      fundingSource: 'NDIS', // Default until we add this to schema
      startDate: budgetSettings.createdAt?.toString() || null,
      endDate: budgetSettings.endOfPlan || null
    };
    
    return [plan];
  }, [budgetSettings, budgetItems]);
  
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
        {budgetPlans.map((plan) => {
          const status = getPlanStatus(plan);
          const availableFunds = typeof plan.availableFunds === 'string'
            ? parseFloat(plan.availableFunds) || 0
            : plan.availableFunds || 0;
          
          return (
            <Card key={plan.id} className={`${plan.active ? 'border-2 border-primary' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      {plan.active && <Star className="h-4 w-4 text-amber-500 mr-1" />}
                      {plan.planName || 'Unnamed Plan'}
                    </CardTitle>
                    <CardDescription>
                      {plan.planCode} • {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                    </CardDescription>
                  </div>
                  <Badge 
                    className={`
                      ${status.color === 'green' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                      ${status.color === 'amber' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : ''}
                      ${status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : ''}
                      ${status.color === 'red' ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}
                      ${status.color === 'gray' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' : ''}
                    `}
                  >
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Available Funds</div>
                    <div className="text-xl font-bold">${availableFunds.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Used</div>
                    <div className="text-xl font-bold">${plan.totalUsed.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Budget Utilization</span>
                    <span>{Math.min(100, plan.percentUsed).toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(100, plan.percentUsed)} 
                    className="h-2"
                    indicatorClassName={
                      plan.percentUsed > 100 ? "bg-red-500" :
                      plan.percentUsed > 90 ? "bg-amber-500" :
                      plan.percentUsed > 70 ? "bg-yellow-500" :
                      "bg-green-500"
                    }
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {plan.itemCount} budget items • {plan.fundingSource || 'Unknown source'}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewDetails(plan)}>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Details
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEditPlan(plan)}>
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="flex gap-2">
                  {!plan.active && (
                    <Button size="sm" variant="outline" onClick={() => onSetActivePlan(plan)}>
                      <Star className="h-3.5 w-3.5 mr-1" />
                      Set Active
                    </Button>
                  )}
                  {!plan.archived && (
                    <Button size="sm" variant="outline" onClick={() => onArchivePlan(plan)}>
                      <FileArchive className="h-3.5 w-3.5 mr-1" />
                      Archive
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {/* Plan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan?.planName || 'Budget Plan Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedPlan?.planCode} • {formatDate(selectedPlan?.startDate || null)} - {formatDate(selectedPlan?.endDate || null)}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
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
                
                {budgetItems.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No budget items added to this plan yet.</p>
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
                        </tr>
                      </thead>
                      <tbody>
                        {budgetItems.map((item) => {
                          const unitPrice = typeof item.unitPrice === 'string'
                            ? parseFloat(item.unitPrice) || 0
                            : item.unitPrice || 0;
                            
                          const quantity = typeof item.quantity === 'string'
                            ? parseInt(item.quantity) || 0
                            : item.quantity || 0;
                            
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
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td colSpan={4} className="p-3 text-right font-medium">Total</td>
                          <td className="p-3 text-right font-bold">
                            ${budgetPlans.find(p => p.id === selectedPlan?.id)?.totalUsed.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setDetailsOpen(false);
              if (selectedPlan) onEditPlan(selectedPlan);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}