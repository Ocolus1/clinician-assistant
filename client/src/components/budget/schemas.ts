import { z } from 'zod';

// Define the budget plan form schema
export const budgetPlanFormSchema = z.object({
  planCode: z.string().min(1, { message: "Plan code is required" }),
  planSerialNumber: z.string().min(1, { message: "Serial number is required" }),
  availableFunds: z.number().min(0, { message: "Available funds must be a positive number" }),
  endOfPlan: z.date().optional(),
  isActive: z.boolean().default(true),
});

export type BudgetPlanFormValues = z.infer<typeof budgetPlanFormSchema>;