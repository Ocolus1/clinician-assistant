import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  AlertCircle, 
  DollarSign, 
  PlusCircle, 
  CalendarRange,
  Check,
  Clock,
  ExternalLink,
  Filter,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BudgetSettings, BudgetItem } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BudgetItemForm } from "@/components/budget/BudgetItemForm";

interface DirectBudgetPlanProps {
  clientId: number;
}

// Enhanced types for UI representation
interface BudgetPlan {
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

// Budget Item with usage tracking
interface EnhancedBudgetItem extends Omit<BudgetItem, 'name' | 'category'> {
  usedQuantity?: number;
  balanceQuantity?: number;
  name?: string | null;
  category?: string | null;
}

/**
 * A component that directly fetches and displays budget plans
 * Provides a clean, consistent interface for budget management
 */
export function DirectBudgetPlanList({ clientId }: DirectBudgetPlanProps) {
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
        
        let items: BudgetItem[] = await response.json();
        
        // Ensure items is an array
        if (!Array.isArray(items)) {
          items = items ? [items] : [];
        }
        
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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3">Loading budget plans...</span>
      </div>
    );
  }
  
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
  
  const [activePlan, setActivePlan] = useState<BudgetPlan | null>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showPlanDetailsView, setShowPlanDetailsView] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  
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
  
  return (
    <div className="space-y-6">
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
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Budget Plan
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan: BudgetPlan) => (
          <BudgetPlanCard 
            key={plan.id} 
            plan={plan} 
            onViewDetails={() => handleViewDetails(plan)}
            onAddItem={() => handleAddItem(plan)}
          />
        ))}
      </div>
      
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
                      
                      let items: BudgetItem[] = await response.json();
                      
                      // Ensure items is an array
                      if (!Array.isArray(items)) {
                        items = items ? [items] : [];
                      }
                      
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

// Define a plan type to avoid type errors
interface BudgetPlan {
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

// Budget Plan Card component
interface BudgetPlanCardProps {
  plan: BudgetPlan;
  onViewDetails: () => void;
  onAddItem: () => void;
}

function BudgetPlanCard({ plan, onViewDetails, onAddItem }: BudgetPlanCardProps) {
  const today = new Date();
  const isExpired = plan.endDate ? new Date(plan.endDate) < today : false;
  const isExpiringSoon = plan.endDate && !isExpired ? 
    new Date(plan.endDate) < new Date(today.setDate(today.getDate() + 30)) : 
    false;
  const isLowFunds = plan.percentUsed > 80;
  
  // Calculate display values
  const balanceAmount = plan.availableFunds - plan.totalUsed;
  const formattedBalance = formatCurrency(balanceAmount);
  const formattedTotal = formatCurrency(plan.availableFunds);
  const progressColor = 
    plan.percentUsed >= 90 ? "bg-red-500" :
    plan.percentUsed >= 75 ? "bg-amber-500" :
    "bg-emerald-500";
  
  // Format dates if available
  const formattedStartDate = plan.startDate ? format(new Date(plan.startDate), "MMM d, yyyy") : null;
  const formattedEndDate = plan.endDate ? format(new Date(plan.endDate), "MMM d, yyyy") : null;
  
  return (
    <Card className={`overflow-hidden transition-all duration-200 ${
      plan.isActive ? "border-primary/70 shadow-md" : ""
    } ${isExpired ? "opacity-75 border-gray-200" : ""}`}>
      <CardHeader className={`pb-2 ${plan.isActive ? "bg-primary/5" : ""}`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg line-clamp-1">{plan.planName}</CardTitle>
            <CardDescription>{plan.planCode}</CardDescription>
          </div>
          
          {plan.isActive && (
            <Badge variant="outline" className="border-primary text-primary flex items-center gap-1">
              <Check className="h-3 w-3" />
              Active
            </Badge>
          )}
          
          {isExpired && (
            <Badge variant="outline" className="border-red-500 text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Expired
            </Badge>
          )}
          
          {!plan.isActive && !isExpired && (
            <Badge variant="outline" className="border-gray-500 text-gray-600">
              Inactive
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 pb-2">
        <div className="space-y-4">
          {/* Budget Progress */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <div className="text-sm font-medium">Budget Usage</div>
              <div className="text-sm text-muted-foreground">
                {plan.percentUsed}%
              </div>
            </div>
            <Progress value={plan.percentUsed} className="h-2" indicatorClassName={progressColor} />
            <div className="flex justify-between mt-1.5 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formattedBalance}</span>
              </div>
              <span className="text-muted-foreground">of {formattedTotal}</span>
            </div>
          </div>
          
          {/* Warning Indicators */}
          {(isExpiringSoon || isLowFunds) && (
            <div className={`rounded-md p-2 text-sm flex items-start gap-2 ${
              isExpiringSoon ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"
            }`}>
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                {isExpiringSoon && !isExpired && (
                  <span>Expires soon: {formattedEndDate}</span>
                )}
                {isLowFunds && (
                  <span>{isExpiringSoon && !isExpired ? "• " : ""}
                    {plan.percentUsed >= 90 ? "Critical" : "Low"} funds available
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Plan Details */}
          <div className="grid grid-cols-2 gap-2 text-sm py-1">
            <div className="flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{plan.itemCount} items</span>
            </div>
            {formattedStartDate && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">Created {formattedStartDate}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex flex-col gap-2">
        <Button 
          variant="default" 
          className="w-full"
          onClick={onViewDetails}
        >
          View Details
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onAddItem}
        >
          Add Products
          <PlusCircle className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}