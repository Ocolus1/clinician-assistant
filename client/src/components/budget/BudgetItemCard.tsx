import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { BudgetItem } from '@shared/schema';

interface BudgetItemCardProps {
  item: BudgetItem;
  onEdit: (item: BudgetItem) => void;
  onDelete: (item: BudgetItem) => void;
}

export function BudgetItemCard({ item, onEdit, onDelete }: BudgetItemCardProps) {
  // Calculate total value
  const unitPrice = typeof item.unitPrice === 'string' ? 
    parseFloat(item.unitPrice) : item.unitPrice;
  const quantity = typeof item.quantity === 'string' ? 
    parseInt(item.quantity) : item.quantity;
  const totalValue = unitPrice * quantity;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 bg-gray-50">
        <CardTitle className="text-base flex justify-between items-start">
          <span>{item.name || item.itemCode || 'Unnamed Item'}</span>
          {item.category && (
            <Badge variant="outline" className="ml-2">
              {item.category}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3 px-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Unit Price:</span>
            <span className="font-medium">{formatCurrency(unitPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Quantity:</span>
            <span className="font-medium">{quantity}</span>
          </div>
          <div className="flex justify-between text-sm pt-1 font-medium border-t mt-1">
            <span>Total:</span>
            <span>{formatCurrency(totalValue)}</span>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-3 pt-2 border-t">
          <Button 
            size="sm" 
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(item)}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}