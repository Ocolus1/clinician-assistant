import React from 'react';
import { BudgetItem, BudgetSettings } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Tag, DollarSign } from 'lucide-react';

interface BudgetItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
}

/**
 * Dialog component for displaying all budget items in a budget plan
 */
export function BudgetItemsDialog({
  open,
  onOpenChange,
  budgetItems,
  budgetSettings,
}: BudgetItemsDialogProps) {
  if (!budgetSettings) return null;

  const planName = budgetSettings.planCode || 'Budget Plan';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Budget Items in {planName}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          {budgetItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Budget Items</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                This budget plan doesn't have any items yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {budgetItems.map((item) => (
                <BudgetItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface BudgetItemCardProps {
  item: BudgetItem;
}

function BudgetItemCard({ item }: BudgetItemCardProps) {
  const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
  const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
  const totalAmount = unitPrice * quantity;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:border-blue-300 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-medium">{item.itemCode || 'No Code'}</h4>
            <div className="flex items-center text-sm text-gray-500">
              <Tag className="h-3.5 w-3.5 mr-1" />
              <span>{item.description || 'No description'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{formatCurrency(totalAmount)}</div>
            <div className="text-sm text-gray-500">
              {formatCurrency(unitPrice)} × {quantity} units
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center text-sm text-gray-500">
          <DollarSign className="h-3.5 w-3.5 mr-1" />
          <span>Available: {quantity} units</span>
        </div>
      </div>
    </div>
  );
}