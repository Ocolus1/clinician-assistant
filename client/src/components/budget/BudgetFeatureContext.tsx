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
    queryKey: ['/api/clients', clientId, 'budget_plans'],
    queryFn: async () => {
      // Add all=true to ensure we get all budget settings for this client
      const response = await apiRequest("GET", `/api/clients/${clientId}/budget_settings?all=true`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch budget plans");
      }
      
      let budgetSettings = await response.json();
      
      // Ensure budgetSettings is always an array
      if (!Array.isArray(budgetSettings)) {
        budgetSettings = [budgetSettings];
      }
      
      // Transform budget settings into budget plans with additional UI properties
      return budgetSettings.map((setting: any) => ({
        id: setting.id,
        clientId: setting.clientId,
        planName: setting.planName || `Plan ${setting.id}`,
        planCode: setting.planCode || `BP-${setting.id}`,
        isActive: setting.isActive || false,
        availableFunds: setting.availableFunds || 0,
        endDate: setting.endOfPlan, // Fix property name (endOfPlan instead of endDate)
        startDate: setting.createdAt,
        // These would be calculated from actual budget items in a real implementation
        totalUsed: 0,
        itemCount: 0,
        percentUsed: 0,
      }));
    },
    enabled: !!clientId,
  });
  
  // Query to fetch budget items for the client
  const {
    data: budgetItems = [],
  } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget_items'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/clients/${clientId}/budget_items`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch budget items");
      }
      
      const items = await response.json();
      
      // Transform to add UI-specific properties
      return items.map((item: any) => ({
        ...item,
        usedQuantity: 0, // Would be calculated from actual session data
        balanceQuantity: item.quantity,
      }));
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
        queryKey: ['/api/clients', clientId, 'budget_plans'] 
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
        queryKey: ['/api/clients', clientId, 'budget_plans'] 
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
        queryKey: ['/api/clients', clientId, 'budget_items'] 
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
        queryKey: ['/api/clients', clientId, 'budget_items'] 
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
        queryKey: ['/api/clients', clientId, 'budget_items'] 
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
  const activeBudgetPlan = budgetPlans?.find((plan: BudgetPlan) => plan.isActive) || null;
  
  // Calculate selected plan items
  const selectedPlanItems = budgetItems.filter(
    (item: BudgetItem) => item.budgetSettingsId === selectedPlanId
  );
  
  // Handle view plan details action
  const viewPlanDetails = useCallback((planId: number) => {
    setSelectedPlanId(planId);
  }, []);
  
  // Handle create plan action
  const createPlan = useCallback(async (planData: any) => {
    await createPlanMutation.mutateAsync(planData);
  }, [createPlanMutation, clientId]);
  
  // Handle update plan action
  const updatePlan = useCallback(async (planData: any) => {
    await updatePlanMutation.mutateAsync(planData);
  }, [updatePlanMutation, clientId]);
  
  // Get budget plan by ID
  const getBudgetPlanById = useCallback((planId: number) => {
    if (!budgetPlans) return null;
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
    if (!budgetPlans || budgetPlans.length === 0 || !budgetItems || budgetItems.length === 0) {
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
    budgetPlans.forEach((plan: BudgetPlan) => {
      const planItems = itemsByPlanId[plan.id] || [];
      plan.itemCount = planItems.length;
      
      // Calculate totalUsed based on unitPrice * usedQuantity
      plan.totalUsed = planItems.reduce(
        (sum: number, item: BudgetItem) => sum + (item.unitPrice * item.usedQuantity), 
        0
      );
      
      // Calculate percentUsed
      plan.percentUsed = plan.availableFunds > 0 
        ? Math.min(Math.round((plan.totalUsed / plan.availableFunds) * 100), 100)
        : 0;
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