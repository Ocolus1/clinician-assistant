import React, { useState, useEffect } from 'react';
import { PlusCircle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedBudgetCardGrid } from './EnhancedBudgetCardGrid';
import { BudgetPlanForm } from './BudgetPlanForm';
import { useBudgetFeature } from './BudgetFeatureContext';
import { formatCurrency } from '@/lib/utils';

interface BudgetPlanViewProps {
  clientId: number;
}

/**
 * Unified view for budget plans, displaying a list of plans and their details
 * This component precisely matches the original layout
 */
export function BudgetPlanView({ clientId }: BudgetPlanViewProps) {
  // Get budget feature context
  const { 
    plans, 
    selectedPlanId, 
    setSelectedPlanId, 
    formDialogOpen, 
    setFormDialogOpen,
    setClientId,
    loading,
    activePlan,
    budgetItems
  } = useBudgetFeature();
  
  // Local state
  const [currentView, setCurrentView] = useState<'all-plans' | 'plan-details'>('all-plans');
  const [activePlanTab, setActivePlanTab] = useState<'summary' | 'items' | 'settings'>('items');
  
  // Set client ID in context when component mounts or clientId changes
  useEffect(() => {
    setClientId(clientId);
  }, [clientId, setClientId]);
  
  // Handle selecting a budget plan
  const handlePlanSelect = (planId: number) => {
    setSelectedPlanId(planId);
    setCurrentView('plan-details');
  };
  
  // Handle returning to plans view
  const handleBackToPlans = () => {
    setCurrentView('all-plans');
  };
  
  // Open form dialog to create a new budget plan
  const handleCreatePlan = () => {
    setFormDialogOpen(true);
  };
  
  // Get the selected plan or default to active plan
  const currentPlan = selectedPlanId 
    ? plans.find(p => p.id === selectedPlanId) 
    : activePlan;
  
  // Function to render plan details
  const renderPlanDetails = () => {
    if (!currentPlan) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">
              Plan #{currentPlan.id}
            </h3>
            <p className="text-sm text-gray-500">
              PLAN {currentPlan.planSerialNumber || currentPlan.planCode}
            </p>
          </div>
          {currentPlan.isActive && (
            <span className="text-green-600 text-sm font-medium px-2 py-1 rounded-md">
              Active
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Available Funds</p>
            <p className="text-xl font-bold">{formatCurrency(currentPlan.availableFunds || 0)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Used</p>
            <p className="text-xl font-bold">{formatCurrency(currentPlan.totalUsed || 0)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Remaining</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency((currentPlan.availableFunds || 0) - (currentPlan.totalUsed || 0))}
            </p>
          </div>
        </div>
        
        <div className="bg-gray-100 rounded-lg">
          <div className="grid grid-cols-3 divide-x divide-gray-200">
            <button 
              className={`py-2 text-center text-sm font-medium ${activePlanTab === 'summary' ? 'bg-white rounded-tl-lg' : ''}`}
              onClick={() => setActivePlanTab('summary')}
            >
              Summary
            </button>
            <button 
              className={`py-2 text-center text-sm font-medium ${activePlanTab === 'items' ? 'bg-white' : ''}`}
              onClick={() => setActivePlanTab('items')}
            >
              Budget Items
            </button>
            <button 
              className={`py-2 text-center text-sm font-medium ${activePlanTab === 'settings' ? 'bg-white rounded-tr-lg' : ''}`}
              onClick={() => setActivePlanTab('settings')}
            >
              Plan Settings
            </button>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-md border mt-2">
          {activePlanTab === 'summary' && (
            <p className="text-gray-500">Plan summary and usage statistics will be shown here.</p>
          )}
          
          {activePlanTab === 'items' && (
            <div>
              {budgetItems && budgetItems.filter(item => currentPlan && item.budgetSettingsId === currentPlan.id).length > 0 ? (
                <div className="space-y-3">
                  {budgetItems
                    .filter(item => currentPlan && item.budgetSettingsId === currentPlan.id)
                    .map(item => (
                      <div key={item.id} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">{item.name || item.description || item.itemCode}</p>
                          <p className="text-sm text-gray-500">{item.itemCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                          <p className="text-sm font-semibold">{formatCurrency(item.unitPrice * item.quantity)}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <p className="text-gray-500">Budget items and services for this plan will be shown here.</p>
              )}
            </div>
          )}
          
          {activePlanTab === 'settings' && (
            <p className="text-gray-500">This section will allow editing plan settings and management options.</p>
          )}
        </div>
      </div>
    );
  };
  
  // Function to render all plans view
  const renderAllPlans = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleCreatePlan}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Budget Plan
          </Button>
        </div>
        
        <EnhancedBudgetCardGrid 
          plans={plans}
          loading={loading}
          onPlanSelected={handlePlanSelect}
        />
      </div>
    );
  };
  
  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Budget Management</h2>
        
        {currentView === 'plan-details' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToPlans}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span>Back to Plans</span>
          </Button>
        )}
      </div>
      
      <div className="bg-gray-100 rounded-lg">
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          <button 
            className={`py-2 text-center text-sm font-medium ${currentView === 'all-plans' ? 'bg-white rounded-l-lg' : ''}`}
            onClick={() => setCurrentView('all-plans')}
          >
            All Plans
          </button>
          <button 
            className={`py-2 text-center text-sm font-medium ${currentView === 'plan-details' ? 'bg-white rounded-r-lg' : ''}`}
            onClick={() => currentPlan && setCurrentView('plan-details')}
            disabled={!currentPlan}
          >
            Plan Details
          </button>
        </div>
      </div>
      
      <div className="mt-4">
        {currentView === 'all-plans' ? renderAllPlans() : renderPlanDetails()}
      </div>
      
      <BudgetPlanForm
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        clientId={clientId}
      />
    </div>
  );
}