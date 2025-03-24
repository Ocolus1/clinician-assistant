import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { FIXED_BUDGET_AMOUNT, NDIS_FUNDS_AMOUNT } from "./BudgetFormSchema";

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
  selectedPlan: BudgetPlan | null;
  setActivePlan: (plan: BudgetPlan | null) => void;
  viewPlanDetails: (planId: number) => void;
  resetSelectedPlan: () => void;
  clearSelectedPlan: () => void; // Alias for resetSelectedPlan
  budgetItems: BudgetItem[];
  setBudgetItems: (items: BudgetItem[]) => void;
  totalAllocated: number;
  totalBudget: number;
  remainingBudget: number;
  refreshData: () => void;
  isReadOnly: boolean;
  budgetPlans: BudgetPlan[] | null;
  isLoading: boolean;
  error: Error | null;
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
  const [isEditing, setIsEditing] = useState(false);
  const [activePlan, setActivePlan] = useState<BudgetPlan | null>(initialPlan);
  const [selectedPlan, setSelectedPlan] = useState<BudgetPlan | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(initialItems);
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[] | null>(initialBudgetPlans);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Function to view a specific plan's details
  const viewPlanDetails = (planId: number) => {
    if (!budgetPlans) return;
    
    const plan = budgetPlans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      console.log(`Viewing details for plan ${planId}`);
    }
  };
  
  // Function to reset selected plan - goes back to plan list view
  const resetSelectedPlan = () => {
    setSelectedPlan(null);
    console.log('Reset selected plan, returning to plan list view');
  };
  
  // Listen for reset-selected-plan events
  useEffect(() => {
    const handleResetSelectedPlan = () => {
      resetSelectedPlan();
    };
    
    window.addEventListener('reset-selected-plan', handleResetSelectedPlan);
    
    return () => {
      window.removeEventListener('reset-selected-plan', handleResetSelectedPlan);
    };
  }, []);
  
  // Calculate budget totals using client-specific budget from active plan
  const totalBudget = activePlan?.ndisFunds ?? FIXED_BUDGET_AMOUNT;
  const totalAllocated = budgetItems.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
  const remainingBudget = totalBudget - totalAllocated;
  
  // Function to refresh data
  const refreshData = () => {
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // Calculate whether the current plan is read-only (non-active plans are read-only)
  const isReadOnly = activePlan ? !activePlan.isActive : false;
  
  return (
    <BudgetFeatureContext.Provider
      value={{
        isEditing,
        setIsEditing,
        activePlan,
        selectedPlan,
        setActivePlan,
        viewPlanDetails,
        resetSelectedPlan,
        clearSelectedPlan: resetSelectedPlan, // Alias for resetSelectedPlan
        budgetItems,
        setBudgetItems,
        totalAllocated,
        totalBudget,
        remainingBudget,
        refreshData,
        isReadOnly,
        budgetPlans,
        isLoading,
        error
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