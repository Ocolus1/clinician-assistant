import { db } from "../db";
import { 
  patients, 
  goals, 
  subgoals, 
  sessions, 
  sessionNotes, 
  goalAssessments, 
  strategies, 
  clinicians,
  patientClinicians,
  caregivers,
  budgetSettings,
  budgetItems
} from "../../shared/schema";
import { eq, like, and, or, desc, asc, sql, inArray, gte, lte, between, ne } from "drizzle-orm";

/**
 * PatientQueriesService
 * 
 * Handles common patient-related queries for the clinician chatbot.
 * Uses Drizzle-ORM for type-safe database queries.
 * Each method is designed to handle a specific type of query about patients.
 */
export class PatientQueriesService {
  
  /**
   * Find patients by name (full or partial match)
   * 
   * @param nameQuery - The name or partial name to search for
   * @param limit - Maximum number of results to return (default: 5)
   * @returns Array of matching patients with basic info
   */
  async findPatientsByName(nameQuery: string, limit: number = 5) {
    try {
      // Check if the query might be a unique identifier (6-digit code)
      const isUniqueIdentifier = /^\d{6}$/.test(nameQuery.trim());
      
      // Search across all name-related fields
      return await db
        .select({
          id: patients.id,
          name: patients.name,
          originalName: patients.originalName,
          uniqueIdentifier: patients.uniqueIdentifier,
          dateOfBirth: patients.dateOfBirth,
          gender: patients.gender,
          contactEmail: patients.contactEmail,
          contactPhone: patients.contactPhone
        })
        .from(patients)
        .where(
          isUniqueIdentifier
            ? eq(patients.uniqueIdentifier, nameQuery.trim())
            : or(
                like(patients.name, `%${nameQuery}%`),
                like(patients.originalName, `%${nameQuery}%`),
                // Also check if the query is part of a combined name+identifier
                like(patients.name, `%${nameQuery}%#%`),
                like(patients.name, `%${nameQuery} #%`)
              )
        )
        .limit(limit);
    } catch (error) {
      console.error("Error finding patients by name:", error);
      throw new Error("Failed to find patients by name");
    }
  }

  /**
   * Get detailed information about a specific patient
   * 
   * @param patientId - The ID of the patient
   * @returns Detailed patient information including contact details
   */
  async getPatientDetails(patientId: number) {
    try {
      const patientDetails = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);
      
      if (patientDetails.length === 0) {
        throw new Error(`Patient with ID ${patientId} not found`);
      }
      
      return patientDetails[0];
    } catch (error) {
      console.error("Error getting patient details:", error);
      throw new Error("Failed to get patient details");
    }
  }

  /**
   * Get all goals for a specific patient
   * 
   * @param patientId - The ID of the patient
   * @returns Array of goals with their status and importance level
   */
  async getPatientGoals(patientId: number) {
    try {
      return await db
        .select({
          id: goals.id,
          title: goals.title,
          description: goals.description,
          importanceLevel: goals.importanceLevel,
          status: goals.status,
          createdAt: goals.createdAt,
          updatedAt: goals.updatedAt
        })
        .from(goals)
        .where(eq(goals.patientId, patientId))
        .orderBy(desc(goals.importanceLevel));
    } catch (error) {
      console.error("Error getting patient goals:", error);
      throw new Error("Failed to get patient goals");
    }
  }

  /**
   * Get all subgoals for a specific goal
   * 
   * @param goalId - The ID of the goal
   * @returns Array of subgoals with their status and completion date
   */
  async getGoalSubgoals(goalId: number) {
    try {
      return await db
        .select({
          id: subgoals.id,
          title: subgoals.title,
          description: subgoals.description,
          status: subgoals.status,
          completionDate: subgoals.completionDate,
          createdAt: subgoals.createdAt,
          updatedAt: subgoals.updatedAt
        })
        .from(subgoals)
        .where(eq(subgoals.goalId, goalId));
    } catch (error) {
      console.error("Error getting goal subgoals:", error);
      throw new Error("Failed to get goal subgoals");
    }
  }

  /**
   * Get all sessions for a specific patient
   * 
   * @param patientId - The ID of the patient
   * @param limit - Maximum number of sessions to return (default: 10)
   * @returns Array of sessions with date, duration, and status
   */
  async getPatientSessions(patientId: number, limit: number = 10) {
    try {
      return await db
        .select({
          id: sessions.id,
          title: sessions.title,
          description: sessions.description,
          sessionDate: sessions.sessionDate,
          duration: sessions.duration,
          status: sessions.status,
          therapistId: sessions.therapistId
        })
        .from(sessions)
        .where(eq(sessions.patientId, patientId))
        .orderBy(desc(sessions.sessionDate))
        .limit(limit);
    } catch (error) {
      console.error("Error getting patient sessions:", error);
      throw new Error("Failed to get patient sessions");
    }
  }

  /**
   * Get the most recent session for a specific patient
   * 
   * @param patientId - The ID of the patient
   * @returns The most recent session or null if no sessions exist
   */
  async getPatientMostRecentSession(patientId: number) {
    try {
      const sessions = await db
        .select({
          id: sessions.id,
          title: sessions.title,
          description: sessions.description,
          sessionDate: sessions.sessionDate,
          duration: sessions.duration,
          status: sessions.status,
          therapistId: sessions.therapistId
        })
        .from(sessions)
        .where(eq(sessions.patientId, patientId))
        .orderBy(desc(sessions.sessionDate))
        .limit(1);
      
      return sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      console.error("Error getting patient's most recent session:", error);
      throw new Error("Failed to get patient's most recent session");
    }
  }

  /**
   * Get the next scheduled session for a specific patient
   * 
   * @param patientId - The ID of the patient
   * @returns The next scheduled session or null if no future sessions exist
   */
  async getPatientNextSession(patientId: number) {
    try {
      const currentDate = new Date();
      
      const futureSessions = await db
        .select({
          id: sessions.id,
          title: sessions.title,
          description: sessions.description,
          sessionDate: sessions.sessionDate,
          duration: sessions.duration,
          status: sessions.status,
          therapistId: sessions.therapistId
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.patientId, patientId),
            gte(sessions.sessionDate, currentDate)
          )
        )
        .orderBy(asc(sessions.sessionDate))
        .limit(1);
      
      return futureSessions.length > 0 ? futureSessions[0] : null;
    } catch (error) {
      console.error("Error getting patient's next session:", error);
      throw new Error("Failed to get patient's next session");
    }
  }

  /**
   * Get notes for a specific session
   * 
   * @param sessionId - The ID of the session
   * @returns Session notes including mood rating and present caregivers
   */
  async getSessionNotes(sessionId: number) {
    try {
      return await db
        .select()
        .from(sessionNotes)
        .where(eq(sessionNotes.sessionId, sessionId))
        .limit(1);
    } catch (error) {
      console.error("Error getting session notes:", error);
      throw new Error("Failed to get session notes");
    }
  }

  /**
   * Get goal assessments for a specific session note
   * 
   * @param sessionNoteId - The ID of the session note
   * @returns Array of goal assessments with achievement level and notes
   */
  async getGoalAssessments(sessionNoteId: number) {
    try {
      return await db
        .select({
          id: goalAssessments.id,
          goalId: goalAssessments.goalId,
          subgoalId: goalAssessments.subgoalId,
          achievementLevel: goalAssessments.achievementLevel,
          score: goalAssessments.score,
          notes: goalAssessments.notes
        })
        .from(goalAssessments)
        .where(eq(goalAssessments.sessionNoteId, sessionNoteId));
    } catch (error) {
      console.error("Error getting goal assessments:", error);
      throw new Error("Failed to get goal assessments");
    }
  }

  /**
   * Get all caregivers for a specific patient
   * 
   * @param patientId - The ID of the patient
   * @returns Array of caregivers with their relationship to the patient
   */
  async getPatientCaregivers(patientId: number) {
    try {
      return await db
        .select({
          id: caregivers.id,
          name: caregivers.name,
          relationship: caregivers.relationship,
          email: caregivers.email,
          phone: caregivers.phone
        })
        .from(caregivers)
        .where(eq(caregivers.patientId, patientId));
    } catch (error) {
      console.error("Error getting patient caregivers:", error);
      throw new Error("Failed to get patient caregivers");
    }
  }

  /**
   * Get all clinicians for a specific patient
   * 
   * @param patientId - The ID of the patient
   * @returns Array of clinicians with their role
   */
  async getPatientClinicians(patientId: number) {
    try {
      return await db
        .select({
          clinicianId: patientClinicians.clinicianId,
          role: patientClinicians.role,
          name: clinicians.name,
          title: clinicians.title,
          email: clinicians.email,
          specialization: clinicians.specialization
        })
        .from(patientClinicians)
        .innerJoin(
          clinicians,
          eq(patientClinicians.clinicianId, clinicians.id)
        )
        .where(eq(patientClinicians.patientId, patientId));
    } catch (error) {
      console.error("Error getting patient clinicians:", error);
      throw new Error("Failed to get patient clinicians");
    }
  }

  /**
   * Get budget information for a specific patient
   * 
   * @param patientId - The ID of the patient
   * @returns Budget settings and items for the patient
   */
  async getPatientBudget(patientId: number) {
    try {
      const settings = await db
        .select()
        .from(budgetSettings)
        .where(eq(budgetSettings.patientId, patientId))
        .limit(1);
      
      if (settings.length === 0) {
        return { settings: null, items: [] };
      }
      
      const items = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.budgetSettingsId, settings[0].id));
      
      return {
        settings: settings[0],
        items
      };
    } catch (error) {
      console.error("Error getting patient budget:", error);
      throw new Error("Failed to get patient budget");
    }
  }

  /**
   * Get patients with budget plans expiring soon
   * 
   * @param daysThreshold - Number of days to look ahead (default: 30)
   * @returns Array of patients with expiring budget plans
   */
  async getPatientsWithExpiringBudgets(daysThreshold: number = 30) {
    try {
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + daysThreshold);
      
      // Convert dates to ISO string format for comparison
      const currentDateStr = currentDate.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      // Get all patients with active budget settings
      return await db
        .select({
          patientId: budgetSettings.patientId,
          patientName: patients.name,
          endOfPlan: budgetSettings.endOfPlan,
          ndisFunds: budgetSettings.ndisFunds,
          planCode: budgetSettings.planCode
        })
        .from(budgetSettings)
        .innerJoin(
          patients,
          eq(budgetSettings.patientId, patients.id)
        )
        .where(
          and(
            ne(budgetSettings.endOfPlan, null),
            eq(budgetSettings.isActive, true),
            // Compare the endOfPlan date string with our date range
            sql`${budgetSettings.endOfPlan} >= ${currentDateStr} AND ${budgetSettings.endOfPlan} <= ${futureDateStr}`
          )
        )
        .orderBy(asc(budgetSettings.endOfPlan));
    } catch (error) {
      console.error("Error getting patients with expiring budgets:", error);
      throw new Error("Failed to get patients with expiring budgets");
    }
  }

  /**
   * Get goal progress for a specific patient
   * 
   * @param patientId - The ID of the patient
   * @param goalId - Optional specific goal ID to filter by
   * @returns Goal progress information including assessments over time
   */
  async getPatientGoalProgress(patientId: number, goalId?: number) {
    try {
      // Get all goals for the patient (or the specific goal if provided)
      const goalsQuery = db
        .select()
        .from(goals)
        .where(eq(goals.patientId, patientId));
      
      if (goalId) {
        goalsQuery.where(eq(goals.id, goalId));
      }
      
      const patientGoals = await goalsQuery;
      
      if (patientGoals.length === 0) {
        return [];
      }
      
      // Get all goal IDs
      const goalIds = patientGoals.map(goal => goal.id);
      
      // Get all session notes for the patient
      const notes = await db
        .select({
          id: sessionNotes.id,
          sessionId: sessionNotes.sessionId,
          sessionDate: sessions.sessionDate
        })
        .from(sessionNotes)
        .innerJoin(
          sessions,
          eq(sessionNotes.sessionId, sessions.id)
        )
        .where(eq(sessionNotes.patientId, patientId))
        .orderBy(asc(sessions.sessionDate));
      
      // Get all goal assessments for these goals
      const assessments = await db
        .select()
        .from(goalAssessments)
        .where(
          and(
            inArray(goalAssessments.goalId, goalIds),
            inArray(goalAssessments.sessionNoteId, notes.map(note => note.id))
          )
        );
      
      // Combine the data into a structured format
      return patientGoals.map(goal => {
        const goalAssessments = assessments.filter(assessment => assessment.goalId === goal.id);
        
        // Map assessments to include session dates
        const progressPoints = goalAssessments.map(assessment => {
          const note = notes.find(n => n.id === assessment.sessionNoteId);
          return {
            date: note?.sessionDate,
            achievementLevel: assessment.achievementLevel,
            score: assessment.score,
            notes: assessment.notes
          };
        });
        
        return {
          goal,
          progress: progressPoints
        };
      });
    } catch (error) {
      console.error("Error getting patient goal progress:", error);
      throw new Error("Failed to get patient goal progress");
    }
  }

  /**
   * Search for patients by various criteria
   * 
   * @param query - Object containing search criteria
   * @returns Array of matching patients
   */
  async searchPatients(query: {
    name?: string;
    gender?: string;
    ageMin?: number;
    ageMax?: number;
    goalKeyword?: string;
  }) {
    try {
      let patientsQuery = db
        .select({
          id: patients.id,
          name: patients.name,
          dateOfBirth: patients.dateOfBirth,
          gender: patients.gender,
          email: patients.email,
          phone: patients.phone
        })
        .from(patients);
      
      const conditions = [];
      
      // Add name condition if provided
      if (query.name) {
        conditions.push(like(patients.name, `%${query.name}%`));
      }
      
      // Add gender condition if provided
      if (query.gender) {
        conditions.push(eq(patients.gender, query.gender));
      }
      
      // Add age range conditions if provided
      if (query.ageMin !== undefined || query.ageMax !== undefined) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        if (query.ageMin !== undefined) {
          const maxBirthYear = currentYear - query.ageMin;
          const maxBirthDate = new Date(maxBirthYear, 11, 31);
          conditions.push(lte(patients.dateOfBirth, maxBirthDate));
        }
        
        if (query.ageMax !== undefined) {
          const minBirthYear = currentYear - query.ageMax - 1;
          const minBirthDate = new Date(minBirthYear, 11, 31);
          conditions.push(gte(patients.dateOfBirth, minBirthDate));
        }
      }
      
      // Apply all conditions if any exist
      if (conditions.length > 0) {
        patientsQuery = patientsQuery.where(and(...conditions));
      }
      
      let matchingPatients = await patientsQuery;
      
      // Filter by goal keyword if provided
      if (query.goalKeyword && matchingPatients.length > 0) {
        const patientIds = matchingPatients.map(p => p.id);
        
        // Get all goals for these patients that match the keyword
        const matchingGoals = await db
          .select({
            patientId: goals.patientId
          })
          .from(goals)
          .where(
            and(
              inArray(goals.patientId, patientIds),
              or(
                like(goals.title, `%${query.goalKeyword}%`),
                like(goals.description, `%${query.goalKeyword}%`)
              )
            )
          );
        
        // Filter patients to only those with matching goals
        const patientIdsWithMatchingGoals = new Set(matchingGoals.map(g => g.patientId));
        matchingPatients = matchingPatients.filter(p => patientIdsWithMatchingGoals.has(p.id));
      }
      
      return matchingPatients;
    } catch (error) {
      console.error("Error searching patients:", error);
      throw new Error("Failed to search patients");
    }
  }

  /**
   * Get total count of patients in the system
   * 
   * @returns Total number of patients
   */
  async getTotalPatientCount(): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients);
      
      return result[0].count;
    } catch (error) {
      console.error("Error getting total patient count:", error);
      throw new Error("Failed to get total patient count");
    }
  }
}

// Export a singleton instance of the service
export const patientQueriesService = new PatientQueriesService();
