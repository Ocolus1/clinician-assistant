import { z } from 'zod';

/**
 * Constants for budget management
 * 
 * NOTE: These constants are NOT used for actual calculation anymore.
 * Instead, we're using client-specific values from the active plan.
 * These values are kept as fallbacks only.
 */
export const FIXED_BUDGET_AMOUNT = 2000; // Fixed budget amount for all clients
export const NDIS_FUNDS_AMOUNT = 0; // Placeholder, use client-specific values instead
export const INITIAL_USED_AMOUNT = 0; // Placeholder, use client-specific values instead

// Used quantities for budget items are now retrieved from the API
// This mock is kept for reference only and is not used in production code
export const MOCK_USED_QUANTITIES: Record<string, number> = {};

/**
 * Schema for unified budget form
 */
// Schema for budget item in the form
export const budgetItemSchema = z.object({
  id: z.number().optional(),
  itemCode: z.string().min(1, 'Item code is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0, 'Quantity must be at least 0'),
  unitPrice: z.number().min(0.01, 'Unit price must be greater than 0'),
  total: z.number(),
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
 * Validates if adding a new budget item would exceed the maximum budget
 * @param currentTotal Current total allocated funds
 * @param itemPrice Price of new item to add
 * @param itemQuantity Quantity of new item
 * @param maxBudget Maximum budget amount specific to client
 * @returns Boolean indicating if adding this item exceeds the budget
 */
export function exceedsBudget(
  currentTotal: number, 
  itemPrice: number, 
  itemQuantity: number, 
  maxBudget: number
): boolean {
  const newTotal = currentTotal + (itemPrice * itemQuantity);
  return newTotal > maxBudget;
}

/**
 * Calculates the maximum quantity that can be added without exceeding budget
 * @param currentTotal Current total allocated funds
 * @param itemPrice Price of item
 * @param maxBudget Maximum budget amount specific to client
 * @returns Maximum quantity that can be added
 */
export function calculateMaxQuantity(
  currentTotal: number, 
  itemPrice: number, 
  maxBudget: number
): number {
  if (itemPrice <= 0) return 0;
  const remainingBudget = maxBudget - currentTotal;
  return Math.floor(remainingBudget / itemPrice);
}

// Store used quantities from API for lookup by item code
export const usedQuantitiesStore: Record<string, number> = {};

/**
 * Sets the used quantity for a specific item code
 * Used to store the API values for later lookup
 * @param itemCode The product's item code
 * @param quantity The used quantity from the API
 */
export function setUsedQuantity(itemCode: string, quantity: number): void {
  usedQuantitiesStore[itemCode] = quantity;
}

/**
 * Gets the used quantity for a specific item code
 * @param itemCode The product's item code
 * @returns The quantity that has been used in sessions
 */
export function getUsedQuantity(itemCode: string): number {
  // Look up the used quantity from our store
  // If it doesn't exist, return 0
  return usedQuantitiesStore[itemCode] || 0;
}

/**
 * Validates that the requested quantity is not less than what's already used
 * @param itemCode The product's item code
 * @param requestedQuantity The quantity the user wants to set
 * @returns Boolean indicating if the quantity is valid
 */
export function validateUsedQuantity(itemCode: string, requestedQuantity: number): boolean {
  const usedQuantity = getUsedQuantity(itemCode);
  return requestedQuantity >= usedQuantity;
}

/**
 * Gets the error message for quantity validation
 * @param itemCode The product's item code
 * @param requestedQuantity The quantity the user wants to set
 * @returns Error message or null if valid
 */
export function getQuantityValidationError(itemCode: string, requestedQuantity: number): string | null {
  const usedQuantity = getUsedQuantity(itemCode);
  if (requestedQuantity < usedQuantity) {
    return `Quantity cannot be less than ${usedQuantity} unit(s) already used in sessions`;
  }
  return null;
}