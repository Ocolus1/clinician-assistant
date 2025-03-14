import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Eye, Clock, CalendarClock, FileBarChart, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BudgetPlan } from './BudgetFeatureContext';

interface EnhancedBudgetCardGridProps {
  plans: BudgetPlan[];
  loading: boolean;
  onPlanSelected: (planId: number) => void;
}

/**
 * Grid display of budget plan cards with enhanced visual indicators
 */
export function EnhancedBudgetCardGrid({ 
  plans,
  loading,
  onPlanSelected
}: EnhancedBudgetCardGridProps) {

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading budget plans...</p>
      </div>
    );
  }

  // Show empty state
  if (!plans || plans.length === 0) {
    return (
      <Card className="col-span-full text-center p-8">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileBarChart className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium mb-2">No Budget Plans Yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create your first budget plan by clicking the "New Budget Plan" button above.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render grid of plan cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card key={plan.id} className={`
          overflow-hidden transition-all duration-200 hover:shadow-md
          ${plan.active ? 'border-green-200 bg-green-50/30' : ''}
        `}>
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium text-lg">{plan.planName}</h3>
                <p className="text-sm text-gray-500">
                  {plan.fundingSource || 'NDIS'}
                </p>
              </div>
              
              {plan.active && (
                <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Used: {plan.percentUsed}%</span>
                <span>{formatCurrency(plan.totalUsed || 0)} of {formatCurrency(plan.availableFunds || 0)}</span>
              </div>
              <Progress 
                value={plan.percentUsed} 
                max={100} 
                className={`h-2 ${plan.percentUsed > 90 ? 'bg-red-100' : 'bg-gray-100'}`}
              />
            </div>
            
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 block">Available:</span>
                  <span className="font-medium">{formatCurrency(plan.availableFunds || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Used:</span>
                  <span className="font-medium">{formatCurrency(plan.totalUsed || 0)}</span>
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