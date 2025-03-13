import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBudgetFeature, BudgetItem } from './BudgetFeatureContext';
import { BudgetItemRow } from './BudgetItemRow';
import { BudgetValidation } from './BudgetValidation';
import { BudgetCatalogSelector } from './BudgetCatalogSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';

interface BudgetPlanDetailsProps {
  clientId: number;
}

/**
 * Component to display and manage budget plan details 
 * with integrated budget items management
 */
export function BudgetPlanDetails({ clientId }: BudgetPlanDetailsProps) {
  const { 
    setActivePlan, 
    activePlan,
    setBudgetItems,
    budgetItems,
    refreshData: contextRefreshData
  } = useBudgetFeature();

  // Get active budget plan
  const plansQuery = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-settings`],
    queryFn: async () => {
      // Use the correct API endpoint for budget settings
      const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget plans');
      }
      const data = await response.json();
      console.log("Fetched budget settings data:", data);
      // Handle both array and single object responses
      return Array.isArray(data) ? data : [data];
    }
  });

  // Get budget items for the active plan
  const itemsQuery = useQuery({
    queryKey: [`/api/clients/${clientId}/budget-items`, activePlan?.id],
    queryFn: async () => {
      if (!activePlan) {
        return [];
      }
      const response = await fetch(`/api/clients/${clientId}/budget-items?budgetSettingsId=${activePlan.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget items');
      }
      return response.json();
    },
    enabled: !!activePlan
  });

  // Set active plan from data (first active plan by default)
  useEffect(() => {
    if (plansQuery.data && plansQuery.data.length > 0 && !activePlan) {
      const activePlans = plansQuery.data.filter((plan: any) => plan.isActive);
      if (activePlans.length > 0) {
        setActivePlan(activePlans[0]);
      } else {
        setActivePlan(plansQuery.data[0]);
      }
    }
  }, [plansQuery.data, activePlan, setActivePlan]);

  // Set budget items from data
  useEffect(() => {
    if (itemsQuery.data) {
      setBudgetItems(itemsQuery.data);
    }
  }, [itemsQuery.data, setBudgetItems]);

  // Handle refresh data (reload queries)
  const refreshData = () => {
    itemsQuery.refetch();
    contextRefreshData(); // Call context refreshData as well
  };
  
  // Set refresh function in context
  useEffect(() => {
    // Update the context's refresh function to use our local one
    if (contextRefreshData) {
      contextRefreshData();
    }
  }, [activePlan, contextRefreshData]);

  // Loading state
  if (plansQuery.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Loading budget information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Error state
  if (plansQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Error loading budget data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              An error occurred while loading budget data. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No plans state
  if (plansQuery.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>No budget plans available</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              There are no budget plans created for this client. 
              Please create a new budget plan to manage budget items.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Sort items by category for better organization
  const sortedItems = [...budgetItems].sort((a, b) => {
    // Sort by category first
    if (a.category && b.category) {
      return a.category.localeCompare(b.category);
    }
    if (a.category) return -1;
    if (b.category) return 1;
    
    // Then by name/description
    const aName = a.name || a.description;
    const bName = b.name || b.description;
    return aName.localeCompare(bName);
  });

  // Group items by category
  const groupedItems: Record<string, BudgetItem[]> = {};
  sortedItems.forEach(item => {
    const category = item.category || 'Uncategorized';
    if (!groupedItems[category]) {
      groupedItems[category] = [];
    }
    groupedItems[category].push(item);
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Budget Plan: {activePlan?.planCode || 'Default Plan'}
        </CardTitle>
        <CardDescription>
          Available Funds: {formatCurrency(activePlan?.availableFunds || 0)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Budget Items</TabsTrigger>
            <TabsTrigger value="add">Add New Item</TabsTrigger>
          </TabsList>
          
          <TabsContent value="items" className="space-y-6">
            {/* Budget Validation */}
            <BudgetValidation />
            
            {/* Budget Items List */}
            {Object.keys(groupedItems).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No budget items added yet. Use the "Add New Item" tab to add items.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="font-medium text-lg">{category}</h3>
                    <div className="space-y-2">
                      {items.map(item => (
                        <BudgetItemRow 
                          key={item.id} 
                          item={item} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="add">
            <div className="space-y-4">
              <BudgetValidation />
              <Separator />
              <BudgetCatalogSelector />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}