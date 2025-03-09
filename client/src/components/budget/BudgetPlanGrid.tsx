import React from 'react';
import { Button } from '@/components/ui/button';
import type { BudgetSettings, BudgetItem } from '@shared/schema';
import { BudgetPlanCard, type BudgetPlanCard as BudgetPlanCardType } from './BudgetCard';
import { PlusCircle } from 'lucide-react';

interface BudgetPlanGridProps {
  budgetSettings?: BudgetSettings;
  allBudgetSettings: BudgetSettings[];
  budgetItems: BudgetItem[];
  onCreatePlan: () => void;
  onEditPlan: (plan: BudgetSettings) => void;
  onViewDetails: (plan: BudgetSettings) => void;
  onArchivePlan: (plan: BudgetSettings) => void;
  onSetActivePlan: (plan: BudgetSettings) => void;
  isLoading: boolean;
}

export function BudgetPlanGrid({
  budgetSettings,
  allBudgetSettings,
  budgetItems,
  onCreatePlan,
  onEditPlan,
  onViewDetails,
  onArchivePlan,
  onSetActivePlan,
  isLoading
}: BudgetPlanGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Budget Plans</h2>
        <Button onClick={onCreatePlan} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Plan
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allBudgetSettings.map((settings) => (
          <BudgetPlanCard
            key={settings.id}
            settings={settings}
            budgetItems={budgetItems.filter(item => item.budgetSettingsId === settings.id)}
            onEdit={() => onEditPlan(settings)}
            onViewDetails={() => onViewDetails(settings)}
            onArchive={() => onArchivePlan(settings)}
            onSetActive={() => onSetActivePlan(settings)}
          />
        ))}
      </div>
    </div>
  );
}