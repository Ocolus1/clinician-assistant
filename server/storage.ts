import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "./db";
import {
  patients,
  clinicians,
  patientClinicians,
  sessions,
  sessionNotes,
  caregivers,
  budgetSettings,
  budgetItems,
  Subgoal,
  subgoals,
  InsertSubgoal,
  budgetItemCatalog,
  strategies,
  goals,
  goalAssessments,
  milestoneAssessments,
} from "@shared/schema";

// Import types from the schema
import type {
  // Renamed types (using the new schema names)
  Patient,
  Caregiver,
  PatientClinician,
  InsertPatient,
  InsertCaregiver,
  InsertPatientClinician,

  // Regular types
  Clinician,
  Session,
  SessionNote,
  BudgetSettings,
  BudgetItem,
  BudgetItemCatalog,
  Strategy,
  Goal,
  GoalAssessment,
  MilestoneAssessment,

  // Insert types
  InsertClinician,
  InsertSession,
  InsertSessionNote,
  InsertBudgetSettings,
  InsertBudgetItem,
  InsertBudgetItemCatalog,
  InsertStrategy,
  InsertGoal,
  InsertGoalAssessment,
  InsertMilestoneAssessment,
  AppointmentStats,
  BudgetExpirationStats,
  UpcomingTaskStats,
} from "@shared/schema";

// Define DateRangeParams type for filtering by date range
export type DateRangeParams = {
  startDate?: Date;
  endDate?: Date;
};

export interface IStorage {
  // Patients (formerly Clients)
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: number): Promise<Patient | undefined>;
  getAllPatients(includeIncomplete?: boolean): Promise<Patient[]>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  deletePatient(id: number): Promise<void>;

  // Caregivers (formerly Allies)
  getCaregiver(id: number): Promise<Caregiver | undefined>;
  getCaregiverByPatient(patientId: number): Promise<Caregiver | undefined>;
  getCaregiversByPatient(patientId: number): Promise<Caregiver[]>;
  getAllCaregivers(): Promise<Caregiver[]>;
  createCaregiver(
    patientIdOrCaregiver: number | InsertCaregiver,
    caregiverData?: Omit<InsertCaregiver, "patientId">
  ): Promise<Caregiver>;
  updateCaregiver(
    id: number,
    caregiver: Partial<InsertCaregiver>
  ): Promise<Caregiver>;
  deleteCaregiver(id: number): Promise<void>;

  // Clinicians
  createClinician(clinician: InsertClinician): Promise<Clinician>;
  getClinician(id: number): Promise<Clinician | undefined>;
  getAllClinicians(): Promise<Clinician[]>;
  updateClinician(
    id: number,
    clinician: Partial<InsertClinician>
  ): Promise<Clinician>;
  deleteClinician(id: number): Promise<void>;

  // Patient-Clinician Assignments
  assignClinicianToPatient(
    patientIdOrAssignment: number | InsertPatientClinician,
    assignmentData?: InsertPatientClinician
  ): Promise<PatientClinician>;
  getCliniciansByPatient(patientId: number): Promise<Clinician[]>;
  getPatientsByClinician(clinicianId: number): Promise<Patient[]>;
  removeClinicianFromPatient(
    patientId: number,
    clinicianId: number
  ): Promise<void>;

  // Strategies
  getAllStrategies(): Promise<Strategy[]>;
  getStrategyById(id: number): Promise<Strategy | undefined>;
  getStrategiesByCategory(category: string): Promise<Strategy[]>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(
    id: number,
    strategy: Partial<InsertStrategy>
  ): Promise<Strategy>;
  deleteStrategy(id: number): Promise<void>;

  // Goals
  createGoal(goal: InsertGoal & { patientId: number }): Promise<Goal>;
  getGoalById(id: number): Promise<Goal | undefined>;
  getGoalsByPatient(patientId: number): Promise<Goal[]>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal>;
  deleteGoal(id: number): Promise<void>;

  // Subgoals
  createSubgoal(goalId: number, subgoal: InsertSubgoal): Promise<Subgoal>;
  getSubgoalsByGoal(goalId: number): Promise<Subgoal[]>;
  updateSubgoal(id: number, data: Partial<InsertSubgoal>): Promise<Subgoal>;
  deleteSubgoal(id: number): Promise<void>;

  // Goal Assessments (formerly Performance Assessments)
  createGoalAssessment(
    assessment: InsertGoalAssessment
  ): Promise<GoalAssessment>;
  getGoalAssessmentsByGoal(goalId: number): Promise<GoalAssessment[]>;
  getGoalAssessmentsBySessionNote(
    sessionNoteId: number
  ): Promise<GoalAssessment[]>;
  getGoalAssessmentById(id: number): Promise<GoalAssessment | undefined>;
  updateGoalAssessment(
    id: number,
    assessment: Partial<InsertGoalAssessment>
  ): Promise<GoalAssessment>;
  deleteGoalAssessment(id: number): Promise<void>;

  // Budget Settings
  getBudgetSettings(patientId: number): Promise<BudgetSettings | undefined>;
  createBudgetSettings(
    settings: InsertBudgetSettings & { patientId: number }
  ): Promise<BudgetSettings>;
  updateBudgetSettings(
    patientId: number,
    settings: Partial<InsertBudgetSettings>
  ): Promise<BudgetSettings>;

  // Dashboard related methods
  getDashboardAppointmentStats(groupBy: string): Promise<any>;
  getBudgetExpirationStats(months: number): Promise<any>;
  getUpcomingTaskStats(months: number): Promise<any>;

  // Goal Performance Data
  getGoalPerformanceData(
    patientIdOrGoalId: number,
    goalIdOrDateRange?: number | DateRangeParams,
    dateRange?: DateRangeParams
  ): Promise<GoalAssessment[]>;

  // Session Notes
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;
  getSessionNoteById(id: number): Promise<SessionNote | undefined>;
  getSessionNotesByPatient(patientId: number): Promise<SessionNote[]>;
  updateSessionNote(
    id: number,
    note: Partial<InsertSessionNote>
  ): Promise<SessionNote>;
  deleteSessionNote(id: number): Promise<void>;
}

export class DrizzleStorage implements IStorage {
  // Patients (formerly Clients)
  async createPatient(patient: InsertPatient): Promise<Patient> {
    console.log(`Creating new patient: ${patient.name}`);
    try {
      // Convert Date to string format for database insertion
      const patientToInsert = {
        ...patient,
        // Convert Date to ISO string format that PostgreSQL can handle
        dateOfBirth:
          patient.dateOfBirth instanceof Date
            ? patient.dateOfBirth.toISOString().split("T")[0]
            : patient.dateOfBirth,
      };

      const [newPatient] = await db
        .insert(patients)
        .values(patientToInsert)
        .returning();
      return newPatient;
    } catch (error) {
      console.error(`Error creating patient: ${error}`);
      throw error;
    }
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    console.log(`Getting patient with ID ${id}`);
    try {
      const result = await db
        .select()
        .from(patients)
        .where(eq(patients.id, id));
      return result[0];
    } catch (error) {
      console.error(`Error getting patient with ID ${id}: ${error}`);
      throw error;
    }
  }

  async getAllPatients(includeIncomplete: boolean = true): Promise<Patient[]> {
    console.log(`Getting all patients, includeIncomplete=${includeIncomplete}`);
    try {
      if (includeIncomplete) {
        // Get all patients regardless of onboarding status
        const result = await db
          .select()
          .from(patients)
          .orderBy(asc(patients.name));
        return result as Patient[];
      } else {
        // Only get patients with complete onboarding status
        const result = await db
          .select()
          .from(patients)
          .where(eq(patients.onboardingStatus, "complete"))
          .orderBy(asc(patients.name));
        return result as Patient[];
      }
    } catch (error) {
      console.error(`Error getting all patients: ${error}`);
      throw error;
    }
  }

  async updatePatient(
    id: number,
    patient: Partial<InsertPatient>
  ): Promise<Patient> {
    console.log(`Updating patient with ID ${id}`);
    try {
      // Convert Date to string format for database insertion
      const patientToInsert = {
        ...patient,
        // Convert Date to ISO string format that PostgreSQL can handle
        dateOfBirth:
          patient.dateOfBirth instanceof Date
            ? patient.dateOfBirth.toISOString().split("T")[0]
            : patient.dateOfBirth,
      };

      const [updatedPatient] = await db
        .update(patients)
        .set(patientToInsert)
        .where(eq(patients.id, id))
        .returning();
      return updatedPatient;
    } catch (error) {
      console.error(`Error updating patient with ID ${id}: ${error}`);
      throw error;
    }
  }

  async deletePatient(id: number): Promise<void> {
    console.log(`Deleting patient with ID ${id}`);
    try {
      await db.delete(patients).where(eq(patients.id, id));
    } catch (error) {
      console.error(`Error deleting patient with ID ${id}: ${error}`);
      throw error;
    }
  }

  // Caregivers (formerly Allies)
  async getCaregiver(id: number): Promise<Caregiver | undefined> {
    console.log(`Getting caregiver with ID ${id}`);
    try {
      const result = await db
        .select()
        .from(caregivers)
        .where(eq(caregivers.id, id));
      return result[0];
    } catch (error) {
      console.error(`Error getting caregiver with ID ${id}: ${error}`);
      throw error;
    }
  }

  async getCaregiverByPatient(
    patientId: number
  ): Promise<Caregiver | undefined> {
    console.log(`Getting caregiver for patient with ID ${patientId}`);
    try {
      const result = await db
        .select()
        .from(caregivers)
        .where(eq(caregivers.patientId, patientId));
      return result[0];
    } catch (error) {
      console.error(
        `Error getting caregiver for patient with ID ${patientId}: ${error}`
      );
      throw error;
    }
  }

  async getCaregiversByPatient(patientId: number): Promise<Caregiver[]> {
    console.log(`Getting caregivers for patient with ID ${patientId}`);
    try {
      const result = await db
        .select()
        .from(caregivers)
        .where(eq(caregivers.patientId, patientId));
      return result;
    } catch (error) {
      console.error(
        `Error getting caregivers for patient with ID ${patientId}: ${error}`
      );
      throw error;
    }
  }

  async getAllCaregivers(): Promise<Caregiver[]> {
    console.log(`Getting all caregivers`);
    try {
      return await db.select().from(caregivers);
    } catch (error) {
      console.error(`Error getting all caregivers: ${error}`);
      throw error;
    }
  }

  async createCaregiver(
    patientIdOrCaregiver: number | InsertCaregiver,
    caregiverData?: Omit<InsertCaregiver, "patientId">
  ): Promise<Caregiver> {
    try {
      let caregiverToInsert: any; // Use any temporarily to bypass type checking

      if (typeof patientIdOrCaregiver === "number") {
        if (!caregiverData) {
          throw new Error(
            "Caregiver data is required when providing patientId"
          );
        }
        // For database insertion, we need to add patientId to the caregiverData
        caregiverToInsert = {
          ...caregiverData,
          patientId: patientIdOrCaregiver,
        };
      } else {
        // If the first argument is already a caregiver object, use it directly
        caregiverToInsert = patientIdOrCaregiver;
      }

      console.log(
        `Creating new caregiver for patient ${
          typeof patientIdOrCaregiver === "number"
            ? patientIdOrCaregiver
            : "from object"
        }`
      );
      const [newCaregiver] = await db
        .insert(caregivers)
        .values(caregiverToInsert)
        .returning();
      return newCaregiver;
    } catch (error) {
      console.error(`Error creating caregiver: ${error}`);
      throw error;
    }
  }

  async updateCaregiver(
    id: number,
    caregiver: Partial<InsertCaregiver>
  ): Promise<Caregiver> {
    console.log(`Updating caregiver with ID ${id}`);
    try {
      const [updatedCaregiver] = await db
        .update(caregivers)
        .set(caregiver)
        .where(eq(caregivers.id, id))
        .returning();
      return updatedCaregiver;
    } catch (error) {
      console.error(`Error updating caregiver with ID ${id}: ${error}`);
      throw error;
    }
  }

  async deleteCaregiver(id: number): Promise<void> {
    console.log(`Deleting caregiver with ID ${id}`);
    try {
      await db.delete(caregivers).where(eq(caregivers.id, id));
    } catch (error) {
      console.error(`Error deleting caregiver with ID ${id}: ${error}`);
      throw error;
    }
  }

  // Clinicians
  async createClinician(clinician: InsertClinician): Promise<Clinician> {
    console.log(`Creating new clinician ${clinician.name}`);
    try {
      const [newClinician] = await db
        .insert(clinicians)
        .values(clinician)
        .returning();
      return newClinician;
    } catch (error) {
      console.error(`Error creating clinician: ${error}`);
      throw error;
    }
  }

  async getClinician(id: number): Promise<Clinician | undefined> {
    console.log(`Getting clinician with ID ${id}`);
    try {
      const result = await db
        .select()
        .from(clinicians)
        .where(eq(clinicians.id, id));
      return result[0];
    } catch (error) {
      console.error(`Error getting clinician with ID ${id}: ${error}`);
      throw error;
    }
  }

  async getAllClinicians(): Promise<Clinician[]> {
    console.log("Getting all clinicians");
    try {
      return await db.select().from(clinicians);
    } catch (error) {
      console.error(`Error getting all clinicians: ${error}`);
      throw error;
    }
  }

  async updateClinician(
    id: number,
    clinician: Partial<InsertClinician>
  ): Promise<Clinician> {
    console.log(`Updating clinician with ID ${id}`);
    try {
      const [updatedClinician] = await db
        .update(clinicians)
        .set(clinician)
        .where(eq(clinicians.id, id))
        .returning();
      return updatedClinician;
    } catch (error) {
      console.error(`Error updating clinician with ID ${id}: ${error}`);
      throw error;
    }
  }

  async deleteClinician(id: number): Promise<void> {
    console.log(`Deleting clinician with ID ${id}`);
    try {
      await db.delete(clinicians).where(eq(clinicians.id, id));
    } catch (error) {
      console.error(`Error deleting clinician with ID ${id}: ${error}`);
      throw error;
    }
  }

  // Patient-Clinician Assignments
  async assignClinicianToPatient(
    patientIdOrAssignment: number | InsertPatientClinician,
    assignmentData?: InsertPatientClinician
  ): Promise<PatientClinician> {
    try {
      let assignmentToInsert: InsertPatientClinician;

      if (typeof patientIdOrAssignment === "number") {
        if (!assignmentData) {
          throw new Error(
            "Assignment data is required when providing patientId"
          );
        }
        assignmentToInsert = assignmentData;
      } else {
        assignmentToInsert = patientIdOrAssignment;
      }

      console.log(
        `Assigning clinician ${assignmentToInsert.clinicianId} to patient ${assignmentToInsert.patientId}`
      );
      const [newAssignment] = await db
        .insert(patientClinicians)
        .values(assignmentToInsert)
        .returning();
      return newAssignment;
    } catch (error) {
      console.error(`Error assigning clinician to patient: ${error}`);
      throw error;
    }
  }

  async getCliniciansByPatient(patientId: number): Promise<Clinician[]> {
    console.log(`Getting clinicians for patient with ID ${patientId}`);
    try {
      const assignments = await db
        .select({
          clinicianId: patientClinicians.clinicianId,
        })
        .from(patientClinicians)
        .where(eq(patientClinicians.patientId, patientId));

      if (assignments.length === 0) {
        return [];
      }

      const clinicianIds = assignments.map((a) => a.clinicianId);
      const result = await db
        .select()
        .from(clinicians)
        .where(inArray(clinicians.id, clinicianIds));

      return result;
    } catch (error) {
      console.error(
        `Error getting clinicians for patient with ID ${patientId}: ${error}`
      );
      throw error;
    }
  }

  async getPatientsByClinician(clinicianId: number): Promise<Patient[]> {
    console.log(`Getting patients for clinician with ID ${clinicianId}`);
    try {
      const assignments = await db
        .select({
          patientId: patientClinicians.patientId,
        })
        .from(patientClinicians)
        .where(eq(patientClinicians.clinicianId, clinicianId));

      if (assignments.length === 0) {
        return [];
      }

      const patientIds = assignments.map((a) => a.patientId);
      const result = await db
        .select()
        .from(patients)
        .where(inArray(patients.id, patientIds));

      return result;
    } catch (error) {
      console.error(
        `Error getting patients for clinician with ID ${clinicianId}: ${error}`
      );
      throw error;
    }
  }

  async removeClinicianFromPatient(
    patientId: number,
    clinicianId: number
  ): Promise<void> {
    console.log(`Removing clinician ${clinicianId} from patient ${patientId}`);
    try {
      await db
        .delete(patientClinicians)
        .where(
          and(
            eq(patientClinicians.patientId, patientId),
            eq(patientClinicians.clinicianId, clinicianId)
          )
        );
    } catch (error) {
      console.error(
        `Error removing clinician ${clinicianId} from patient ${patientId}: ${error}`
      );
      throw error;
    }
  }

  // Milestone Assessment Methods
  async createMilestoneAssessment(
    assessment: InsertMilestoneAssessment
  ): Promise<MilestoneAssessment> {
    console.log(
      `Creating milestone assessment for goal assessment ${assessment.goalAssessmentId}:`,
      JSON.stringify(assessment)
    );
    try {
      const [newAssessment] = await db
        .insert(milestoneAssessments)
        .values(assessment)
        .returning();

      console.log(
        `Successfully created milestone assessment with ID ${newAssessment.id}`
      );
      return newAssessment;
    } catch (error) {
      console.error(
        `Error creating milestone assessment for goal assessment ${assessment.goalAssessmentId}:`,
        error
      );
      throw error;
    }
  }

  async getMilestoneAssessmentsByGoalAssessment(
    goalAssessmentId: number
  ): Promise<MilestoneAssessment[]> {
    console.log(
      `Getting milestone assessments for goal assessment ${goalAssessmentId}`
    );
    try {
      const assessments = await db
        .select()
        .from(milestoneAssessments)
        .where(eq(milestoneAssessments.goalAssessmentId, goalAssessmentId));

      console.log(
        `Found ${assessments.length} milestone assessments for goal assessment ${goalAssessmentId}`
      );
      return assessments;
    } catch (error) {
      console.error(
        `Error getting milestone assessments for goal assessment ${goalAssessmentId}:`,
        error
      );
      throw error;
    }
  }

  async updateMilestoneAssessment(
    id: number,
    assessment: InsertMilestoneAssessment
  ): Promise<MilestoneAssessment> {
    console.log(
      `Updating milestone assessment with ID ${id}:`,
      JSON.stringify(assessment)
    );
    try {
      const [updatedAssessment] = await db
        .update(milestoneAssessments)
        .set(assessment)
        .where(eq(milestoneAssessments.id, id))
        .returning();

      if (!updatedAssessment) {
        console.error(`Milestone assessment with ID ${id} not found`);
        throw new Error("Milestone assessment not found");
      }

      console.log(`Successfully updated milestone assessment with ID ${id}`);
      return updatedAssessment;
    } catch (error) {
      console.error(
        `Error updating milestone assessment with ID ${id}:`,
        error
      );
      throw error;
    }
  }

  async deleteMilestoneAssessment(id: number): Promise<void> {
    console.log(`Deleting milestone assessment with ID ${id}`);
    try {
      await db
        .delete(milestoneAssessments)
        .where(eq(milestoneAssessments.id, id));
      console.log(`Successfully deleted milestone assessment with ID ${id}`);
    } catch (error) {
      console.error(
        `Error deleting milestone assessment with ID ${id}:`,
        error
      );
      throw error;
    }
  }

  // Strategies
  async getAllStrategies(): Promise<Strategy[]> {
    console.log("Getting all strategies");
    try {
      return await db.select().from(strategies);
    } catch (error) {
      console.error(`Error getting all strategies: ${error}`);
      throw error;
    }
  }

  async getStrategyById(id: number): Promise<Strategy | undefined> {
    console.log(`Getting strategy with ID ${id}`);
    try {
      const result = await db
        .select()
        .from(strategies)
        .where(eq(strategies.id, id));
      return result[0];
    } catch (error) {
      console.error(`Error getting strategy with ID ${id}: ${error}`);
      throw error;
    }
  }

  async getStrategiesByCategory(category: string): Promise<Strategy[]> {
    console.log(`Getting strategies with category ${category}`);
    try {
      return await db
        .select()
        .from(strategies)
        .where(eq(strategies.category, category));
    } catch (error) {
      console.error(
        `Error getting strategies with category ${category}: ${error}`
      );
      throw error;
    }
  }

  async createStrategy(strategy: InsertStrategy): Promise<Strategy> {
    console.log(`Creating new strategy: ${strategy.name}`);
    try {
      const [newStrategy] = await db
        .insert(strategies)
        .values(strategy)
        .returning();
      return newStrategy;
    } catch (error) {
      console.error(`Error creating strategy: ${error}`);
      throw error;
    }
  }

  async updateStrategy(
    id: number,
    strategy: Partial<InsertStrategy>
  ): Promise<Strategy> {
    console.log(`Updating strategy with ID ${id}`);
    try {
      const [updatedStrategy] = await db
        .update(strategies)
        .set(strategy)
        .where(eq(strategies.id, id))
        .returning();
      return updatedStrategy;
    } catch (error) {
      console.error(`Error updating strategy with ID ${id}: ${error}`);
      throw error;
    }
  }

  async deleteStrategy(id: number): Promise<void> {
    console.log(`Deleting strategy with ID ${id}`);
    try {
      await db.delete(strategies).where(eq(strategies.id, id));
    } catch (error) {
      console.error(`Error deleting strategy with ID ${id}: ${error}`);
      throw error;
    }
  }

  // Goals
  async createGoal(goal: InsertGoal & { patientId: number }): Promise<Goal> {
    console.log(`Creating new goal for patient ${goal.patientId}`);
    try {
      // We need to ensure patientId is included in the goal
      const goalToInsert = {
        ...goal,
      };

      const [newGoal] = await db.insert(goals).values(goalToInsert).returning();
      return newGoal;
    } catch (error) {
      console.error(`Error creating goal: ${error}`);
      throw error;
    }
  }

  async getGoalById(id: number): Promise<Goal | undefined> {
    console.log(`Getting goal with ID ${id}`);
    try {
      const result = await db.select().from(goals).where(eq(goals.id, id));
      return result[0];
    } catch (error) {
      console.error(`Error getting goal with ID ${id}: ${error}`);
      throw error;
    }
  }

  async getGoalsByPatient(patientId: number): Promise<Goal[]> {
    console.log(`Getting goals for patient with ID ${patientId}`);
    try {
      const result = await db
        .select()
        .from(goals)
        .where(eq(goals.patientId, patientId))
        .orderBy(asc(goals.id));

      console.log(
        `Found ${result.length} goals for patient with ID ${patientId}`
      );
      return result;
    } catch (error) {
      console.error(
        `Error getting goals for patient with ID ${patientId}:`,
        error
      );
      throw error;
    }
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal> {
    console.log(`Updating goal with ID ${id}`);
    try {
      const [updatedGoal] = await db
        .update(goals)
        .set(goal)
        .where(eq(goals.id, id))
        .returning();
      return updatedGoal;
    } catch (error) {
      console.error(`Error updating goal with ID ${id}: ${error}`);
      throw error;
    }
  }

  async deleteGoal(id: number): Promise<void> {
    console.log(`Deleting goal with ID ${id}`);
    try {
      await db.delete(goals).where(eq(goals.id, id));
    } catch (error) {
      console.error(`Error deleting goal with ID ${id}: ${error}`);
      throw error;
    }
  }

  // Subgoals
  async createSubgoal(
    goalId: number,
    subgoal: InsertSubgoal
  ): Promise<Subgoal> {
    console.log(
      `Creating subgoal for goal ${goalId}:`,
      JSON.stringify(subgoal)
    );
    try {
      const [newSubgoal] = await db
        .insert(subgoals)
        .values({
          ...subgoal,
          goalId,
        })
        .returning();

      console.log(`Successfully created subgoal with ID ${newSubgoal.id}`);
      return newSubgoal;
    } catch (error) {
      console.error(`Error creating subgoal for goal ${goalId}:`, error);
      throw error;
    }
  }

  async getSubgoalsByGoal(goalId: number): Promise<Subgoal[]> {
    console.log(`Getting subgoals for goal ${goalId}`);
    try {
      const goalSubgoals = await db
        .select()
        .from(subgoals)
        .where(eq(subgoals.goalId, goalId));

      console.log(`Found ${goalSubgoals.length} subgoals for goal ${goalId}`);
      return goalSubgoals;
    } catch (error) {
      console.error(`Error fetching subgoals for goal ${goalId}:`, error);
      throw error;
    }
  }

  async updateSubgoal(id: number, data: Partial<InsertSubgoal>): Promise<Subgoal> {
    console.log(`Updating subgoal with ID ${id}:`, JSON.stringify(data));
    try {
      const [updatedSubgoal] = await db
        .update(subgoals)
        .set(data)
        .where(eq(subgoals.id, id))
        .returning();

      if (!updatedSubgoal) {
        console.error(`Subgoal with ID ${id} not found`);
        throw new Error("Subgoal not found");
      }

      console.log(`Successfully updated subgoal with ID ${id}`);
      return updatedSubgoal;
    } catch (error) {
      console.error(`Error updating subgoal with ID ${id}:`, error);
      throw error;
    }
  }

  async deleteSubgoal(id: number): Promise<void> {
    console.log(`Deleting subgoal with ID ${id}`);
    try {
      await db.delete(subgoals).where(eq(subgoals.id, id));
      console.log(`Successfully deleted subgoal with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting subgoal with ID ${id}:`, error);
      throw error;
    }
  }

  // Goal Assessments (formerly Performance Assessments)
  async getGoalAssessmentsByGoal(goalId: number): Promise<GoalAssessment[]> {
    console.log(`Getting goal assessments for goal ${goalId}`);
    try {
      const assessments = await db
        .select()
        .from(goalAssessments)
        .where(eq(goalAssessments.goalId, goalId))
        .orderBy(asc(goalAssessments.id));

      console.log(
        `Found ${assessments.length} goal assessments for goal ${goalId}`
      );
      return assessments;
    } catch (error) {
      console.error(
        `Error getting goal assessments for goal ${goalId}: ${error}`
      );
      throw error;
    }
  }

  async getGoalAssessmentsBySessionNote(
    sessionNoteId: number
  ): Promise<GoalAssessment[]> {
    console.log(`Getting goal assessments for session note ${sessionNoteId}`);
    try {
      const assessments = await db
        .select()
        .from(goalAssessments)
        .where(eq(goalAssessments.sessionNoteId, sessionNoteId))
        .orderBy(asc(goalAssessments.id));

      console.log(
        `Found ${assessments.length} goal assessments for session note ${sessionNoteId}`
      );
      return assessments;
    } catch (error) {
      console.error(
        `Error getting goal assessments for session note ${sessionNoteId}: ${error}`
      );
      throw error;
    }
  }

  async getGoalAssessmentById(id: number): Promise<GoalAssessment | undefined> {
    console.log(`Getting goal assessment with ID ${id}`);
    try {
      const result = await db
        .select()
        .from(goalAssessments)
        .where(eq(goalAssessments.id, id));

      if (result.length === 0) {
        console.log(`Goal assessment with ID ${id} not found`);
        return undefined;
      }

      console.log(`Found goal assessment with ID ${id}`);
      return result[0];
    } catch (error) {
      console.error(`Error getting goal assessment with ID ${id}: ${error}`);
      throw error;
    }
  }

  async updateGoalAssessment(
    id: number,
    assessment: Partial<InsertGoalAssessment>
  ): Promise<GoalAssessment> {
    console.log(`Updating goal assessment with ID ${id}`);
    try {
      const [updatedAssessment] = await db
        .update(goalAssessments)
        .set(assessment)
        .where(eq(goalAssessments.id, id))
        .returning();
      return updatedAssessment;
    } catch (error) {
      console.error(`Error updating goal assessment with ID ${id}: ${error}`);
      throw error;
    }
  }

  async deleteGoalAssessment(id: number): Promise<void> {
    console.log(`Deleting goal assessment with ID ${id}`);
    try {
      await db.delete(goalAssessments).where(eq(goalAssessments.id, id));
    } catch (error) {
      console.error(`Error deleting goal assessment with ID ${id}: ${error}`);
      throw error;
    }
  }

  async createGoalAssessment(
    assessment: InsertGoalAssessment
  ): Promise<GoalAssessment> {
    console.log(`Creating new goal assessment for goal ${assessment.goalId}`);
    try {
      const [newAssessment] = await db
        .insert(goalAssessments)
        .values(assessment)
        .returning();
      return newAssessment;
    } catch (error) {
      console.error(`Error creating goal assessment: ${error}`);
      throw error;
    }
  }

  //Budget Items
  async createBudgetItem(
    patientId: number,
    budgetSettingsId: number,
    item: InsertBudgetItem
  ): Promise<BudgetItem> {
    console.log(
      `Creating budget item for patient ${patientId} and budgetSettings ${budgetSettingsId}:`,
      JSON.stringify(item)
    );
    try {
      // Process item data for storage
      const processedItem = {
        ...item,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
      };

      // Make sure budgetSettingsId is stored correctly
      const [newBudgetItem] = await db
        .insert(budgetItems)
        .values({
          ...processedItem,
          patientId,
          budgetSettingsId,
        })
        .returning();

      console.log(
        `Successfully created budget item with ID ${newBudgetItem.id}`
      );
      return newBudgetItem;
    } catch (error) {
      console.error(
        `Error creating budget item for patient ${patientId}:`,
        error
      );
      throw error;
    }
  }

  async deleteBudgetItem(id: number): Promise<void> {
    console.log(`Deleting budget item with ID ${id}`);
    try {
      await db.delete(budgetItems).where(eq(budgetItems.id, id));
      console.log(`Successfully deleted budget item with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting budget item with ID ${id}:`, error);
      throw error;
    }
  }

  async updateBudgetItem(
    id: number,
    item: Partial<InsertBudgetItem>
  ): Promise<BudgetItem> {
    console.log(`Updating budget item with ID ${id}:`, JSON.stringify(item));
    try {
      // Process item data for storage
      const processedItem: Partial<InsertBudgetItem> = {
        ...item,
      };

      // Convert values to numbers if present
      if (item.unitPrice !== undefined) {
        processedItem.unitPrice = Number(item.unitPrice);
      }

      if (item.quantity !== undefined) {
        processedItem.quantity = Number(item.quantity);
      }

      const [updatedBudgetItem] = await db
        .update(budgetItems)
        .set(processedItem)
        .where(eq(budgetItems.id, id))
        .returning();

      if (!updatedBudgetItem) {
        console.error(`Budget item with ID ${id} not found`);
        throw new Error("Budget item not found");
      }

      console.log(`Successfully updated budget item with ID ${id}`);
      return updatedBudgetItem;
    } catch (error) {
      console.error(`Error updating budget item with ID ${id}:`, error);
      throw error;
    }
  }

  async getBudgetItemsByPatientId(patientId: number): Promise<BudgetItem[]> {
    console.log(`Getting budget items for patient ${patientId}`);
    try {
      const patientBudgetItems = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.patientId, patientId));

      console.log(
        `Found ${patientBudgetItems.length} budget items for patient ${patientId}`
      );
      return patientBudgetItems;
    } catch (error) {
      console.error(
        `Error fetching budget items for patient ${patientId}:`,
        error
      );
      throw error;
    }
  }

  // Budget Item Catalog methods
  async createBudgetItemCatalog(
    item: InsertBudgetItemCatalog
  ): Promise<BudgetItemCatalog> {
    console.log(`Creating budget item catalog entry:`, JSON.stringify(item));
    try {
      const processedItem = {
        ...item,
        defaultUnitPrice: Number(item.defaultUnitPrice || 0),
      };

      const [newCatalogItem] = await db
        .insert(budgetItemCatalog)
        .values(processedItem)
        .returning();

      console.log(
        `Successfully created budget item catalog entry with ID ${newCatalogItem.id}`
      );
      return newCatalogItem;
    } catch (error) {
      console.error(`Error creating budget item catalog entry:`, error);
      throw error;
    }
  }

  async getBudgetItemCatalog(): Promise<BudgetItemCatalog[]> {
    console.log(`Getting all budget item catalog entries`);
    try {
      const catalogItems = await db.select().from(budgetItemCatalog);

      console.log(`Found ${catalogItems.length} budget item catalog entries`);
      return catalogItems;
    } catch (error) {
      console.error(`Error fetching budget item catalog:`, error);
      throw error;
    }
  }

  async getBudgetItemCatalogByCode(
    itemCode: string
  ): Promise<BudgetItemCatalog | undefined> {
    console.log(`Getting budget item catalog entry with code ${itemCode}`);
    try {
      const result = await db
        .select()
        .from(budgetItemCatalog)
        .where(eq(budgetItemCatalog.itemCode, itemCode));

      if (result.length === 0) {
        console.log(
          `Budget item catalog entry with code ${itemCode} not found`
        );
        return undefined;
      }

      console.log(`Found budget item catalog entry for code ${itemCode}`);
      return result[0];
    } catch (error) {
      console.error(
        `Error fetching budget item catalog entry with code ${itemCode}:`,
        error
      );
      throw error;
    }
  }

  async updateBudgetItemCatalog(
    id: number,
    item: InsertBudgetItemCatalog
  ): Promise<BudgetItemCatalog> {
    console.log(
      `Updating budget item catalog entry with ID ${id}:`,
      JSON.stringify(item)
    );
    try {
      const processedItem = {
        ...item,
        defaultUnitPrice: Number(item.defaultUnitPrice || 0),
      };

      const [updatedCatalogItem] = await db
        .update(budgetItemCatalog)
        .set(processedItem)
        .where(eq(budgetItemCatalog.id, id))
        .returning();

      if (!updatedCatalogItem) {
        console.error(`Budget item catalog entry with ID ${id} not found`);
        throw new Error("Budget item catalog entry not found");
      }

      console.log(
        `Successfully updated budget item catalog entry with ID ${id}`
      );
      return updatedCatalogItem;
    } catch (error) {
      console.error(
        `Error updating budget item catalog entry with ID ${id}:`,
        error
      );
      throw error;
    }
  }

  // Budget Settings
  async getBudgetSettings(
    patientId: number
  ): Promise<BudgetSettings | undefined> {
    console.log(`Getting budget settings for patient with ID ${patientId}`);
    try {
      const result = await db
        .select()
        .from(budgetSettings)
        .where(eq(budgetSettings.patientId, patientId));
      return result[0];
    } catch (error) {
      console.error(
        `Error getting budget settings for patient with ID ${patientId}: ${error}`
      );
      throw error;
    }
  }

  async createBudgetSettings(
    settings: InsertBudgetSettings & { patientId: number }
  ): Promise<BudgetSettings> {
    console.log(`Creating budget settings for patient ${settings.patientId}`);
    try {
      // We need to ensure patientId is included in the settings
      const settingsToInsert = {
        ...settings,
      };

      const [newSettings] = await db
        .insert(budgetSettings)
        .values(settingsToInsert)
        .returning();
      return newSettings;
    } catch (error) {
      console.error(`Error creating budget settings: ${error}`);
      throw error;
    }
  }

  async getBudgetSettingsByPatientId(
    patientId: number
  ): Promise<BudgetSettings | undefined> {
    console.log(`Getting budget settings for patient ${patientId}`);
    try {
      const result = await db
        .select()
        .from(budgetSettings)
        .where(eq(budgetSettings.patientId, patientId));

      if (result.length === 0) {
        console.log(`Budget settings for patient ${patientId} not found`);
        return undefined;
      }

      // Find and return the active budget settings
      const activeSetting = result.find((setting) => setting.isActive);

      console.log(`Found budget settings for patient ${patientId}`);
      return activeSetting || result[0]; // Return active or first one if no active is found
    } catch (error) {
      console.error(
        `Error fetching budget settings for patient ${patientId}:`,
        error
      );
      throw error;
    }
  }

  // New method to get all budget settings for a client
  async getAllBudgetSettingsByPatientId(
    patientId: number
  ): Promise<BudgetSettings[]> {
    console.log(`Getting all budget settings for patient ${patientId}`);
    try {
      const result = await db
        .select()
        .from(budgetSettings)
        .where(eq(budgetSettings.patientId, patientId));

      console.log(
        `Found ${result.length} budget settings for patient ${patientId}`
      );
      return result;
    } catch (error) {
      console.error(
        `Error fetching all budget settings for patient ${patientId}:`,
        error
      );
      throw error;
    }
  }

  async updateBudgetSettings(
    patientId: number,
    settings: Partial<InsertBudgetSettings>
  ): Promise<BudgetSettings> {
    console.log(`Updating budget settings for patient with ID ${patientId}`);
    try {
      const [updatedSettings] = await db
        .update(budgetSettings)
        .set(settings)
        .where(eq(budgetSettings.patientId, patientId))
        .returning();
      return updatedSettings;
    } catch (error) {
      console.error(
        `Error updating budget settings for patient with ID ${patientId}: ${error}`
      );
      throw error;
    }
  }

  // Dashboard related methods
  async getDashboardAppointmentStats(
    timeframe: "day" | "week" | "month" | "year"
  ): Promise<AppointmentStats> {
    console.log(
      `Getting dashboard appointment stats with timeframe: ${timeframe}`
    );
    try {
      // Get session data from the database
      const allSessions = await db.select().from(sessions);
      console.log(`Found ${allSessions.length} sessions in database`);

      // Initialize stats with empty arrays
      const stats: AppointmentStats = {
        daily: [],
        weekly: [],
        monthly: [],
        yearly: [],
      };

      if (allSessions.length === 0) {
        return stats;
      }

      // Group sessions by day, week, month, and year
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      // Filter to sessions within the last year
      const recentSessions = allSessions.filter((session) => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= oneYearAgo && sessionDate <= today;
      });

      // Process stats based on timeframe
      const dailyStats = this.processDailyStats(recentSessions);
      const weeklyStats = this.processWeeklyStats(recentSessions);
      const monthlyStats = this.processMonthlyStats(recentSessions);
      const yearlyStats = this.processYearlyStats(recentSessions);

      return {
        daily: dailyStats,
        weekly: weeklyStats,
        monthly: monthlyStats,
        yearly: yearlyStats,
      };
    } catch (error) {
      console.error("Error getting dashboard appointment stats:", error);
      throw error;
    }
  }

  async getBudgetExpirationStats(
    months: number
  ): Promise<BudgetExpirationStats> {
    console.log(
      `Getting budget expiration stats for the next ${months} months`
    );
    try {
      // Get all budget settings and join with patients
      const allBudgetSettings = await db.select().from(budgetSettings);
      const allPatients = await db.select().from(patients);

      // Get all budget items for calculating used funds
      const allBudgetItems = await db.select().from(budgetItems);

      // Identify which plans expire next month
      const today = new Date();
      const nextMonthStart = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1
      );
      const nextMonthEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 2,
        0
      );

      // Find plans expiring next month
      const expiringPlans = allBudgetSettings.filter((plan) => {
        if (!plan.endOfPlan) return false;

        const endDate = new Date(plan.endOfPlan);
        return endDate >= nextMonthStart && endDate <= nextMonthEnd;
      });

      // Format client info for expiring plans
      const expiringClientsInfo = expiringPlans.map((plan) => {
        const patient = allPatients.find((c) => c.id === plan.patientId);
        return {
          patientId: plan.patientId,
          patientName: patient ? patient.name : `Patient ${plan.patientId}`,
          planId: plan.id,
          planName: plan.planCode || `Plan ${plan.id}`,
        };
      });

      // Calculate remaining funds by month for the requested number of months
      const monthlyData = Array.from({ length: months }, (_, i) => {
        const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        // Format for display: MMM YYYY
        const monthLabel = month.toISOString().split("T")[0].substring(0, 7);

        // Find plans active during this month
        const activePlans = allBudgetSettings.filter((plan) => {
          if (!plan.endOfPlan) return true; // Plans with no end date are considered active

          const endDate = new Date(plan.endOfPlan);
          return endDate >= month;
        });

        // Calculate total funds and remaining funds
        let totalRemainingAmount = 0;

        activePlans.forEach((plan) => {
          // Calculate used funds for this plan
          const planItems = allBudgetItems.filter(
            (item) => item.budgetSettingsId === plan.id
          );

          const usedFunds = planItems.reduce(
            (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
            0
          );

          // Add remaining funds to total
          const planRemainingFunds = Number(plan.ndisFunds) - usedFunds;
          if (planRemainingFunds > 0) {
            totalRemainingAmount += planRemainingFunds;
          }
        });

        return {
          month: monthLabel,
          amount: totalRemainingAmount,
          planCount: activePlans.length,
        };
      });

      return {
        expiringNextMonth: {
          count: expiringPlans.length,
          byPatient: expiringClientsInfo,
        },
        remainingFunds: monthlyData,
      };
    } catch (error) {
      console.error("Error getting budget expiration stats:", error);
      throw error;
    }
  }

  async getUpcomingTaskStats(months: number): Promise<UpcomingTaskStats> {
    console.log(`Getting upcoming task stats for the next ${months} months`);
    try {
      // Get all sessions to calculate future tasks
      const allSessions = await db.select().from(sessions);

      // Generate data for the next X months
      const today = new Date();
      const monthlyData = Array.from({ length: months }, (_, i) => {
        const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        // Format for display: YYYY-MM
        const monthLabel = month.toISOString().split("T")[0].substring(0, 7);

        // Calculate upcoming sessions for different task types
        const monthSessions = allSessions.filter((session) => {
          const sessionDate = new Date(session.sessionDate);
          return sessionDate >= month && sessionDate <= monthEnd;
        });

        // Categorize sessions based on title/description
        // This is a simplification - in a real system, you'd have actual task types
        const reports = monthSessions.filter(
          (s) =>
            s.title.toLowerCase().includes("report") ||
            (s.description && s.description.toLowerCase().includes("report"))
        ).length;

        const letters = monthSessions.filter(
          (s) =>
            s.title.toLowerCase().includes("letter") ||
            (s.description && s.description.toLowerCase().includes("letter"))
        ).length;

        const assessments = monthSessions.filter(
          (s) =>
            s.title.toLowerCase().includes("assessment") ||
            (s.description &&
              s.description.toLowerCase().includes("assessment"))
        ).length;

        // Count other sessions (those not in above categories)
        const categorizedCount = reports + letters + assessments;
        const other = Math.max(0, monthSessions.length - categorizedCount);

        return {
          month: monthLabel,
          reports,
          letters,
          assessments,
          other,
        };
      });

      return {
        byMonth: monthlyData,
      };
    } catch (error) {
      console.error("Error getting upcoming task stats:", error);
      throw error;
    }
  }

  // Helper methods for processing appointment stats
  private processDailyStats(
    sessions: Session[]
  ): Array<{ period: string; count: number; percentChange?: number }> {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    }).reverse();

    const dailyCounts = last30Days.map((day) => {
      const count = sessions.filter((session) => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate.toISOString().split("T")[0] === day;
      }).length;

      return {
        period: day,
        count,
        percentChange: undefined as number | undefined,
      };
    });

    // Calculate percent changes
    for (let i = 1; i < dailyCounts.length; i++) {
      const prevCount = dailyCounts[i - 1].count;
      const currCount = dailyCounts[i].count;

      if (prevCount > 0) {
        dailyCounts[i].percentChange =
          ((currCount - prevCount) / prevCount) * 100;
      }
    }

    return dailyCounts;
  }

  private processWeeklyStats(
    sessions: Session[]
  ): Array<{ period: string; count: number; percentChange?: number }> {
    // Group by week for the last 12 weeks
    const last12Weeks = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Sunday of week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Saturday of week

      return {
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.toISOString().split("T")[0]} to ${
          weekEnd.toISOString().split("T")[0]
        }`,
      };
    }).reverse();

    const weeklyCounts = last12Weeks.map((week) => {
      const count = sessions.filter((session) => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= week.start && sessionDate <= week.end;
      }).length;

      return {
        period: week.label,
        count,
        percentChange: undefined as number | undefined,
      };
    });

    // Calculate percent changes
    for (let i = 1; i < weeklyCounts.length; i++) {
      const prevCount = weeklyCounts[i - 1].count;
      const currCount = weeklyCounts[i].count;

      if (prevCount > 0) {
        weeklyCounts[i].percentChange =
          ((currCount - prevCount) / prevCount) * 100;
      }
    }

    return weeklyCounts;
  }

  private processMonthlyStats(
    sessions: Session[]
  ): Array<{ period: string; count: number; percentChange?: number }> {
    // Group by month for the last 12 months
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      const monthName = monthStart.toLocaleString("default", { month: "long" });
      return {
        start: monthStart,
        end: monthEnd,
        label: `${monthName} ${year}`,
      };
    }).reverse();

    const monthlyCounts = last12Months.map((month) => {
      const count = sessions.filter((session) => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= month.start && sessionDate <= month.end;
      }).length;

      return {
        period: month.label,
        count,
        percentChange: undefined as number | undefined,
      };
    });

    // Calculate percent changes
    for (let i = 1; i < monthlyCounts.length; i++) {
      const prevCount = monthlyCounts[i - 1].count;
      const currCount = monthlyCounts[i].count;

      if (prevCount > 0) {
        monthlyCounts[i].percentChange =
          ((currCount - prevCount) / prevCount) * 100;
      }
    }

    return monthlyCounts;
  }

  private processYearlyStats(
    sessions: Session[]
  ): Array<{ period: string; count: number; percentChange?: number }> {
    // Group by year for the last 3 years
    const last3Years = Array.from({ length: 3 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      return {
        start: yearStart,
        end: yearEnd,
        label: `${year}`,
      };
    }).reverse();

    const yearlyCounts = last3Years.map((year) => {
      const count = sessions.filter((session) => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= year.start && sessionDate <= year.end;
      }).length;

      return {
        period: year.label,
        count,
        percentChange: undefined as number | undefined,
      };
    });

    // Calculate percent changes
    for (let i = 1; i < yearlyCounts.length; i++) {
      const prevCount = yearlyCounts[i - 1].count;
      const currCount = yearlyCounts[i].count;

      if (prevCount > 0) {
        yearlyCounts[i].percentChange =
          ((currCount - prevCount) / prevCount) * 100;
      }
    }

    return yearlyCounts;
  }

  async getSessionsByPatientId(patientId: number): Promise<Session[]> {
    console.log(`Getting sessions for patient ${patientId}`);
    try {
      // First get all sessions for this patient
      const patientSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.patientId, patientId));

      console.log(
        `Found ${patientSessions.length} sessions for patient ${patientId}`
      );

      // Now get all session notes for these sessions
      if (patientSessions.length > 0) {
        const sessionIds = patientSessions.map((session) => session.id);
        console.log(`Fetching session notes for ${sessionIds.length} sessions`);

        // Use direct SQL query to get all notes for these sessions
        // This approach is more efficient and guarantees we get all needed data
        const query = `
          SELECT * FROM session_notes 
          WHERE session_id IN (${sessionIds.join(",")})
        `;

        const result = await db.execute(sql.raw(query));
        const notes = result.rows || [];

        console.log(
          `Found ${notes.length} session notes using direct SQL query`
        );

        // Attach notes to their sessions
        const sessionsWithNotes = patientSessions.map((session) => {
          // Find the corresponding session note
          const sessionNote = notes.find(
            (note) => note.session_id === session.id
          );

          if (!sessionNote) {
            console.log(`No session note found for session ${session.id}`);
            return {
              ...session,
              sessionNote: null,
            };
          }

          // Convert column names from snake_case to camelCase for API consistency
          const formattedNote = {
            id: sessionNote.id,
            sessionId: sessionNote.session_id,
            clientId: sessionNote.client_id,
            presentAllies: sessionNote.present_allies || [],
            moodRating: sessionNote.mood_rating,
            physicalActivityRating: sessionNote.physical_activity_rating,
            focusRating: sessionNote.focus_rating,
            cooperationRating: sessionNote.cooperation_rating,
            notes: sessionNote.notes,
            status: sessionNote.status,
            createdAt: sessionNote.created_at,
            updatedAt: sessionNote.updated_at,
            // Properly handle products data - parse JSON string for client consumption
            products: sessionNote.products
              ? typeof sessionNote.products === "string"
                ? JSON.parse(sessionNote.products)
                : sessionNote.products
              : "[]",
          };

          console.log(
            `Attached session note ${formattedNote.id} to session ${session.id}`
          );

          return {
            ...session,
            sessionNote: formattedNote,
          };
        });

        return sessionsWithNotes;
      }

      return patientSessions;
    } catch (error) {
      console.error(`Error fetching sessions for patient ${patientId}:`, error);
      throw error;
    }
  }

  // Sessions methods implementation
  async createSession(session: InsertSession): Promise<Session> {
    console.log(`Creating session:`, JSON.stringify(session));
    try {
      const [newSession] = await db
        .insert(sessions)
        .values(session)
        .returning();

      console.log(`Successfully created session with ID ${newSession.id}`);
      return newSession;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }

  async getSessionById(id: number): Promise<Session | undefined> {
    console.log(`Getting session with ID ${id}`);
    try {
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id));

      if (result.length === 0) {
        console.log(`Session with ID ${id} not found`);
        return undefined;
      }

      console.log(`Found session with ID ${id}`);
      return result[0];
    } catch (error) {
      console.error(`Error fetching session with ID ${id}:`, error);
      throw error;
    }
  }

  async getAllSessions(): Promise<Session[]> {
    console.log(`Getting all sessions`);
    try {
      const allSessions = await db.select().from(sessions);
      console.log(`Found ${allSessions.length} sessions`);
      return allSessions;
    } catch (error) {
      console.error("Error fetching all sessions:", error);
      throw error;
    }
  }

  async updateSession(id: number, session: InsertSession): Promise<Session> {
    console.log(`Updating session with ID ${id}:`, JSON.stringify(session));
    try {
      const [updatedSession] = await db
        .update(sessions)
        .set(session)
        .where(eq(sessions.id, id))
        .returning();

      if (!updatedSession) {
        console.error(`Session with ID ${id} not found`);
        throw new Error("Session not found");
      }

      console.log(`Successfully updated session with ID ${id}`);
      return updatedSession;
    } catch (error) {
      console.error(`Error updating session with ID ${id}:`, error);
      throw error;
    }
  }

  async deleteSession(id: number): Promise<void> {
    console.log(`Deleting session with ID ${id}`);
    try {
      await db.delete(sessions).where(eq(sessions.id, id));
      console.log(`Successfully deleted session with ID ${id}`);
    } catch (error) {
      console.error(`Error deleting session with ID ${id}:`, error);
      throw error;
    }
  }

  // Session Notes
  async createSessionNote(note: InsertSessionNote): Promise<SessionNote> {
    console.log(`Creating new session note for patient ${note.patientId}`);
    try {
      const [newNote] = await db.insert(sessionNotes).values(note).returning();
      return newNote;
    } catch (error) {
      console.error(`Error creating session note: ${error}`);
      throw error;
    }
  }

  async getSessionNoteById(id: number): Promise<SessionNote | undefined> {
    console.log(`Getting session note with ID ${id}`);
    try {
      const result = await db
        .select()
        .from(sessionNotes)
        .where(eq(sessionNotes.id, id));
      return result[0];
    } catch (error) {
      console.error(`Error getting session note with ID ${id}: ${error}`);
      throw error;
    }
  }

  async getSessionNotesByPatient(patientId: number): Promise<SessionNote[]> {
    console.log(`Getting session notes for patient with ID ${patientId}`);
    try {
      return await db
        .select()
        .from(sessionNotes)
        .where(eq(sessionNotes.patientId, patientId))
        .orderBy(desc(sessionNotes.createdAt));
    } catch (error) {
      console.error(
        `Error getting session notes for patient with ID ${patientId}: ${error}`
      );
      throw error;
    }
  }

  async getSessionNoteBySessionId(
    sessionId: number
  ): Promise<SessionNote | undefined> {
    console.log(`Getting session note for session ${sessionId}`);
    try {
      const result = await db
        .select()
        .from(sessionNotes)
        .where(eq(sessionNotes.sessionId, sessionId));

      if (result.length === 0) {
        console.log(`No session note found for session ${sessionId}`);
        return undefined;
      }

      // Parse products if it exists
      const sessionNote = result[0];
      if (sessionNote.products && typeof sessionNote.products === "string") {
        try {
          sessionNote.products = JSON.parse(sessionNote.products);
        } catch (e) {
          console.error(
            `Error parsing products for session note ${sessionNote.id}:`,
            e
          );
          sessionNote.products = "[]";
        }
      }

      console.log(
        `Found session note for session ${sessionId} with ${
          Array.isArray(sessionNote.products) ? sessionNote.products.length : 0
        } products`
      );
      return sessionNote;
    } catch (error) {
      console.error(
        `Error getting session note for session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  async getSessionNotesWithProductsByPatientId(
    patientId: number
  ): Promise<SessionNote[]> {
    console.log(`Getting session notes with products for patient ${patientId}`);
    try {
      // First get all sessions for this patient
      const sessions = await this.getSessionsByPatientId(patientId);
      console.log(`Found ${sessions.length} sessions for patient ${patientId}`);

      // Then get notes for all these sessions
      const sessionIds = sessions.map((session) => session.id);

      // If no sessions, return empty array
      if (sessionIds.length === 0) {
        return [];
      }

      // Get session notes for all sessions
      const notes: SessionNote[] = [];
      for (const sessionId of sessionIds) {
        try {
          const note = await this.getSessionNoteBySessionId(sessionId);
          if (note) {
            notes.push(note);
          }
        } catch (e) {
          console.error(
            `Error fetching session note for session ${sessionId}:`,
            e
          );
        }
      }

      console.log(
        `Found ${notes.length} session notes with products for patient ${patientId}`
      );
      return notes;
    } catch (error) {
      console.error(
        `Error getting session notes with products for patient ${patientId}:`,
        error
      );
      throw error;
    }
  }

  async updateSessionNote(
    id: number,
    note: Partial<InsertSessionNote>
  ): Promise<SessionNote> {
    console.log(`Updating session note with ID ${id}`);
    try {
      const [updatedNote] = await db
        .update(sessionNotes)
        .set(note)
        .where(eq(sessionNotes.id, id))
        .returning();
      return updatedNote;
    } catch (error) {
      console.error(`Error updating session note with ID ${id}: ${error}`);
      throw error;
    }
  }

  async deleteSessionNote(id: number): Promise<void> {
    console.log(`Deleting session note with ID ${id}`);
    try {
      await db.delete(sessionNotes).where(eq(sessionNotes.id, id));
    } catch (error) {
      console.error(`Error deleting session note with ID ${id}: ${error}`);
      throw error;
    }
  }

  async getGoalPerformanceData(
    patientIdOrGoalId: number,
    goalIdOrDateRange?: number | DateRangeParams,
    dateRange?: DateRangeParams
  ): Promise<GoalAssessment[]> {
    // Determine if first parameter is patientId or goalId
    let patientId: number | undefined;
    let goalId: number | undefined;
    let dateRangeParam: DateRangeParams | undefined;

    if (typeof goalIdOrDateRange === "number") {
      // Case: getGoalPerformanceData(patientId, goalId, dateRange?)
      patientId = patientIdOrGoalId;
      goalId = goalIdOrDateRange;
      dateRangeParam = dateRange;
    } else {
      // Case: getGoalPerformanceData(goalId, dateRange?)
      goalId = patientIdOrGoalId;
      dateRangeParam = goalIdOrDateRange;
    }

    console.log(
      `Getting performance data for goal ${goalId}${
        patientId ? ` of patient ${patientId}` : ""
      }`
    );

    try {
      // We'll build our conditions array and then apply them all at once
      let conditions = [];
      
      // Add goal or patient conditions
      if (goalId) {
        conditions.push(eq(goalAssessments.goalId, goalId));
      } else if (patientId) {
        // Get all goals for this patient
        const patientGoals = await this.getGoalsByPatient(patientId);
        if (patientGoals.length === 0) {
          console.log(`No goals found for patient ${patientId}`);
          return [];
        }

        const goalIds = patientGoals.map((goal) => goal.id);
        conditions.push(inArray(goalAssessments.goalId, goalIds));
      }

      let assessments: GoalAssessment[];
      
      if (dateRangeParam) {
        // If we have date filtering, we need to join with sessions
        const query = db
          .select({
            goalAssessment: goalAssessments
          })
          .from(goalAssessments)
          .innerJoin(sessionNotes, eq(goalAssessments.sessionNoteId, sessionNotes.id))
          .innerJoin(sessions, eq(sessionNotes.sessionId, sessions.id));
        
        // Add date conditions if provided
        if (dateRangeParam.startDate) {
          conditions.push(gte(sessions.sessionDate, dateRangeParam.startDate));
        }
        
        if (dateRangeParam.endDate) {
          conditions.push(lte(sessions.sessionDate, dateRangeParam.endDate));
        }
        
        // Apply all conditions with AND
        if (conditions.length > 0) {
          query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
        }
        
        // Add ordering
        query.orderBy(asc(goalAssessments.id));
        
        // Execute the query and extract just the goal assessment data
        const results = await query;
        assessments = results.map(result => result.goalAssessment);
      } else {
        // Simple query without joins if no date filtering
        const query = db.select().from(goalAssessments);
        
        // Apply all conditions with AND
        if (conditions.length > 0) {
          query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
        }
        
        // Add ordering
        query.orderBy(asc(goalAssessments.id));
        
        // Execute the query
        assessments = await query;
      }

      console.log(
        `Found ${assessments.length} assessments${
          goalId ? ` for goal ${goalId}` : ""
        }${patientId ? ` of patient ${patientId}` : ""}`
      );
      return assessments;
    } catch (error) {
      console.error(
        `Error getting performance data${goalId ? ` for goal ${goalId}` : ""}${
          patientId ? ` of patient ${patientId}` : ""
        }:`,
        error
      );
      throw error;
    }
  }
}
