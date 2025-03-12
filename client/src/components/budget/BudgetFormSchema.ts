import * as z from "zod";
import { BudgetItem } from "@shared/schema";

// Schema for individual budget items in the form
export const budgetItemFormSchema = z.object({
  id: z.number().optional(), // Optional for new items being added
  itemCode: z.string(),
  description: z.string(),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number(), // Calculated field
  budgetSettingsId: z.number(),
  clientId: z.number(),
  isNew: z.boolean().default(false) // Flag to track newly added items
});

// Schema for the unified budget form
export const unifiedBudgetFormSchema = z.object({
  items: z.array(budgetItemFormSchema),
  // Meta fields for validation and calculation
  totalBudget: z.number(),
  totalAllocated: z.number().default(0),
  remainingBudget: z.number().default(0)
});

// Helper function to convert database items to form items
export function mapBudgetItemsToFormItems(
  budgetItems: BudgetItem[],
  clientId: number,
  budgetSettingsId: number
) {
  return budgetItems.map(item => ({
    id: item.id,
    itemCode: item.itemCode,
    description: item.description || "",
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.quantity * item.unitPrice,
    budgetSettingsId: budgetSettingsId,
    clientId: clientId,
    isNew: false
  }));
}

// Helper function to calculate total budget allocation
export function calculateTotalAllocation(items: Array<{ quantity: number, unitPrice: number }>) {
  return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
}

// Type definitions
export type BudgetItemFormValues = z.infer<typeof budgetItemFormSchema>;
export type UnifiedBudgetFormValues = z.infer<typeof unifiedBudgetFormSchema>;