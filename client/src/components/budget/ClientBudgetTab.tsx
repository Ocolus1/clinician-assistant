import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BudgetPlanGrid } from './BudgetPlanGrid';
import { BudgetPlanCard } from './BudgetCard';
import { queryClient } from '@/lib/queryClient';
import type { BudgetSettings, BudgetItem } from '@shared/schema';

interface ClientBudgetTabProps {
  clientId: number;
  budgetSettings?: BudgetSettings;
  budgetItems: BudgetItem[];
}

export function ClientBudgetTab({ 
  clientId, 
  budgetSettings, 
  budgetItems 
}: ClientBudgetTabProps) {
  const { toast } = useToast();
  
  // Handler for creating a new budget plan
  const handleCreatePlan = async () => {
    try {
      // Generate random plan details for demonstration
      const defaultSettings = {
        planCode: `PLAN-${Math.floor(Math.random() * 10000)}`,
        planSerialNumber: `SN-${Math.floor(Math.random() * 10000)}`,
        availableFunds: 15000,
        isActive: true,
        endOfPlan: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      };
      
      const response = await fetch(`/api/clients/${clientId}/budget-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(defaultSettings),
      });
      
      if (response.ok) {
        // Refresh the budget settings data
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
        
        toast({
          title: "Budget plan created",
          description: "New budget plan has been created successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create budget plan. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating budget plan:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handler for editing a budget plan
  const handleEditPlan = (plan: BudgetPlanCard) => {
    toast({
      title: "Edit Budget Plan",
      description: "Budget plan edit functionality will be implemented soon.",
    });
  };
  
  // Handler for viewing budget plan details - the dialog will be shown from BudgetPlanGrid
  const handleViewPlanDetails = (plan: BudgetPlanCard) => {
    // This is now handled directly in the BudgetPlanGrid component
    // with the BudgetItemsDialog
  };
  
  // Handler for archiving a budget plan
  const handleArchivePlan = (plan: BudgetPlanCard) => {
    toast({
      title: "Archive Budget Plan",
      description: "Budget plan archive functionality will be implemented soon.",
    });
  };
  
  // Handler for setting a budget plan as active
  const handleSetActivePlan = (plan: BudgetPlanCard) => {
    toast({
      title: "Set Active Plan",
      description: "Setting plan as active functionality will be implemented soon.",
    });
  };
  
  return (
    <div className="space-y-6">
      <BudgetPlanGrid
        budgetSettings={budgetSettings}
        budgetItems={budgetItems}
        onCreatePlan={handleCreatePlan}
        onEditPlan={handleEditPlan}
        onViewDetails={handleViewPlanDetails}
        onArchivePlan={handleArchivePlan}
        onSetActivePlan={handleSetActivePlan}
      />
    </div>
  );
}