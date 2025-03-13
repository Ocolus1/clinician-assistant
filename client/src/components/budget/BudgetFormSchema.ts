import { z } from 'zod';

/**
 * Constants for budget management
 */
export const FIXED_BUDGET_AMOUNT = 375; // Maximum allocated budget
export const AVAILABLE_FUNDS_AMOUNT = 500; // Total available funds
export const INITIAL_USED_AMOUNT = 0; // Initial amount used (no sessions yet)

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
 * Validates if adding a new budget item would exceed the maximum budget
 * @param currentTotal Current total allocated funds
 * @param itemPrice Price of new item to add
 * @param itemQuantity Quantity of new item
 * @returns Boolean indicating if adding this item exceeds the budget
 */
export function exceedsBudget(currentTotal: number, itemPrice: number, itemQuantity: number): boolean {
  const newTotal = currentTotal + (itemPrice * itemQuantity);
  return newTotal > FIXED_BUDGET_AMOUNT;
}

/**
 * Calculates the maximum quantity that can be added without exceeding budget
 * @param currentTotal Current total allocated funds
 * @param itemPrice Price of item
 * @returns Maximum quantity that can be added
 */
export function calculateMaxQuantity(currentTotal: number, itemPrice: number): number {
  if (itemPrice <= 0) return 0;
  const remainingBudget = FIXED_BUDGET_AMOUNT - currentTotal;
  return Math.floor(remainingBudget / itemPrice);
}