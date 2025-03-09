import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Edit, Archive, Star, DollarSign, PlusCircle, FileArchive } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { BudgetSettings, BudgetItem } from '@shared/schema';

// Interface for the unified budget plan with additional UI properties
export interface BudgetPlanCard {
  // Original BudgetSettings properties
  id: number;
  clientId: number;
  planSerialNumber: string | null;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endOfPlan: string | null;
  createdAt: Date | null;
  
  // Additional properties for UI display
  active: boolean;
  archived: boolean;
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
  
  // Mapped properties for consistent UI naming
  planName: string;
  fundingSource: string;
  startDate: string | null;
  endDate: string | null;
}

interface BudgetCardProps {
  plan: BudgetPlanCard;
  onEdit: (plan: BudgetPlanCard) => void;
  onViewDetails: (plan: BudgetPlanCard) => void;
  onArchive: (plan: BudgetPlanCard) => void;
  onSetActive: (plan: BudgetPlanCard) => void;
}

export function BudgetCard({ plan, onEdit, onViewDetails, onArchive, onSetActive }: BudgetCardProps) {
  // Determine plan status for UI display
  const getPlanStatus = () => {
    if (plan.percentUsed >= 100) {
      return { label: 'Depleted', color: 'bg-red-100 text-red-800 hover:bg-red-100' };
    } else if (plan.percentUsed >= 90) {
      return { label: 'Critical', color: 'bg-amber-100 text-amber-800 hover:bg-amber-100' };
    } else if (plan.percentUsed >= 70) {
      return { label: 'High Usage', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' };
    }
    
    return { label: 'Active', color: 'bg-green-100 text-green-800 hover:bg-green-100' };
  };

  const status = getPlanStatus();
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className={`${plan.active ? 'border-2 border-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              {plan.active && <Star className="h-4 w-4 text-amber-500 mr-1" />}
              {plan.planName || 'Unnamed Plan'}
            </CardTitle>
            <CardDescription>
              {plan.planSerialNumber ? (
                <>
                  {plan.planSerialNumber?.substr(-6) || ''} 
                  {(plan.startDate || plan.endDate) && ' • '}
                  {plan.startDate && formatDate(plan.startDate)}
                  {plan.startDate && plan.endDate && ' - '}
                  {plan.endDate && formatDate(plan.endDate)}
                </>
              ) : 'No plan details available'}
            </CardDescription>
          </div>
          <Badge className={status.color}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-500">Total Funds</div>
            <div className="text-xl font-bold mt-1">
              {formatCurrency(plan.availableFunds)}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500">Used</div>
            <div className="text-xl font-bold mt-1">
              {formatCurrency(plan.totalUsed)}
            </div>
            <div className="text-xs text-gray-500">({plan.itemCount} items)</div>
          </div>
        </div>
        
        {/* Budget Utilization Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Budget Utilization</span>
            <span>{Math.min(100, plan.percentUsed).toFixed(0)}%</span>
          </div>
          <Progress 
            value={Math.min(100, plan.percentUsed)}
            className="h-2"
          />
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex flex-wrap gap-2 justify-between">
        <Button size="sm" variant="outline" onClick={() => onViewDetails(plan)}>
          <DollarSign className="h-3.5 w-3.5 mr-1" />
          View Details
        </Button>
        
        <div className="flex gap-2">
          {!plan.active && !plan.archived && (
            <Button size="sm" variant="outline" onClick={() => onSetActive(plan)}>
              <Star className="h-3.5 w-3.5 mr-1" />
              Set Active
            </Button>
          )}
          {!plan.archived && (
            <Button size="sm" variant="outline" onClick={() => onArchive(plan)}>
              <FileArchive className="h-3.5 w-3.5 mr-1" />
              Archive
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}