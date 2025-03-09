import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, DollarSign } from 'lucide-react';
import { BudgetCard, BudgetPlanCard } from './BudgetCard';
import type { BudgetSettings, BudgetItem } from '@shared/schema';

interface BudgetPlanGridProps {
  budgetSettings?: BudgetSettings;
  budgetItems: BudgetItem[];
  onCreatePlan: () => void;
  onEditPlan: (plan: BudgetPlanCard) => void;
  onViewDetails: (plan: BudgetPlanCard) => void;
  onArchivePlan: (plan: BudgetPlanCard) => void;
  onSetActivePlan: (plan: BudgetPlanCard) => void;
}

export function BudgetPlanGrid({
  budgetSettings,
  budgetItems,
  onCreatePlan,
  onEditPlan,
  onViewDetails,
  onArchivePlan,
  onSetActivePlan
}: BudgetPlanGridProps) {
  
  // Convert BudgetSettings to BudgetPlanCard format for display
  const budgetPlans = useMemo(() => {
    if (!budgetSettings) return [];
    
    // Calculate total used funds from budget items
    const totalUsed = budgetItems.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === 'string' ? 
        parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? 
        parseInt(item.quantity) : item.quantity;
      return sum + (unitPrice * quantity);
    }, 0);
    
    // Parse available funds safely
    const availableFunds = typeof budgetSettings.availableFunds === 'string' ? 
      parseFloat(budgetSettings.availableFunds) : 
      budgetSettings.availableFunds || 0;
    
    // Calculate percent used
    const percentUsed = availableFunds > 0 ? 
      (totalUsed / availableFunds) * 100 : 0;
    
    return [{
      ...budgetSettings,
      active: !!budgetSettings.isActive,
      archived: false, // We don't have archived state in the current schema
      totalUsed,
      itemCount: budgetItems.length,
      percentUsed,
      planName: budgetSettings.planCode || 'Therapy Budget Plan',
      fundingSource: 'Self-Managed', // Placeholder, should come from client data
      startDate: null, // We don't have this in the current schema
      endDate: budgetSettings.endOfPlan,
      availableFunds: availableFunds
    }];
  }, [budgetSettings, budgetItems]);
  
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
          <BudgetCard
            key={plan.id}
            plan={plan}
            onEdit={onEditPlan}
            onViewDetails={onViewDetails}
            onArchive={onArchivePlan}
            onSetActive={onSetActivePlan}
          />
        ))}
      </div>
    </div>
  );
}