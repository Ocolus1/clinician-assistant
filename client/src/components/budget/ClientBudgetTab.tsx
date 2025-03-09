import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BudgetPlanGrid } from './BudgetPlanGrid';
import { BudgetPlanCard } from './BudgetCard';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { BudgetSettings, BudgetItem } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface ClientBudgetTabProps {
  clientId: number;
  budgetSettings?: BudgetSettings;
  budgetItems: BudgetItem[];
}

export function ClientBudgetTab({ 
  clientId, 
  budgetSettings: initialBudgetSettings, 
  budgetItems: initialBudgetItems 
}: ClientBudgetTabProps) {
  const { toast } = useToast();
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  
  // Use the TanStack Query to manage budget settings state
  const { data: refreshedBudgetSettings, refetch: refetchBudgetSettings } = useQuery<BudgetSettings>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    initialData: initialBudgetSettings,
    enabled: !!clientId,
  });

  // Use the TanStack Query to manage budget items state
  const { data: refreshedBudgetItems, refetch: refetchBudgetItems } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    initialData: initialBudgetItems,
    enabled: !!clientId,
  });
  
  // Handler for creating a new budget plan
  const handleCreatePlan = async () => {
    try {
      setIsCreatingPlan(true);
      
      // Generate random plan details for demonstration
      const defaultSettings = {
        planCode: `PLAN-${Math.floor(Math.random() * 10000)}`,
        planSerialNumber: `SN-${Math.floor(Math.random() * 10000)}`,
        availableFunds: 15000,
        isActive: true,
        endOfPlan: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      };
      
      const response = await apiRequest('POST', `/api/clients/${clientId}/budget-settings`, defaultSettings);
      
      if (response) {
        // Explicitly invalidate the queries and refetch
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
        
        // Explicitly refetch the data
        await Promise.all([
          refetchBudgetSettings(),
          refetchBudgetItems()
        ]);
        
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
    } finally {
      setIsCreatingPlan(false);
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
        budgetSettings={refreshedBudgetSettings}
        budgetItems={refreshedBudgetItems || []}
        onCreatePlan={handleCreatePlan}
        onEditPlan={handleEditPlan}
        onViewDetails={handleViewPlanDetails}
        onArchivePlan={handleArchivePlan}
        onSetActivePlan={handleSetActivePlan}
        isLoading={isCreatingPlan}
      />
    </div>
  );
}