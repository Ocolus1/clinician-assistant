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
      <p className="text-xs text-amber-700 mb-2">
        These tools are only visible in development mode. Use "Force Mock Products" to add test products 
        when no active budget plan is available. This helps test the product selection feature.
      </p>
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
        
        {/* Always show the mock products button when in development mode */}
        {clientId && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 py-0 text-xs font-bold"
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
                  productDescription: "Speech Therapy Session",
                  name: "Speech Therapy Session" // Required by the component
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
                  productDescription: "Assessment Session",
                  name: "Assessment Session" // Required by the component
                }
              ];
              
              // First update the global debug override
              (window as any).__debugAvailableProducts = mockProducts;
              
              // Then update the component state
              setAvailableProducts(mockProducts);
              
              toast({
                title: "Debug Tools Active",
                description: "Mock products are now available! Click Add Product to see them.",
              });
              
              // Force a timeout to let React rerender first
              setTimeout(() => {
                // Make sure the refresh event propagates through React
                // Using CustomEvent to allow passing data
                window.dispatchEvent(new CustomEvent('force-products-update', {
                  detail: { products: mockProducts }
                }));
              }, 100);
              
              // Show confirmation
              toast({
                title: "Mock Products Added",
                description: `Added 2 mock products for testing. Click "Add Product" to use them.`,
              });
            }}
          >
            🚨 Force Mock Products 🚨
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