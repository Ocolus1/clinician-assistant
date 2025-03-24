import React, { useState, useEffect } from "react";
import { BudgetFeatureProvider, useBudgetFeature, BudgetPlan } from "./BudgetFeatureContext";
import { EnhancedBudgetCardGrid } from "./EnhancedBudgetCardGrid";
import { BudgetPlanFullView } from "./BudgetPlanFullView";
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
    return (
      <div className="space-y-4">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4" 
            onClick={() => window.dispatchEvent(new CustomEvent('reset-selected-plan'))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Budget Plans
          </Button>
        </div>
        
        <BudgetPlanFullView />
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {/* Debug info when we have direct plans but no context plans */}
      {showNoPlansDebug && (
        <div className="mb-4 p-4 border border-yellow-400 bg-yellow-50 rounded-md">
          <div className="font-semibold mb-2">Debug Info: Context plans missing but plans found in database</div>
          <div className="text-sm">Found {directPlans.length} plans in database:</div>
          <ul className="text-xs mt-1 space-y-1">
            {directPlans.map((plan, idx) => (
              <li key={idx}>
                Plan {idx+1}: ID {plan.id} - {plan.planSerialNumber || 'Unnamed'} - 
                {plan.isActive ? ' (Active)' : ' (Inactive)'} -
                ${plan.availableFunds}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Show the budget card grid by default */}
      <EnhancedBudgetCardGrid clientId={clientId} />
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
        planName: setting.planSerialNumber || `Plan ${setting.id}`,
        planCode: setting.planCode || null,
        isActive: setting.isActive === true,
        availableFunds: parseFloat(setting.availableFunds) || 0,
        endDate: setting.endOfPlan,
        startDate: setting.createdAt,
        totalUsed: 0,
        itemCount: 0,
        percentUsed: 0,
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