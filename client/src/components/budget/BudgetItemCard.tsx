import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { BudgetItem } from '@shared/schema';

// Helper function to format currency
const formatCurrency = (amount: number | string): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numericAmount.toFixed(2);
};

interface BudgetItemCardProps {
  item: BudgetItem;
  onEdit?: (item: BudgetItem) => void;
  onDelete?: (item: BudgetItem) => void;
}

export function BudgetItemCard({ item, onEdit, onDelete }: BudgetItemCardProps) {
  // Calculate the total cost for this item
  const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
  const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
  const totalCost = unitPrice * quantity;
  
  return (
    <Card className="overflow-hidden border-gray-200 hover:border-gray-300 transition-all">
      <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">
              {item.name || item.itemCode || 'Unnamed Item'}
            </CardTitle>
            {item.category && (
              <Badge variant="outline" className="mt-1">
                {item.category}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0"
                onClick={() => onEdit(item)}
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="py-3 px-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Unit Price:</span>
            <span className="font-medium">${formatCurrency(unitPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Quantity:</span>
            <span className="font-medium">{quantity}</span>
          </div>
          <div className="flex justify-between text-sm pt-1 font-medium border-t mt-1">
            <span>Total:</span>
            <span>${formatCurrency(totalCost)}</span>
          </div>
        </div>
        
        {item.description && (
          <div className="mt-3 pt-3 border-t text-sm text-gray-500">
            {item.description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}