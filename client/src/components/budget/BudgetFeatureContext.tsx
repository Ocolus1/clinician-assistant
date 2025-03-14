import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BudgetSettings, BudgetItem } from '@shared/schema';

/**
 * Budget Plan type with UI-friendly properties
 */
export interface BudgetPlan {
  // Original BudgetSettings properties
  id: number;
  clientId: number;
  planSerialNumber: string | null;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endOfPlan: string | null;
  createdAt: Date | null;
  
  // Additional properties for UI display
  active: boolean;
  archived: boolean;
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
  
  // Mapped properties for consistent UI naming
  planName: string;
  fundingSource: string;
  startDate: string | null;
  endDate: string | null;
}

interface BudgetFeatureContextType {
  clientId: number;
  plans: BudgetPlan[];
  activePlan: BudgetPlan | null;
  selectedPlanId: number | null;
  isLoading: boolean;
  setSelectedPlanId: (planId: number | null) => void;
  createPlan: (plan: Partial<BudgetSettings>) => Promise<BudgetPlan>;
  updatePlan: (planId: number, plan: Partial<BudgetSettings>) => Promise<BudgetPlan>;
  archivePlan: (planId: number) => Promise<void>;
  setActivePlan: (planId: number) => Promise<void>;
}

const defaultContext: BudgetFeatureContextType = {
  clientId: 0,
  plans: [],
  activePlan: null,
  selectedPlanId: null,
  isLoading: false,
  setSelectedPlanId: () => {},
  createPlan: async () => ({} as BudgetPlan),
  updatePlan: async () => ({} as BudgetPlan),
  archivePlan: async () => {},
  setActivePlan: async () => {}
};

const BudgetFeatureContext = createContext<BudgetFeatureContextType>(defaultContext);

interface BudgetFeatureProviderProps {
  children: ReactNode;
  clientId: number;
}

export function BudgetFeatureProvider({ children, clientId }: BudgetFeatureProviderProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  
  // Fetch budget plans
  const { data: budgetSettings = [], isLoading: isLoadingSettings } = useQuery<BudgetSettings[]>({
    queryKey: ['/api/clients', clientId, 'budget-settings', 'all'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget settings');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    }
  });
  
  // Fetch budget items
  const { data: budgetItems = [], isLoading: isLoadingItems } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget-items`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget items');
      }
      return response.json();
    }
  });
  
  // Transform budget settings and items into UI-friendly budget plans
  const plans = budgetSettings.map(settings => {
    // Get items for this budget settings
    const items = budgetItems.filter(item => item.budgetSettingsId === settings.id);
    
    // Calculate total used
    const totalUsed = items.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === 'string' 
        ? parseFloat(item.unitPrice) 
        : item.unitPrice;
      
      const quantity = typeof item.quantity === 'string'
        ? parseInt(item.quantity)
        : item.quantity;
        
      return sum + (unitPrice * quantity);
    }, 0);
    
    // Calculate percent used
    const availableFunds = typeof settings.availableFunds === 'string'
      ? parseFloat(settings.availableFunds)
      : settings.availableFunds;
      
    const percentUsed = availableFunds > 0 
      ? Math.min(100, (totalUsed / availableFunds) * 100)
      : 0;
    
    // Transform to BudgetPlan
    return {
      // Original properties
      id: settings.id,
      clientId: settings.clientId,
      planSerialNumber: settings.planSerialNumber,
      planCode: settings.planCode,
      isActive: settings.isActive,
      availableFunds,
      endOfPlan: settings.endOfPlan,
      createdAt: settings.createdAt,
      
      // UI display properties
      active: !!settings.isActive,
      archived: false, // Will be implemented later
      totalUsed,
      itemCount: items.length,
      percentUsed,
      
      // Mapped properties
      planName: settings.planCode || `Plan #${settings.id}`,
      fundingSource: 'NDIS', // Placeholder
      startDate: settings.createdAt ? new Date(settings.createdAt).toLocaleDateString() : null,
      endDate: settings.endOfPlan ? new Date(settings.endOfPlan).toLocaleDateString() : null
    };
  });
  
  // Find active plan
  const activePlan = plans.find(plan => plan.active) || null;
  
  // If no selected plan and active plan exists, select it
  useEffect(() => {
    if (!selectedPlanId && activePlan) {
      setSelectedPlanId(activePlan.id);
    }
  }, [selectedPlanId, activePlan]);
  
  // Methods for managing plans
  const createPlan = async (plan: Partial<BudgetSettings>): Promise<BudgetPlan> => {
    const response = await fetch(`/api/clients/${clientId}/budget-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...plan,
        clientId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create budget plan');
    }
    
    const data = await response.json();
    return {
      ...data,
      active: !!data.isActive,
      archived: false,
      totalUsed: 0,
      itemCount: 0,
      percentUsed: 0,
      planName: data.planCode || `Plan #${data.id}`,
      fundingSource: 'NDIS',
      startDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : null,
      endDate: data.endOfPlan ? new Date(data.endOfPlan).toLocaleDateString() : null
    };
  };
  
  const updatePlan = async (planId: number, plan: Partial<BudgetSettings>): Promise<BudgetPlan> => {
    const response = await fetch(`/api/clients/${clientId}/budget-settings/${planId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(plan)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update budget plan');
    }
    
    const data = await response.json();
    const existingPlan = plans.find(p => p.id === planId);
    
    return {
      ...data,
      active: !!data.isActive,
      archived: false,
      totalUsed: existingPlan?.totalUsed || 0,
      itemCount: existingPlan?.itemCount || 0,
      percentUsed: existingPlan?.percentUsed || 0,
      planName: data.planCode || `Plan #${data.id}`,
      fundingSource: 'NDIS',
      startDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : null,
      endDate: data.endOfPlan ? new Date(data.endOfPlan).toLocaleDateString() : null
    };
  };
  
  const archivePlan = async (planId: number): Promise<void> => {
    // This will be implemented when we add archived flag to the schema
    console.log('Archive plan not yet implemented', planId);
  };
  
  const setActivePlan = async (planId: number): Promise<void> => {
    // Set this plan as active and all others as inactive
    const response = await fetch(`/api/clients/${clientId}/budget-settings/${planId}/activate`, {
      method: 'PUT'
    });
    
    if (!response.ok) {
      throw new Error('Failed to set active plan');
    }
  };
  
  return (
    <BudgetFeatureContext.Provider
      value={{
        clientId,
        plans,
        activePlan,
        selectedPlanId,
        isLoading: isLoadingSettings || isLoadingItems,
        setSelectedPlanId,
        createPlan,
        updatePlan,
        archivePlan,
        setActivePlan
      }}
    >
      {children}
    </BudgetFeatureContext.Provider>
  );
}

// Custom hook to use the budget feature context
export function useBudgetFeature() {
  const context = useContext(BudgetFeatureContext);
  if (context === undefined) {
    throw new Error('useBudgetFeature must be used within a BudgetFeatureProvider');
  }
  return context;
}