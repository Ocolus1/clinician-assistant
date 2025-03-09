import React from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign, PlusCircle } from 'lucide-react';
import { BudgetPlanCard } from './BudgetCard';
import type { BudgetSettings, BudgetItem } from '@shared/schema';

interface BudgetPlanGridProps {
  budgetSettings?: BudgetSettings;
  budgetItems: BudgetItem[];
  onCreatePlan: () => void;
  onEditPlan: (plan: BudgetPlanCard) => void;
  onViewDetails: (plan: BudgetPlanCard) => void;
  onArchivePlan: (plan: BudgetPlanCard) => void;
  onSetActivePlan?: (plan: BudgetPlanCard) => void;
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
  // Convert budget settings to card format
  const budgetPlans: BudgetPlanCard[] = budgetSettings ? [createBudgetPlanCard(budgetSettings, budgetItems)] : [];
  
  function createBudgetPlanCard(settings: BudgetSettings, items: BudgetItem[]): BudgetPlanCard {
    // Calculate TOTAL available funds from budget items (unit price * quantity)
    // This is the correct definition of "available funds" - the total budget booked during onboarding
    const availableFunds = items.reduce((total, item) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return total + (unitPrice * quantity);
    }, 0);
    
    // Used funds would be the total allocated to sessions
    // Currently we assume 0 as sessions allocation is not yet implemented
    const usedFunds = 0;
    
    // Calculate budget percentage
    const percentUsed = availableFunds > 0 
      ? Math.min(100, (usedFunds / availableFunds) * 100)
      : 0;
    
    return {
      id: settings.id,
      planName: settings.planCode || 'Therapy Budget Plan',
      planCode: settings.planCode || undefined,
      planSerialNumber: settings.planSerialNumber || undefined,
      availableFunds: availableFunds,
      usedFunds: usedFunds,
      itemCount: items.length,
      percentUsed: percentUsed,
      endDate: settings.endOfPlan || undefined,
      isActive: Boolean(settings.isActive)
    };
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">Budget Plans</h4>
        <Button 
          size="sm" 
          onClick={onCreatePlan}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Budget Plan
        </Button>
      </div>
      
      {budgetPlans.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg py-10 text-center">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Budget Plans</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            No budget plans have been created yet. You'll need to set up a budget plan to track funding and expenses.
          </p>
          <Button onClick={onCreatePlan}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Budget Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetPlans.map(plan => (
            <BudgetPlanCard
              key={plan.id}
              plan={plan}
              onEdit={onEditPlan}
              onView={onViewDetails}
              onArchive={onArchivePlan}
              onSetActive={onSetActivePlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}