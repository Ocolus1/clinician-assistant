import { z } from "zod";
import { FUNDS_MANAGEMENT_OPTIONS } from "@shared/schema";

// Basic budget plan schema
export const budgetPlanSchema = z.object({
  planCode: z
    .string()
    .min(1, "Plan code is required")
    .max(50, "Plan code cannot exceed 50 characters"),
  
  ndisFunds: z
    .union([
      z.number().min(0, "NDIS funds must be a positive number"),
      z.string().refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
        "NDIS funds must be a valid positive number"
      )
    ])
    .transform((val) => typeof val === "string" ? parseFloat(val) : val),
  
  endOfPlan: z
    .string()
    .min(1, "End of plan date is required")
    .optional()
    .nullable(),
  
  isActive: z
    .boolean()
    .default(true)
    .nullable(),
  
  fundsManagement: z
    .enum(FUNDS_MANAGEMENT_OPTIONS)
    .default(FUNDS_MANAGEMENT_OPTIONS[0]),
});

// Budget item schema
export const budgetItemSchema = z.object({
  itemCode: z
    .string()
    .min(1, "Item code is required"),
  
  description: z
    .string()
    .min(1, "Description is required"),
  
  unitPrice: z
    .union([
      z.number().min(0, "Unit price must be a positive number"),
      z.string().refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
        "Unit price must be a valid positive number"
      )
    ])
    .transform((val) => typeof val === "string" ? parseFloat(val) : val),
  
  quantity: z
    .union([
      z.number().int().min(1, "Quantity must be a positive integer"),
      z.string().refine(
        (val) => !isNaN(parseInt(val)) && parseInt(val) >= 1,
        "Quantity must be a valid positive integer"
      )
    ])
    .transform((val) => typeof val === "string" ? parseInt(val) : val),
  
  budgetSettingsId: z
    .number()
    .int()
    .positive("Budget settings ID is required"),
});

// Types for our form values
export type BudgetPlanFormValues = z.infer<typeof budgetPlanSchema>;
export type BudgetItemFormValues = z.infer<typeof budgetItemSchema>;