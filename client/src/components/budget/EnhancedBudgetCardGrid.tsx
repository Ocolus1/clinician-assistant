import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CalendarClock, Check, Clock, DollarSign, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BudgetPlan } from './BudgetFeatureContext';

interface EnhancedBudgetCardGridProps {
  clientId: number;
  onPlanSelected: (planId: number) => void;
}

/**
 * Grid display of budget plans with enhanced visual information
 */
export function EnhancedBudgetCardGrid({ clientId, onPlanSelected }: EnhancedBudgetCardGridProps) {
  // Fetch all budget plans for this client
  const { data: budgetPlans = [], isLoading } = useQuery<BudgetPlan[]>({
    queryKey: ['/api/clients', clientId, 'budget/plans'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/budget/plans`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget plans');
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="bg-gray-100 h-24" />
            <CardContent className="py-6">
              <div className="h-4 bg-gray-200 rounded mb-3" />
              <div className="h-4 bg-gray-200 w-3/4 rounded mb-3" />
              <div className="h-4 bg-gray-200 w-1/2 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // If no budget plans exist yet
  if (budgetPlans.length === 0) {
    return (
      <Card className="col-span-full text-center p-8">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium mb-2">No Budget Plans Yet</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Get started by creating your first budget plan. This will help track available funds and expenses.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort plans so active plans appear first, then by creation date (newest first)
  const sortedPlans = [...budgetPlans].sort((a, b) => {
    // First sort by active status
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    
    // Then sort by created date (newest first)
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sortedPlans.map((plan) => (
        <Card 
          key={plan.id} 
          className={`
            overflow-hidden transition-all
            ${plan.active ? 'border-green-500 border-2' : 'border'}
            ${plan.archived ? 'opacity-70' : 'opacity-100'}
            hover:shadow-md
          `}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{plan.planName || `Plan #${plan.id}`}</CardTitle>
                <p className="text-sm text-gray-500">
                  {plan.planCode || plan.planSerialNumber || 'No plan identifier'}
                </p>
              </div>
              <div className="flex gap-2">
                {plan.active && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>}
                {plan.archived && <Badge variant="outline" className="bg-gray-100 text-gray-500">Archived</Badge>}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pb-2">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Budget Utilization</span>
                  <span className="text-sm font-medium">{plan.percentUsed.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={plan.percentUsed} 
                  className={`h-2 ${plan.percentUsed > 90 ? 'bg-red-100' : 'bg-blue-100'}`}
                  indicatorClassName={plan.percentUsed > 90 ? 'bg-red-500' : undefined}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 block">Available:</span>
                  <span className="font-medium">{formatCurrency(plan.availableFunds)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Used:</span>
                  <span className="font-medium">{formatCurrency(plan.totalUsed)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500">Start: </span>
                  <span>{plan.startDate || 'N/A'}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <CalendarClock className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500">End: </span>
                  <span>{plan.endDate || 'N/A'}</span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="pt-4 flex justify-between">
            <div className="text-sm text-gray-500">
              Items: {plan.itemCount}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-1"
              onClick={() => onPlanSelected(plan.id)}
            >
              <Eye className="h-3.5 w-3.5" />
              View Details
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}