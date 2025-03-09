import { z } from 'zod';

// Define the budget plan form schema
export const budgetPlanFormSchema = z.object({
  planCode: z.string().min(1, { message: "Plan code is required" }),
  planSerialNumber: z.string().min(1, { message: "Serial number is required" }),
  // Note: Available funds is the total budget allocation (will be linked to budget items)
  // This is not the actual spending amount, just the initial budget allocation
  availableFunds: z.number().min(0, { message: "Available funds must be a positive number" }),
  endOfPlan: z.date().optional(),
  isActive: z.boolean().default(true),
});

export type BudgetPlanFormValues = z.infer<typeof budgetPlanFormSchema>;