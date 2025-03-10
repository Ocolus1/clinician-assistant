import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
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
import { BudgetPlan, BudgetItemDetail } from "./BudgetPlanFullView";
import { format, differenceInDays, isAfter } from "date-fns";
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";

// Import your dialogs components here
// import { BudgetPlanCreateDialog } from "./BudgetPlanCreateDialog";
// import { BudgetPlanEditDialog } from "./BudgetPlanEditDialog";
// import { BudgetPlanDetailsDialog } from "./BudgetPlanDetailsDialog";

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
  isLoading = false
}: BudgetCardGridProps) {
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BudgetPlan | null>(null);
  
  // Calculate usage and enhance budget settings with additional information
  const enhancedBudgetSettings = budgetSettings.map(setting => {
    // Get budget items for this plan
    const planItems = budgetItems.filter(item => item.budgetSettingsId === setting.id);
    
    // Calculate total allocated funds
    const totalAllocated = planItems.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return sum + (unitPrice * quantity);
    }, 0);
    
    // Calculate used funds based on sessions
    // This is a simplified version - in a real app you might need more complex logic
    const totalUsed = 0; // Placeholder until we implement session-based calculations
    
    // Calculate percent used
    const percentUsed = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;
    
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
      availableFunds: typeof setting.availableFunds === 'string' ? 
        parseFloat(setting.availableFunds) : setting.availableFunds,
      endDate,
      startDate,
      totalUsed,
      percentUsed,
      itemCount: planItems.length,
      remainingFunds: totalAllocated - totalUsed,
      archived: false, // Add proper handling if you have an archived field
      fundingSource,
      createdAt: setting.createdAt
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
        // Here you would calculate actual usage based on sessions
        // This is a simplified version
        const usedQuantity = 0; // Placeholder
        const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
        const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
        
        return {
          ...item,
          quantity,
          unitPrice,
          usedQuantity,
          remainingQuantity: quantity - usedQuantity,
          totalPrice: unitPrice * quantity,
          usedAmount: unitPrice * usedQuantity,
          remainingAmount: unitPrice * (quantity - usedQuantity),
          usagePercentage: quantity > 0 ? (usedQuantity / quantity) * 100 : 0
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
      
      {/* Dialogs will go here - uncomment once implemented */}
      {/*
      {showCreateDialog && (
        <BudgetPlanCreateDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={onCreatePlan}
          catalogItems={catalogItems}
        />
      )}
      
      {showEditDialog && selectedPlan && (
        <BudgetPlanEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          plan={selectedPlan}
          budgetItems={getEnhancedBudgetItems(selectedPlan.id)}
          onSubmit={(data) => {
            // Handle both plan updates and item updates
            if (data.plan) {
              onUpdatePlan(data.plan);
            }
            if (data.items) {
              onUpdateItems(selectedPlan.id, data.items);
            }
          }}
          catalogItems={catalogItems}
        />
      )}
      
      {showDetailsDialog && selectedPlan && (
        <BudgetPlanDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          plan={selectedPlan}
          budgetItems={getEnhancedBudgetItems(selectedPlan.id)}
          onEdit={() => {
            setShowDetailsDialog(false);
            handleEditPlan(selectedPlan);
          }}
          onArchive={() => {
            setShowDetailsDialog(false);
            onArchivePlan(selectedPlan);
          }}
          onSetActive={() => {
            setShowDetailsDialog(false);
            onSetActivePlan(selectedPlan);
          }}
        />
      )}
      */}
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
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Format date with error handling
  const formatDate = (dateString: string | null) => {
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
      
      <CardContent className="pb-2">
        {/* Budget amount */}
        <div className="mb-4">
          <div className="text-2xl font-bold">{formatCurrency(plan.availableFunds)}</div>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {plan.fundingSource} Funding
          </div>
        </div>
        
        {/* Usage information */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Usage</span>
            <span>
              {formatCurrency(plan.totalUsed)} / {formatCurrency(plan.availableFunds)}
              {' '}({plan.percentUsed.toFixed(1)}%)
            </span>
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
          <div className="pt-1 flex justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>End: {formatDate(plan.endDate)}</span>
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
      
      <CardFooter className="pt-2">
        {isArchived ? (
          <Button variant="secondary" className="w-full" onClick={onView}>
            View Details
          </Button>
        ) : (
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={onView}>
              View
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
              
              {onArchive && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onArchive) onArchive();
                  }}
                  title="Archive plan"
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}