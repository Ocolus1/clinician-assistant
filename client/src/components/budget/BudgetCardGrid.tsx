
import { useState } from "react";
import { BudgetPlan, BudgetSettings, BudgetItem, BudgetItemCatalog } from "../../types";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  DollarSign, 
  PlusCircle, 
  Info, 
  Edit, 
  Archive, 
  Check, 
  MoreHorizontal,
  Star,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Progress
} from "../ui/index";
import { format, differenceInDays } from "date-fns";
import { BudgetPlanDetailsDialog } from "./BudgetPlanDetailsDialog";
import { BudgetPlanEditDialog } from "./BudgetPlanEditDialog";
import { BudgetPlanCreateDialog } from "./BudgetPlanCreateDialog";

interface BudgetCardGridProps {
  budgetSettings: BudgetSettings[];
  budgetItems: BudgetItem[];
  catalogItems?: BudgetItemCatalog[];
  onCreatePlan: (data: any) => void;
  onUpdatePlan: (data: any) => void;
  onUpdateItems: (planId: number, items: BudgetItem[]) => void;
  onArchivePlan: (plan: BudgetPlan) => void;
  onSetActivePlan: (plan: BudgetPlan) => void;
  clientSessions?: any[];
  isLoading?: boolean;
}

export function createBudgetPlan(settings: BudgetSettings, items: BudgetItem[] = []): BudgetPlan {
  // Calculate total used
  const totalUsed = items.reduce((sum, item) => {
    const unitPrice = typeof item.unitPrice === 'string' 
      ? parseFloat(item.unitPrice) || 0 
      : item.unitPrice || 0;
      
    const quantity = typeof item.quantity === 'string' 
      ? parseInt(item.quantity) || 0 
      : item.quantity || 0;
      
    return sum + (unitPrice * quantity);
  }, 0);
  
  // Parse available funds
  const availableFunds = typeof settings.availableFunds === 'string' 
    ? parseFloat(settings.availableFunds) || 0
    : settings.availableFunds || 0;
  
  // Calculate percentage used
  const percentUsed = availableFunds > 0 
    ? (totalUsed / availableFunds) * 100
    : 0;
    
  // Calculate remaining funds
  const remainingFunds = Math.max(0, availableFunds - totalUsed);
  
  return {
    id: settings.id,
    clientId: settings.clientId,
    planCode: settings.planCode || "",
    planName: settings.planCode || `Plan ${settings.planSerialNumber?.substr(-6) || ''}`.trim() || 'Default Plan',
    planSerialNumber: settings.planSerialNumber || "",
    active: settings.isActive || false,
    availableFunds,
    endDate: settings.endOfPlan || null,
    startDate: settings.createdAt?.toString() || null,
    totalUsed,
    percentUsed,
    itemCount: items.length,
    remainingFunds,
    archived: false,
    fundingSource: 'NDIS', // Default until we add this to schema
  };
}

export default function BudgetCardGrid({
  budgetSettings,
  budgetItems,
  catalogItems = [],
  onCreatePlan,
  onUpdatePlan,
  onUpdateItems,
  onArchivePlan,
  onSetActivePlan,
  clientSessions = [],
  isLoading = false
}: BudgetCardGridProps) {
  // Dialog state
  const [selectedPlan, setSelectedPlan] = useState<BudgetPlan | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Convert budget settings to plans with calculated properties
  const budgetPlans: BudgetPlan[] = budgetSettings.map(settings => {
    const itemsForSettings = budgetItems.filter(
      item => item.budgetSettingsId === settings.id
    );
    
    return createBudgetPlan(settings, itemsForSettings);
  });
  
  // Check if there is an active plan
  const hasActivePlan = budgetPlans.some(plan => plan.active);
  
  // Handle view details click
  const handleViewDetails = (plan: BudgetPlan) => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
  };
  
  // Handle edit click
  const handleEditPlan = (plan: BudgetPlan) => {
    setSelectedPlan(plan);
    setEditDialogOpen(true);
  };
  
  // Handle save edited items
  const handleSaveItems = (items: BudgetItem[]) => {
    if (selectedPlan) {
      onUpdateItems(selectedPlan.id, items);
      setEditDialogOpen(false);
    }
  };
  
  // Format date to display in a more user-friendly way
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  // Calculate days remaining until plan end
  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    
    try {
      const end = new Date(endDate);
      const today = new Date();
      const days = differenceInDays(end, today);
      return days > 0 ? days : 0;
    } catch (e) {
      return null;
    }
  };
  
  // Determine status color based on percentage used
  const getStatusColor = (percentUsed: number) => {
    if (percentUsed >= 100) return "bg-red-500";
    if (percentUsed >= 90) return "bg-amber-500";
    if (percentUsed >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  // Get more detailed plan status
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
  
  // Create the appropriate badge color class
  const getBadgeColorClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'amber':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'red':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };
  
  // If no budget plans exist, show empty state
  if (budgetPlans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Budget Plans</h3>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} disabled={isLoading}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Budget Plan
          </Button>
        </div>
        
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-10 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Budget Plans</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              No budget plans have been created for this client yet. You'll need to set up a budget plan to track funding and expenses.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} disabled={isLoading}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Budget Plan
            </Button>
          </CardContent>
        </Card>
        
        {/* Create Dialog */}
        <BudgetPlanCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={onCreatePlan}
          isLoading={isLoading}
          existingPlans={budgetSettings}
          hasActivePlan={hasActivePlan}
        />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Budget Plans ({budgetPlans.length})</h3>
        <Button 
          size="sm" 
          onClick={() => setCreateDialogOpen(true)}
          disabled={isLoading}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Budget Plan
        </Button>
      </div>
      
      {/* Grid of budget plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetPlans.map(plan => {
          const status = getPlanStatus(plan);
          const daysRemaining = calculateDaysRemaining(plan.endDate);
          
          return (
            <Card 
              key={plan.id} 
              className={`hover:shadow-md transition-shadow duration-200 ${
                plan.active ? 'border-primary border-2' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      {plan.active && <Star className="h-4 w-4 text-amber-500 mr-1" />}
                      {plan.planName}
                    </CardTitle>
                    <CardDescription>
                      {plan.planSerialNumber ? (
                        <>
                          {plan.planSerialNumber} 
                          {(plan.startDate || plan.endDate) && ' • '}
                          {plan.startDate && formatDate(plan.startDate)}
                          {plan.startDate && plan.endDate && ' - '}
                          {plan.endDate && formatDate(plan.endDate)}
                        </>
                      ) : 'No plan details available'}
                    </CardDescription>
                  </div>
                  <Badge className={getBadgeColorClass(status.color)}>
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="py-4">
                {/* Budget usage progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Budget Usage</span>
                    <span>{plan.percentUsed.toFixed(1)}%</span>
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
                </div>
                
                {/* Financial summary */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Total Budget</span>
                    <span className="font-medium">${plan.availableFunds.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Remaining</span>
                    <span className="font-medium">${plan.remainingFunds.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Items</span>
                    <span className="font-medium">{plan.itemCount}</span>
                  </div>
                  <div>
                    {daysRemaining !== null ? (
                      <>
                        <span className="text-gray-500 block">Days Remaining</span>
                        <span className={`font-medium ${daysRemaining < 30 ? 'text-amber-600' : ''}`}>
                          {daysRemaining}
                        </span>
                      </>
                    ) : plan.endDate ? (
                      <>
                        <span className="text-gray-500 block">End Date</span>
                        <span className="font-medium">{formatDate(plan.endDate)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-500 block">End Date</span>
                        <span className="font-medium text-gray-400">Not set</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDetails(plan)}
                >
                  <Info className="h-4 w-4 mr-1" />
                  Details
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleEditPlan(plan)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Items
                    </DropdownMenuItem>
                    
                    {!plan.active && (
                      <DropdownMenuItem 
                        onClick={() => onSetActivePlan(plan)}
                        disabled={hasActivePlan && !plan.active}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Set as Active
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem 
                      onClick={() => onArchivePlan(plan)}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Plan
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {/* Details Dialog */}
      <BudgetPlanDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        plan={selectedPlan}
        budgetItems={budgetItems.filter(item => 
          selectedPlan && item.budgetSettingsId === selectedPlan.id
        )}
        sessions={clientSessions}
        onEdit={() => {
          setDetailsOpen(false);
          setEditDialogOpen(true);
        }}
      />
      
      {/* Edit Dialog */}
      <BudgetPlanEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        plan={selectedPlan}
        budgetItems={budgetItems.filter(item => 
          selectedPlan && item.budgetSettingsId === selectedPlan.id
        )}
        catalogItems={catalogItems}
        onSave={handleSaveItems}
        isLoading={isLoading}
      />
      
      {/* Create Dialog */}
      <BudgetPlanCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={onCreatePlan}
        isLoading={isLoading}
        existingPlans={budgetSettings}
        hasActivePlan={hasActivePlan}
      />
    </div>
  );
}
