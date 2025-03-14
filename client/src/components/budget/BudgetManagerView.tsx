import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, PlusCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { BudgetSettings, BudgetItem } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { BudgetPlanForm } from './BudgetPlanForm';

interface BudgetManagerViewProps {
  clientId: number;
}

/**
 * Original budget management view for backward compatibility
 * This is used as a fallback when the enhanced budget view is disabled
 */
export function BudgetManagerView({ clientId }: BudgetManagerViewProps) {
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  
  // Fetch budget settings
  const { 
    data: budgetSettings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    enabled: Boolean(clientId),
    queryFn: async () => {
      if (!clientId) return null;
      const response = await fetch(`/api/clients/${clientId}/budget-settings`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No settings found, but not an error
        }
        throw new Error(`Failed to fetch budget settings: ${response.statusText}`);
      }
      return response.json() as Promise<BudgetSettings>;
    }
  });
  
  // Fetch budget items
  const {
    data: budgetItems = [],
    isLoading: isLoadingItems,
    error: itemsError,
  } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    enabled: Boolean(clientId),
    queryFn: async () => {
      if (!clientId) return [];
      const response = await fetch(`/api/clients/${clientId}/budget-items`);
      if (!response.ok) {
        throw new Error(`Failed to fetch budget items: ${response.statusText}`);
      }
      return response.json() as Promise<BudgetItem[]>;
    }
  });
  
  // Calculate total budget and percentage used
  const totalBudget = budgetItems.reduce((acc, item) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
    const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
    return acc + (unitPrice * quantity);
  }, 0);
  
  // Calculate budget percentage - safely handle nullish values
  const availableFunds = budgetSettings?.availableFunds 
    ? (typeof budgetSettings.availableFunds === 'string' 
        ? parseFloat(budgetSettings.availableFunds) 
        : budgetSettings.availableFunds)
    : 0;
  
  const budgetPercentage = availableFunds > 0 ? (totalBudget / availableFunds) * 100 : 0;
  
  // Loading state
  const isLoading = isLoadingSettings || isLoadingItems;
  const error = settingsError || itemsError;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Loading budget information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>An error occurred while loading budget data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <p>{(error as Error).message || 'Unknown error occurred'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>
              {budgetSettings ? 'Current budget allocation and usage.' : 'No budget plan has been set up.'}
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreatePlanForm(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {budgetSettings ? 'Update Plan' : 'Create Plan'}
          </Button>
        </CardHeader>
        
        <CardContent>
          {budgetSettings ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Available Funds</p>
                  <p className="text-2xl font-bold">{formatCurrency(availableFunds || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Used</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Remaining</p>
                  <p className="text-2xl font-bold">{formatCurrency(availableFunds - totalBudget)}</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Budget Usage</span>
                  <span className="text-sm">{Math.min(100, Math.round(budgetPercentage))}%</span>
                </div>
                <Progress value={Math.min(100, budgetPercentage)} className="h-2" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Budget Plan Found</h3>
              <p className="text-gray-500 text-center max-w-md mb-6">
                You haven't set up a budget plan for this client yet. Create a plan to track available funds and usage.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {budgetItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Items</CardTitle>
            <CardDescription>Items and services allocated in this budget.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {budgetItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 rounded-md border">
                  <div>
                    <p className="font-medium">{item.itemName || 'Unnamed Item'}</p>
                    <p className="text-sm text-gray-500">{item.itemCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                    <p className="text-sm font-bold">{formatCurrency(item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <BudgetPlanForm
        open={showCreatePlanForm}
        onOpenChange={setShowCreatePlanForm}
        clientId={clientId}
      />
    </div>
  );
}