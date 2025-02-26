import { pgTable, text, serial, integer, boolean, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
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

export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  itemCode: text("item_code").notNull(),
  description: text("description").notNull(),
  unitPrice: numeric("unit_price").notNull().$type<number>(),
  quantity: integer("quantity").notNull(),
});

export const insertClientSchema = createInsertSchema(clients);
export const insertAllySchema = createInsertSchema(allies).omit({ id: true, clientId: true });
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, clientId: true });
export const insertSubgoalSchema = createInsertSchema(subgoals).omit({ id: true, goalId: true });

// Create a custom budget item schema with explicit type transformation for unitPrice
export const insertBudgetItemSchema = createInsertSchema(budgetItems)
  .omit({ id: true, clientId: true })
  .extend({
    // Ensure unitPrice is always parsed as a number
    unitPrice: z.coerce.number()
  });

export type Client = typeof clients.$inferSelect;
export type Ally = typeof allies.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Subgoal = typeof subgoals.$inferSelect;
export type BudgetItem = typeof budgetItems.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertAlly = z.infer<typeof insertAllySchema>;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type InsertSubgoal = z.infer<typeof insertSubgoalSchema>;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;