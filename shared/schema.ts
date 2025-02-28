import { pgTable, text, serial, integer, boolean, date, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const FUNDS_MANAGEMENT_OPTIONS = ["Self-Managed", "Advisor-Managed", "Custodian-Managed"] as const;

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  fundsManagement: text("funds_management"), // Made optional to allow null values
  // We're moving availableFunds to the budget section, but keeping it here for backward compatibility
  availableFunds: numeric("available_funds").notNull().$type<number>().default(0), 
});

export const allies = pgTable("allies", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  preferredLanguage: text("preferred_language").notNull(),
  email: text("email").notNull(),
  accessTherapeutics: boolean("access_therapeutics").notNull(),
  accessFinancials: boolean("access_financials").notNull(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull(),
});

export const subgoals = pgTable("subgoals", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
});

// Add these budget settings
export const budgetSettings = pgTable("budget_settings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  planSerialNumber: text("plan_serial_number"),
  isActive: boolean("is_active").default(true),
  availableFunds: numeric("available_funds").notNull().$type<number>().default(0),
  endOfPlan: text("end_of_plan"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Item catalog for predefined budget items
export const budgetItemCatalog = pgTable("budget_item_catalog", {
  id: serial("id").primaryKey(),
  itemCode: text("item_code").notNull().unique(),
  description: text("description").notNull(),
  defaultUnitPrice: numeric("default_unit_price").notNull().$type<number>(),
  category: text("category"),
  isActive: boolean("is_active").default(true),
});

export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  budgetSettingsId: integer("budget_settings_id").notNull(),
  itemCode: text("item_code").notNull(),
  description: text("description").notNull(),
  unitPrice: numeric("unit_price").notNull().$type<number>(),
  quantity: integer("quantity").notNull(),
  category: text("category"),
});

// Create a custom client schema with explicit type transformation for availableFunds
export const insertClientSchema = createInsertSchema(clients)
  .extend({
    // Ensure availableFunds is always parsed as a number
    availableFunds: z.coerce.number()
  });

export const insertAllySchema = createInsertSchema(allies)
  .omit({ id: true, clientId: true })
  .extend({
    name: z.string().min(1, { message: "Name is required" }),
    relationship: z.string().min(1, { message: "Relationship is required" }),
    preferredLanguage: z.string().min(1, { message: "Preferred language is required" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    accessTherapeutics: z.boolean(),
    accessFinancials: z.boolean(),
  })
  .refine(
    (data) => data.accessTherapeutics || data.accessFinancials,
    {
      message: "", // Empty message since we don't want to show it
      path: ["accessSettings"], // Map to a custom path that will be used in the form
    }
  );
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, clientId: true });
export const insertSubgoalSchema = createInsertSchema(subgoals).omit({ id: true, goalId: true });

// Create a budget settings schema
export const insertBudgetSettingsSchema = createInsertSchema(budgetSettings)
  .omit({ id: true, clientId: true })
  .extend({
    // Ensure availableFunds is always parsed as a number
    availableFunds: z.coerce.number(),
    // Make endOfPlan optional
    endOfPlan: z.string().optional(),
  });

// Create a custom budget item schema with explicit type transformation for unitPrice and quantity
export const insertBudgetItemSchema = createInsertSchema(budgetItems)
  .omit({ id: true, clientId: true })
  .extend({
    // Add validation messages for required fields
    itemCode: z.string().min(1, { message: "Item code is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    // Ensure unitPrice and quantity are always parsed as numbers with validation
    unitPrice: z.coerce.number()
      .min(0.01, { message: "Unit price must be greater than 0" }),
    quantity: z.coerce.number()
      .min(1, { message: "Quantity must be at least 1" })
  });
  
// Create schema for budget item catalog
export const insertBudgetItemCatalogSchema = createInsertSchema(budgetItemCatalog)
  .omit({ id: true })
  .extend({
    itemCode: z.string().min(1, { message: "Item code is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    defaultUnitPrice: z.coerce.number()
      .min(0.01, { message: "Unit price must be greater than 0" }),
    category: z.string().optional()
  });

export type Client = typeof clients.$inferSelect;
export type Ally = typeof allies.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Subgoal = typeof subgoals.$inferSelect;
export type BudgetItem = typeof budgetItems.$inferSelect;
export type BudgetSettings = typeof budgetSettings.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertAlly = z.infer<typeof insertAllySchema>;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type InsertSubgoal = z.infer<typeof insertSubgoalSchema>;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type InsertBudgetSettings = z.infer<typeof insertBudgetSettingsSchema>;
export type InsertBudgetItemCatalog = z.infer<typeof insertBudgetItemCatalogSchema>;
export type BudgetItemCatalog = typeof budgetItemCatalog.$inferSelect;