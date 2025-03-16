import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BudgetSettings, BudgetItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Budget plan interface combining settings and computed metrics
export interface BudgetPlan {
  id: number;
  clientId: number;
  planSerialNumber?: string;
  planName?: string;
  planCode?: string | null;
  isActive: boolean;
  ndisFunds: number;
  endOfPlan?: string;
  createdAt?: string;
  // Computed fields
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
  // Helper fields
  endDate?: string;
}

// Context interface defining all shared budget feature data and operations
interface BudgetFeatureContextType {
  // State
  clientId: number;
  budgetPlans: BudgetPlan[];
  selectedPlanId: number | null;
  activePlan: BudgetPlan | null;
  budgetItems: BudgetItem[];
  isLoading: boolean;
  error: Error | null;
  
  // Operations
  refreshData: () => void;
  viewPlanDetails: (planId: number) => void;
  returnToOverview: () => void;
  createPlan: (planData: Partial<BudgetSettings>) => Promise<BudgetSettings>;
  updatePlan: (planId: number, planData: Partial<BudgetSettings>) => Promise<BudgetSettings>;
  deletePlan: (planId: number) => Promise<void>;
  createBudgetItem: (planId: number, itemData: Partial<BudgetItem>) => Promise<BudgetItem>;
  updateBudgetItem: (itemId: number, itemData: Partial<BudgetItem>) => Promise<BudgetItem>;
  deleteBudgetItem: (itemId: number) => Promise<void>;
}

// Create context with default values
const BudgetFeatureContext = createContext<BudgetFeatureContextType>({
  clientId: 0,
  budgetPlans: [],
  selectedPlanId: null,
  activePlan: null,
  budgetItems: [],
  isLoading: false,
  error: null,
  
  refreshData: () => {},
  viewPlanDetails: () => {},
  returnToOverview: () => {},
  createPlan: async () => ({ id: 0 } as BudgetSettings),
  updatePlan: async () => ({ id: 0 } as BudgetSettings),
  deletePlan: async () => {},
  createBudgetItem: async () => ({ id: 0 } as BudgetItem),
  updateBudgetItem: async () => ({ id: 0 } as BudgetItem),
  deleteBudgetItem: async () => {},
});

// Props interface for the context provider
interface BudgetFeatureProviderProps {
  children: ReactNode;
  clientId: number;
  initialBudgetPlans?: BudgetPlan[];
  initialItems?: BudgetItem[];
}

/**
 * Budget Feature Context Provider
 * Manages budget-related state and operations across components
 */
export function BudgetFeatureProvider({ 
  children, 
  clientId,
  initialBudgetPlans,
  initialItems
}: BudgetFeatureProviderProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [activePlan, setActivePlan] = useState<BudgetPlan | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch all budget plans for the client
  const {
    data: budgetPlans = initialBudgetPlans || [],
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans
  } = useQuery<BudgetPlan[]>({
    queryKey: ['/api/clients', clientId, 'budget-settings', 'all'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
        if (!response.ok) {
          throw new Error(`Failed to fetch budget plans: ${response.statusText}`);
        }
        
        const rawData = await response.json();
        // Ensure response is an array
        const dataArray = Array.isArray(rawData) ? rawData : [rawData];
        
        // Transform the API response into our BudgetPlan format
        return dataArray.map((plan: any) => ({
          id: plan.id,
          clientId: plan.clientId,
          planSerialNumber: plan.planSerialNumber,
          planCode: plan.planCode || null,
          isActive: plan.isActive === true,
          ndisFunds: typeof plan.ndisFunds === 'number' ? plan.ndisFunds : 
                     typeof plan.ndisFunds === 'string' ? parseFloat(plan.ndisFunds) : 
                     // Fallback to availableFunds for backward compatibility
                     (typeof plan.availableFunds === 'number' ? plan.availableFunds : 
                     typeof plan.availableFunds === 'string' ? parseFloat(plan.availableFunds) : 0),
          endOfPlan: plan.endOfPlan,
          createdAt: plan.createdAt,
          // Derived fields - will be calculated with budget items
          planName: plan.planCode || plan.planSerialNumber || `Plan ${plan.id}`,
          endDate: plan.endOfPlan,
          totalUsed: 0,
          itemCount: 0,
          percentUsed: 0,
        }));
      } catch (error) {
        console.error("Error fetching budget plans:", error);
        throw error;
      }
    },
    enabled: !!clientId,
    initialData: initialBudgetPlans,
  });
  
  // Fetch budget items for the client
  const {
    data: budgetItems = initialItems || [],
    isLoading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems
  } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/budget-items`);
        if (!response.ok) {
          throw new Error(`Failed to fetch budget items: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching budget items:", error);
        throw error;
      }
    },
    enabled: !!clientId,
    initialData: initialItems,
  });
  
  // Calculate budget metrics when plans or items change
  useEffect(() => {
    if (budgetPlans && budgetItems && budgetPlans.length > 0) {
      // Process each plan and calculate metrics
      const updatedPlans = budgetPlans.map(plan => {
        // Get items for this plan
        const planItems = budgetItems.filter(item => item.budgetSettingsId === plan.id);
        
        // Calculate metrics
        const itemCount = planItems.length;
        
        const totalUsed = planItems.reduce((sum, item) => {
          const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
          const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
          return sum + (unitPrice * quantity);
        }, 0);
        
        const percentUsed = plan.ndisFunds > 0 ? (totalUsed / plan.ndisFunds) * 100 : 0;
        
        return {
          ...plan,
          totalUsed,
          itemCount,
          percentUsed
        };
      });
      
      // Find the active plan
      const active = updatedPlans.find(plan => plan.isActive) || null;
      setActivePlan(active);
    }
  }, [budgetPlans, budgetItems]);
  
  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (planData: Partial<BudgetSettings>) => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...planData, clientId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create budget plan: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget plan created successfully",
      });
      
      // Refresh data
      refetchPlans();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create budget plan: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, planData }: { planId: number; planData: Partial<BudgetSettings> }) => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update budget plan: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget plan updated successfully",
      });
      
      // Refresh data
      refetchPlans();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update budget plan: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch(`/api/clients/${clientId}/budget-settings/${planId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete budget plan: ${response.statusText}`);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget plan deleted successfully",
      });
      
      // Refresh data
      refetchPlans();
      setSelectedPlanId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete budget plan: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Create budget item mutation
  const createBudgetItemMutation = useMutation({
    mutationFn: async ({ planId, itemData }: { planId: number; itemData: Partial<BudgetItem> }) => {
      const response = await fetch(`/api/clients/${clientId}/budget-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...itemData,
          clientId,
          budgetSettingsId: planId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create budget item: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget item created successfully",
      });
      
      // Refresh data
      refetchItems();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create budget item: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update budget item mutation
  const updateBudgetItemMutation = useMutation({
    mutationFn: async ({ itemId, itemData }: { itemId: number; itemData: Partial<BudgetItem> }) => {
      const response = await fetch(`/api/clients/${clientId}/budget-items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update budget item: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget item updated successfully",
      });
      
      // Refresh data
      refetchItems();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update budget item: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete budget item mutation
  const deleteBudgetItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/clients/${clientId}/budget-items/${itemId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete budget item: ${response.statusText}`);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget item deleted successfully",
      });
      
      // Refresh data
      refetchItems();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete budget item: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Helper function to refresh all budget data
  const refreshData = () => {
    refetchPlans();
    refetchItems();
  };
  
  // Handler to view plan details
  const viewPlanDetails = (planId: number) => {
    setSelectedPlanId(planId);
  };
  
  // Handler to return to plans overview
  const returnToOverview = () => {
    setSelectedPlanId(null);
  };
  
  // Combined loading state
  const isLoading = isLoadingPlans || isLoadingItems;
  
  // Combined error
  const error = plansError || itemsError;
  
  // Context value containing all state and operations
  const contextValue: BudgetFeatureContextType = {
    clientId,
    budgetPlans: budgetPlans || [],
    selectedPlanId,
    activePlan,
    budgetItems: budgetItems || [],
    isLoading,
    error: error as Error,
    
    refreshData,
    viewPlanDetails,
    returnToOverview,
    createPlan: async (planData) => createPlanMutation.mutateAsync(planData),
    updatePlan: async (planId, planData) => updatePlanMutation.mutateAsync({ planId, planData }),
    deletePlan: async (planId) => deletePlanMutation.mutateAsync(planId),
    createBudgetItem: async (planId, itemData) => createBudgetItemMutation.mutateAsync({ planId, itemData }),
    updateBudgetItem: async (itemId, itemData) => updateBudgetItemMutation.mutateAsync({ itemId, itemData }),
    deleteBudgetItem: async (itemId) => deleteBudgetItemMutation.mutateAsync(itemId),
  };
  
  return (
    <BudgetFeatureContext.Provider value={contextValue}>
      {children}
    </BudgetFeatureContext.Provider>
  );
}

/**
 * Custom hook to access the budget feature context
 */
export function useBudgetFeature() {
  const context = useContext(BudgetFeatureContext);
  
  if (!context) {
    throw new Error("useBudgetFeature must be used within a BudgetFeatureProvider");
  }
  
  return context;
}