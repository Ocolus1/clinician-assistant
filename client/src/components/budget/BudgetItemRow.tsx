import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BudgetItem, BudgetItemCatalog } from "@shared/schema";

interface BudgetItemRowProps {
  item: {
    itemCode: string;
    description?: string;
    quantity: string;
    unitPrice: string;
  };
  index: number;
  catalogItems: BudgetItemCatalog[];
  onItemChange: (index: number, field: string, value: string) => void;
  onItemDelete: (index: number) => void;
  onCatalogItemSelect: (index: number, itemCode: string) => void;
  disabled?: boolean;
}

export function BudgetItemRow({
  item,
  index,
  catalogItems,
  onItemChange,
  onItemDelete,
  onCatalogItemSelect,
  disabled = false
}: BudgetItemRowProps) {
  // Calculate the total for this item
  const quantity = parseInt(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const total = quantity * unitPrice;
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-start">
          <Label className="font-medium">Item {index + 1}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onItemDelete(index)}
            className="h-8 w-8 p-0"
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`item-code-${index}`}>Item Code</Label>
            <Select
              disabled={disabled}
              value={item.itemCode}
              onValueChange={(value) => onCatalogItemSelect(index, value)}
            >
              <SelectTrigger id={`item-code-${index}`}>
                <SelectValue placeholder="Select an item code" />
              </SelectTrigger>
              <SelectContent>
                {catalogItems.map((catalogItem) => (
                  <SelectItem key={catalogItem.id} value={catalogItem.itemCode}>
                    {catalogItem.itemCode} - {catalogItem.description.substring(0, 30)}{catalogItem.description.length > 30 ? '...' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`quantity-${index}`}>Quantity</Label>
              <Input
                id={`quantity-${index}`}
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(e) => onItemChange(index, 'quantity', e.target.value)}
                disabled={disabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`unit-price-${index}`}>Unit Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id={`unit-price-${index}`}
                  className="pl-8"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => onItemChange(index, 'unitPrice', e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`description-${index}`}>Description</Label>
            <Input
              id={`description-${index}`}
              placeholder="Item description"
              value={item.description || ''}
              onChange={(e) => onItemChange(index, 'description', e.target.value)}
              disabled={disabled}
            />
          </div>
          
          <div className="flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total</div>
              <div className="font-semibold">{formatCurrency(total)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}