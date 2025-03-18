import React from 'react';
import { BudgetExpirationCard } from './BudgetExpirationCard';

interface BudgetVisualizationProps {
  className?: string;
}

/**
 * Budget Visualization Component
 * This component displays the business-level budget visualization
 * showing expiring plans and remaining funds across all clients
 */
export function BudgetVisualization({ className }: BudgetVisualizationProps) {
  // We're using the BudgetExpirationCard component which already handles
  // fetching and displaying business-level budget data
  return (
    <div className={className}>
      <BudgetExpirationCard />
    </div>
  );
}