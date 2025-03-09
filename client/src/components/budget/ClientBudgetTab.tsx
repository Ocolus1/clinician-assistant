import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BudgetPlanGrid } from './BudgetPlanGrid';
import { BudgetPlanFormDialog } from './BudgetPlanFormDialog';
import { BudgetPlanDetailsDialog } from './BudgetPlanDetailsDialog';
import { budgetPlanFormSchema, type BudgetPlanFormValues } from './schemas';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from '@shared/schema';
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BudgetSettings | null>(null);
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
  const handleSubmitNewPlan = async (values: BudgetPlanFormValues) => {
    try {
      setIsCreatingPlan(true);
      const formattedValues = {
        ...values,
        endOfPlan: values.endOfPlan ? values.endOfPlan.toISOString().split('T')[0] : null,
      };
      
      const response = await apiRequest('POST', `/api/clients/${clientId}/budget-settings`, formattedValues);
      
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
        
        setShowCreateDialog(false);
        
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
  
  const handleCreatePlan = () => {
    setShowCreateDialog(true);
  };
  
  // Handler for editing a budget plan
  const handleEditPlan = (plan: BudgetSettings) => {
    toast({
      title: "Edit Budget Plan",
      description: "Budget plan edit functionality will be implemented soon.",
    });
  };
  
  // Handler for viewing budget plan details
  const handleViewPlanDetails = (plan: BudgetSettings) => {
    setSelectedPlan(plan);
    setShowDetailsDialog(true);
  };
  
  // Handler for archiving a budget plan
  const handleArchivePlan = async (plan: BudgetSettings) => {
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
  const handleSetActivePlan = async (plan: BudgetSettings) => {
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
  
  // Fetch catalog items to enrich budget items with descriptions
  const { data: catalogItems = [] } = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-item-catalog'],
    enabled: !!clientId,
  });

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
      
      <BudgetPlanFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleSubmitNewPlan}
        isLoading={isCreatingPlan}
      />
      
      {selectedPlan && (
        <BudgetPlanDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          settings={selectedPlan}
          budgetItems={refreshedBudgetItems?.filter(item => item.budgetSettingsId === selectedPlan.id) || []}
          catalogItems={catalogItems}
          onUpdateItem={async (updatedItem) => {
            try {
              // Update the budget item
              const response = await apiRequest('PUT', `/api/budget-items/${updatedItem.id}`, updatedItem);
              
              if (response) {
                // Invalidate relevant queries
                queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
                
                // Refetch budget items
                await refetchBudgetItems();
                
                toast({
                  title: "Budget Item Updated",
                  description: "The budget item has been updated successfully."
                });
                
                return Promise.resolve();
              } else {
                toast({
                  title: "Error",
                  description: "Failed to update the budget item. Please try again.",
                  variant: "destructive"
                });
                return Promise.reject(new Error("Update failed"));
              }
            } catch (error) {
              console.error("Error updating budget item:", error);
              toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive"
              });
              return Promise.reject(error);
            }
          }}
        />
      )}
    </div>
  );
}