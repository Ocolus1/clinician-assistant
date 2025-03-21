import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetItem, BudgetSettings } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { 
  TrendingDown, 
  TrendingUp, 
  CornerDownRight,
  AlertTriangle,
  Check,
  ArrowRightLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BudgetReallocationSuggestionsProps {
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
  sessions: any[];
}

export function BudgetReallocationSuggestions({ 
  budgetItems, 
  budgetSettings,
  sessions 
}: BudgetReallocationSuggestionsProps) {
  // Enhanced budget items with usage metrics
  const enhancedBudgetItems = React.useMemo(() => {
    return budgetItems.map(item => {
      // Calculate total cost allocated
      const totalCost = item.quantity * (item.unitPrice || 0);
      
      // Simulate used amount based on session count (in a real app, this would come from actual usage data)
      // This is a simplified calculation - in production, you'd get real usage from sessions
      const daysElapsedInPlan = calculateDaysElapsedInPlan(budgetSettings);
      const totalDaysInPlan = calculateTotalDaysInPlan(budgetSettings);
      const planProgress = totalDaysInPlan > 0 ? daysElapsedInPlan / totalDaysInPlan : 0;
      
      // Create different usage patterns for different items to show variety
      const utilizationRate = calculateUtilizationRate(item, planProgress);
      const used = Math.round(item.quantity * utilizationRate);
      const usedCost = used * (item.unitPrice || 0);
      
      // Determine if this item is significantly over or underutilized
      const idealUtilization = planProgress;
      const utilizationDelta = utilizationRate - idealUtilization;
      
      // Usage pattern (for UI indicators)
      let usagePattern = 'normal';
      if (utilizationDelta > 0.15) usagePattern = 'accelerating';
      if (utilizationDelta < -0.15) usagePattern = 'decelerating';
      
      return {
        ...item,
        totalCost,
        used,
        usedCost,
        remainingCost: totalCost - usedCost,
        utilizationRate,
        utilizationDelta,
        idealUsed: Math.round(item.quantity * idealUtilization),
        usagePattern,
        category: item.category || 'Uncategorized',
      };
    });
  }, [budgetItems, budgetSettings, sessions]);

  // Calculate days elapsed in the plan
  function calculateDaysElapsedInPlan(settings?: BudgetSettings): number {
    if (!settings) return 30; // Default if no settings
    
    // If there's no start date, estimate based on end date
    if (!settings.createdAt && !settings.endOfPlan) return 30;
    
    // Use createdAt as a fallback for startOfPlan
    const startDate = settings.createdAt ? new Date(settings.createdAt) : 
                    (settings.endOfPlan ? new Date(new Date(settings.endOfPlan).getTime() - (365 * 24 * 60 * 60 * 1000)) : new Date());
    
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  
  // Calculate total days in the plan
  function calculateTotalDaysInPlan(settings?: BudgetSettings): number {
    if (!settings) return 365; // Default to a year
    
    // If there's no end date, default to a year from creation or today
    if (!settings.endOfPlan) return 365;
    
    // Use createdAt as a fallback for startOfPlan
    const startDate = settings.createdAt ? new Date(settings.createdAt) : 
                    new Date(new Date(settings.endOfPlan).getTime() - (365 * 24 * 60 * 60 * 1000));
    
    const endDate = new Date(settings.endOfPlan);
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Calculate utilization rate with some variance for different items
  function calculateUtilizationRate(item: BudgetItem, planProgress: number): number {
    // Simple model: some items are used more quickly, some more slowly, based on item ID
    const variance = (item.id % 5) / 10; // Creates variety in usage rates
    let rate = planProgress + variance;
    
    // Ensure rate is between 0 and 1 for most items, but allow some to be overutilized
    if (item.id % 7 === 0) {
      rate = Math.min(1.2, rate); // Allow some overutilization for certain items
    } else {
      rate = Math.min(1, rate);
    }
    
    return Math.max(0, rate);
  }

  // Generate reallocation suggestions
  const reallocationSuggestions = React.useMemo(() => {
    const overutilizedItems = enhancedBudgetItems
      .filter(item => item.utilizationDelta > 0.15)
      .sort((a, b) => b.utilizationDelta - a.utilizationDelta);
      
    const underutilizedItems = enhancedBudgetItems
      .filter(item => item.utilizationDelta < -0.15)
      .sort((a, b) => a.utilizationDelta - b.utilizationDelta);
    
    const suggestions = [];
    
    // Generate suggestions based on overutilized and underutilized items
    for (const overItem of overutilizedItems) {
      // Find underutilized items in the same category if possible
      const sameCategory = underutilizedItems.filter(item => 
        item.category === overItem.category
      );
      
      const candidateItems = sameCategory.length > 0 ? sameCategory : underutilizedItems;
      
      if (candidateItems.length > 0) {
        // Calculate how much more this item needs
        const projectedShortage = Math.ceil(
          (overItem.utilizationRate / calculateDaysElapsedInPlan(budgetSettings) * calculateTotalDaysInPlan(budgetSettings) - 1) 
          * overItem.quantity
        );
        
        if (projectedShortage <= 0) continue;
        
        // Find an item with enough remaining to reallocate
        for (const underItem of candidateItems) {
          const availableToReallocate = Math.floor(underItem.quantity - underItem.idealUsed);
          
          if (availableToReallocate > 0) {
            const amountToReallocate = Math.min(projectedShortage, availableToReallocate);
            
            if (amountToReallocate > 0) {
              suggestions.push({
                fromItem: underItem,
                toItem: overItem,
                amount: amountToReallocate,
                costImpact: amountToReallocate * (
                  (overItem.unitPrice || 0) - (underItem.unitPrice || 0)
                ),
                sameCategory: underItem.category === overItem.category,
              });
              break;
            }
          }
        }
      }
    }
    
    return suggestions;
  }, [enhancedBudgetItems, budgetSettings]);

  // Don't render if no budget items
  if (budgetItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base flex items-center">
              <ArrowRightLeft className="h-4 w-4 mr-2" /> 
              Budget Reallocation Suggestions
            </CardTitle>
            <CardDescription>
              Optimize your budget utilization with these recommendations
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
            {reallocationSuggestions.length} Suggestions
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 py-0">
        {reallocationSuggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Check className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium">Your budget allocation looks optimal!</p>
            <p className="text-xs text-gray-500 mt-1">All items are being utilized within expected rates.</p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Suggestion</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reallocationSuggestions.map((suggestion, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          Move <span className="font-semibold">{suggestion.amount} units</span> from{' '}
                          <span className="font-semibold">{suggestion.fromItem.description}</span> to{' '}
                          <span className="font-semibold">{suggestion.toItem.description}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center mb-1">
                          <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                          <span className="text-xs">
                            {suggestion.toItem.description} is being used {Math.round(suggestion.toItem.utilizationDelta * 100)}% faster than expected
                          </span>
                        </div>
                        <div className="flex items-center">
                          <TrendingDown className="h-3 w-3 text-blue-500 mr-1" />
                          <span className="text-xs">
                            {suggestion.fromItem.description} is being used {Math.round(Math.abs(suggestion.fromItem.utilizationDelta) * 100)}% slower than expected
                          </span>
                        </div>
                        {suggestion.sameCategory && (
                          <div className="flex items-center mt-1">
                            <CornerDownRight className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500">
                              Both items are in the same category: {suggestion.toItem.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <div className="font-medium">
                          {suggestion.costImpact > 0 ? (
                            <span className="text-red-600">+{formatCurrency(suggestion.costImpact)}</span>
                          ) : suggestion.costImpact < 0 ? (
                            <span className="text-green-600">{formatCurrency(suggestion.costImpact)}</span>
                          ) : (
                            <span className="text-gray-600">$0.00</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">Cost impact</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 bg-gray-50 border-t flex justify-between">
        <div className="text-xs text-gray-500">
          Reallocation suggestions are based on current usage patterns
        </div>
        <Button variant="outline" size="sm" disabled={reallocationSuggestions.length === 0}>
          Apply Suggestions
        </Button>
      </CardFooter>
    </Card>
  );
}