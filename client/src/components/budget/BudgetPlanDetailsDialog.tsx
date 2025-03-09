import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from '@shared/schema';

interface BudgetPlanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BudgetSettings;
  budgetItems: BudgetItem[];
  catalogItems?: BudgetItemCatalog[];
}

export function BudgetPlanDetailsDialog({
  open,
  onOpenChange,
  settings,
  budgetItems,
  catalogItems = []
}: BudgetPlanDetailsDialogProps) {
  // Calculate total budget amount
  const totalBudget = budgetItems.reduce((acc, item) => {
    return acc + (item.quantity * item.unitPrice);
  }, 0);

  // Get formatted end date
  const endDate = settings.endOfPlan ? new Date(settings.endOfPlan) : null;
  const formattedEndDate = endDate ? endDate.toLocaleDateString() : 'No end date';

  // Get catalog descriptions for budget items (if available)
  const getItemDescription = (item: BudgetItem) => {
    if (item.description) return item.description;
    
    const catalogItem = catalogItems.find(catalog => catalog.itemCode === item.itemCode);
    return catalogItem?.description || 'No description available';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {settings.planCode ? settings.planCode : 'Budget Plan Details'}
          </DialogTitle>
          <DialogDescription>
            Detailed view of budget plan and associated items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-4">
          {/* Plan Overview Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Plan Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
                <p className="text-base">{settings.planSerialNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-base">{settings.isActive ? 'Active' : 'Inactive'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-base font-semibold">{formatCurrency(totalBudget)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">End Date</p>
                <p className="text-base flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formattedEndDate}
                </p>
              </div>
            </div>
          </div>

          {/* Budget Items Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Budget Items</h3>
            {budgetItems.length === 0 ? (
              <p className="text-muted-foreground">No budget items found for this plan.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budgetItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base">{item.itemCode}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                      <p className="text-sm">{getItemDescription(item)}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Unit Price</p>
                          <p className="font-medium">{formatCurrency(item.unitPrice)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}