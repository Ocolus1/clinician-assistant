import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BudgetSettings, BudgetItem } from "@shared/schema";

// Define the budget plan type (enhanced from BudgetSettings)
export interface BudgetPlan {
  id: number;
  clientId: number;
  planName: string;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endDate: string | null;
  startDate: string | null;
  
  // Calculated/derived properties
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
}

// Define the context state type
interface BudgetFeatureContextType {
  clientId: number;
  budgetPlans: BudgetPlan[];
  activeBudgetPlan: BudgetPlan | null;
  budgetItems: Record<number, BudgetItem[]>; // Grouped by budgetSettingsId
  isLoading: boolean;
  error: Error | null;
  refreshData: () => void;
  viewPlanDetails: (planId: number) => void;
  createPlan: (plan: Partial<BudgetPlan>) => Promise<BudgetPlan>;
  updatePlan: (planId: number, updates: Partial<BudgetPlan>) => Promise<BudgetPlan>;
  activatePlan: (planId: number) => Promise<void>;
  archivePlan: (planId: number) => Promise<void>;
  addBudgetItem: (planId: number, item: Partial<BudgetItem>) => Promise<BudgetItem>;
  updateBudgetItem: (itemId: number, updates: Partial<BudgetItem>) => Promise<BudgetItem>;
  removeBudgetItem: (itemId: number) => Promise<void>;
}

// Create the context with a default value
const BudgetFeatureContext = createContext<BudgetFeatureContextType | undefined>(undefined);

// Provider component
export function BudgetProvider({ 
  children, 
  clientId 
}: { 
  children: React.ReactNode;
  clientId: number;
}) {
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  
  // Fetch budget settings (plans)
  const { 
    data: budgetSettings = [], 
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings
  } = useQuery<BudgetSettings[]>({
    queryKey: ['/api/clients', clientId, 'budget-settings', 'all'],
    queryFn: async () => {
      console.log(`Fetching all budget settings for client ${clientId}`);
      const response = await fetch(`/api/clients/${clientId}/budget-settings/all`);
      if (!response.ok) {
        throw new Error(`Failed to fetch budget settings: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!clientId,
  });

  // Fetch budget items
  const {
    data: budgetItems = [],
    isLoading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems
  } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    queryFn: async () => {
      console.log(`Fetching budget items for client ${clientId}`);
      const response = await fetch(`/api/clients/${clientId}/budget-items`);
      if (!response.ok) {
        throw new Error(`Failed to fetch budget items: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!clientId,
  });

  // Group budget items by budgetSettingsId
  const groupedBudgetItems = budgetItems.reduce((acc, item) => {
    const settingsId = item.budgetSettingsId;
    if (!acc[settingsId]) {
      acc[settingsId] = [];
    }
    acc[settingsId].push(item);
    return acc;
  }, {} as Record<number, BudgetItem[]>);

  // Transform budget settings into budget plans with additional calculated properties
  const budgetPlans: BudgetPlan[] = budgetSettings.map(settings => {
    const items = groupedBudgetItems[settings.id] || [];
    const totalUsed = items.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return sum + (unitPrice * quantity);
    }, 0);
    
    const availableFunds = typeof settings.availableFunds === 'string' 
      ? parseFloat(settings.availableFunds) 
      : settings.availableFunds;
    
    return {
      id: settings.id,
      clientId: settings.clientId,
      planName: settings.planCode || `Plan #${settings.id}`,
      planCode: settings.planCode,
      isActive: settings.isActive,
      availableFunds,
      startDate: settings.createdAt ? new Date(settings.createdAt).toISOString() : null,
      endDate: settings.endOfPlan,
      totalUsed,
      itemCount: items.length,
      percentUsed: availableFunds > 0 ? (totalUsed / availableFunds) * 100 : 0
    };
  });

  // Find the active budget plan
  const activeBudgetPlan = budgetPlans.find(plan => plan.isActive) || null;
  
  // Set the active plan ID when it changes
  useEffect(() => {
    if (activeBudgetPlan) {
      setActivePlanId(activeBudgetPlan.id);
    }
  }, [activeBudgetPlan]);

  // Combine loading states and errors
  const isLoading = isLoadingSettings || isLoadingItems;
  const error = settingsError || itemsError;

  // Refresh all data
  const refreshData = () => {
    refetchSettings();
    refetchItems();
  };

  // View plan details (placeholder for navigation or UI state change)
  const viewPlanDetails = (planId: number) => {
    console.log(`Viewing details for plan ${planId}`);
    // This could set some state, navigate, or show a modal
  };

  // Create a new budget plan
  const createPlan = async (plan: Partial<BudgetPlan>): Promise<BudgetPlan> => {
    console.log(`Creating new budget plan for client ${clientId}`, plan);
    
    // If this is going to be an active plan, deactivate the current active plan
    let needToDeactivateCurrentActive = plan.isActive;
    
    // Convert to the format expected by the API
    const newBudgetSettings: Partial<BudgetSettings> = {
      clientId,
      planCode: plan.planCode,
      isActive: plan.isActive,
      availableFunds: plan.availableFunds,
      endOfPlan: plan.endDate
    };
    
    // Make API call to create the plan
    const response = await fetch(`/api/clients/${clientId}/budget-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newBudgetSettings),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create budget plan: ${response.status}`);
    }
    
    const createdSettings = await response.json();
    
    // If this is an active plan, we need to deactivate the current active plan
    if (needToDeactivateCurrentActive && activeBudgetPlan) {
      await deactivatePlan(activeBudgetPlan.id);
    }
    
    // Refresh data
    refreshData();
    
    // Return the created plan (with additional calculated properties)
    return {
      id: createdSettings.id,
      clientId: createdSettings.clientId,
      planName: createdSettings.planCode || `Plan #${createdSettings.id}`,
      planCode: createdSettings.planCode,
      isActive: createdSettings.isActive,
      availableFunds: typeof createdSettings.availableFunds === 'string' 
        ? parseFloat(createdSettings.availableFunds) 
        : createdSettings.availableFunds,
      startDate: createdSettings.createdAt ? new Date(createdSettings.createdAt).toISOString() : null,
      endDate: createdSettings.endOfPlan,
      totalUsed: 0,
      itemCount: 0,
      percentUsed: 0
    };
  };

  // Update an existing budget plan
  const updatePlan = async (planId: number, updates: Partial<BudgetPlan>): Promise<BudgetPlan> => {
    console.log(`Updating budget plan ${planId}`, updates);
    
    // If this plan is being activated, deactivate the current active plan
    if (updates.isActive && activeBudgetPlan && activeBudgetPlan.id !== planId) {
      await deactivatePlan(activeBudgetPlan.id);
    }
    
    // Convert to the format expected by the API
    const updatedSettings: Partial<BudgetSettings> = {
      planCode: updates.planCode,
      isActive: updates.isActive,
      availableFunds: updates.availableFunds,
      endOfPlan: updates.endDate
    };
    
    // Make API call to update the plan
    const response = await fetch(`/api/budget-settings/${planId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedSettings),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update budget plan: ${response.status}`);
    }
    
    const updatedPlan = await response.json();
    
    // Refresh data
    refreshData();
    
    // Find the items for this plan to calculate the derived properties
    const items = groupedBudgetItems[planId] || [];
    const totalUsed = items.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return sum + (unitPrice * quantity);
    }, 0);
    
    const availableFunds = typeof updatedPlan.availableFunds === 'string' 
      ? parseFloat(updatedPlan.availableFunds) 
      : updatedPlan.availableFunds;
    
    // Return the updated plan (with additional calculated properties)
    return {
      id: updatedPlan.id,
      clientId: updatedPlan.clientId,
      planName: updatedPlan.planCode || `Plan #${updatedPlan.id}`,
      planCode: updatedPlan.planCode,
      isActive: updatedPlan.isActive,
      availableFunds,
      startDate: updatedPlan.createdAt ? new Date(updatedPlan.createdAt).toISOString() : null,
      endDate: updatedPlan.endOfPlan,
      totalUsed,
      itemCount: items.length,
      percentUsed: availableFunds > 0 ? (totalUsed / availableFunds) * 100 : 0
    };
  };

  // Helper function to deactivate a plan
  const deactivatePlan = async (planId: number): Promise<void> => {
    console.log(`Deactivating budget plan ${planId}`);
    
    // Make API call to deactivate the plan
    const response = await fetch(`/api/budget-settings/${planId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: false }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to deactivate budget plan: ${response.status}`);
    }
  };

  // Activate a plan (and deactivate the current active plan)
  const activatePlan = async (planId: number): Promise<void> => {
    console.log(`Activating budget plan ${planId}`);
    
    // If there's already an active plan, deactivate it first
    if (activeBudgetPlan && activeBudgetPlan.id !== planId) {
      await deactivatePlan(activeBudgetPlan.id);
    }
    
    // Make API call to activate the plan
    const response = await fetch(`/api/budget-settings/${planId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: true }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to activate budget plan: ${response.status}`);
    }
    
    // Refresh data
    refreshData();
  };

  // Archive a plan (currently just deactivates it)
  const archivePlan = async (planId: number): Promise<void> => {
    console.log(`Archiving budget plan ${planId}`);
    
    // Make API call to archive (deactivate) the plan
    const response = await fetch(`/api/budget-settings/${planId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: false }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to archive budget plan: ${response.status}`);
    }
    
    // Refresh data
    refreshData();
  };

  // Add a budget item to a plan
  const addBudgetItem = async (planId: number, item: Partial<BudgetItem>): Promise<BudgetItem> => {
    console.log(`Adding budget item to plan ${planId}`, item);
    
    // Convert to the format expected by the API
    const newBudgetItem: Partial<BudgetItem> = {
      clientId,
      budgetSettingsId: planId,
      ...item
    };
    
    // Make API call to create the item
    const response = await fetch(`/api/clients/${clientId}/budget-settings/${planId}/budget-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newBudgetItem),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add budget item: ${response.status}`);
    }
    
    const createdItem = await response.json();
    
    // Refresh data
    refreshData();
    
    return createdItem;
  };

  // Update a budget item
  const updateBudgetItem = async (itemId: number, updates: Partial<BudgetItem>): Promise<BudgetItem> => {
    console.log(`Updating budget item ${itemId}`, updates);
    
    // Make API call to update the item
    const response = await fetch(`/api/budget-items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update budget item: ${response.status}`);
    }
    
    const updatedItem = await response.json();
    
    // Refresh data
    refreshData();
    
    return updatedItem;
  };

  // Remove a budget item
  const removeBudgetItem = async (itemId: number): Promise<void> => {
    console.log(`Removing budget item ${itemId}`);
    
    // Make API call to delete the item
    const response = await fetch(`/api/budget-items/${itemId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to remove budget item: ${response.status}`);
    }
    
    // Refresh data
    refreshData();
  };

  // Provide the context value
  const contextValue: BudgetFeatureContextType = {
    clientId,
    budgetPlans,
    activeBudgetPlan,
    budgetItems: groupedBudgetItems,
    isLoading,
    error,
    refreshData,
    viewPlanDetails,
    createPlan,
    updatePlan,
    activatePlan,
    archivePlan,
    addBudgetItem,
    updateBudgetItem,
    removeBudgetItem
  };

  return (
    <BudgetFeatureContext.Provider value={contextValue}>
      {children}
    </BudgetFeatureContext.Provider>
  );
}

// Custom hook to use the budget feature context
export function useBudgetFeature() {
  const context = useContext(BudgetFeatureContext);
  if (context === undefined) {
    throw new Error('useBudgetFeature must be used within a BudgetProvider');
  }
  return context;
}