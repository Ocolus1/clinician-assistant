import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { FIXED_BUDGET_AMOUNT } from "./BudgetFormSchema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define BudgetPlan type directly here to avoid circular dependencies
export interface BudgetPlan {
  id: number;
  clientId: number;
  planSerialNumber: string | null;
  planCode: string | null;
  isActive: boolean | null;
  ndisFunds: number;
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
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  activePlan: BudgetPlan | null;
  selectedPlanId: number | null;
  setActivePlan: (plan: BudgetPlan | null) => void;
  budgetItems: BudgetItem[];
  setBudgetItems: (items: BudgetItem[]) => void;
  budgetPlans: BudgetPlan[];
  isLoading: boolean;
  error: Error | null;
  totalAllocated: number;
  totalBudget: number;
  remainingBudget: number;
  refreshData: () => void;
  createPlan: (planData: any) => Promise<BudgetPlan>;
  viewPlanDetails: (planId: number) => void;
  returnToOverview: () => void;
}

const BudgetFeatureContext = createContext<BudgetFeatureContextType | undefined>(undefined);

interface BudgetFeatureProviderProps {
  children: ReactNode;
  clientId: number;
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
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [activePlan, setActivePlan] = useState<BudgetPlan | null>(initialPlan);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(initialItems);
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>(initialBudgetPlans);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  
  // Calculate budget totals using client-specific budget from active plan
  const totalBudget = activePlan?.ndisFunds ?? FIXED_BUDGET_AMOUNT;
  const totalAllocated = budgetItems.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
  const remainingBudget = totalBudget - totalAllocated;
  
  // Function to refresh data
  const refreshData = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
    
    // Fetch budget plans and items
    fetchBudgetPlans();
  }, [onRefresh, clientId]);
  
  // Function to fetch budget plans
  const fetchBudgetPlans = useCallback(async () => {
    if (!clientId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all budget plans for this client
      const response = await apiRequest("GET", `/api/clients/${clientId}/budget-settings?all=true`);
      const data = await response.json();
      
      // Ensure we have an array
      const plansArray = Array.isArray(data) ? data : [data];
      
      // Transform to BudgetPlan objects
      const plans: BudgetPlan[] = plansArray.map((plan: any) => ({
        id: plan.id,
        clientId: plan.clientId,
        planSerialNumber: plan.planSerialNumber,
        planCode: plan.planCode,
        isActive: Boolean(plan.isActive),
        ndisFunds: typeof plan.ndisFunds === 'number' ? plan.ndisFunds : 
                   typeof plan.ndisFunds === 'string' ? parseFloat(plan.ndisFunds) : 
                   // Fallback to availableFunds for backward compatibility
                   (typeof plan.availableFunds === 'number' ? plan.availableFunds : 
                   typeof plan.availableFunds === 'string' ? parseFloat(plan.availableFunds) : 0),
        endOfPlan: plan.endOfPlan,
        createdAt: plan.createdAt,
        planName: plan.planCode || plan.planSerialNumber || `Plan ${plan.id}`,
        endDate: plan.endOfPlan,
        percentUsed: 0, // Will be calculated later
        itemCount: 0, // Will be calculated later
        totalUsed: 0, // Will be calculated later
      }));
      
      // Update state with plans
      setBudgetPlans(plans);
      
      // If we have an active plan in the plans array, set it as the active plan
      const activeInPlans = plans.find(plan => plan.isActive);
      if (activeInPlans && !activePlan) {
        setActivePlan(activeInPlans);
      }
      
      console.log(`[BudgetFeatureProvider] Fetched ${plans.length} budget plans`);
    } catch (err) {
      console.error("[BudgetFeatureProvider] Error fetching budget plans:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [clientId, activePlan]);
  
  // Function to view budget plan details
  const viewPlanDetails = useCallback((planId: number) => {
    console.log(`[BudgetFeatureProvider] Viewing plan details for plan ID: ${planId}`);
    setSelectedPlanId(planId);
    
    // Find the plan in our list
    const plan = budgetPlans.find(p => p.id === planId);
    if (plan) {
      // Set as active plan in the context
      setActivePlan(plan);
    }
  }, [budgetPlans]);
  
  // Function to return to overview from details
  const returnToOverview = useCallback(() => {
    setSelectedPlanId(null);
  }, []);
  
  // Function to create a new budget plan
  const createPlan = useCallback(async (planData: any): Promise<BudgetPlan> => {
    if (!clientId) {
      throw new Error("Client ID is required to create a budget plan");
    }
    
    try {
      // Submit the plan data to the API
      const response = await apiRequest("POST", `/api/clients/${clientId}/budget-settings`, {
        ...planData,
        // Ensure ndisFunds is used (not availableFunds)
        ndisFunds: parseFloat(planData.availableFunds || planData.ndisFunds || 0),
        // Ensure the date is properly formatted
        endOfPlan: planData.endDate || planData.endOfPlan || null,
      });
      
      const newPlan = await response.json();
      
      // Update the local state
      toast({
        title: "Success",
        description: "Budget plan created successfully",
      });
      
      // Refresh the data
      refreshData();
      
      // Return the created plan
      return newPlan;
    } catch (err) {
      console.error("[BudgetFeatureProvider] Error creating budget plan:", err);
      toast({
        title: "Error",
        description: "Failed to create budget plan",
        variant: "destructive",
      });
      throw err;
    }
  }, [clientId, refreshData, toast]);
  
  // Initial data fetch on mount
  useEffect(() => {
    if (clientId && budgetPlans.length === 0) {
      fetchBudgetPlans();
    } else {
      // If we already have initial budget plans, set loading to false
      setIsLoading(false);
    }
  }, [clientId, fetchBudgetPlans, budgetPlans.length]);
  
  return (
    <BudgetFeatureContext.Provider
      value={{
        isEditing,
        setIsEditing,
        activePlan,
        selectedPlanId,
        setActivePlan,
        budgetItems,
        setBudgetItems,
        budgetPlans,
        isLoading,
        error,
        totalAllocated,
        totalBudget,
        remainingBudget,
        refreshData,
        createPlan,
        viewPlanDetails,
        returnToOverview
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