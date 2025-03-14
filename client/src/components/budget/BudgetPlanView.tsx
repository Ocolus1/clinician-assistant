import React, { useState, useEffect } from 'react';
import { PlusCircle, ChevronLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EnhancedBudgetCardGrid } from './EnhancedBudgetCardGrid';
import { BudgetPlanForm } from './BudgetPlanForm';
import { useBudgetFeature } from './BudgetFeatureContext';
import { formatCurrency } from '@/lib/utils';

interface BudgetPlanViewProps {
  clientId: number;
}

/**
 * Unified view for budget plans, displaying a list of plans and their details
 * Preserves the original layout of the budget plan detail view
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
    activePlan
  } = useBudgetFeature();
  
  // Set up local state
  const [activeTab, setActiveTab] = useState('all');
  const [activePlanView, setActivePlanView] = useState('summary');
  
  // Set client ID in context when component mounts or clientId changes
  useEffect(() => {
    setClientId(clientId);
  }, [clientId, setClientId]);
  
  // Handle selecting a budget plan
  const handlePlanSelect = (planId: number) => {
    setSelectedPlanId(planId);
    setActiveTab('plan');
  };
  
  // Handle returning to plans view
  const handleBackToPlans = () => {
    setSelectedPlanId(null);
    setActiveTab('all');
  };
  
  // Open form dialog to create a new budget plan
  const handleCreatePlan = () => {
    setFormDialogOpen(true);
  };
  
  // Get the selected plan or default to active plan
  const currentPlan = selectedPlanId 
    ? plans.find(p => p.id === selectedPlanId) 
    : activePlan;
  
  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Budget Management</h2>
        
        {activeTab === 'plan' && (
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="all">All Plans</TabsTrigger>
          <TabsTrigger value="plan" disabled={!selectedPlanId}>Plan Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <div className="flex justify-end mb-4">
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
        </TabsContent>
        
        <TabsContent value="plan">
          {currentPlan && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">
                    Plan #{currentPlan.id}
                  </h3>
                  <p className="text-sm text-gray-500">
                    PLAN {currentPlan.planSerialNumber || currentPlan.planCode}
                  </p>
                </div>
                {currentPlan.active && (
                  <span className="text-green-600 text-sm font-medium">
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
              
              <Tabs value={activePlanView} onValueChange={setActivePlanView}>
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="items">Budget Items</TabsTrigger>
                  <TabsTrigger value="settings">Plan Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-gray-500">
                        Plan summary and usage statistics will be shown here.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="items" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-gray-500">
                        Budget items and services for this plan will be shown here.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="settings" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-gray-500">
                        This section will allow editing plan settings and management options.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <BudgetPlanForm
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        clientId={clientId}
      />
    </div>
  );
}