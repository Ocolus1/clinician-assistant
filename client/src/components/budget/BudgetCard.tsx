import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { BudgetSettings, BudgetItem } from '@shared/schema';
import { Eye, Archive, Star, Edit2, Play } from 'lucide-react';

interface BudgetPlanCardProps {
  settings: BudgetSettings;
  budgetItems: BudgetItem[];
  onEdit: () => void;
  onViewDetails: () => void;
  onArchive: () => void;
  onSetActive: () => void;
}

export type BudgetPlanCard = BudgetSettings;

export function BudgetPlanCard({
  settings,
  budgetItems,
  onEdit,
  onViewDetails,
  onArchive,
  onSetActive,
}: BudgetPlanCardProps) {
  // Calculate total used amount
  const totalUsed = budgetItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const percentUsed = (totalUsed / settings.availableFunds) * 100;
  
  const endDate = settings.endOfPlan ? new Date(settings.endOfPlan) : null;
  const formattedEndDate = endDate ? endDate.toLocaleDateString() : 'No end date';
  
  return (
    <Card className={`relative ${settings.isActive ? 'border-primary' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">
              {settings.planCode || 'Plan Code N/A'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {settings.planSerialNumber || 'Serial Number N/A'}
            </p>
          </div>
          <Badge variant={settings.isActive ? 'default' : 'secondary'}>
            {settings.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Available Funds</p>
            <p className="text-2xl font-bold">{formatCurrency(settings.availableFunds)}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium">Used Funds</p>
            <p className="text-lg">{formatCurrency(totalUsed)}</p>
            <p className="text-sm text-muted-foreground">
              {percentUsed.toFixed(1)}% utilized
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium">End Date</p>
            <p className="text-sm">{formattedEndDate}</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>
        
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4 mr-1" />
          Edit
        </Button>
        
        {settings.isActive ? (
          <Button variant="outline" size="sm" onClick={onArchive}>
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onSetActive}>
            <Play className="h-4 w-4 mr-1" />
            Activate
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}