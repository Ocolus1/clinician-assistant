import React from "react";
import { BudgetPlanCard } from "./BudgetPlanCard";
import { BudgetSettings } from "@shared/schema";
import { CalendarRange } from "lucide-react";

interface BudgetPlansGridProps {
  plans: BudgetSettings[];
  clientId: number;
  onViewPlan?: (planId: number) => void;
}

/**
 * Grid display for budget plans with empty state handling
 */
export function BudgetPlansGrid({ plans, clientId, onViewPlan }: BudgetPlansGridProps) {
  // Handle empty state
  if (!plans || plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-gray-50 h-[300px]">
        <CalendarRange className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Budget Plans</h3>
        <p className="text-sm text-gray-500">Create your first budget plan to start managing funds.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((plan) => (
        <div 
          key={plan.id} 
          className="cursor-pointer"
          onClick={() => onViewPlan && onViewPlan(plan.id)}
        >
          <BudgetPlanCard plan={plan} clientId={clientId} />
        </div>
      ))}
    </div>
  );
}