import React from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { BudgetItem } from "@shared/schema";

interface ProductDebugHelperProps {
  clientId: number | null;
  allBudgetItems: BudgetItem[];
  budgetSettings: any;
  availableProducts: any[];
  setAvailableProducts: (products: any[]) => void;
  refetchBudgetItems?: () => void;
  refetchBudgetSettings?: () => void;
}

/**
 * Debug helper component that only shows in development mode
 * Provides utilities to help debug product-related issues
 */
export function ProductDebugHelper({
  clientId,
  allBudgetItems,
  budgetSettings,
  availableProducts,
  setAvailableProducts,
  refetchBudgetItems,
  refetchBudgetSettings
}: ProductDebugHelperProps) {
  // Only show in development mode
  if (!import.meta.env.DEV) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-4">
      <h3 className="text-amber-800 font-medium text-sm mb-2">Development Tools</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 py-0 border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
          onClick={() => {
            console.log('Debug state:', {
              clientId,
              budgetSettings,
              budgetItems: allBudgetItems,
              availableProducts,
              isActive: budgetSettings?.isActive,
              isActiveType: budgetSettings?.isActive ? typeof budgetSettings.isActive : 'N/A'
            });
            
            if (refetchBudgetItems && refetchBudgetSettings) {
              console.log('Manually refetching budget data');
              refetchBudgetItems();
              refetchBudgetSettings();
            }
            
            toast({
              title: "Debug Information",
              description: `Client: ${clientId || 'none'}, Products: ${availableProducts.length}, Items: ${allBudgetItems.length}`,
              variant: "default"
            });
          }}
        >
          Show Debug Info
        </Button>
        
        {availableProducts.length === 0 && clientId && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 py-0 text-xs"
            onClick={() => {
              toast({
                title: "DEV MODE",
                description: "Override is active - using dummy product list",
              });
              
              // Force setting a mock product list for testing
              const mockProducts = [
                {
                  id: 999,
                  budgetSettingsId: 16,
                  clientId: clientId,
                  itemCode: "THERAPY-001",
                  description: "Speech Therapy Session",
                  quantity: 10,
                  unitPrice: 150,
                  availableQuantity: 10,
                  productCode: "THERAPY-001",
                  productDescription: "Speech Therapy Session"
                },
                {
                  id: 998,
                  budgetSettingsId: 16,
                  clientId: clientId,
                  itemCode: "ASSESS-001",
                  description: "Assessment Session",
                  quantity: 5,
                  unitPrice: 200,
                  availableQuantity: 5,
                  productCode: "ASSESS-001",
                  productDescription: "Assessment Session"
                }
              ];
              setAvailableProducts(mockProducts);
            }}
          >
            Force Mock Products
          </Button>
        )}
        
        {budgetSettings && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 py-0 text-xs border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
            onClick={() => {
              const isActive = typeof budgetSettings.isActive === 'boolean'
                ? budgetSettings.isActive
                : typeof budgetSettings.isActive === 'string'
                  ? budgetSettings.isActive.toLowerCase() !== 'false'
                  : true;
                  
              toast({
                title: "Budget Settings",
                description: `ID: ${budgetSettings.id}, Active: ${isActive}, Type: ${typeof budgetSettings.isActive}`,
              });
            }}
          >
            Check Budget Settings
          </Button>
        )}
      </div>
    </div>
  );
}