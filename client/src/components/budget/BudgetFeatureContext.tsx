import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Default budget amount when none is specified
export const FIXED_BUDGET_AMOUNT = 5000;
export const AVAILABLE_FUNDS_AMOUNT = 5000;

// Define BudgetPlan type directly here to avoid circular dependencies
export interface BudgetPlan {
  id: number;
  clientId: number;
  planSerialNumber: string | null;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endOfPlan: string | null;
  createdAt: Date | null;
  
  // Additional properties for UI display
  active?: boolean;
  archived?: boolean;
  totalUsed?: number;
  itemCount?: number;
  percentUsed?: number;
  
  // Mapped properties for consistent UI naming
  planName?: string;
  fundingSource?: string;
  startDate?: string | null;
  endDate?: string | null;
}

// Budget item interface for use within the context
export interface BudgetItem {
  id: number;
  clientId: number;
  budgetSettingsId: number;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  name: string | null;
  category: string | null;
}

interface BudgetFeatureContextType {
  // Core state
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  activePlan: BudgetPlan | null;
  setActivePlan: (plan: BudgetPlan | null) => void;
  budgetItems: BudgetItem[];
  setBudgetItems: (items: BudgetItem[]) => void;
  
  // Budget calculations
  totalAllocated: number;
  totalBudget: number;
  remainingBudget: number;
  
  // Budget plans management
  budgetPlans: BudgetPlan[];
  isLoading: boolean;
  error: Error | null;
  
  // Operations
  refreshData: () => void;
  viewPlanDetails: (planId: number) => void;
  createPlan: (planData: any) => Promise<any>;
  deletePlan: (planId: number) => Promise<void>;
}

const BudgetFeatureContext = createContext<BudgetFeatureContextType | undefined>(undefined);

interface BudgetFeatureProviderProps {
  children: ReactNode;
  clientId?: number;
  initialPlan?: BudgetPlan | null;
  initialItems?: BudgetItem[];
  initialBudgetPlans?: BudgetPlan[];
  onRefresh?: () => void;
}

/**
 * Provider component for budget feature state and context
 */
export function BudgetFeatureProvider({
  children,
  clientId,
  initialPlan = null,
  initialItems = [],
  initialBudgetPlans = [],
  onRefresh
}: BudgetFeatureProviderProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activePlan, setActivePlan] = useState<BudgetPlan | null>(initialPlan);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(initialItems);
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>(initialBudgetPlans);
  const [error, setError] = useState<Error | null>(null);
  
  // Get all budget plans for the client
  const plansQuery = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-settings`, "all"],
    queryFn: async () => {
      if (!clientId) return [];
      
      try {
        console.log(`[BudgetFeatureContext] Fetching budget plans for client ${clientId}`);
        const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
        if (!response.ok) {
          throw new Error('Failed to fetch budget plans');
        }
        
        const data = await response.json();
        // Handle both array and single object responses
        const plans = Array.isArray(data) ? data : [data];
        
        // Transform plans for UI
        return plans.map((plan: any) => ({
          ...plan,
          // Add UI display properties
          active: plan.isActive === true,
          planName: plan.planSerialNumber || `Plan ${plan.id}`,
          endDate: plan.endOfPlan,
          startDate: plan.createdAt,
          // Calculate usage metrics (can be extended later)
          totalUsed: 0,
          itemCount: 0,
          percentUsed: 0
        }));
      } catch (err) {
        console.error('[BudgetFeatureContext] Error fetching plans:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        return [];
      }
    },
    enabled: !!clientId
  });
  
  // Update budget plans state when query completes
  useEffect(() => {
    if (plansQuery.data) {
      setBudgetPlans(plansQuery.data);
      
      // If no active plan is set but we have plans, try to set one
      if (!activePlan && plansQuery.data.length > 0) {
        // Find active plan or use first one
        const activePlans = plansQuery.data.filter((plan: any) => plan.isActive);
        if (activePlans.length > 0) {
          setActivePlan(activePlans[0]);
        } else {
          setActivePlan(plansQuery.data[0]);
        }
      }
    }
  }, [plansQuery.data, activePlan]);
  
  // Calculate budget totals using client-specific budget from active plan
  const totalBudget = activePlan?.availableFunds ?? FIXED_BUDGET_AMOUNT;
  const totalAllocated = budgetItems.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
  const remainingBudget = totalBudget - totalAllocated;
  
  // Function to refresh data
  const refreshData = () => {
    // Invalidate queries to refresh data
    if (clientId) {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/budget-settings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/budget-items`] });
    }
    
    // Call custom refresh function if provided
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // View details for a specific plan
  const viewPlanDetails = (planId: number) => {
    // Find the plan in the list
    const plan = budgetPlans.find(p => p.id === planId);
    if (plan) {
      // Set as active plan
      setActivePlan(plan);
      
      // Fetch budget items for this plan
      if (clientId) {
        queryClient.prefetchQuery({
          queryKey: [`/api/clients/${clientId}/budget-items`, plan.id],
          queryFn: async () => {
            const response = await fetch(`/api/clients/${clientId}/budget-items?budgetSettingsId=${plan.id}`);
            if (!response.ok) {
              throw new Error('Failed to fetch budget items');
            }
            return response.json();
          }
        });
      }
    }
  };
  
  // Create a new budget plan
  const createPlan = async (planData: any) => {
    if (!clientId) {
      throw new Error('Client ID is required to create a budget plan');
    }
    
    try {
      // Create the budget plan
      const response = await apiRequest('POST', `/api/clients/${clientId}/budget-settings`, {
        ...planData,
        clientId
      });
      
      // Refresh data after creation
      refreshData();
      
      return response.json();
    } catch (error) {
      console.error('[BudgetFeatureContext] Error creating plan:', error);
      throw error;
    }
  };
  
  // Delete a budget plan
  const deletePlan = async (planId: number) => {
    if (!clientId) {
      throw new Error('Client ID is required to delete a budget plan');
    }
    
    try {
      // Delete the budget plan
      await apiRequest('DELETE', `/api/budget-settings/${planId}`);
      
      // Update local state
      setBudgetPlans(prev => prev.filter(p => p.id !== planId));
      
      // If the active plan was deleted, set a new active plan
      if (activePlan?.id === planId) {
        const remainingPlans = budgetPlans.filter(p => p.id !== planId);
        if (remainingPlans.length > 0) {
          setActivePlan(remainingPlans[0]);
        } else {
          setActivePlan(null);
        }
      }
      
      // Refresh data
      refreshData();
    } catch (error) {
      console.error('[BudgetFeatureContext] Error deleting plan:', error);
      throw error;
    }
  };
  
  return (
    <BudgetFeatureContext.Provider
      value={{
        isEditing,
        setIsEditing,
        activePlan,
        setActivePlan,
        budgetItems,
        setBudgetItems,
        totalAllocated,
        totalBudget,
        remainingBudget,
        budgetPlans,
        isLoading: plansQuery.isLoading,
        error,
        refreshData,
        viewPlanDetails,
        createPlan,
        deletePlan
      }}
    >
      {children}
    </BudgetFeatureContext.Provider>
  );
}

/**
 * Hook to access budget feature context
 */
export function useBudgetFeature() {
  const context = useContext(BudgetFeatureContext);
  
  if (context === undefined) {
    throw new Error("useBudgetFeature must be used within a BudgetFeatureProvider");
  }
  
  return context;
}