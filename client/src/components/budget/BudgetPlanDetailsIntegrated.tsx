import React from 'react';
import { UnifiedBudgetManager } from './UnifiedBudgetManager';

interface BudgetPlanDetailsProps {
  clientId: number;
}

/**
 * Container component for the budget management interface
 * Uses the unified budget manager for a single form context approach
 */
export function BudgetPlanDetails({ clientId }: BudgetPlanDetailsProps) {
  return <UnifiedBudgetManager clientId={clientId} />;
}