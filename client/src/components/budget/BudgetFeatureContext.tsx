import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInDays, isAfter, addDays } from "date-fns";
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";

// Enhanced types for the budget feature
export interface EnhancedBudgetItem extends BudgetItem {
  usedQuantity: number;
  remainingQuantity: number;
  totalPrice: number;
  usedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  itemName?: string;
  catalogItem?: BudgetItemCatalog;
}

export interface BudgetPlan extends BudgetSettings {
  // UI display properties
  planName: string;
  active: boolean;
  archived: boolean;
  fundingSource: string;
  startDate: string | null;
  endDate: string | null;
  
  // Calculated metrics
  totalUsed: number;
  remainingFunds: number;
  percentUsed: number;
  itemCount: number;
  daysRemaining: number | null;
  
  // Most used metrics
  mostUsedItem?: string;
  mostUsedCategory?: string;
  
  // Status indicators
  statusColor: 'green' | 'yellow' | 'red' | 'grey';
  
  // Visual data
  enhancedItems?: EnhancedBudgetItem[];
}

interface BudgetContextType {
  // Budget plans
  budgetPlans: BudgetPlan[];
  activePlan: BudgetPlan | null;
  
  // Budget items
  allBudgetItems: EnhancedBudgetItem[];
  catalogItems: BudgetItemCatalog[];
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  createPlan: (planData: any) => Promise<BudgetPlan>;
  updatePlan: (planId: number, planData: any) => Promise<BudgetPlan>;
  archivePlan: (planId: number) => Promise<BudgetPlan>;
  setActivePlan: (planId: number) => Promise<BudgetPlan>;
  
  // Budget items actions
  updateBudgetItems: (planId: number, items: EnhancedBudgetItem[]) => Promise<EnhancedBudgetItem[]>;
  
  // Helper functions
  getBudgetItemsByPlan: (planId: number) => EnhancedBudgetItem[];
  getPlanById: (planId: number) => BudgetPlan | null;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

interface BudgetProviderProps {
  clientId: number;
  children: ReactNode;
}

export function BudgetProvider({ clientId, children }: BudgetProviderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creatingPlanId, setCreatingPlanId] = useState<string | null>(null);
  
  // Fetch all budget plans for this client
  const { 
    data: budgetSettingsData = [], 
    isLoading: isLoadingSettings,
  } = useQuery<BudgetSettings[]>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    queryFn: async () => {
      try {
        // Explicitly request all budget settings
        const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
        
        if (!response.ok) {
          console.error(`Error fetching budget settings: ${response.status} ${response.statusText}`);
          return [];
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [data];
      } catch (error) {
        console.error("Error in budget settings fetch:", error);
        return [];
      }
    },
  });
  
  // Fetch all budget items for this client
  const { 
    data: budgetItemsData = [], 
    isLoading: isLoadingItems,
  } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
  });
  
  // Fetch catalog items
  const { 
    data: catalogItemsData = [], 
    isLoading: isLoadingCatalog
  } = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-catalog'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch sessions for the client to calculate actual used funds
  const { 
    data: clientSessions = [], 
    isLoading: isLoadingSessions
  } = useQuery<any[]>({
    queryKey: ['/api/clients', clientId, 'sessions'],
  });
  
  // Mutation to create a new budget plan
  const createPlanMutation = useMutation({
    mutationFn: async (newPlan: any) => {
      // Check if we're already creating a plan with this ID to prevent duplicates
      if (creatingPlanId === newPlan.planSerialNumber) {
        console.warn(`Duplicate budget plan creation attempt with ID ${newPlan.planSerialNumber}`);
        throw new Error("A budget plan is already being created. Please wait for it to complete.");
      }
      
      // Set the current plan ID we're creating to prevent duplicates
      setCreatingPlanId(newPlan.planSerialNumber);
      
      try {
        // Extract budget items from the plan data
        const { budgetItems: newItems, ...planData } = newPlan;
        
        // Critical: Include only required and valid fields for the budget settings schema
        const validPlanData = {
          planSerialNumber: planData.planSerialNumber || "",
          planCode: planData.planCode || "",
          availableFunds: Number(planData.availableFunds),
          isActive: Boolean(planData.isActive),
          endOfPlan: planData.endOfPlan || null,
          clientId
        };
        
        // First handle active plan status changes if needed
        if (validPlanData.isActive === true) {
          // Get all budget settings for this client that are active
          const activeSettings = budgetSettingsData.filter((s) => Boolean(s.isActive));
          
          // Deactivate existing active plans BEFORE creating the new plan
          for (const activePlan of activeSettings) {
            // Use only the required field for update to avoid validation errors
            const deactivateResult = await fetch(`/api/budget-settings/${activePlan.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                isActive: false,
                planSerialNumber: activePlan.planSerialNumber || "",
                planCode: activePlan.planCode || "",
                availableFunds: Number(activePlan.availableFunds),
                endOfPlan: activePlan.endOfPlan || null,
                clientId: activePlan.clientId
              })
            });
            
            if (!deactivateResult.ok) {
              const errorText = await deactivateResult.text();
              throw new Error(`Failed to deactivate existing active plan. Error: ${errorText}`);
            }
          }
          
          // Allow a small delay to ensure deactivation is complete before creating new plan
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Step 1: Create the budget plan
        const response = await apiRequest('POST', `/api/clients/${clientId}/budget-settings`, validPlanData);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const createdPlan = await response.json();
        
        // Step 2: Create budget items if they exist
        if (newItems && newItems.length > 0) {
          // Create budget items for the new plan
          const itemsWithIds = newItems.map((item: any) => ({
            itemCode: item.itemCode,
            description: item.description,
            unitPrice: Number(item.unitPrice || item.defaultUnitPrice),
            quantity: Number(item.quantity || 1),
            category: item.category || null,
            clientId,
            budgetSettingsId: createdPlan.id
          }));
          
          // Add a slight delay before creating budget items to ensure DB consistency
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Create budget items one by one to ensure they are associated with the correct plan
          for (const item of itemsWithIds) {
            const itemResponse = await apiRequest('POST', `/api/clients/${clientId}/budget-items`, item);
            if (!itemResponse.ok) {
              const errorText = await itemResponse.text();
              console.error(`Error creating budget item for plan ${createdPlan.id}:`, errorText);
            }
          }
          
          // Invalidate budget items query to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
        }
        
        return createdPlan;
      } catch (error) {
        throw error;
      } finally {
        // Reset the creating plan ID to allow new plan creation
        setCreatingPlanId(null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      toast({
        title: "Success",
        description: "Budget plan created successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create budget plan: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation to update a budget plan
  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, data }: { planId: number, data: any }) => {
      try {
        // Process data to ensure consistent format
        const processedData = { ...data };
        
        // Handle numeric fields
        if ('availableFunds' in processedData) {
          processedData.availableFunds = Number(parseFloat(processedData.availableFunds.toString()).toFixed(2));
        }
        
        // Handle boolean fields
        if ('isActive' in processedData) {
          processedData.isActive = Boolean(processedData.isActive);
        }
        
        // Handle date fields
        if ('endOfPlan' in processedData) {
          processedData.endOfPlan = processedData.endOfPlan ? String(processedData.endOfPlan) : null;
        }
        
        // Handle string fields
        if ('planCode' in processedData) {
          processedData.planCode = String(processedData.planCode).trim();
        }
        
        if ('planSerialNumber' in processedData) {
          processedData.planSerialNumber = String(processedData.planSerialNumber).trim();
        }
        
        const response = await apiRequest('PUT', `/api/budget-settings/${planId}`, processedData);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const updatedPlan = await response.json();
        return updatedPlan;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      toast({
        title: "Success",
        description: "Budget plan updated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update budget plan: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation to update budget items
  const updateItemsMutation = useMutation({
    mutationFn: ({ planId, items }: { planId: number, items: EnhancedBudgetItem[] }) => {
      return apiRequest('PUT', `/api/budget-settings/${planId}/items`, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
      toast({
        title: "Success",
        description: "Budget items updated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update budget items: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Create enhanced budget items with calculated usage metrics
  const enhancedBudgetItems: EnhancedBudgetItem[] = budgetItemsData.map(item => {
    // TODO: Calculate actual used quantity from session data
    const usedQuantity = 0; // This would be calculated from session data
    const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity as string) : item.quantity;
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice as string) : item.unitPrice;
    
    // Find matching catalog item for additional details
    const catalogItem = catalogItemsData.find(c => c.itemCode === item.itemCode);
    
    return {
      ...item,
      quantity,
      unitPrice,
      usedQuantity,
      remainingQuantity: quantity - usedQuantity,
      totalPrice: unitPrice * quantity,
      usedAmount: unitPrice * usedQuantity,
      remainingAmount: unitPrice * (quantity - usedQuantity),
      usagePercentage: quantity > 0 ? (usedQuantity / quantity) * 100 : 0,
      itemName: item.name || catalogItem?.description || item.itemCode,
      catalogItem
    };
  });
  
  // Create enhanced budget plans with additional calculated fields
  const enhancedBudgetPlans: BudgetPlan[] = budgetSettingsData.map(setting => {
    // Get items for this plan
    const planItems = enhancedBudgetItems.filter(item => item.budgetSettingsId === setting.id);
    
    // Calculate total allocated & used funds
    const totalAllocated = planItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalUsed = planItems.reduce((sum, item) => sum + item.usedAmount, 0);
    
    // Calculate days remaining
    let daysRemaining: number | null = null;
    let statusColor: 'green' | 'yellow' | 'red' | 'grey' = 'grey';
    
    if (setting.endOfPlan) {
      try {
        const endDate = parseISO(setting.endOfPlan);
        if (isAfter(endDate, new Date())) {
          daysRemaining = differenceInDays(endDate, new Date());
          
          // Set status color based on days remaining
          if (daysRemaining > 30) {
            statusColor = 'green';
          } else if (daysRemaining > 7) {
            statusColor = 'yellow';
          } else {
            statusColor = 'red';
          }
        } else {
          // Plan has expired
          daysRemaining = 0;
          statusColor = 'red';
        }
      } catch (e) {
        // Invalid date format
        daysRemaining = null;
      }
    }
    
    // Calculate percent used
    const percentUsed = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;
    
    // Determine most used item and category if applicable
    let mostUsedItem: string | undefined;
    let mostUsedCategory: string | undefined;
    
    if (planItems.length > 0) {
      const itemsByUsage = [...planItems].sort((a, b) => b.usedAmount - a.usedAmount);
      if (itemsByUsage[0].usedAmount > 0) {
        mostUsedItem = itemsByUsage[0].itemName;
      }
      
      // Group by category and find most used category
      const categoriesUsage = planItems.reduce((acc, item) => {
        if (item.category) {
          if (!acc[item.category]) {
            acc[item.category] = 0;
          }
          acc[item.category] += item.usedAmount;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const categories = Object.entries(categoriesUsage).sort(([,a], [,b]) => b - a);
      if (categories.length > 0 && categories[0][1] > 0) {
        mostUsedCategory = categories[0][0];
      }
    }
    
    return {
      ...setting,
      // UI display properties
      planName: setting.planCode || `Plan #${setting.id}`,
      active: Boolean(setting.isActive),
      archived: false, // We'll determine this from other properties
      fundingSource: "Self-Managed", // This would be populated from client data
      startDate: setting.createdAt ? format(new Date(setting.createdAt), 'yyyy-MM-dd') : null,
      endDate: setting.endOfPlan || null,
      
      // Calculated metrics
      totalUsed,
      remainingFunds: setting.availableFunds - totalUsed,
      percentUsed,
      itemCount: planItems.length,
      daysRemaining,
      
      // Most used metrics
      mostUsedItem,
      mostUsedCategory,
      
      // Status indicators
      statusColor,
    };
  });
  
  // Determine active plan
  const activePlan = enhancedBudgetPlans.find(plan => plan.active) || null;
  
  // Helper function to get budget items for a specific plan
  const getBudgetItemsByPlan = (planId: number) => {
    return enhancedBudgetItems.filter(item => item.budgetSettingsId === planId);
  };
  
  // Helper function to get a plan by ID
  const getPlanById = (planId: number) => {
    return enhancedBudgetPlans.find(plan => plan.id === planId) || null;
  };
  
  const isLoading = isLoadingSettings || isLoadingItems || isLoadingCatalog || isLoadingSessions;
  
  // Value object for the context
  const contextValue: BudgetContextType = {
    budgetPlans: enhancedBudgetPlans,
    activePlan,
    allBudgetItems: enhancedBudgetItems,
    catalogItems: catalogItemsData,
    isLoading,
    
    // Actions
    createPlan: async (planData) => {
      const result = await createPlanMutation.mutateAsync(planData);
      return result as BudgetPlan;
    },
    updatePlan: async (planId, planData) => {
      const result = await updatePlanMutation.mutateAsync({ planId, data: planData });
      return result as BudgetPlan;
    },
    archivePlan: async (planId) => {
      const result = await updatePlanMutation.mutateAsync({ 
        planId, 
        data: { isActive: false }
      });
      return result as BudgetPlan;
    },
    setActivePlan: async (planId) => {
      // First deactivate any active plans
      const activeSettings = budgetSettingsData.filter((s) => Boolean(s.isActive));
      
      for (const activePlan of activeSettings) {
        await updatePlanMutation.mutateAsync({ 
          planId: activePlan.id, 
          data: { 
            isActive: false,
            planSerialNumber: activePlan.planSerialNumber || "",
            planCode: activePlan.planCode || "",
            availableFunds: Number(activePlan.availableFunds),
            endOfPlan: activePlan.endOfPlan || null
          } 
        });
      }
      
      // Then activate the selected plan
      const targetPlan = budgetSettingsData.find(s => s.id === planId);
      if (!targetPlan) throw new Error("Budget plan not found");
      
      const result = await updatePlanMutation.mutateAsync({ 
        planId, 
        data: { 
          isActive: true,
          planSerialNumber: targetPlan.planSerialNumber || "",
          planCode: targetPlan.planCode || "",
          availableFunds: Number(targetPlan.availableFunds),
          endOfPlan: targetPlan.endOfPlan || null
        } 
      });
      
      return result as BudgetPlan;
    },
    
    // Budget items actions
    updateBudgetItems: async (planId, items) => {
      await updateItemsMutation.mutateAsync({ planId, items });
      return items;
    },
    
    // Helper functions
    getBudgetItemsByPlan,
    getPlanById,
  };
  
  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
}

// Custom hook to use the budget context
export function useBudgetFeature() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error("useBudgetFeature must be used within a BudgetProvider");
  }
  return context;
}