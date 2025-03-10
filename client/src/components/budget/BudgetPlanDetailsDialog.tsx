import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { BudgetPlan, BudgetItemDetail } from "./BudgetPlanFullView";
import { BudgetPlanFullView } from "./BudgetPlanFullView";
import type { BudgetItem } from "@shared/schema";

interface BudgetPlanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BudgetPlan | null;
  budgetItems: BudgetItem[];
  sessions?: any[];
  onEdit: () => void;
}

/**
 * Dialog component for displaying detailed budget plan information
 */
export function BudgetPlanDetailsDialog({
  open,
  onOpenChange,
  plan,
  budgetItems,
  sessions = [],
  onEdit
}: BudgetPlanDetailsDialogProps) {
  if (!plan) return null;

  // Transform BudgetItems to BudgetItemDetails with usage tracking
  const enhancedItems: BudgetItemDetail[] = budgetItems.map(item => {
    // Calculate usage based on sessions
    const usedQuantity = sessions
      .filter((session: any) => 
        session.products?.some((p: any) => p.budgetItemId === item.id)
      )
      .reduce((sum: number, session: any) => {
        const product = session.products.find((p: any) => p.budgetItemId === item.id);
        return sum + (product?.quantity || 0);
      }, 0);
    
    // Calculate remaining quantity
    const quantity = typeof item.quantity === 'string' 
      ? parseInt(item.quantity) || 0 
      : item.quantity || 0;
    
    const remainingQuantity = Math.max(0, quantity - usedQuantity);
    
    // Calculate financial metrics
    const unitPrice = typeof item.unitPrice === 'string' 
      ? parseFloat(item.unitPrice) || 0 
      : item.unitPrice || 0;
    
    const totalPrice = unitPrice * quantity;
    const usedAmount = unitPrice * usedQuantity;
    const remainingAmount = unitPrice * remainingQuantity;
    const usagePercentage = quantity > 0 ? (usedQuantity / quantity) * 100 : 0;
    
    return {
      id: item.id,
      clientId: item.clientId,
      budgetSettingsId: item.budgetSettingsId,
      itemCode: item.itemCode,
      name: item.name || null,
      description: item.description || item.itemCode,
      unitPrice,
      quantity,
      category: item.category || null,
      usedQuantity,
      remainingQuantity,
      totalPrice,
      usedAmount,
      remainingAmount,
      usagePercentage
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <BudgetPlanFullView
          plan={plan}
          budgetItems={enhancedItems}
          onBack={() => onOpenChange(false)}
          onEdit={onEdit}
          onArchive={() => {}}
          onSetActive={() => {}}
        />
      </DialogContent>
    </Dialog>
  );
}