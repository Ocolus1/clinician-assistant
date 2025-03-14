import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, FileText, ShoppingCart, Settings, DollarSign } from 'lucide-react';
import { useBudgetFeature } from './BudgetFeatureContext';
import { formatCurrency } from '@/lib/utils';

interface UnifiedBudgetManagerProps {
  clientId: number;
}

/**
 * Unified view for managing all aspects of a specific budget plan
 */
export function UnifiedBudgetManager({ clientId }: UnifiedBudgetManagerProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const { plans, activePlan, selectedPlanId } = useBudgetFeature();
  
  // Find the selected plan or fallback to active plan
  const currentPlan = selectedPlanId 
    ? plans.find(p => p.id === selectedPlanId) 
    : activePlan;
  
  if (!currentPlan) {
    return (
      <Card className="col-span-full text-center p-8">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium mb-2">No Budget Plan Selected</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Please select a budget plan from the plans view or create a new one.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{currentPlan.planName}</CardTitle>
              <p className="text-sm text-gray-500">
                {currentPlan.planCode || currentPlan.planSerialNumber}
              </p>
            </div>
            <div className="flex gap-2">
              {currentPlan.active && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Available Funds</p>
              <p className="text-2xl font-bold">{formatCurrency(currentPlan.availableFunds || 0)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Used</p>
              <p className="text-2xl font-bold">{formatCurrency(currentPlan.totalUsed || 0)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Remaining</p>
              <p className="text-2xl font-bold">
                {formatCurrency((currentPlan.availableFunds || 0) - (currentPlan.totalUsed || 0))}
              </p>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="summary">
                <FileText className="h-4 w-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="items">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Budget Items
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Plan Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Budget Plan Summary</h3>
                    <p className="text-gray-500">
                      Details about plan funding, utilization, and expiration.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Plan Code</p>
                        <p>{currentPlan.planCode || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Serial Number</p>
                        <p>{currentPlan.planSerialNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Start Date</p>
                        <p>{currentPlan.startDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">End Date</p>
                        <p>{currentPlan.endDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Funding Source</p>
                        <p>{currentPlan.fundingSource || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Budget Status</p>
                        <p>{(currentPlan.percentUsed || 0) >= 100 ? 'Depleted' : 'Available'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="items" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Budget Items</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" /> 
                  Add Item
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-500">
                    This section will show a list of budget items associated with this plan.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <h3 className="text-lg font-medium">Plan Settings</h3>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-500">
                    This section will allow editing plan settings and management options.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}