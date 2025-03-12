import React, { useState, useEffect, useMemo } from "react";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  AlertCircle, 
  PlusCircle, 
  Filter
} from "lucide-react";
import { BudgetSettings } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BudgetItemForm } from "@/components/budget/BudgetItemForm";
import { BudgetPlanCard } from "@/components/budget/BudgetPlanCard";
import { BudgetPlanDetails } from "@/components/budget/BudgetPlanDetails";
import { BudgetPlan, BudgetItem } from "@/components/budget/BudgetFeatureContext";

interface DirectBudgetPlanProps {
  clientId: number;
}

/**
 * A component that directly fetches and displays budget plans
 * Provides a clean, consistent interface for budget management
 */
export function DirectBudgetPlanList({ clientId }: DirectBudgetPlanProps) {
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<BudgetPlan | null>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showPlanDetailsView, setShowPlanDetailsView] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for budget items specific to the selected plan
  const [selectedPlanItems, setSelectedPlanItems] = useState<BudgetItem[]>([]);
  
  // Direct fetch from the API
  useEffect(() => {
    const fetchBudgetPlans = async () => {
      try {
        console.log(`[DirectBudgetPlanList] Fetching budget plans for client ${clientId}`);
        
        // Make the API request
        const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
        
        if (!response.ok) {
          throw new Error(`Error fetching budget plans: ${response.status} ${response.statusText}`);
        }
        
        let data: BudgetSettings[] = await response.json();
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
          data = [data];
        }
        
        console.log(`[DirectBudgetPlanList] Received ${data.length} budget plans:`, data);
        
        // Transform the data to include UI-specific properties
        const transformedPlans = data.map((plan: BudgetSettings): BudgetPlan => ({
          id: plan.id,
          clientId: plan.clientId,
          planName: plan.planSerialNumber || `Plan ${plan.id}`,
          planCode: plan.planCode || null,
          isActive: plan.isActive === true, // Ensure boolean
          availableFunds: typeof plan.availableFunds === 'string' ? 
            parseFloat(plan.availableFunds) : plan.availableFunds || 0,
          endDate: plan.endOfPlan, // Field name in API is endOfPlan
          startDate: plan.createdAt ? plan.createdAt.toString() : null,
          // These will be calculated from budget items later
          totalUsed: 0,
          itemCount: 0,
          percentUsed: 0,
        }));
        
        console.log(`[DirectBudgetPlanList] Transformed ${transformedPlans.length} budget plans`);
        setPlans(transformedPlans);
        
        // If we have budget plans, fetch the budget items to calculate usage
        if (transformedPlans.length > 0) {
          fetchBudgetItems(transformedPlans);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[DirectBudgetPlanList] Error fetching budget plans:", error);
        setError(error instanceof Error ? error.message : "Unknown error fetching budget plans");
        setIsLoading(false);
      }
    };
    
    // Fetch budget items and calculate plan usage
    const fetchBudgetItems = async (budgetPlans: BudgetPlan[]) => {
      try {
        const response = await fetch(`/api/clients/${clientId}/budget-items`);
        
        if (!response.ok) {
          throw new Error(`Error fetching budget items: ${response.status} ${response.statusText}`);
        }
        
        let rawItems = await response.json();
        
        // Ensure items is an array
        if (!Array.isArray(rawItems)) {
          rawItems = rawItems ? [rawItems] : [];
        }
        
        // Transform items to match BudgetItem interface
        const items: BudgetItem[] = rawItems.map((item: any) => ({
          ...item,
          usedQuantity: item.usedQuantity ?? 0,  // Default to 0 if undefined
          balanceQuantity: item.balanceQuantity ?? item.quantity ?? 0, // Default to quantity
        }));
        
        console.log(`[DirectBudgetPlanList] Received ${items.length} budget items`);
        
        // Group items by budget settings ID
        const itemsByPlanId = items.reduce((acc: Record<number, BudgetItem[]>, item: BudgetItem) => {
          const planId = item.budgetSettingsId;
          if (!acc[planId]) {
            acc[planId] = [];
          }
          acc[planId].push(item);
          return acc;
        }, {} as Record<number, BudgetItem[]>);
        
        // Calculate usage for each plan
        const plansWithUsage = budgetPlans.map((plan: BudgetPlan) => {
          const planItems = itemsByPlanId[plan.id] || [];
          
          // Calculate item count
          const itemCount = planItems.length;
          
          // Calculate total used based on unit price * quantity
          // In a real system with usage tracking, this would use the tracked usage instead
          const totalUsed = planItems.reduce(
            (sum: number, item: BudgetItem) => {
              const unitPrice = typeof item.unitPrice === 'string' ? 
                parseFloat(item.unitPrice) : item.unitPrice;
              const quantity = typeof item.quantity === 'string' ? 
                parseInt(String(item.quantity)) : item.quantity;
              return sum + (unitPrice * quantity);
            }, 0
          );
          
          // Calculate percent used
          const percentUsed = plan.availableFunds > 0
            ? Math.min(Math.round((totalUsed / plan.availableFunds) * 100), 100)
            : 0;
          
          return {
            ...plan,
            itemCount,
            totalUsed,
            percentUsed
          };
        });
        
        console.log(`[DirectBudgetPlanList] Plans with usage calculated:`, plansWithUsage);
        setPlans(plansWithUsage);
        setIsLoading(false);
      } catch (error) {
        console.error("[DirectBudgetPlanList] Error fetching budget items:", error);
        // Don't set an error, just use the plans without usage info
        setIsLoading(false);
      }
    };
    
    fetchBudgetPlans();
  }, [clientId]);
  
  // Fetch budget items for the selected plan
  useEffect(() => {
    if (selectedPlanId) {
      const fetchItemsForSelectedPlan = async () => {
        try {
          const response = await fetch(`/api/clients/${clientId}/budget-items`);
          if (!response.ok) {
            throw new Error(`Error fetching budget items: ${response.status}`);
          }
          const allItems = await response.json();
          const items = Array.isArray(allItems) ? allItems : [allItems];
          
          // Filter items for the selected plan and transform to match BudgetItem interface
          const planItems = items
            .filter((item: any) => item.budgetSettingsId === selectedPlanId)
            .map((item: any) => ({
              ...item,
              usedQuantity: item.usedQuantity ?? 0,
              balanceQuantity: item.balanceQuantity ?? item.quantity ?? 0,
            }));
            
          setSelectedPlanItems(planItems);
        } catch (error) {
          console.error("[DirectBudgetPlanList] Error fetching items for plan details:", error);
          setSelectedPlanItems([]);
        }
      };
      
      fetchItemsForSelectedPlan();
    }
  }, [selectedPlanId, clientId]);
  
  // Budget Plan Detailed View
  const handleViewDetails = (plan: BudgetPlan) => {
    setSelectedPlanId(plan.id);
    setShowPlanDetailsView(true);
  };
  
  // Handle adding a budget item to a plan
  const handleAddItem = (plan: BudgetPlan) => {
    setActivePlan(plan);
    setShowAddItemDialog(true);
  };
  
  // Find the selected plan for details view
  const selectedPlan = useMemo(() => {
    if (showPlanDetailsView && selectedPlanId && plans.length > 0) {
      return plans.find(p => p.id === selectedPlanId) || null;
    }
    return null;
  }, [showPlanDetailsView, selectedPlanId, plans]);
  
  const handleBackFromDetails = () => {
    setShowPlanDetailsView(false);
    setSelectedPlanId(null);
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3">Loading budget plans...</span>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
            <div>
              <h3 className="text-base font-medium text-red-800">Error Loading Budget Plans</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render empty state
  if (plans.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-background p-3 mb-4">
            <PlusCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Budget Plans</h3>
          <p className="text-center text-muted-foreground mb-4 max-w-md">
            Create your first budget plan to start tracking therapy expenses and funding allocations.
          </p>
          <Button>
            Create New Budget Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Primary component render
  return (
    <div className="space-y-6">
      {showPlanDetailsView && selectedPlan ? (
        // Render the plan details view when a plan is selected
        <BudgetPlanDetails
          plan={selectedPlan}
          items={selectedPlanItems}
          onBack={handleBackFromDetails}
          onMakeActive={() => console.log("Make active")}
        />
      ) : (
        // Otherwise show the list view
        <>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Budget Plans</h3>
              <p className="text-sm text-muted-foreground">
                {plans.length} {plans.length === 1 ? 'plan' : 'plans'} available
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan: BudgetPlan) => (
              <BudgetPlanCard 
                key={plan.id} 
                plan={plan} 
                onView={() => handleViewDetails(plan)}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Budget Item Form Dialog */}
      {activePlan && (
        <BudgetItemForm
          open={showAddItemDialog}
          onOpenChange={setShowAddItemDialog}
          clientId={clientId}
          budgetSettingsId={activePlan.id}
          onSuccess={() => {
            // Refresh plans data
            const fetchBudgetPlans = async () => {
              try {
                const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
                
                if (!response.ok) {
                  throw new Error(`Error fetching budget plans: ${response.status} ${response.statusText}`);
                }
                
                let data: BudgetSettings[] = await response.json();
                
                // Ensure data is an array
                if (!Array.isArray(data)) {
                  data = [data];
                }
                
                const transformedPlans = data.map((plan: BudgetSettings): BudgetPlan => ({
                  id: plan.id,
                  clientId: plan.clientId,
                  planName: plan.planSerialNumber || `Plan ${plan.id}`,
                  planCode: plan.planCode || null,
                  isActive: plan.isActive === true,
                  availableFunds: typeof plan.availableFunds === 'string' ? 
                    parseFloat(plan.availableFunds) : plan.availableFunds || 0,
                  endDate: plan.endOfPlan,
                  startDate: plan.createdAt ? plan.createdAt.toString() : null,
                  totalUsed: 0,
                  itemCount: 0,
                  percentUsed: 0,
                }));
                
                setPlans(transformedPlans);
                
                if (transformedPlans.length > 0) {
                  const fetchBudgetItems = async () => {
                    try {
                      const response = await fetch(`/api/clients/${clientId}/budget-items`);
                      
                      if (!response.ok) {
                        throw new Error(`Error fetching budget items: ${response.status} ${response.statusText}`);
                      }
                      
                      let rawItems = await response.json();
                      
                      // Ensure items is an array
                      if (!Array.isArray(rawItems)) {
                        rawItems = rawItems ? [rawItems] : [];
                      }
                      
                      // Transform items to match BudgetItem interface
                      const items: BudgetItem[] = rawItems.map((item: any) => ({
                        ...item,
                        usedQuantity: item.usedQuantity ?? 0,  // Default to 0 if undefined
                        balanceQuantity: item.balanceQuantity ?? item.quantity ?? 0, // Default to quantity
                      }));
                      
                      // Calculate usage for each plan
                      // Group items by budget settings ID
                      const itemsByPlanId = items.reduce((acc: Record<number, BudgetItem[]>, item: BudgetItem) => {
                        const planId = item.budgetSettingsId;
                        if (!acc[planId]) {
                          acc[planId] = [];
                        }
                        acc[planId].push(item);
                        return acc;
                      }, {} as Record<number, BudgetItem[]>);
                      
                      // Calculate usage for each plan
                      const plansWithUsage = transformedPlans.map((plan: BudgetPlan) => {
                        const planItems = itemsByPlanId[plan.id] || [];
                        
                        // Calculate item count
                        const itemCount = planItems.length;
                        
                        // Calculate total used based on unit price * quantity
                        const totalUsed = planItems.reduce(
                          (sum: number, item: BudgetItem) => {
                            const unitPrice = typeof item.unitPrice === 'string' ? 
                              parseFloat(item.unitPrice) : item.unitPrice;
                            const quantity = typeof item.quantity === 'string' ? 
                              parseInt(String(item.quantity)) : item.quantity;
                            return sum + (unitPrice * quantity);
                          }, 0
                        );
                        
                        // Calculate percent used
                        const percentUsed = plan.availableFunds > 0
                          ? Math.min(Math.round((totalUsed / plan.availableFunds) * 100), 100)
                          : 0;
                        
                        return {
                          ...plan,
                          itemCount,
                          totalUsed,
                          percentUsed
                        };
                      });
                      
                      setPlans(plansWithUsage);
                    } catch (error) {
                      console.error("[DirectBudgetPlanList] Error fetching budget items:", error);
                    }
                  };
                  
                  fetchBudgetItems();
                }
              } catch (error) {
                console.error("[DirectBudgetPlanList] Error fetching budget plans:", error);
              }
            };
            
            fetchBudgetPlans();
          }}
        />
      )}
    </div>
  );
}

