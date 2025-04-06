import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import {
  Dialog,
  DialogContent
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Skeleton } from "../ui/skeleton";
import { 
  PlusCircle, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  XCircle,
  Edit
} from "lucide-react";
import { format, differenceInDays, isAfter } from "date-fns";
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";

// Define internal interfaces for this component
interface BudgetPlan {
  id: number;
  clientId: number;
  planCode: string | null;
  planSerialNumber: string | null;
  isActive?: boolean | null;
  active?: boolean;
  ndisFunds?: number;
  availableFunds: number;
  endOfPlan?: string | null;
  endDate?: string | null;
  startDate?: string | null;
  createdAt?: Date | null;
  totalUsed: number;
  percentUsed: number;
  itemCount: number;
  remainingFunds: number;
  archived?: boolean;
  fundingSource?: string;
  daysRemaining?: number | null;
  planName?: string;
  enhancedItems?: BudgetItemDetail[];
}

interface BudgetItemDetail extends BudgetItem {
  usedQuantity: number;
  remainingQuantity: number;
  totalPrice: number;
  usedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  balanceQuantity?: number;
}

// Import dialog components
import { BudgetPlanCreateDialog } from "./BudgetPlanCreateDialog";
import { BudgetPlanEditDialog } from "./BudgetPlanEditDialog";
import { BudgetPlanFullView } from "./BudgetPlanFullView";

interface BudgetCardGridProps {
  budgetSettings: BudgetSettings[];
  budgetItems: BudgetItem[];
  catalogItems: BudgetItemCatalog[];
  clientSessions: any[];
  onCreatePlan: (data: any) => void;
  onUpdatePlan: (data: any) => void;
  onUpdateItems: (planId: number, items: BudgetItem[]) => void;
  onArchivePlan: (plan: BudgetPlan) => void;
  onSetActivePlan: (plan: BudgetPlan) => void;
  isLoading?: boolean;
  hasActivePlan?: boolean;
}

export default function BudgetCardGrid({
  budgetSettings,
  budgetItems,
  catalogItems,
  clientSessions,
  onCreatePlan,
  onUpdatePlan,
  onUpdateItems,
  onArchivePlan,
  onSetActivePlan,
  isLoading = false,
  hasActivePlan = false
}: BudgetCardGridProps) {
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BudgetPlan | null>(null);
  
  // Calculate usage and enhance budget settings with additional information
  console.log("BudgetCardGrid: Re-calculating budget usage based on budget items:", budgetItems);
  
  // Log usedQuantity values to verify they're coming through
  budgetItems.forEach(item => {
    console.log(`Budget item ${item.id} (${item.itemCode}): usedQuantity = ${item.usedQuantity}`);
  });
  
  const enhancedBudgetSettings = budgetSettings.map(setting => {
    // Get budget items for this plan
    const planItems = budgetItems.filter(item => item.budgetSettingsId === setting.id);
    console.log(`Found ${planItems.length} items for plan ${setting.id} (${setting.planCode || 'no code'})`);
    
    // Calculate total allocated funds
    const totalAllocated = planItems.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return sum + (unitPrice * quantity);
    }, 0);
    
    // Get NDIS funds from new schema or fallback to 0
    const ndisAmount = typeof setting.ndisFunds === 'number' ? setting.ndisFunds : 
                       typeof setting.ndisFunds === 'string' ? parseFloat(setting.ndisFunds) : 0;
    
    // Calculate used funds based on budget items with usedQuantity
    const totalUsed = planItems.reduce((sum, item) => {
      // Parse the usedQuantity as a number
      const usedQuantity = typeof item.usedQuantity === 'string' 
        ? parseFloat(item.usedQuantity) 
        : (item.usedQuantity || 0);
      
      // Parse unit price
      const unitPrice = typeof item.unitPrice === 'string' 
        ? parseFloat(item.unitPrice) 
        : (item.unitPrice || 0);
        
      // Calculate the cost of used items
      const usedCost = usedQuantity * unitPrice;
      console.log(`Item ${item.itemCode}: Used ${usedQuantity} at ${unitPrice} each = ${usedCost}`);
      
      return sum + usedCost;
    }, 0);
    
    console.log(`Total used for plan ${setting.id}: $${totalUsed.toFixed(2)}`);
    
    // Calculate percent used based on available funds
    const fundValue = typeof setting.ndisFunds === 'string' 
      ? parseFloat(setting.ndisFunds)
      : (setting.ndisFunds || 0);
    
    const percentUsed = fundValue > 0 ? (totalUsed / fundValue) * 100 : 0;
    
    // Calculate days remaining
    let daysRemaining = null;
    if (setting.endOfPlan) {
      const endDate = new Date(setting.endOfPlan);
      const today = new Date();
      if (isAfter(endDate, today)) {
        daysRemaining = differenceInDays(endDate, today);
      } else {
        daysRemaining = 0;
      }
    }
    
    // Create plan name for display
    const planName = setting.planCode || `Budget Plan ${setting.id}`;
    
    // Get funding source
    const fundingSource = "NDIS"; // Placeholder - replace with actual data if available
    
    // Format dates for display
    const startDate = null; // Placeholder - could be created_at in a real app
    const endDate = setting.endOfPlan;
    
    return {
      id: setting.id,
      clientId: setting.clientId,
      planCode: setting.planCode,
      planSerialNumber: setting.planSerialNumber,
      planName,
      active: !!setting.isActive,
      // Support both schema versions
      ndisFunds: ndisAmount,
      availableFunds: ndisAmount, // Use ndisFunds for backward compatibility with UI components
      endDate,
      startDate,
      totalUsed,
      percentUsed,
      itemCount: planItems.length,
      remainingFunds: ndisAmount - totalUsed,
      archived: false, // Add proper handling if you have an archived field
      fundingSource,
      createdAt: setting.createdAt,
      daysRemaining: daysRemaining
    };
  });
  
  // Filter active plans and archived plans
  const activePlans = enhancedBudgetSettings.filter(plan => !plan.archived);
  const archivedPlans = enhancedBudgetSettings.filter(plan => plan.archived);
  
  // Prepare enhanced budget items for selected plan
  const getEnhancedBudgetItems = (planId: number): BudgetItemDetail[] => {
    return budgetItems
      .filter(item => item.budgetSettingsId === planId)
      .map(item => {
        // Parse incoming values
        const usedQuantity = typeof item.usedQuantity === 'string' 
          ? parseFloat(item.usedQuantity) 
          : (item.usedQuantity || 0);
          
        const quantity = typeof item.quantity === 'string' 
          ? parseInt(item.quantity) 
          : item.quantity;
          
        const unitPrice = typeof item.unitPrice === 'string' 
          ? parseFloat(item.unitPrice) 
          : item.unitPrice;
        
        // Calculate derived values
        const remainingQuantity = Math.max(0, quantity - usedQuantity);
        const totalPrice = unitPrice * quantity;
        const usedAmount = unitPrice * usedQuantity;
        const remainingAmount = unitPrice * remainingQuantity;
        const usagePercentage = quantity > 0 ? (usedQuantity / quantity) * 100 : 0;
        
        console.log(`Enhanced budget item ${item.id} (${item.itemCode}): ${usedQuantity}/${quantity} used (${usagePercentage.toFixed(1)}%)`);
        
        return {
          ...item,
          quantity,
          unitPrice,
          usedQuantity,
          remainingQuantity,
          totalPrice,
          usedAmount,
          remainingAmount,
          usagePercentage
        };
      });
  };
  
  // Handle clicking on a budget plan
  const handlePlanClick = (plan: BudgetPlan) => {
    const enhancedItems = getEnhancedBudgetItems(plan.id);
    setSelectedPlan({
      ...plan,
      enhancedItems
    } as BudgetPlan);
    setShowDetailsDialog(true);
  };
  
  // Handle editing a budget plan
  const handleEditPlan = (plan: BudgetPlan) => {
    setSelectedPlan(plan);
    setShowEditDialog(true);
  };
  
  // Render loading skeletons
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="pb-2">
              <Skeleton className="h-8 w-full mb-2" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Action buttons */}
      <div className="flex justify-end">
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Create New Budget Plan
        </Button>
      </div>
      
      {/* Active plans section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Active Budget Plans</h3>
        
        {activePlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePlans.map(plan => (
              <BudgetPlanCard 
                key={plan.id}
                plan={plan}
                onView={() => handlePlanClick(plan)}
                onEdit={() => handleEditPlan(plan)}
                onArchive={() => onArchivePlan(plan)}
                onSetActive={() => onSetActivePlan(plan)}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Budget Plans</h3>
              <p className="text-gray-500 text-center mb-4 max-w-md">
                Create a budget plan to start tracking funding and expenses for this client.
              </p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Create New Budget Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Archived plans section - only show if there are archived plans */}
      {archivedPlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Archived Budget Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedPlans.map(plan => (
              <BudgetPlanCard 
                key={plan.id}
                plan={plan}
                isArchived
                onView={() => handlePlanClick(plan)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Dialog components for create, edit and view */}
      <BudgetPlanCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={onCreatePlan}
        existingPlans={budgetSettings}
        hasActivePlan={hasActivePlan}
        isLoading={isLoading}
      />
      
      <BudgetPlanEditDialog
        open={showEditDialog && !!selectedPlan}
        onOpenChange={setShowEditDialog}
        plan={selectedPlan}
        budgetItems={selectedPlan ? getEnhancedBudgetItems(selectedPlan.id) : []}
        catalogItems={catalogItems}
        onSave={(items) => {
          if (selectedPlan) {
            onUpdateItems(selectedPlan.id, items);
            setShowEditDialog(false);
          }
        }}
      />
      
      <Dialog open={showDetailsDialog && !!selectedPlan} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedPlan && (
            <BudgetPlanFullView
              plan={selectedPlan}
              budgetItems={getEnhancedBudgetItems(selectedPlan.id)}
              onBack={() => setShowDetailsDialog(false)}
              onEdit={() => {
                setShowDetailsDialog(false);
                handleEditPlan(selectedPlan);
              }}
              onToggleActive={() => {
                setShowDetailsDialog(false);
                // Only call to activate plan, never deactivate from details view
                if (!selectedPlan.active) {
                  onSetActivePlan(selectedPlan);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Budget Plan Card component
interface BudgetPlanCardProps {
  plan: BudgetPlan;
  isArchived?: boolean;
  onView: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onSetActive?: () => void;
}

function BudgetPlanCard({
  plan,
  isArchived = false,
  onView,
  onEdit,
  onArchive,
  onSetActive
}: BudgetPlanCardProps) {
  console.log(`BudgetPlanCard rendering for plan ${plan.id}:`, {
    totalUsed: plan.totalUsed,
    percentUsed: plan.percentUsed,
    ndisFunds: plan.ndisFunds,
    availableFunds: plan.availableFunds
  });
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Helper to get funds value considering both old and new schema
  const getFundsValue = (plan: any) => {
    // Support both schema versions and convert to number
    const fundValue = plan.ndisFunds !== undefined ? plan.ndisFunds : plan.availableFunds;
    
    // Ensure it's a number by parsing
    const numericValue = typeof fundValue === 'string' ? parseFloat(fundValue) : (fundValue || 0);
    console.log(`getFundsValue() for plan ${plan.id}: ${numericValue}`);
    return numericValue;
  };
  
  // Format date with error handling
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  // Determine card border style based on status
  const getBorderStyle = () => {
    if (isArchived) return "border-gray-200";
    if (!plan.active) return "border-gray-200";
    
    if (plan.percentUsed >= 90) return "border-red-400";
    if (plan.percentUsed >= 70) return "border-amber-400";
    
    return "border-primary/70";
  };
  
  return (
    <Card 
      className={`overflow-hidden transition-all duration-200 hover:shadow-md ${getBorderStyle()} ${
        plan.active ? "border-l-4" : ""
      } ${isArchived ? "opacity-70" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{plan.planName}</CardTitle>
            <CardDescription>
              {plan.planSerialNumber && `Serial: ${plan.planSerialNumber}`}
            </CardDescription>
          </div>
          
          <div>
            {isArchived ? (
              <Badge variant="outline" className="bg-gray-100 text-gray-800">Archived</Badge>
            ) : plan.active ? (
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">Inactive</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="py-4">
        {/* Budget amount */}
        <div className="mb-5">
          <div className="text-2xl font-bold">{formatCurrency(getFundsValue(plan))}</div>
          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
            <DollarSign className="h-3 w-3" />
            {plan.fundingSource} Funding
          </div>
        </div>
        
        {/* Usage information */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span>Usage</span>
            <span>
              {formatCurrency(plan.totalUsed)} / {formatCurrency(getFundsValue(plan))}
            </span>
          </div>
          <div className="text-xs text-right text-gray-500 -mt-2">
            {plan.percentUsed.toFixed(1)}% used
          </div>
          
          <Progress 
            value={plan.percentUsed} 
            max={100} 
            className={`h-2 ${
              plan.percentUsed >= 90 ? 'bg-red-200' : 
              plan.percentUsed >= 70 ? 'bg-amber-200' : 
              'bg-green-200'
            }`}
            indicatorClassName={`${
              plan.percentUsed >= 90 ? 'bg-red-500' : 
              plan.percentUsed >= 70 ? 'bg-amber-500' : 
              'bg-green-500'
            }`}
          />
          
          {/* Dates and details */}
          <div className="pt-2 flex justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>End: {plan.endDate ? formatDate(plan.endDate) : 'Not set'}</span>
            </div>
            
            {plan.endDate && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{typeof plan.daysRemaining === 'number' ? `${plan.daysRemaining} days left` : 'No end date'}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 pb-4">
        {isArchived ? (
          <Button variant="secondary" className="w-full" onClick={onView}>
            View Details
          </Button>
        ) : (
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={onView}>
              View Details
            </Button>
            <div className="flex gap-1">
              {!plan.active && onSetActive && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSetActive) onSetActive();
                  }}
                  title="Set as active plan"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
              )}
              
              {onEdit && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) onEdit();
                  }}
                  title="Edit plan"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              
              {/* Removed archive button */}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}