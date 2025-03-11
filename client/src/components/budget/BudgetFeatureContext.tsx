import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define the budget plan interface
export interface BudgetPlan {
  id: number;
  clientId: number;
  planName: string;
  planCode: string | null;
  isActive: boolean;
  availableFunds: number;
  endDate: string | null;
  startDate: string | null;
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
}

// Define budget item interface
export interface BudgetItem {
  id: number;
  budgetSettingsId: number;
  clientId: number;
  itemCode: string;
  description: string;
  unitPrice: number;
  quantity: number;
  category: string | null;
  usedQuantity: number;
  balanceQuantity: number;
}

// Define the context type
export interface BudgetFeatureContextType {
  // Budget Plans
  budgetPlans: BudgetPlan[] | null;
  activeBudgetPlan: BudgetPlan | null;
  selectedPlanId: number | null;
  isLoading: boolean;
  error: Error | null;
  
  // Budget Items
  budgetItems: BudgetItem[];
  selectedPlanItems: BudgetItem[];
  
  // Action handlers
  viewPlanDetails: (planId: number) => void;
  createPlan: (planData: any) => Promise<void>;
  updatePlan: (planData: any) => Promise<void>;
  setActivePlan: (planId: number) => Promise<void>;
  getBudgetPlanById: (planId: number) => BudgetPlan | null;
  
  // Budget Item actions
  createBudgetItem: (itemData: any) => Promise<void>;
  updateBudgetItem: (itemData: any) => Promise<void>;
  deleteBudgetItem: (itemId: number) => Promise<void>;
}

// Create the context with default values
const BudgetFeatureContext = createContext<BudgetFeatureContextType>({
  budgetPlans: null,
  activeBudgetPlan: null,
  selectedPlanId: null,
  isLoading: false,
  error: null,
  budgetItems: [],
  selectedPlanItems: [],
  viewPlanDetails: () => {},
  createPlan: async () => {},
  updatePlan: async () => {},
  setActivePlan: async () => {},
  getBudgetPlanById: () => null,
  createBudgetItem: async () => {},
  updateBudgetItem: async () => {},
  deleteBudgetItem: async () => {},
});

// Custom hook to use the budget feature context
export function useBudgetFeature() {
  return useContext(BudgetFeatureContext);
}

// Props for the provider component
interface BudgetFeatureProviderProps {
  children: React.ReactNode;
  clientId: number;
}

/**
 * Budget Feature Provider Component
 * Manages the state and data flow for the budget management feature
 */
export function BudgetFeatureProvider({ children, clientId }: BudgetFeatureProviderProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query to fetch all budget plans for a client
  const { 
    data: budgetPlans, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    queryFn: async () => {
      try {
        console.log(`[BudgetFeature] Fetching budget settings for client ${clientId}`);
        
        // First try to get all budget settings for this client with a direct fetch to ensure
        // we get all parameters correctly passed
        const url = `/api/clients/${clientId}/budget-settings?all=true`;
        console.log(`[BudgetFeature] Making request to: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[BudgetFeature] Error response:`, errorText);
          throw new Error(`Failed to fetch budget plans: ${response.status} ${response.statusText}`);
        }
        
        let budgetSettings = await response.json();
        console.log(`[BudgetFeature] Received budget settings:`, budgetSettings);
        
        // Handle empty response
        if (!budgetSettings) {
          console.log(`[BudgetFeature] No budget settings returned, using empty array`);
          return [];
        }
        
        // Ensure budgetSettings is always an array
        if (!Array.isArray(budgetSettings)) {
          console.log(`[BudgetFeature] Converting single budget setting to array`);
          budgetSettings = [budgetSettings];
        }
        
        console.log(`[BudgetFeature] Processing ${budgetSettings.length} budget settings`);
        
        // Transform budget settings into budget plans with additional UI properties
        const transformedSettings = budgetSettings.map((setting: any) => {
          // Create a meaningful plan name if one is not provided
          const planName = setting.planSerialNumber || `Plan ${setting.id}`;
          
          return {
            id: setting.id,
            clientId: setting.clientId,
            planName: planName,
            planCode: setting.planCode || null,
            isActive: setting.isActive === true, // Ensure boolean
            availableFunds: parseFloat(setting.availableFunds) || 0,
            endDate: setting.endOfPlan, // Field name in API is endOfPlan
            startDate: setting.createdAt,
            // These will be calculated from budget items later
            totalUsed: 0,
            itemCount: 0,
            percentUsed: 0,
          };
        });
        
        console.log(`[BudgetFeature] Transformed ${transformedSettings.length} budget settings to plans:`, transformedSettings);
        return transformedSettings;
      } catch (error) {
        console.error("Error fetching budget plans:", error);
        throw error;
      }
    },
    enabled: !!clientId,
  });
  
  // Query to fetch budget items for the client
  const {
    data: budgetItems = [],
    error: budgetItemsError
  } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/clients/${clientId}/budget-items`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || "Failed to fetch budget items");
        }
        
        const items = await response.json();
        
        // Handle empty response or non-array response
        if (!items) {
          return [];
        }
        
        // Ensure items is always an array
        const itemsArray = Array.isArray(items) ? items : [items];
        
        // Transform to add UI-specific properties
        return itemsArray.map((item: any) => ({
          ...item,
          usedQuantity: item.usedQuantity ?? 0, // Default to 0 if undefined
          balanceQuantity: item.balanceQuantity ?? item.quantity ?? 0, // Calculate balance if missing
        }));
      } catch (error) {
        console.error("Error fetching budget items:", error);
        // Return empty array on error to avoid breaking UI
        return [];
      }
    },
    enabled: !!clientId,
  });
  
  // Mutation to create a new budget plan
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/budget_settings`, {
        ...planData,
        clientId,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create budget plan");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', clientId, 'budget-settings'] 
      });
      
      toast({
        title: "Budget Plan Created",
        description: "New budget plan has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Failed to create budget plan.",
      });
    },
  });
  
  // Mutation to update an existing budget plan
  const updatePlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const response = await apiRequest("PUT", `/api/clients/${clientId}/budget_settings/${planData.id}`, planData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update budget plan");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', clientId, 'budget-settings'] 
      });
      
      toast({
        title: "Budget Plan Updated",
        description: "Budget plan has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update budget plan.",
      });
    },
  });
  
  // Mutation to create a new budget item
  const createBudgetItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/budget_items`, {
        ...itemData,
        clientId,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create budget item");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', clientId, 'budget-items'] 
      });
      
      toast({
        title: "Budget Item Added",
        description: "New budget item has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Failed to add budget item.",
      });
    },
  });
  
  // Mutation to update an existing budget item
  const updateBudgetItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await apiRequest("PUT", `/api/clients/${clientId}/budget_items/${itemData.id}`, itemData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update budget item");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', clientId, 'budget-items'] 
      });
      
      toast({
        title: "Budget Item Updated",
        description: "Budget item has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update budget item.",
      });
    },
  });
  
  // Mutation to delete a budget item
  const deleteBudgetItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest("DELETE", `/api/clients/${clientId}/budget_items/${itemId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete budget item");
      }
      
      return true;
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', clientId, 'budget-items'] 
      });
      
      toast({
        title: "Budget Item Deleted",
        description: "Budget item has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "Failed to delete budget item.",
      });
    },
  });
  
  // Find the active budget plan
  let activeBudgetPlan: BudgetPlan | null = null;
  if (budgetPlans && Array.isArray(budgetPlans)) {
    activeBudgetPlan = budgetPlans.find((plan: BudgetPlan) => plan.isActive) || null;
  }
  
  // Calculate selected plan items
  const selectedPlanItems = Array.isArray(budgetItems) 
    ? budgetItems.filter((item: BudgetItem) => item.budgetSettingsId === selectedPlanId) 
    : [];
  
  // Handle view plan details action
  const viewPlanDetails = useCallback((planId: number) => {
    // Use 0 as a signal value to clear the selection
    setSelectedPlanId(planId === 0 ? null : planId);
  }, []);
  
  // Handle create plan action
  const createPlan = useCallback(async (planData: any) => {
    await createPlanMutation.mutateAsync(planData);
  }, [createPlanMutation, clientId]);
  
  // Handle update plan action
  const updatePlan = useCallback(async (planData: any) => {
    await updatePlanMutation.mutateAsync(planData);
  }, [updatePlanMutation, clientId]);
  
  // Mutation to set a plan as active
  const setActivePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      // First, get the current plan
      const plan = getBudgetPlanById(planId);
      if (!plan) {
        throw new Error("Budget plan not found");
      }
      
      // Update the plan to set isActive to true
      const response = await apiRequest("PUT", `/api/clients/${clientId}/budget_settings/${planId}`, {
        ...plan,
        isActive: true,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to set plan as active");
      }
      
      // If there's another currently active plan, deactivate it
      if (activeBudgetPlan && activeBudgetPlan.id !== planId) {
        const deactivateResponse = await apiRequest(
          "PUT", 
          `/api/clients/${clientId}/budget_settings/${activeBudgetPlan.id}`,
          {
            ...activeBudgetPlan,
            isActive: false,
          }
        );
        
        if (!deactivateResponse.ok) {
          // Log error but don't throw, as the primary action succeeded
          console.error("Failed to deactivate previous active plan");
        }
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', clientId, 'budget-settings'] 
      });
      
      toast({
        title: "Active Plan Changed",
        description: "Budget plan has been set as active successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to set plan as active.",
      });
    },
  });
  
  // Handle set active plan action
  const setActivePlan = useCallback(async (planId: number) => {
    await setActivePlanMutation.mutateAsync(planId);
  }, [setActivePlanMutation, clientId]);
  
  // Get budget plan by ID
  const getBudgetPlanById = useCallback((planId: number) => {
    if (!budgetPlans || !Array.isArray(budgetPlans)) return null;
    return budgetPlans.find((plan: BudgetPlan) => plan.id === planId) || null;
  }, [budgetPlans]);
  
  // Handle create budget item action
  const createBudgetItem = useCallback(async (itemData: any) => {
    await createBudgetItemMutation.mutateAsync(itemData);
  }, [createBudgetItemMutation, clientId]);
  
  // Handle update budget item action
  const updateBudgetItem = useCallback(async (itemData: any) => {
    await updateBudgetItemMutation.mutateAsync(itemData);
  }, [updateBudgetItemMutation, clientId]);
  
  // Handle delete budget item action
  const deleteBudgetItem = useCallback(async (itemId: number) => {
    await deleteBudgetItemMutation.mutateAsync(itemId);
  }, [deleteBudgetItemMutation, clientId]);
  
  // Set initial selected plan to active plan if available
  useEffect(() => {
    if (activeBudgetPlan && !selectedPlanId) {
      setSelectedPlanId(activeBudgetPlan.id);
    }
  }, [activeBudgetPlan, selectedPlanId]);
  
  // Calculate totals and usage for each plan once budget items are loaded
  useEffect(() => {
    if (!budgetPlans || !Array.isArray(budgetPlans) || budgetPlans.length === 0 || 
        !budgetItems || !Array.isArray(budgetItems) || budgetItems.length === 0) {
      return;
    }
    
    // Group budget items by budgetSettingsId
    const itemsByPlanId = budgetItems.reduce((acc: Record<number, BudgetItem[]>, item: BudgetItem) => {
      const planId = item.budgetSettingsId;
      if (!acc[planId]) {
        acc[planId] = [];
      }
      acc[planId].push(item);
      return acc;
    }, {} as Record<number, BudgetItem[]>);
    
    // Update each plan with calculated values
    // Make sure we're not trying to mutate the response data directly, create a new array
    // Even though Array.isArray check is done above, we'll keep it safe here with optional chaining
    budgetPlans?.forEach((plan: BudgetPlan) => {
      const planItems = itemsByPlanId[plan.id] || [];
      
      // Safely set properties
      if (plan) {
        plan.itemCount = planItems.length;
        
        // Calculate totalUsed based on unitPrice * usedQuantity
        plan.totalUsed = planItems.reduce(
          (sum: number, item: BudgetItem) => sum + (item.unitPrice * (item.usedQuantity || 0)), 
          0
        );
        
        // Calculate percentUsed
        plan.percentUsed = plan.availableFunds > 0 
          ? Math.min(Math.round((plan.totalUsed / plan.availableFunds) * 100), 100)
          : 0;
      }
    });
    
  }, [budgetPlans, budgetItems]);
  
  const contextValue: BudgetFeatureContextType = {
    budgetPlans,
    activeBudgetPlan,
    selectedPlanId,
    isLoading,
    error,
    budgetItems,
    selectedPlanItems,
    viewPlanDetails,
    createPlan,
    updatePlan,
    setActivePlan,
    getBudgetPlanById,
    createBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
  };
  
  return (
    <BudgetFeatureContext.Provider value={contextValue}>
      {children}
    </BudgetFeatureContext.Provider>
  );
}