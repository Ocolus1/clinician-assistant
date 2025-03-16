import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";
import { BudgetFeatureProvider } from "./BudgetFeatureContext";
import { BudgetPlansView } from "./BudgetPlansView";
import { EnhancedBudgetPlanDialog } from "./EnhancedBudgetPlanDialog";
import { BudgetItemsView } from "./BudgetItemsView";
import { BudgetAddItemDialog } from "./BudgetAddItemDialog";

interface UnifiedBudgetManagerProps {
  clientId: number;
}

export function UnifiedBudgetManager({ clientId }: UnifiedBudgetManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("plans");
  
  // State for budget plan dialog
  const [showBudgetPlanDialog, setShowBudgetPlanDialog] = useState(false);
  
  // State for budget item dialog
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedBudgetSettings, setSelectedBudgetSettings] = useState<BudgetSettings | null>(null);
  
  // Fetch all budget plans (settings)
  const { data: budgetPlans = [], isLoading: isLoadingBudgetPlans } = useQuery<BudgetSettings[]>({
    queryKey: ['/api/clients', clientId, 'budget/plans'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget/plans`);
      if (!response.ok) {
        throw new Error(`Failed to fetch budget plans: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // Fetch all budget items for this client
  const { data: budgetItems = [], isLoading: isLoadingBudgetItems } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget-items`);
      if (!response.ok) {
        throw new Error(`Failed to fetch budget items: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // Fetch the catalog items for reference
  const { data: catalogItems = [], isLoading: isLoadingCatalog } = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/budget-catalog');
      if (!response.ok) {
        throw new Error(`Failed to fetch budget catalog: ${response.status}`);
      }
      return response.json();
    },
  });
  
  // Add a new budget item mutation
  const addBudgetItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/budget-items`, data);
      return response;
    },
    onSuccess: () => {
      // Invalidate the budget items cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
      
      toast({
        title: "Budget item added",
        description: "The budget item has been added successfully.",
      });
      
      // Close the dialog
      setShowAddItemDialog(false);
    },
    onError: (error: any) => {
      console.error("Error adding budget item:", error);
      toast({
        title: "Error",
        description: "Failed to add budget item. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handler for adding a new budget item
  const handleAddItem = (data: any) => {
    if (!selectedBudgetSettings) {
      toast({
        title: "Error",
        description: "No budget plan selected. Please select a budget plan first.",
        variant: "destructive",
      });
      return;
    }
    
    // Add the client ID and budget settings ID to the data
    const itemData = {
      ...data,
      clientId,
      budgetSettingsId: selectedBudgetSettings.id,
    };
    
    // Submit the data
    addBudgetItemMutation.mutate(itemData);
  };
  
  // Handler for opening the add item dialog
  const handleOpenAddItemDialog = (budgetSettings: BudgetSettings) => {
    setSelectedBudgetSettings(budgetSettings);
    setShowAddItemDialog(true);
  };
  
  // Calculate if we have any plans at all
  const hasPlans = budgetPlans && budgetPlans.length > 0;
  
  // Calculate the total budget across all items
  const totalBudget = budgetItems.reduce((total, item) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
    const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
    return total + (unitPrice * quantity);
  }, 0);
  
  // Loading state
  const isLoading = isLoadingBudgetPlans || isLoadingBudgetItems || isLoadingCatalog;
  
  return (
    <BudgetFeatureProvider>
      <div className="space-y-6">
        <Tabs 
          defaultValue={activeTab} 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="plans">Budget Plans</TabsTrigger>
              <TabsTrigger value="items">Budget Items</TabsTrigger>
            </TabsList>
            
            <div>
              {activeTab === "plans" && (
                <Button
                  onClick={() => setShowBudgetPlanDialog(true)}
                  className="gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>New Plan</span>
                </Button>
              )}
            </div>
          </div>
          
          <TabsContent value="plans" className="space-y-4 mt-4">
            <BudgetPlansView 
              clientId={clientId}
              budgetPlans={budgetPlans}
              budgetItems={budgetItems}
              isLoading={isLoading}
              onAddItem={handleOpenAddItemDialog}
            />
          </TabsContent>
          
          <TabsContent value="items" className="space-y-4 mt-4">
            <BudgetItemsView 
              clientId={clientId} 
              budgetItems={budgetItems} 
              budgetPlans={budgetPlans}
              catalogItems={catalogItems}
              isLoading={isLoading}
              onAddItem={handleOpenAddItemDialog}
            />
          </TabsContent>
        </Tabs>
        
        {/* Add budget plan dialog */}
        <EnhancedBudgetPlanDialog
          open={showBudgetPlanDialog}
          onOpenChange={setShowBudgetPlanDialog}
          clientId={clientId}
        />
        
        {/* Add budget item dialog */}
        {selectedBudgetSettings && (
          <BudgetAddItemDialog
            open={showAddItemDialog}
            onOpenChange={setShowAddItemDialog}
            onSubmit={handleAddItem}
            catalogItems={catalogItems}
            budgetSettings={selectedBudgetSettings}
          />
        )}
      </div>
    </BudgetFeatureProvider>
  );
}