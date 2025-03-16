import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, Trash2, RefreshCw, PlusCircle } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";

interface BudgetItemsViewProps {
  clientId: number;
  budgetItems: BudgetItem[];
  budgetPlans: BudgetSettings[];
  catalogItems: BudgetItemCatalog[];
  isLoading: boolean;
  onAddItem: (plan: BudgetSettings) => void;
}

export function BudgetItemsView({
  clientId,
  budgetItems,
  budgetPlans,
  catalogItems,
  isLoading,
  onAddItem
}: BudgetItemsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filtering by plan
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  
  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
    toast({
      title: "Refreshed",
      description: "Budget items data has been refreshed."
    });
  };
  
  // Get filtered items
  const filteredItems = selectedPlanId 
    ? budgetItems.filter(item => item.budgetSettingsId === selectedPlanId)
    : budgetItems;
  
  // Get plan name by ID
  const getPlanName = (planId: number) => {
    const plan = budgetPlans.find(p => p.id === planId);
    return plan?.planCode || 'Unknown Plan';
  };
  
  // Get catalog item details
  const getCatalogItemDetails = (itemCode: string) => {
    return catalogItems.find(item => item.itemCode === itemCode);
  };
  
  // Loading state UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    );
  }
  
  // Empty state UI
  if (!budgetItems.length) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">No Budget Items</h3>
          <p className="text-muted-foreground">
            This client doesn't have any budget items yet.
            {budgetPlans.length > 0 && (
              <>
                <br />
                Select a plan to add budget items.
              </>
            )}
          </p>
          
          {budgetPlans.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              You need to create a budget plan first.
            </p>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Budget Items</h3>
          <p className="text-muted-foreground">
            View and manage budget allocations across plans.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {budgetPlans.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedPlanId === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPlanId(null)}
          >
            All Plans
          </Button>
          
          {budgetPlans.map((plan) => (
            <Button
              key={plan.id}
              variant={selectedPlanId === plan.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlanId(plan.id)}
            >
              {plan.planCode || `Plan #${plan.id}`}
            </Button>
          ))}
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Budget Plan</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              // Get catalog item details if available
              const catalogItem = getCatalogItemDetails(item.itemCode);
              
              // Calculate total
              const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
              const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
              const total = unitPrice * quantity;
              
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.itemCode}</TableCell>
                  <TableCell>{item.description || catalogItem?.description || 'No description'}</TableCell>
                  <TableCell>{getPlanName(item.budgetSettingsId)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(unitPrice)}</TableCell>
                  <TableCell className="text-right">{quantity}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {budgetPlans.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => onAddItem(budgetPlans[0])}
            className="gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Budget Item</span>
          </Button>
        </div>
      )}
    </div>
  );
}