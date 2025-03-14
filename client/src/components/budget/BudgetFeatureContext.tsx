import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BudgetSettings, BudgetItem } from '@shared/schema';

// Define the structure of a budget plan for UI display
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
  // Feature flags
  enableEnhancedBudget: boolean;
  setEnableEnhancedBudget: (enabled: boolean) => void;
  
  // Current client ID
  clientId: number | null;
  setClientId: (id: number | null) => void;
  
  // Budget plan management
  plans: BudgetPlan[];
  setPlans: (plans: BudgetPlan[]) => void;
  activePlan: BudgetPlan | null;
  selectedPlanId: number | null;
  setSelectedPlanId: (id: number | null) => void;
  
  // UI State
  formDialogOpen: boolean;
  setFormDialogOpen: (open: boolean) => void;
  
  // Derived data
  loading: boolean;
  error: Error | null;
  
  // Actions
  refresh: () => void;
}

const BudgetFeatureContext = createContext<BudgetFeatureContextType | undefined>(undefined);

export function BudgetFeatureProvider({ children }: { children: ReactNode }) {
  // Feature flags
  const [enableEnhancedBudget, setEnableEnhancedBudget] = useState(true);
  
  // Current client ID
  const [clientId, setClientId] = useState<number | null>(null);
  
  // Budget plan management
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  
  // UI State
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  
  // Fetch budget settings and items for the client
  const settingsQuery = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-settings', { all: true }],
    enabled: Boolean(clientId),
    queryFn: async () => {
      if (!clientId) return null;
      const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
      if (!response.ok) throw new Error('Failed to fetch budget settings');
      return response.json() as Promise<BudgetSettings[]>;
    }
  });
  
  const itemsQuery = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    enabled: Boolean(clientId),
    queryFn: async () => {
      if (!clientId) return [];
      const response = await fetch(`/api/clients/${clientId}/budget-items`);
      if (!response.ok) throw new Error('Failed to fetch budget items');
      return response.json() as Promise<BudgetItem[]>;
    }
  });
  
  // Derived loading and error states
  const loading = settingsQuery.isLoading || itemsQuery.isLoading;
  const error = settingsQuery.error || itemsQuery.error || null;
  
  // Function to trigger manual refresh
  const refresh = () => {
    if (clientId) {
      settingsQuery.refetch();
      itemsQuery.refetch();
    }
  };
  
  // Process and transform budget data
  useEffect(() => {
    if (!settingsQuery.data || !clientId) {
      setPlans([]);
      return;
    }
    
    // Map the settings data to our UI-friendly budget plan format
    const transformedPlans: BudgetPlan[] = settingsQuery.data.map(setting => {
      // Get items for this budget setting
      const budgetItems = itemsQuery.data?.filter(item => item.budgetSettingsId === setting.id) || [];
      
      // Calculate total used amount for this budget setting
      const totalUsed = budgetItems.reduce((sum, item) => {
        return sum + (item.unitPrice * item.quantity);
      }, 0);
      
      // Calculate percent used
      const percentUsed = setting.availableFunds > 0 
        ? Math.min(100, Math.round((totalUsed / setting.availableFunds) * 100))
        : 0;
      
      // Create the budget plan object
      return {
        // Original properties
        id: setting.id,
        clientId: setting.clientId,
        planSerialNumber: setting.planSerialNumber,
        planCode: setting.planCode,
        isActive: setting.isActive,
        availableFunds: setting.availableFunds,
        endOfPlan: setting.endOfPlan,
        createdAt: setting.createdAt,
        
        // Additional UI properties
        active: Boolean(setting.isActive),
        archived: false, // Not implemented yet
        totalUsed,
        itemCount: budgetItems.length,
        percentUsed,
        
        // Mapped properties
        planName: setting.planCode || `Plan #${setting.id}`,
        fundingSource: 'NDIS', // Default value, could be enhanced later
        startDate: setting.createdAt ? new Date(setting.createdAt).toLocaleDateString() : null,
        endDate: setting.endOfPlan ? new Date(setting.endOfPlan).toLocaleDateString() : null,
      };
    });
    
    setPlans(transformedPlans);
  }, [settingsQuery.data, itemsQuery.data, clientId]);
  
  // Get the active plan
  const activePlan = plans.find(plan => plan.active) || null;
  
  // Context value
  const value: BudgetFeatureContextType = {
    enableEnhancedBudget,
    setEnableEnhancedBudget,
    clientId,
    setClientId,
    plans,
    setPlans,
    activePlan,
    selectedPlanId,
    setSelectedPlanId,
    formDialogOpen,
    setFormDialogOpen,
    loading,
    error,
    refresh,
  };
  
  return (
    <BudgetFeatureContext.Provider value={value}>
      {children}
    </BudgetFeatureContext.Provider>
  );
}

export function useBudgetFeature() {
  const context = useContext(BudgetFeatureContext);
  if (!context) {
    throw new Error('useBudgetFeature must be used within a BudgetFeatureProvider');
  }
  return context;
}