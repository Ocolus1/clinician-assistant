import { z } from 'zod';

// Default budget settings
export const FIXED_BUDGET_AMOUNT = 5000;
export const AVAILABLE_FUNDS_AMOUNT = 5000;

// Budget item schema for the form
export const budgetItemSchema = z.object({
  id: z.number().optional(),
  itemCode: z.string().min(1, "Item code is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0.01, "Unit price must be greater than 0"),
  total: z.number().optional(),
  isNew: z.boolean().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  budgetSettingsId: z.number().optional(),
  clientId: z.number().optional(),
});

// Main schema for unified budget form
export const unifiedBudgetFormSchema = z.object({
  totalAllocated: z.number().min(0, "Total allocated must be at least 0"),
  remainingBudget: z.number().min(0, "Budget cannot be exceeded"),
  items: z.array(budgetItemSchema),
  totalBudget: z.number().optional(),
});

export type UnifiedBudgetFormValues = z.infer<typeof unifiedBudgetFormSchema>;

/**
 * Schema for budget item form
 */
export const budgetItemFormSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0.01, 'Unit price must be greater than 0'),
  name: z.string().optional(),
  category: z.string().optional(),
});

export type BudgetItemFormValues = z.infer<typeof budgetItemFormSchema>;

/**
 * Schema for budget catalog selection
 */
export const budgetCatalogSelectionSchema = z.object({
  catalogItemId: z.string().min(1, 'Please select a catalog item'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
});

export type BudgetCatalogSelectionValues = z.infer<typeof budgetCatalogSelectionSchema>;

/**
 * Helper function to calculate the used quantity of a budget item
 * When in multi-plan mode, this helps track usage across plans
 */
export function getUsedQuantity(item: any, usageData: any[] = []): number {
  if (!item || !item.id) return 0;
  
  // Find usage data for this item
  const usage = usageData.find(u => u.budgetItemId === item.id);
  if (usage) {
    return usage.quantityUsed || 0;
  }
  
  return 0;
}

/**
 * Helper function to calculate the available quantity of a budget item
 */
export function getAvailableQuantity(item: any, usageData: any[] = []): number {
  if (!item) return 0;
  
  const totalQuantity = item.quantity || 0;
  const usedQuantity = getUsedQuantity(item, usageData);
  
  return Math.max(0, totalQuantity - usedQuantity);
}