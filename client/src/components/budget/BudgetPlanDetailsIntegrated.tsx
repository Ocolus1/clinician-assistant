import React from 'react';
import { UnifiedBudgetManager } from './UnifiedBudgetManager';

interface BudgetPlanDetailsProps {
  clientId: number;
  planId?: number | null;
}

/**
 * Container component for the budget management interface
 * Uses the unified budget manager for a single form context approach
 * 
 * @param clientId - The ID of the client
 * @param planId - Optional ID of a specific budget plan to display
 */
export function BudgetPlanDetails({ clientId, planId }: BudgetPlanDetailsProps) {
  return <UnifiedBudgetManager clientId={clientId} selectedPlanId={planId} />;
}