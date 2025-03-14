import React, { useState, useEffect } from 'react';
import { PlusCircle, ChevronLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EnhancedBudgetCardGrid } from './EnhancedBudgetCardGrid';
import { BudgetPlanForm } from './BudgetPlanForm';
import { UnifiedBudgetManager } from './UnifiedBudgetManager';
import { useBudgetFeature } from './BudgetFeatureContext';

interface BudgetPlanViewProps {
  clientId: number;
}

/**
 * Unified view for budget plans, displaying a list of plans and their details
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
    loading
  } = useBudgetFeature();
  
  // Set up local state
  const [activeTab, setActiveTab] = useState('plans');
  
  // Set client ID in context when component mounts or clientId changes
  useEffect(() => {
    setClientId(clientId);
  }, [clientId, setClientId]);
  
  // Handle selecting a budget plan
  const handlePlanSelect = (planId: number) => {
    setSelectedPlanId(planId);
    setActiveTab('details');
  };
  
  // Handle returning to plans view
  const handleBackToPlans = () => {
    setSelectedPlanId(null);
    setActiveTab('plans');
  };
  
  // Open form dialog to create a new budget plan
  const handleCreatePlan = () => {
    setFormDialogOpen(true);
  };
  
  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Budget Management</h2>
        
        {activeTab === 'plans' && (
          <Button onClick={handleCreatePlan}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Budget Plan
          </Button>
        )}
        
        {activeTab === 'details' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToPlans}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Plans
          </Button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="plans">All Plans</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedPlanId}>Plan Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="plans" className="space-y-4">
          <EnhancedBudgetCardGrid 
            plans={plans} 
            loading={loading}
            onPlanSelected={handlePlanSelect}
          />
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <UnifiedBudgetManager clientId={clientId} />
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