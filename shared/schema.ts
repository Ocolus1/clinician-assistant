import { pgTable, text, serial, integer, boolean, date, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const FUNDS_MANAGEMENT_OPTIONS = ["Self-Managed", "Advisor-Managed", "Custodian-Managed"] as const;

// Clinician roles
export const CLINICIAN_ROLES = ["Primary Therapist", "Secondary Therapist", "Supervisor", "Support Staff"] as const;

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalName: text("original_name"), // Store original name without identifier
  uniqueIdentifier: text("unique_identifier"), // Store just the 6-digit identifier
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender"),
  preferredLanguage: text("preferred_language"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  medicalHistory: text("medical_history"),
  communicationNeeds: text("communication_needs"),
  therapyPreferences: text("therapy_preferences"),
  fundsManagement: text("funds_management"), // Made optional to allow null values
  // We're moving availableFunds to the budget section, but keeping it here for backward compatibility
  ndisFunds: numeric("ndis_funds").notNull().$type<number>().default(0),
  // Add onboarding status field to track completion
  onboardingStatus: text("onboarding_status").default("incomplete"),
});

export const allies = pgTable("allies", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  preferredLanguage: text("preferred_language").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  accessTherapeutics: boolean("access_therapeutics").notNull().default(false),
  accessFinancials: boolean("access_financials").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
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
  status: text("status").default("pending"),
});

// Add these budget settings
export const budgetSettings = pgTable("budget_settings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  planSerialNumber: text("plan_serial_number"),
  planCode: text("plan_code"),
  isActive: boolean("is_active").default(true),
  ndisFunds: numeric("ndis_funds").notNull().$type<number>().default(0),
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
  name: text("name"),
  description: text("description").notNull(),
  unitPrice: numeric("unit_price").notNull().$type<number>(),
  quantity: integer("quantity").notNull(),
  category: text("category"),
});

// Create a custom client schema with explicit type transformation for availableFunds
export const insertClientSchema = createInsertSchema(clients)
  .extend({
    // Ensure availableFunds is always parsed as a number
    ndisFunds: z.coerce.number()
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
    ndisFunds: z.coerce.number(),
    // Make endOfPlan optional
    endOfPlan: z.string().optional(),
  });

// Create a custom budget item schema with explicit type transformation for unitPrice and quantity
export const insertBudgetItemSchema = createInsertSchema(budgetItems)
  .omit({ id: true, clientId: true, budgetSettingsId: true })
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
// Sessions table for tracking therapy sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  therapistId: integer("therapist_id"), // Reference to an ally who is the therapist
  title: text("title").notNull(),
  description: text("description"),
  sessionDate: timestamp("session_date").notNull(),
  duration: integer("duration").notNull(), // Duration in minutes
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, etc.
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schema for sessions
export const insertSessionSchema = createInsertSchema(sessions)
  .omit({ id: true })
  .extend({
    sessionDate: z.coerce.date(),
    duration: z.coerce.number().min(1, { message: "Duration must be at least 1 minute" }),
  });

export type InsertBudgetSettings = z.infer<typeof insertBudgetSettingsSchema>;
export type InsertBudgetItemCatalog = z.infer<typeof insertBudgetItemCatalogSchema>;
export type BudgetItemCatalog = typeof budgetItemCatalog.$inferSelect;
// Session Notes schema
export const sessionNotes = pgTable("session_notes", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  displaySessionId: text("display_session_id"), // Added display session ID for reference
  presentAllies: text("present_allies").array(),

  // General observations (ratings from 0-10)
  moodRating: integer("mood_rating"),
  physicalActivityRating: integer("physical_activity_rating"),
  focusRating: integer("focus_rating"),
  cooperationRating: integer("cooperation_rating"),

  // General note
  notes: text("notes"),

  // Products used in session
  products: text("products"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: text("status", { enum: ["draft", "completed"] }).default("draft"),
});

// Performance assessment schema for goals
export const performanceAssessments = pgTable("performance_assessments", {
  id: serial("id").primaryKey(),
  sessionNoteId: integer("session_note_id").notNull().references(() => sessionNotes.id, { onDelete: "cascade" }),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  subgoalId: integer("subgoal_id").references(() => subgoals.id, { onDelete: "cascade" }),
  rating: integer("rating"),
  score: integer("score"),
  notes: text("notes"),
});

// Milestone assessment schema
export const milestoneAssessments = pgTable("milestone_assessments", {
  id: serial("id").primaryKey(),
  performanceAssessmentId: integer("performance_assessment_id").notNull().references(() => performanceAssessments.id, { onDelete: "cascade" }),
  milestoneId: integer("milestone_id").notNull(), // We don't have a milestones table yet
  rating: integer("rating"), // 1-5 rating
  strategies: text("strategies").array(), // Array of strategy identifiers
  notes: text("notes"),
});

// Therapy strategies schema
export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
});

// Clinicians table for staff that can be assigned to clients
export const clinicians = pgTable("clinicians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email").notNull(),
  specialization: text("specialization"),
  active: boolean("active").default(true),
  notes: text("notes"),
});

// Client-Clinician relationship table for assignments
export const clientClinicians = pgTable("client_clinicians", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  clinicianId: integer("clinician_id").notNull().references(() => clinicians.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // Primary, Secondary, Support, etc.
  assignedDate: timestamp("assigned_date").defaultNow(),
  notes: text("notes"),
});

// Create insert schemas
export const insertSessionNoteSchema = createInsertSchema(sessionNotes);
export const insertPerformanceAssessmentSchema = createInsertSchema(performanceAssessments);
export const insertMilestoneAssessmentSchema = createInsertSchema(milestoneAssessments);
export const insertStrategySchema = createInsertSchema(strategies);

// Clinician schemas
export const insertClinicianSchema = createInsertSchema(clinicians)
  .omit({ id: true })
  .extend({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
  });

export const insertClientClinicianSchema = createInsertSchema(clientClinicians)
  .omit({ id: true, assignedDate: true })
  .extend({
    role: z.enum(CLINICIAN_ROLES as unknown as [string, ...string[]]),
  });

// Define types for inserts
export type InsertSessionNote = z.infer<typeof insertSessionNoteSchema>;
export type InsertPerformanceAssessment = z.infer<typeof insertPerformanceAssessmentSchema>;
export type InsertMilestoneAssessment = z.infer<typeof insertMilestoneAssessmentSchema>;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type InsertClinician = z.infer<typeof insertClinicianSchema>;
export type InsertClientClinician = z.infer<typeof insertClientClinicianSchema>;

// Define types for selects
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type SessionNote = typeof sessionNotes.$inferSelect;
export type PerformanceAssessment = typeof performanceAssessments.$inferSelect;
export type MilestoneAssessment = typeof milestoneAssessments.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type Clinician = typeof clinicians.$inferSelect;
export type ClientClinician = typeof clientClinicians.$inferSelect;

// Dashboard data types
export type AppointmentStatsEntry = {
  period: string;
  count: number;
  percentChange?: number;
};

export type AppointmentStats = {
  daily: AppointmentStatsEntry[];
  weekly: AppointmentStatsEntry[];
  monthly: AppointmentStatsEntry[];
  yearly: AppointmentStatsEntry[];
};

export type BudgetExpirationStats = {
  expiringNextMonth: {
    count: number;
    byClient: Array<{ 
      clientId: number, 
      clientName: string, 
      planId: number, 
      planName: string, 
      daysLeft?: number,            // Days remaining until expiration
      unutilizedAmount?: number,    // Amount of funds not yet utilized
      unutilizedPercentage?: number // Percentage of funds not yet utilized
    }>;
  };
  remainingFunds: Array<{
    month: string; // Format: YYYY-MM
    amount: number;
    planCount: number;
  }>;
};

export type UpcomingTaskStats = {
  byMonth: Array<{
    month: string; // Format: YYYY-MM
    reports: number;
    letters: number;
    assessments: number;
    other: number;
  }>;
};

export type DashboardData = {
  appointments: AppointmentStats;
  budgets: BudgetExpirationStats;
  tasks: UpcomingTaskStats;
  lastUpdated: string;
};