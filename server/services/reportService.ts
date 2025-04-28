/**
 * Report Service
 * 
 * Provides aggregated data for patient performance reports including:
 * - Patient details with caregivers information
 * - Spending deviation and plan expiration
 * - General observations average scores
 * - Cancellation statistics
 * - Strategy usage and effectiveness
 * - Goal achievement metrics
 */
import { Pool } from "@neondatabase/serverless";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { format, parseISO, subMonths } from "date-fns";

// Import from shared schema
import {
  budgetSettings,
  budgetItems,
  budgetItemCatalog,
  goals,
  subgoals,
  patients, 
  caregivers, 
  clinicians,
  patientClinicians, 
  sessions,
  sessionNotes,
  strategies,
  goalAssessments,
  milestoneAssessments
} from "@shared/schema";

// Import database connection
import { db } from "../db";

// Create a pool for raw SQL queries
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface PatientReportData {
  patientDetails: PatientDetailsData;
  keyMetrics: KeyMetricsData;
  observations: ObservationsData;
  cancellations: CancellationsData;
  strategies: StrategiesData;
  goals: GoalsData;
}

export interface PatientDetailsData {
  id: number;
  name: string;
  age: number;
  fundsManagement: string;
  caregivers: Array<{
    name: string;
    relationship: string;
    preferredLanguage: string;
  }>;
}

export interface KeyMetricsData {
  spendingDeviation: number;
  planExpiration: number; // Days until expiration
  cancellationRate?: number; // Percentage
}

export interface ObservationsData {
  physicalActivity: number;
  cooperation: number;
  focus: number;
  mood: number;
}

export interface CancellationsData {
  completed: number; // Percentage
  waived: number; // Percentage
  changed: number; // Percentage
  total: number; // Total number of sessions
}

export interface StrategiesData {
  strategies: Array<{
    id: number;
    name: string;
    timesUsed: number;
    averageScore: number;
  }>;
}

export interface GoalsData {
  goals: Array<{
    id: number;
    title: string;
    score: number; // 0-10 scale
  }>;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

/**
 * Convert a Date object or string to ISO string format for SQL queries
 */
function toSqlDateString(date?: Date | string): string | undefined {
  if (!date) return undefined;
  if (date instanceof Date) return date.toISOString();
  return date;
}

/**
 * Parse a date string or Date object to a Date object
 */
function parseDate(date?: Date | string): Date | undefined {
  if (!date) return undefined;
  if (date instanceof Date) return date;
  try {
    return new Date(date);
  } catch (error) {
    console.error("Error parsing date:", error);
    return undefined;
  }
}

/**
 * Generate a comprehensive performance report for a patient
 */
export async function generatePatientReport(
  patientId: number,
  dateRange?: DateRangeParams
): Promise<PatientReportData> {
  try {
    console.log(`Generating report for patient ${patientId}`);
    
    // Convert date strings to Date objects if provided
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (dateRange?.startDate) {
      startDate = parseDate(dateRange.startDate);
      console.log(`Using start date: ${startDate?.toISOString()}`);
    }
    
    if (dateRange?.endDate) {
      endDate = parseDate(dateRange.endDate);
      console.log(`Using end date: ${endDate?.toISOString()}`);
    }
    
    // Gather all report sections
    const [
      patientDetailsData,
      keyMetricsData,
      observationsData,
      cancellationsData,
      strategiesData,
      goalsData
    ] = await Promise.all([
      getPatientDetails(patientId),
      getKeyMetrics(patientId),
      getObservationScores(patientId, startDate, endDate),
      getCancellationStats(patientId, startDate, endDate),
      getStrategyStats(patientId, startDate, endDate),
      getGoalAchievementScores(patientId, startDate, endDate)
    ]);
    
    console.log(`Successfully generated report for patient ${patientId}`);
    
    // Return complete report
    return {
      patientDetails: patientDetailsData,
      keyMetrics: keyMetricsData,
      observations: observationsData,
      cancellations: cancellationsData,
      strategies: strategiesData,
      goals: goalsData
    };
  } catch (error) {
    console.error("Error generating patient report:", error);
    throw new Error(`Failed to generate patient report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get patient details including age and caregivers
 */
async function getPatientDetails(patientId: number): Promise<PatientDetailsData> {
  // Query patient information
  const [patientResult] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));
  
  if (!patientResult) {
    throw new Error(`Patient with ID ${patientId} not found`);
  }
  
  // Calculate age from date of birth
  let age = 0;
  if (patientResult.dateOfBirth) {
    const dob = new Date(patientResult.dateOfBirth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    // Adjust age if birthday hasn't occurred yet this year
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }
  
  // Get caregivers
  const patientCaregivers = await db
    .select()
    .from(caregivers)
    .where(eq(caregivers.patientId, patientId));
  
  // Build caregivers array with required fields
  const caregiversFormatted = patientCaregivers.map(caregiver => ({
    name: caregiver.name,
    relationship: caregiver.relationship || 'Unknown',
    preferredLanguage: caregiver.preferredLanguage || 'English'
  }));
  
  return {
    id: patientResult.id,
    name: patientResult.name,
    age,
    fundsManagement: patientResult.fundsManagement || 'Unknown',
    caregivers: caregiversFormatted
  };
}

/**
 * Get key metrics: spending deviation and plan expiration
 */
async function getKeyMetrics(patientId: number): Promise<KeyMetricsData> {
  // Get active budget settings
  const [budgetResult] = await db
    .select()
    .from(budgetSettings)
    .where(and(
      eq(budgetSettings.patientId, patientId),
      eq(budgetSettings.isActive, true)
    ));
  
  // Default values if no budget settings found
  if (!budgetResult) {
    return {
      spendingDeviation: 0,
      planExpiration: 0
    };
  }
  
  // Get budget items
  const budgetItemsResult = await db
    .select()
    .from(budgetItems)
    .where(eq(budgetItems.budgetSettingsId, budgetResult.id));
  
  // Calculate total budget
  const totalBudget = budgetResult.ndisFunds || 0;
  
  // Calculate allocated amount
  const allocatedAmount = budgetItemsResult.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity),
    0
  );
  
  // Calculate spending deviation (allocated vs. available)
  // Negative value means under-allocated, positive means over-allocated
  const spendingDeviation = allocatedAmount > 0 
    ? (allocatedAmount - totalBudget) / totalBudget 
    : 0;
  
  // Calculate days until expiration
  let planExpiration = 365; // Default to 1 year if no end date
  
  if (budgetResult.endOfPlan) {
    const endDate = new Date(budgetResult.endOfPlan);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    planExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    planExpiration = Math.max(0, planExpiration); // Ensure not negative
  }
  
  return {
    spendingDeviation,
    planExpiration
  };
}

/**
 * Get average observation scores from session notes
 */
async function getObservationScores(
  patientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ObservationsData> {
  try {
    // Get sessions for the patient
    let sessionsQuery = `
      SELECT s.id 
      FROM sessions s
      WHERE s.patient_id = $1
    `;
    
    const queryParams = [patientId];
    
    // Add date filtering if provided
    if (startDate || endDate) {
      if (startDate) {
        sessionsQuery += ` AND s.created_at >= $${queryParams.length + 1}`;
        queryParams.push(toSqlDateString(startDate));
      }
      
      if (endDate) {
        sessionsQuery += ` AND s.created_at <= $${queryParams.length + 1}`;
        queryParams.push(toSqlDateString(endDate));
      }
    }
    
    const sessionsResult = await pool.query(sessionsQuery, queryParams);
    const sessionIds = sessionsResult.rows.map(row => row.id);
    
    // If no sessions found, return default values
    if (sessionIds.length === 0) {
      return {
        physicalActivity: 0,
        cooperation: 0,
        focus: 0,
        mood: 0
      };
    }
    
    // Get observation scores from session notes
    // Using raw SQL as we need to query observation fields
    // that may not be in the schema
    const notesQuery = `
      SELECT 
        AVG(COALESCE(physical_activity_rating, 0)) as avg_physical,
        AVG(COALESCE(cooperation_rating, 0)) as avg_cooperation,
        AVG(COALESCE(focus_rating, 0)) as avg_focus,
        AVG(COALESCE(mood_rating, 0)) as avg_mood
      FROM session_notes
      WHERE session_id = ANY($1)
    `;
    
    const notesResult = await pool.query(notesQuery, [sessionIds]);
    
    if (notesResult.rows.length === 0) {
      return {
        physicalActivity: 0,
        cooperation: 0,
        focus: 0,
        mood: 0
      };
    }
    
    // Format results
    const row = notesResult.rows[0];
    
    return {
      physicalActivity: parseFloat(row.avg_physical) || 0,
      cooperation: parseFloat(row.avg_cooperation) || 0,
      focus: parseFloat(row.avg_focus) || 0,
      mood: parseFloat(row.avg_mood) || 0
    };
  } catch (error) {
    console.error("Error getting observation scores:", error);
    return {
      physicalActivity: 0,
      cooperation: 0,
      focus: 0,
      mood: 0
    };
  }
}

/**
 * Get cancellation statistics
 */
async function getCancellationStats(
  patientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<CancellationsData> {
  try {
    // Get sessions for the patient
    let sessionsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM sessions
      WHERE patient_id = $1
    `;
    
    const queryParams = [patientId];
    
    // Add date filtering if provided
    if (startDate || endDate) {
      if (startDate) {
        sessionsQuery += ` AND created_at >= $${queryParams.length + 1}`;
        queryParams.push(toSqlDateString(startDate));
      }
      
      if (endDate) {
        sessionsQuery += ` AND created_at <= $${queryParams.length + 1}`;
        queryParams.push(toSqlDateString(endDate));
      }
    }
    
    sessionsQuery += ` GROUP BY status`;
    
    const result = await pool.query(sessionsQuery, queryParams);
    
    // Count totals and calculate percentages
    let total = 0;
    let completed = 0;
    let waived = 0;
    let changed = 0;
    
    for (const row of result.rows) {
      const count = parseInt(row.count);
      total += count;
      
      if (row.status === 'completed') {
        completed = count;
      } else if (row.status === 'waived') {
        waived = count;
      } else if (row.status === 'rescheduled') {
        changed = count;
      }
    }
    
    // Convert to percentages
    const completedPercent = total > 0 ? (completed / total) * 100 : 0;
    const waivedPercent = total > 0 ? (waived / total) * 100 : 0;
    const changedPercent = total > 0 ? (changed / total) * 100 : 0;
    
    return {
      completed: Math.round(completedPercent),
      waived: Math.round(waivedPercent),
      changed: Math.round(changedPercent),
      total
    };
  } catch (error) {
    console.error("Error getting cancellation stats:", error);
    return {
      completed: 0,
      waived: 0,
      changed: 0,
      total: 0
    };
  }
}

/**
 * Get strategy usage and effectiveness
 */
async function getStrategyStats(
  patientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<StrategiesData> {
  try {
    // Get sessions for the patient
    let sessionsQuery = `
      SELECT id FROM sessions
      WHERE patient_id = $1
    `;
    
    const queryParams = [patientId];
    
    // Add date filtering if provided
    if (startDate || endDate) {
      if (startDate) {
        sessionsQuery += ` AND created_at >= $${queryParams.length + 1}`;
        queryParams.push(toSqlDateString(startDate));
      }
      
      if (endDate) {
        sessionsQuery += ` AND created_at <= $${queryParams.length + 1}`;
        queryParams.push(toSqlDateString(endDate));
      }
    }
    
    const sessionsResult = await pool.query(sessionsQuery, queryParams);
    const sessionIds = sessionsResult.rows.map(row => row.id);
    
    // If no sessions found, return empty array
    if (sessionIds.length === 0) {
      return { strategies: [] };
    }
    
    // Get strategies used in sessions and their average scores
    // The strategies are stored as an array of strategy names directly in the goal_assessments table
    // We need to join multiple tables to get the strategy usage and scores
    const strategyQuery = `
      WITH strategy_usages AS (
        -- Unnest the strategies array to get individual strategy uses
        SELECT 
          ga.achievement_level as rating,
          unnest(ga.strategies) as strategy_name
        FROM goal_assessments ga
        JOIN session_notes sn ON ga.session_note_id = sn.id
        JOIN sessions s ON sn.session_id = s.id
        WHERE s.patient_id = $1
          ${sessionIds.length > 0 ? `AND s.id IN (${sessionIds.map((_, i) => `$${i + 2}`).join(',')})` : ''}
      )
      SELECT 
        s.id,
        s.name,
        COUNT(su.strategy_name) as times_used,
        CASE 
          WHEN COUNT(su.strategy_name) > 0 THEN AVG(su.rating)::numeric
          ELSE 0 
        END as avg_score
      FROM strategies s
      LEFT JOIN strategy_usages su ON s.name = su.strategy_name
      GROUP BY s.id, s.name
      ORDER BY times_used DESC, avg_score DESC
      LIMIT 10
    `;
    
    // Add sessionIds to the query parameters if there are any
    const strategyParams = [patientId, ...sessionIds];
    const strategyResult = await pool.query(strategyQuery, strategyParams);
    
    // Format strategy results
    const strategies = strategyResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      timesUsed: parseInt(row.times_used),
      averageScore: parseFloat(row.avg_score) || 0
    }));
    
    return { strategies };
  } catch (error) {
    console.error("Error getting strategy stats:", error);
    return { strategies: [] };
  }
}

/**
 * Get goal achievement scores
 */
async function getGoalAchievementScores(
  patientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<GoalsData> {
  try {
    // Get goals for the patient
    const goalsResult = await db
      .select()
      .from(goals)
      .where(eq(goals.patientId, patientId));
    
    // If no goals found, return empty array
    if (goalsResult.length === 0) {
      return { goals: [] };
    }
    
    // Get sessions in date range
    let sessionsQuery = `
      SELECT id FROM sessions
      WHERE patient_id = $1
    `;
    
    const queryParams = [patientId];
    
    // Add date filtering if provided
    if (startDate || endDate) {
      if (startDate) {
        sessionsQuery += ` AND created_at >= $${queryParams.length + 1}`;
        queryParams.push(toSqlDateString(startDate));
      }
      
      if (endDate) {
        sessionsQuery += ` AND created_at <= $${queryParams.length + 1}`;
        queryParams.push(toSqlDateString(endDate));
      }
    }
    
    const sessionsResult = await pool.query(sessionsQuery, queryParams);
    const sessionIds = sessionsResult.rows.map(row => row.id);
    
    // Calculate scores for each goal based on goal assessments
    const goalScores = await Promise.all(
      goalsResult.map(async (goal) => {
        // Get subgoals
        const subgoalsList = await db
          .select()
          .from(subgoals)
          .where(eq(subgoals.goalId, goal.id));
        
        // If no sessions or no subgoals, use a default score
        if (sessionIds.length === 0 || subgoalsList.length === 0) {
          return {
            id: goal.id,
            title: goal.title || `Goal ${goal.id}`,
            score: 0
          };
        }
        
        // Get goal assessments for this goal's subgoals
        let avgScore = 0;
        
        // Use raw query to get goal assessments by subgoal IDs
        const subgoalIds = subgoalsList.map(s => s.id);
        
        const scoreQuery = `
          SELECT AVG(COALESCE(ga.achievement_level, 0)) as avg_score
          FROM goal_assessments ga
          JOIN session_notes sn ON ga.session_note_id = sn.id
          WHERE 
            sn.session_id = ANY($1) AND
            ga.goal_id = $2
        `;
        
        const scoreResult = await pool.query(
          scoreQuery, 
          [sessionIds, goal.id]
        );
        
        if (scoreResult.rows.length > 0 && scoreResult.rows[0].avg_score) {
          avgScore = parseFloat(scoreResult.rows[0].avg_score);
        }
        
        return {
          id: goal.id,
          title: goal.title || `Goal ${goal.id}`,
          score: Math.round(avgScore * 10) / 10 // Round to 1 decimal place
        };
      })
    );
    
    return { goals: goalScores };
  } catch (error) {
    console.error("Error getting goal scores:", error);
    return { goals: [] };
  }
}