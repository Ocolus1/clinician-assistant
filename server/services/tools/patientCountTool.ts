/**
 * Specialized tool for retrieving patient counts and basic statistics
 */

import { db } from "../../db";
import { patients, goals, sessions, budgetSettings } from "../../../shared/schema";
import { count, eq, gte, and, sql, not, inArray } from 'drizzle-orm';

/**
 * Get the total number of patients and basic statistics
 * @returns A formatted string with patient count and statistics
 */
export async function getPatientCount(): Promise<string> {
  try {
    // Get total patient count
    const patientCountResult = await db.select({ count: count() }).from(patients);
    const totalPatients = patientCountResult[0].count;
    
    // Get count of patients with active goals
    const activeGoalsQuery = await db.select({ patientId: patients.id })
      .from(patients)
      .innerJoin(goals, eq(goals.patientId, patients.id))
      .groupBy(patients.id);
    
    const patientsWithGoals = activeGoalsQuery.length;
    
    // Get count of patients with recent sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    const recentSessionsQuery = await db.select({ patientId: patients.id })
      .from(patients)
      .innerJoin(sessions, eq(sessions.patientId, patients.id))
      .where(gte(sessions.sessionDate, sql`${thirtyDaysAgoStr}`))
      .groupBy(patients.id);
    
    const patientsWithRecentSessions = recentSessionsQuery.length;
    
    // Get count of patients with active budgets
    const activeBudgetsQuery = await db.select({ patientId: patients.id })
      .from(patients)
      .innerJoin(budgetSettings, eq(budgetSettings.patientId, patients.id))
      .where(eq(budgetSettings.isActive, true))
      .groupBy(patients.id);
    
    const patientsWithActiveBudgets = activeBudgetsQuery.length;
    
    // Format the response
    let response = `Currently, there are ${totalPatients} patients in the system.\n\n`;
    response += `Patient Statistics:\n`;
    response += `- Patients with active goals: ${patientsWithGoals} (${Math.round((patientsWithGoals / totalPatients) * 100)}%)\n`;
    response += `- Patients with sessions in the last 30 days: ${patientsWithRecentSessions} (${Math.round((patientsWithRecentSessions / totalPatients) * 100)}%)\n`;
    response += `- Patients with active budgets: ${patientsWithActiveBudgets} (${Math.round((patientsWithActiveBudgets / totalPatients) * 100)}%)\n`;
    
    return response;
  } catch (error) {
    console.error("Error in getPatientCount:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error retrieving patient count: ${errorMessage}`;
  }
}

/**
 * Get patient count filtered by a specific condition
 * @param filter The filter to apply (e.g., "active", "inactive", "new")
 * @returns A formatted string with filtered patient count
 */
export async function getFilteredPatientCount(filter: string): Promise<string> {
  try {
    const filterLower = filter.toLowerCase();
    let filteredCount = 0;
    let filterDescription = '';
    
    // Get total patient count for percentage calculations
    const patientCountResult = await db.select({ count: count() }).from(patients);
    const totalPatients = patientCountResult[0].count;
    
    if (filterLower === 'active' || filterLower === 'engaged') {
      // Active patients have had a session in the last 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString();
      
      const activeQuery = await db.select({ patientId: patients.id })
        .from(patients)
        .innerJoin(sessions, eq(sessions.patientId, patients.id))
        .where(gte(sessions.sessionDate, sql`${sixtyDaysAgoStr}`))
        .groupBy(patients.id);
      
      filteredCount = activeQuery.length;
      filterDescription = 'active (had a session in the last 60 days)';
    } 
    else if (filterLower === 'inactive' || filterLower === 'disengaged') {
      // Inactive patients haven't had a session in the last 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString();
      
      // Get all patients with recent sessions
      const activeQuery = await db.select({ patientId: patients.id })
        .from(patients)
        .innerJoin(sessions, eq(sessions.patientId, patients.id))
        .where(gte(sessions.sessionDate, sql`${sixtyDaysAgoStr}`))
        .groupBy(patients.id);
      
      const activePatientIds = activeQuery.map(p => p.patientId);
      
      // Count patients not in the active list
      if (activePatientIds.length === 0) {
        filteredCount = totalPatients;
      } else {
        const inactiveQuery = await db.select({ count: count() })
          .from(patients)
          .where(not(inArray(patients.id, activePatientIds)));
        
        filteredCount = inactiveQuery[0].count;
      }
      
      filterDescription = 'inactive (no sessions in the last 60 days)';
    }
    else if (filterLower === 'new' || filterLower === 'recent') {
      // New patients were added in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
      
      // Note: This assumes patients table has createdAt column
      // If not, we'll need to modify this logic
      const newQuery = await db.select({ count: count() })
        .from(patients)
        .where(gte(sql`patients.created_at`, sql`${thirtyDaysAgoStr}`));
      
      filteredCount = newQuery[0].count;
      filterDescription = 'new (added in the last 30 days)';
    }
    else if (filterLower === 'with goals' || filterLower === 'has goals') {
      // Patients with at least one goal
      const withGoalsQuery = await db.select({ patientId: patients.id })
        .from(patients)
        .innerJoin(goals, eq(goals.patientId, patients.id))
        .groupBy(patients.id);
      
      filteredCount = withGoalsQuery.length;
      filterDescription = 'with at least one goal';
    }
    else if (filterLower === 'with budget' || filterLower === 'has budget') {
      // Patients with an active budget
      const withBudgetQuery = await db.select({ patientId: patients.id })
        .from(patients)
        .innerJoin(budgetSettings, eq(budgetSettings.patientId, patients.id))
        .where(eq(budgetSettings.isActive, true))
        .groupBy(patients.id);
      
      filteredCount = withBudgetQuery.length;
      filterDescription = 'with an active budget';
    }
    else {
      return `I don't understand the filter "${filter}". Please try with "active", "inactive", "new", "with goals", or "with budget".`;
    }
    
    // Format the response
    const percentage = Math.round((filteredCount / totalPatients) * 100);
    let response = `There are ${filteredCount} patients who are ${filterDescription}.\n`;
    response += `This represents ${percentage}% of the total ${totalPatients} patients in the system.`;
    
    return response;
  } catch (error) {
    console.error("Error in getFilteredPatientCount:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error retrieving filtered patient count: ${errorMessage}`;
  }
}
