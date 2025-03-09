import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BudgetPlanGrid } from './BudgetPlanGrid';
import { BudgetPlanCard } from './BudgetCard';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { BudgetSettings, BudgetItem } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

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
  const [activeBudgetSettings, setActiveBudgetSettings] = useState<BudgetSettings | undefined>(initialBudgetSettings);
  
  // Use the TanStack Query to get all budget settings for the client
  const { data: allBudgetSettings, refetch: refetchAllBudgetSettings } = useQuery<BudgetSettings[]>({
    queryKey: ['/api/clients', clientId, 'budget-settings', 'all'],
    queryFn: async () => {
      try {
        // Use the API endpoint to get all budget settings
        const path = `/api/clients/${clientId}/budget-settings?all=true`;
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : (initialBudgetSettings ? [initialBudgetSettings] : []);
      } catch (error) {
        console.error("Error fetching all budget settings:", error);
        return initialBudgetSettings ? [initialBudgetSettings] : [];
      }
    },
    initialData: initialBudgetSettings ? [initialBudgetSettings] : [],
    enabled: !!clientId,
  });

  // Use the TanStack Query to manage active budget setting state
  const { data: activeSetting, refetch: refetchBudgetSettings } = useQuery<BudgetSettings>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    initialData: initialBudgetSettings,
    enabled: !!clientId,
  });

  useEffect(() => {
    if (activeSetting) {
      setActiveBudgetSettings(activeSetting);
    }
  }, [activeSetting]);

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
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings', 'all'] });
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
        
        // Explicitly refetch the data
        await Promise.all([
          refetchBudgetSettings(),
          refetchAllBudgetSettings(),
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
  const handleArchivePlan = async (plan: BudgetPlanCard) => {
    try {
      // Update the plan to set isActive = false
      const response = await apiRequest('PUT', `/api/budget-settings/${plan.id}`, {
        ...plan,
        isActive: false
      });
      
      if (response) {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings', 'all'] });
        
        await Promise.all([
          refetchBudgetSettings(),
          refetchAllBudgetSettings()
        ]);
        
        toast({
          title: "Plan Archived",
          description: "Budget plan has been archived successfully.",
        });
      }
    } catch (error) {
      console.error("Error archiving budget plan:", error);
      toast({
        title: "Error",
        description: "Failed to archive plan. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handler for setting a budget plan as active
  const handleSetActivePlan = async (plan: BudgetPlanCard) => {
    try {
      // First, deactivate the currently active plan(s)
      if (allBudgetSettings && Array.isArray(allBudgetSettings)) {
        for (const setting of allBudgetSettings) {
          if (setting.isActive && setting.id !== plan.id) {
            await apiRequest('PUT', `/api/budget-settings/${setting.id}`, {
              ...setting,
              isActive: false
            });
          }
        }
      }
      
      // Then activate the selected plan
      const response = await apiRequest('PUT', `/api/budget-settings/${plan.id}`, {
        ...plan,
        isActive: true
      });
      
      if (response) {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings', 'all'] });
        
        await Promise.all([
          refetchBudgetSettings(),
          refetchAllBudgetSettings()
        ]);
        
        toast({
          title: "Plan Activated",
          description: "Budget plan has been set as active successfully.",
        });
      }
    } catch (error) {
      console.error("Error setting plan as active:", error);
      toast({
        title: "Error",
        description: "Failed to set plan as active. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <BudgetPlanGrid
        budgetSettings={allBudgetSettings?.length ? allBudgetSettings[0] : undefined}
        allBudgetSettings={allBudgetSettings || []}
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