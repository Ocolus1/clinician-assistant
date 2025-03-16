import React, { useState } from "react";
import { BudgetFeatureProvider, useBudgetFeature } from "./BudgetFeatureContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { EnhancedBudgetPlansView } from "./EnhancedBudgetPlansView";
import { BudgetPlanDetails } from "./BudgetPlanDetailsIntegrated";

interface EnhancedClientBudgetTabProps {
  clientId: number;
  budgetSettings?: any[] | any; // Can be array or single object
  budgetItems?: any[];
}

/**
 * Budget tab contents that use the BudgetFeatureContext
 * Shows either the plan overview or plan details based on the selected plan
 */
function BudgetTabContents({ clientId }: { clientId: number }) {
  // Get budget state from context
  const { 
    budgetPlans, 
    isLoading, 
    error, 
    refreshData, 
    selectedPlanId, 
    viewPlanDetails, 
    returnToOverview 
  } = useBudgetFeature();
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Budget Plans</h2>
          <Button onClick={() => refreshData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load budget plans. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Determine the active tab based on whether a plan is selected
  const activeTab = selectedPlanId ? "details" : "plans";
  
  return (
    <Tabs value={activeTab} className="w-full" onValueChange={(value) => {
      // If switching to plans, clear the selected plan
      if (value === "plans") {
        returnToOverview();
      }
    }}>
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="plans" className="px-4">Plans Overview</TabsTrigger>
          <TabsTrigger value="details" className="px-4">Plan Details</TabsTrigger>
        </TabsList>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <TabsContent value="plans" className="mt-0">
            <EnhancedBudgetPlansView 
              clientId={clientId}
              onViewPlan={viewPlanDetails}
            />
          </TabsContent>
          
          <TabsContent value="details" className="mt-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Budget Plan Details</h2>
              <Button 
                onClick={returnToOverview} 
                variant="outline"
                size="sm"
              >
                Back to Plans Overview
              </Button>
            </div>
            
            <BudgetPlanDetails 
              clientId={clientId}
              planId={selectedPlanId || undefined}
            />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}

/**
 * The main budget tab component for the client profile
 * Provides tab navigation between budget plans and plan details views
 * with the improved UI based on the onboarding experience.
 */
export function EnhancedClientBudgetTab({ clientId, budgetSettings, budgetItems }: EnhancedClientBudgetTabProps) {
  // Ensure we have an array of budget settings
  const budgetSettingsArray = budgetSettings ? 
    (Array.isArray(budgetSettings) ? budgetSettings : [budgetSettings]) : 
    [];
    
  // Create initial budget plans from settings for the context
  const initialBudgetPlans = budgetSettingsArray.map((setting: any) => {
    return {
      id: setting.id,
      clientId: setting.clientId,
      planSerialNumber: setting.planSerialNumber,
      planCode: setting.planCode || null,
      isActive: setting.isActive === true, // Ensure boolean
      ndisFunds: typeof setting.ndisFunds === 'number' ? setting.ndisFunds : 
                 typeof setting.ndisFunds === 'string' ? parseFloat(setting.ndisFunds) : 
                 // Fallback to availableFunds for backward compatibility
                 (typeof setting.availableFunds === 'number' ? setting.availableFunds : 
                 typeof setting.availableFunds === 'string' ? parseFloat(setting.availableFunds) : 0),
      endOfPlan: setting.endOfPlan,
      createdAt: setting.createdAt,
      planName: setting.planCode || setting.planSerialNumber || `Plan ${setting.id}`,
      endDate: setting.endOfPlan,
      totalUsed: 0, // Will be calculated from budget items
      itemCount: budgetItems?.filter((item: any) => item.budgetSettingsId === setting.id).length || 0,
      percentUsed: 0, // Will be calculated from usage data
    };
  });
  
  // Initialize the BudgetFeatureProvider with the transformed data
  return (
    <BudgetFeatureProvider 
      clientId={clientId} 
      initialBudgetPlans={initialBudgetPlans}
      initialItems={budgetItems || []}
    >
      <BudgetTabContents clientId={clientId} />
    </BudgetFeatureProvider>
  );
}