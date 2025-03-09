import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Edit, Archive, Eye, Check } from 'lucide-react';
import type { BudgetSettings, BudgetItem } from '@shared/schema';

// Helper function to format currency 
const formatCurrency = (amount: number | string): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numericAmount.toFixed(2);
};

export interface BudgetPlanCard {
  id: number;
  planName: string;
  planCode?: string;
  planSerialNumber?: string;
  availableFunds: number;
  usedFunds: number;
  itemCount: number;
  percentUsed: number;
  endDate?: string;
  isActive: boolean;
}

interface BudgetCardProps {
  plan: BudgetPlanCard;
  onEdit?: (plan: BudgetPlanCard) => void;
  onView?: (plan: BudgetPlanCard) => void;
  onArchive?: (plan: BudgetPlanCard) => void;
  onSetActive?: (plan: BudgetPlanCard) => void;
}

export function BudgetPlanCard({ 
  plan, 
  onEdit, 
  onView, 
  onArchive,
  onSetActive
}: BudgetCardProps) {
  const remainingFunds = plan.availableFunds - plan.usedFunds;
  
  return (
    <Card className="overflow-hidden border-gray-200 hover:border-gray-300 transition-all">
      <CardHeader className={`p-4 ${plan.isActive ? "bg-blue-50 border-b border-blue-100" : "bg-gray-50 border-b border-gray-100"}`}>
        <div className="flex justify-between items-start">
          <div>
            {plan.isActive && (
              <Badge className="bg-blue-500 hover:bg-blue-600 mb-2">Active</Badge>
            )}
            <h3 className="text-lg font-medium">{plan.planName || "Unnamed Plan"}</h3>
            <div className="text-sm text-gray-500 mt-1">
              {plan.planSerialNumber && (
                <span className="mr-2">Serial: {plan.planSerialNumber}</span>
              )}
              {plan.planCode && (
                <span>Code: {plan.planCode}</span>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {onView && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => onView(plan)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            )}
            {onEdit && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                onClick={() => onEdit(plan)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {!plan.isActive && onSetActive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => onSetActive(plan)}
              >
                <Check className="h-4 w-4 mr-1" />
                Set Active
              </Button>
            )}
            {onArchive && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-500 hover:text-gray-600 hover:bg-gray-50"
                onClick={() => onArchive(plan)}
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-500">Total Budget</div>
            <div className="text-xl font-bold mt-1">
              ${formatCurrency(plan.availableFunds)}
            </div>
            <div className="text-xs text-gray-500">({plan.itemCount} items)</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500">Used in Sessions</div>
            <div className="text-xl font-bold mt-1">
              ${formatCurrency(plan.usedFunds)}
            </div>
            {plan.usedFunds === 0 && 
              <div className="text-xs text-gray-500">No sessions yet</div>
            }
          </div>
          
          <div>
            <div className="text-sm text-gray-500">Remaining Budget</div>
            <div className="text-xl font-bold mt-1">
              ${formatCurrency(remainingFunds)}
            </div>
            {remainingFunds < 0 ? (
              <div className="text-xs text-red-500">Over budget</div>
            ) : (
              <div className="text-xs text-green-500">Available for sessions</div>
            )}
          </div>
        </div>
        
        {/* Utilization Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Budget Utilization</span>
            <span>
              {plan.percentUsed.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={plan.percentUsed}
            className={`h-2 ${plan.percentUsed > 90 ? 'bg-red-200' : 'bg-blue-200'}`}
          />
        </div>
        
        {plan.endDate && (
          <div className="mt-4 text-sm text-gray-500">
            End date: {new Date(plan.endDate).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}