import { pgTable, text, serial, integer, boolean, date, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const FUNDS_MANAGEMENT_OPTIONS = ["Self-Managed", "Advisor-Managed", "Custodian-Managed"] as const;

// Clinician roles
export const CLINICIAN_ROLES = ["Primary Therapist", "Secondary Therapist", "Supervisor", "Support Staff"] as const;

// Renamed from clients to patients
export const patients = pgTable("patients", {
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

// Renamed from allies to caregivers
export const caregivers = pgTable("caregivers", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(), // Renamed from clientId
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
  patientId: integer("patient_id").notNull(), // Renamed from clientId
  title: text("title").notNull(),
  description: text("description").notNull(),
  importanceLevel: text("importance_level").notNull(), // Renamed from priority
  status: text("status").default("in_progress"), // Added status field
});

export const subgoals = pgTable("subgoals", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("pending"),
  completionDate: timestamp("completion_date"), // Added completion date
});

// Add these budget settings
export const budgetSettings = pgTable("budget_settings", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(), // Renamed from clientId
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
  patientId: integer("patient_id").notNull(), // Renamed from clientId
  budgetSettingsId: integer("budget_settings_id").notNull(),
  itemCode: text("item_code").notNull(),
  name: text("name"),
  description: text("description").notNull(),
  unitPrice: numeric("unit_price").notNull().$type<number>(),
  quantity: integer("quantity").notNull(),
  usedQuantity: integer("used_quantity").notNull().default(0),
  category: text("category"),
});

// Create a custom patient schema with explicit type transformation for availableFunds
export const insertPatientSchema = createInsertSchema(patients)
  .extend({
    // Ensure availableFunds is always parsed as a number
    ndisFunds: z.coerce.number()
      .min(0, { message: "Available funds must be a positive number" }),
    // Make fundsManagement optional
    fundsManagement: z.enum(FUNDS_MANAGEMENT_OPTIONS as unknown as [string, ...string[]])
      .optional(),
    // Make sure dateOfBirth is a valid date
    dateOfBirth: z.coerce.date()
      .refine((date) => {
        // Ensure date is not in the future
        return date <= new Date();
      }, { message: "Date of birth cannot be in the future" }),
    // Add validation for at least one access type
    accessTherapeutics: z.boolean().optional(),
    accessFinancials: z.boolean().optional(),
  });

// Create a caregiver schema with validation
export const insertCaregiverSchema = createInsertSchema(caregivers)
  .omit({ id: true, patientId: true })
  .extend({
    // Add validation for at least one access type
    accessTherapeutics: z.boolean(),
    accessFinancials: z.boolean(),
  })
  .refine(
    (data) => data.accessTherapeutics || data.accessFinancials,
    {
      message: "At least one access type must be selected",
      path: ["accessTherapeutics"],
    }
  );

// Backward compatibility aliases for client-side components
export const insertClientSchema = insertPatientSchema;
export const insertAllySchema = insertCaregiverSchema;

export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, patientId: true });
export const insertSubgoalSchema = createInsertSchema(subgoals).omit({ id: true, goalId: true });

// Create a budget settings schema
export const insertBudgetSettingsSchema = createInsertSchema(budgetSettings)
  .omit({ id: true, patientId: true })
  .extend({
    // Ensure availableFunds is always parsed as a number
    ndisFunds: z.coerce.number(),
    // Make endOfPlan optional
    endOfPlan: z.string().optional(),
  });

// Create a custom budget item schema with explicit type transformation for unitPrice and quantity
export const insertBudgetItemSchema = createInsertSchema(budgetItems)
  .omit({ id: true, patientId: true, budgetSettingsId: true })
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

export type Patient = typeof patients.$inferSelect;
export type Caregiver = typeof caregivers.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Subgoal = typeof subgoals.$inferSelect;
export type BudgetItem = typeof budgetItems.$inferSelect;
export type BudgetSettings = typeof budgetSettings.$inferSelect;

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertCaregiver = z.infer<typeof insertCaregiverSchema>;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type InsertSubgoal = z.infer<typeof insertSubgoalSchema>;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
// Sessions table for tracking therapy sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(), // Renamed from clientId
  therapistId: integer("therapist_id"), // Reference to a caregiver who is the therapist
  title: text("title").notNull(),
  description: text("description"),
  sessionDate: timestamp("session_date").notNull(),
  duration: integer("duration").notNull(), // Duration in minutes
  status: text("status", { enum: ["draft", "completed"] }).notNull().default("draft"), // Either draft or completed
  location: text("location"),
  notes: text("notes"),
  aiSummary: text("ai_summary"), // Added AI-generated summary
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
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }), // Renamed from clientId
  // Note: displaySessionId was removed as it doesn't exist in the actual database
  presentCaregivers: text("present_caregivers").array(), // Renamed from presentAllies

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
  date: timestamp("date").defaultNow(), // Added date field for better chronological tracking
});

// Renamed from performanceAssessments to goalAssessments
export const goalAssessments = pgTable("goal_assessments", {
  id: serial("id").primaryKey(),
  sessionNoteId: integer("session_note_id").notNull().references(() => sessionNotes.id, { onDelete: "cascade" }),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  subgoalId: integer("subgoal_id").references(() => subgoals.id, { onDelete: "cascade" }),
  achievementLevel: integer("achievement_level"), // Renamed from rating
  score: integer("score"),
  notes: text("notes"),
  strategies: text("strategies").array(),
  date: timestamp("date").defaultNow(), // Added date field
  createdAt: timestamp("created_at").defaultNow(), // Added createdAt field
  updatedAt: timestamp("updated_at").defaultNow(), // Added updatedAt field
});

// Milestone assessment schema
export const milestoneAssessments = pgTable("milestone_assessments", {
  id: serial("id").primaryKey(),
  goalAssessmentId: integer("goal_assessment_id").notNull().references(() => goalAssessments.id, { onDelete: "cascade" }), // Renamed from performanceAssessmentId
  milestoneId: integer("milestone_id").notNull(), // We don't have a milestones table yet
  rating: integer("rating"), // 1-5 rating
  strategies: text("strategies").array(), // Array of strategy identifiers
  notes: text("notes"),
  completionDate: timestamp("completion_date"), // Added completion date
});

// Therapy strategies schema
export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  effectiveness: integer("effectiveness"), // Added effectiveness rating (1-10)
  goalId: integer("goal_id").references(() => goals.id, { onDelete: "cascade" }), // Added goalId reference
});

// Clinicians table for staff that can be assigned to patients
export const clinicians = pgTable("clinicians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email").notNull(),
  specialization: text("specialization"),
  active: boolean("active").default(true),
  notes: text("notes"),
});

// Patient-Clinician relationship table for assignments (renamed from clientClinicians)
export const patientClinicians = pgTable("patient_clinicians", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }), // Renamed from clientId
  clinicianId: integer("clinician_id").notNull().references(() => clinicians.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // Primary, Secondary, Support, etc.
  assignedDate: timestamp("assigned_date").defaultNow(),
  notes: text("notes"),
});

// Create insert schemas
export const insertSessionNoteSchema = createInsertSchema(sessionNotes);
export const insertGoalAssessmentSchema = createInsertSchema(goalAssessments); // Renamed from insertPerformanceAssessmentSchema
export const insertMilestoneAssessmentSchema = createInsertSchema(milestoneAssessments);
export const insertStrategySchema = createInsertSchema(strategies);

// Clinician schemas
export const insertClinicianSchema = createInsertSchema(clinicians)
  .omit({ id: true })
  .extend({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
  });

export const insertPatientClinicianSchema = createInsertSchema(patientClinicians) // Renamed from insertClientClinicianSchema
  .omit({ id: true, assignedDate: true })
  .extend({
    role: z.enum(CLINICIAN_ROLES as unknown as [string, ...string[]]),
  });

// Define types for inserts
export type InsertSessionNote = z.infer<typeof insertSessionNoteSchema>;
export type InsertGoalAssessment = z.infer<typeof insertGoalAssessmentSchema>; // Renamed from InsertPerformanceAssessment
export type InsertMilestoneAssessment = z.infer<typeof insertMilestoneAssessmentSchema>;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type InsertClinician = z.infer<typeof insertClinicianSchema>;
export type InsertPatientClinician = z.infer<typeof insertPatientClinicianSchema>; // Renamed from InsertClientClinician

// Define types for selects
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type SessionNote = typeof sessionNotes.$inferSelect;
export type GoalAssessment = typeof goalAssessments.$inferSelect; // Renamed from PerformanceAssessment
export type MilestoneAssessment = typeof milestoneAssessments.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type Clinician = typeof clinicians.$inferSelect;
export type PatientClinician = typeof patientClinicians.$inferSelect; // Renamed from ClientClinician

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
    byPatient: Array<{ // Renamed from byClient
      patientId: number, // Renamed from clientId
      patientName: string, // Renamed from clientName
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