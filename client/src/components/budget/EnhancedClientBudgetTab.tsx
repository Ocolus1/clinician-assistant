import React, { useState, useEffect } from "react";
import { BudgetFeatureProvider, useBudgetFeature, BudgetPlan } from "./BudgetFeatureContext";
import { SimpleBudgetCardGrid } from "./SimpleBudgetCardGrid";
import { ContextAwareBudgetPlanFullView } from "./ContextAwareBudgetPlanFullView";
import { Button } from "../ui/button";
import { ChevronLeft } from "lucide-react";

interface EnhancedClientBudgetTabProps {
  clientId: number;
  budgetSettings?: any[] | any; // Can be array or single object
  budgetItems?: any[];
}

/**
 * Budget tab contents that use the BudgetFeatureContext
 * Simplified to show cards directly without tab navigation
 */
function BudgetTabContents({ clientId }: { clientId: number }) {
  const { budgetPlans, isLoading, error, selectedPlan } = useBudgetFeature();
  
  // Direct fetch for plans as a fallback
  const [directPlans, setDirectPlans] = useState<any[]>([]);
  const [isDirectFetching, setIsDirectFetching] = useState(false);
  
  // Debug log when budget plans change
  useEffect(() => {
    console.log("[BudgetTabContents] Budget plans updated:", 
      budgetPlans ? (Array.isArray(budgetPlans) ? budgetPlans.length : "non-array") : "null"
    );
    
    if (budgetPlans && Array.isArray(budgetPlans) && budgetPlans.length > 0) {
      console.log("[BudgetTabContents] First plan:", budgetPlans[0]);
    } else {
      // If we don't have budget plans from the context, do a direct fetch
      if (!isDirectFetching && (!budgetPlans || (Array.isArray(budgetPlans) && budgetPlans.length === 0))) {
        console.log("[BudgetTabContents] No budget plans from context, doing direct fetch");
        setIsDirectFetching(true);
        
        fetch(`/api/clients/${clientId}/budget-settings?all=true`)
          .then(response => response.json())
          .then(data => {
            if (data) {
              // Ensure we have an array
              const plansArray = Array.isArray(data) ? data : [data];
              console.log(`[BudgetTabContents] Direct fetch got ${plansArray.length} plans`);
              setDirectPlans(plansArray);
            }
          })
          .catch(error => {
            console.error("[BudgetTabContents] Direct fetch error:", error);
          })
          .finally(() => {
            setIsDirectFetching(false);
          });
      }
    }
  }, [budgetPlans, clientId, isDirectFetching]);
  
  // If both sources have no plans, show direct plans debugging info
  const showNoPlansDebug = 
    (!budgetPlans || (Array.isArray(budgetPlans) && budgetPlans.length === 0)) && 
    directPlans.length > 0;
  
  // If we have a selected plan, show its details instead of the grid
  if (selectedPlan) {
    // Get the clearSelectedPlan function from the context
    const { clearSelectedPlan } = useBudgetFeature();
    
    return (
      <div className="space-y-4">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4" 
            onClick={clearSelectedPlan}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Budget Plans
          </Button>
        </div>
        
        <ContextAwareBudgetPlanFullView />
      </div>
    );
  }
  
  // Use the direct plans if we have them but not in context
  const plansToUse = (budgetPlans && budgetPlans.length > 0) ? null : 
                     (directPlans.length > 0) ? directPlans : null;
  
  // If we have direct plans but they're not in context, create a provider with them
  if (plansToUse) {
    console.log(`[BudgetTabContents] Creating provider with ${plansToUse.length} direct plans`);
    
    // Format plans for the context to match the BudgetPlan interface
    const formattedPlans = plansToUse.map(plan => ({
      id: plan.id,
      clientId: plan.clientId,
      planSerialNumber: plan.planSerialNumber || null,
      planCode: plan.planCode || null,
      isActive: plan.isActive === true,
      ndisFunds: parseFloat(plan.ndisFunds) || 0,
      endOfPlan: plan.endOfPlan || null,
      createdAt: plan.createdAt || null,
      // UI display properties
      planName: plan.planSerialNumber || `Plan ${plan.id}`,
      totalUsed: 0,
      itemCount: 0,
      percentUsed: 0,
      startDate: plan.createdAt ? new Date(plan.createdAt).toISOString() : null,
      endDate: plan.endOfPlan ? new Date(plan.endOfPlan).toISOString() : null,
    }));
    
    return (
      <BudgetFeatureProvider clientId={clientId} initialBudgetPlans={formattedPlans}>
        <SimpleBudgetCardGrid clientId={clientId} />
      </BudgetFeatureProvider>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 text-red-500">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Failed to load budget plans</h3>
            <p className="text-sm text-red-700 mt-1">Please try again.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {/* Show the simplified budget card grid by default */}
      <SimpleBudgetCardGrid clientId={clientId} />
    </div>
  );
}

/**
 * The main budget tab component for the client profile
 * Provides tab navigation between budget plans and plan details views
 */
export function EnhancedClientBudgetTab({ clientId, budgetSettings, budgetItems }: EnhancedClientBudgetTabProps) {
  // Log the budget settings to diagnose issues
  console.log(`[EnhancedClientBudgetTab] Rendering for client ${clientId}`, { 
    budgetSettingsType: budgetSettings ? (Array.isArray(budgetSettings) ? `Array[${budgetSettings.length}]` : typeof budgetSettings) : 'undefined',
    budgetItemsCount: budgetItems?.length || 0 
  });
  
  // If budget settings is an array with content, log the first item
  if (budgetSettings && Array.isArray(budgetSettings) && budgetSettings.length > 0) {
    console.log(`[EnhancedClientBudgetTab] First budget setting:`, budgetSettings[0]);
  }
  
  // Debug info for array processing
  if (budgetSettings && !Array.isArray(budgetSettings)) {
    console.log("[EnhancedClientBudgetTab] Converting single budget setting to array");
  }
  
  // Ensure we have an array of budget settings
  const budgetSettingsArray = budgetSettings ? 
    (Array.isArray(budgetSettings) ? budgetSettings : [budgetSettings]) : 
    [];
    
  // Custom initial budget plans derived from the passed-in settings
  const initialBudgetPlans = budgetSettingsArray.map((setting: any) => {
    // Create a meaningful plan name if one is not provided
    const planName = setting.planSerialNumber || `Plan ${setting.id}`;
    
    return {
      id: setting.id,
      clientId: setting.clientId,
      planSerialNumber: setting.planSerialNumber || null,
      planCode: setting.planCode || null,
      isActive: setting.isActive === true, // Ensure boolean
      ndisFunds: parseFloat(setting.ndisFunds || setting.availableFunds) || 0,
      endOfPlan: setting.endOfPlan || null,
      createdAt: setting.createdAt || null,
      // UI display properties
      planName: planName,
      totalUsed: 0,
      itemCount: 0,
      percentUsed: 0,
      startDate: setting.createdAt ? new Date(setting.createdAt).toISOString() : null,
      endDate: setting.endOfPlan ? new Date(setting.endOfPlan).toISOString() : null,
    };
  });
  
  // Log the transformed budget plans
  console.log(`[EnhancedClientBudgetTab] Transformed ${initialBudgetPlans.length} settings into plans`);
  
  // Direct debugging: Let's bypass the provider for now and test if we can directly render plans
  if (initialBudgetPlans.length === 0) {
    // If we have no budget plans, directly fetch from API as fallback
    const [fetchedPlans, setFetchedPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
      const fetchDirectly = async () => {
        try {
          console.log(`[EnhancedClientBudgetTab] Directly fetching budget settings for client ${clientId}`);
          
          // Make a direct API call to get all budget settings
          const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
          
          if (response.ok) {
            let data = await response.json();
            
            // Ensure data is an array
            if (!Array.isArray(data)) {
              data = [data];
            }
            
            console.log(`[EnhancedClientBudgetTab] Directly fetched ${data.length} budget settings`);
            setFetchedPlans(data);
          } else {
            console.error(`[EnhancedClientBudgetTab] Error fetching budget settings: ${response.status}`);
          }
          
          setIsLoading(false);
        } catch (error) {
          console.error("[EnhancedClientBudgetTab] Error in direct fetch:", error);
          setIsLoading(false);
        }
      };
      
      fetchDirectly();
    }, [clientId]);
    
    if (isLoading) {
      return <div>Loading budget plans...</div>;
    }
    
    if (fetchedPlans.length > 0) {
      console.log(`[EnhancedClientBudgetTab] Using ${fetchedPlans.length} directly fetched plans`);
      
      // Create properly transformed plans from the fetched data
      const directPlans = fetchedPlans.map((setting: any) => ({
        id: setting.id,
        clientId: setting.clientId,
        planSerialNumber: setting.planSerialNumber || null,
        planCode: setting.planCode || null,
        isActive: setting.isActive === true,
        ndisFunds: parseFloat(setting.ndisFunds || setting.availableFunds) || 0,
        endOfPlan: setting.endOfPlan || null,
        createdAt: setting.createdAt || null,
        // UI display properties
        planName: setting.planSerialNumber || `Plan ${setting.id}`,
        totalUsed: 0,
        itemCount: 0,
        percentUsed: 0,
        startDate: setting.createdAt ? new Date(setting.createdAt).toISOString() : null,
        endDate: setting.endOfPlan ? new Date(setting.endOfPlan).toISOString() : null,
      }));
      
      // Our primary fix is to use these direct plans
      return (
        <BudgetFeatureProvider 
          clientId={clientId} 
          initialBudgetPlans={directPlans}
        >
          <BudgetTabContents clientId={clientId} />
        </BudgetFeatureProvider>
      );
    }
  }
  
  // Our primary fix is to ensure we properly wrap all budget-related components
  // in the BudgetFeatureProvider context which handles the data flow
  return (
    <BudgetFeatureProvider 
      clientId={clientId} 
      initialBudgetPlans={initialBudgetPlans}
    >
      <BudgetTabContents clientId={clientId} />
    </BudgetFeatureProvider>
  );
}