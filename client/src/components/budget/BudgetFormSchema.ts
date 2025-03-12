import * as z from "zod";

/**
 * Schema for individual budget items in the form
 */
export const budgetItemSchema = z.object({
  id: z.number().optional(), // Optional for new items being added
  itemCode: z.string().min(1, "Item code is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be at least 0"),
  unitPrice: z.number().min(0, "Unit price must be at least 0"),
  // These are form-specific fields
  isNew: z.boolean().optional(), // Flag to track newly added items
  name: z.string().nullable(), // Required by the database schema but can be null
  category: z.string().nullable(), // Required by the database schema but can be null
});

/**
 * Schema for the unified budget form
 */
export const unifiedBudgetFormSchema = z.object({
  items: z.array(budgetItemSchema),
  // Meta fields for validation - not persisted to database
  totalBudget: z.number(),
  totalAllocated: z.number(),
  remainingBudget: z.number(),
});

export type BudgetItemFormValues = z.infer<typeof budgetItemSchema>;
export type UnifiedBudgetFormValues = z.infer<typeof unifiedBudgetFormSchema>;

// Constants
export const FIXED_BUDGET_AMOUNT = 375;