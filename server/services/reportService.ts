/**
 * Report Service
 * 
 * Provides aggregated data for client performance reports including:
 * - Client details with allies information
 * - Spending deviation and plan expiration
 * - General observations average scores
 * - Cancellation statistics
 * - Strategy usage and effectiveness
 * - Goal achievement metrics
 */
import { sql } from "../db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { db } from "../drizzle";
import { 
  clients, 
  allies, 
  goals,
  subgoals,
  budgetSettings,
  budgetItems,
  sessions,
  sessionNotes,
  strategies,
  performanceAssessments,
  milestoneAssessments
} from "@shared/schema";

export interface ClientReportData {
  clientDetails: ClientDetailsData;
  keyMetrics: KeyMetricsData;
  observations: ObservationsData;
  cancellations: CancellationsData;
  strategies: StrategiesData;
  goals: GoalsData;
}

export interface ClientDetailsData {
  id: number;
  name: string;
  age: number;
  fundsManagement: string;
  allies: Array<{
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
 * Generate a comprehensive performance report for a client
 */
export async function generateClientReport(
  clientId: number,
  dateRange?: DateRangeParams
): Promise<ClientReportData> {
  try {
    console.log(`Generating report for client ${clientId}`);
    
    // Convert date strings to Date objects if provided
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (dateRange?.startDate) {
      startDate = new Date(dateRange.startDate);
      console.log(`Using start date: ${startDate.toISOString()}`);
    }
    
    if (dateRange?.endDate) {
      endDate = new Date(dateRange.endDate);
      console.log(`Using end date: ${endDate.toISOString()}`);
    }
    
    // Gather all report sections
    const [
      clientDetailsData,
      keyMetricsData,
      observationsData,
      cancellationsData,
      strategiesData,
      goalsData
    ] = await Promise.all([
      getClientDetails(clientId),
      getKeyMetrics(clientId),
      getObservationScores(clientId, startDate, endDate),
      getCancellationStats(clientId, startDate, endDate),
      getStrategyStats(clientId, startDate, endDate),
      getGoalAchievementScores(clientId, startDate, endDate)
    ]);
    
    console.log(`Successfully generated report for client ${clientId}`);
    
    // Return complete report
    return {
      clientDetails: clientDetailsData,
      keyMetrics: keyMetricsData,
      observations: observationsData,
      cancellations: cancellationsData,
      strategies: strategiesData,
      goals: goalsData
    };
  } catch (error) {
    console.error("Error generating client report:", error);
    throw new Error(`Failed to generate client report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get client details including age and allies
 */
async function getClientDetails(clientId: number): Promise<ClientDetailsData> {
  // Query client information
  const [clientResult] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId));
  
  if (!clientResult) {
    throw new Error(`Client with ID ${clientId} not found`);
  }
  
  // Calculate age from date of birth
  let age = 0;
  if (clientResult.dateOfBirth) {
    const dob = new Date(clientResult.dateOfBirth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    // Adjust age if birthday hasn't occurred yet this year
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }
  
  // Get allies
  const clientAllies = await db
    .select()
    .from(allies)
    .where(eq(allies.clientId, clientId));
  
  // Build allies array with required fields
  const alliesFormatted = clientAllies.map(ally => ({
    name: ally.name,
    relationship: ally.relationship || 'Unknown',
    preferredLanguage: ally.preferredLanguage || 'English'
  }));
  
  return {
    id: clientResult.id,
    name: clientResult.name,
    age,
    fundsManagement: clientResult.fundsManagement || 'Unknown',
    allies: alliesFormatted
  };
}

/**
 * Get key metrics: spending deviation and plan expiration
 */
async function getKeyMetrics(clientId: number): Promise<KeyMetricsData> {
  // Get active budget settings
  const [budgetResult] = await db
    .select()
    .from(budgetSettings)
    .where(and(
      eq(budgetSettings.clientId, clientId),
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
  clientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ObservationsData> {
  try {
    // Get sessions for the client using sql tagged template
    let sessionsResult;
    if (startDate && endDate) {
      sessionsResult = await sql`
        SELECT s.id 
        FROM sessions s
        WHERE s.client_id = ${clientId}
        AND s.created_at >= ${toSqlDateString(startDate)}
        AND s.created_at <= ${toSqlDateString(endDate)}
      `;
    } else if (startDate) {
      sessionsResult = await sql`
        SELECT s.id 
        FROM sessions s
        WHERE s.client_id = ${clientId}
        AND s.created_at >= ${toSqlDateString(startDate)}
      `;
    } else if (endDate) {
      sessionsResult = await sql`
        SELECT s.id 
        FROM sessions s
        WHERE s.client_id = ${clientId}
        AND s.created_at <= ${toSqlDateString(endDate)}
      `;
    } else {
      sessionsResult = await sql`
        SELECT s.id 
        FROM sessions s
        WHERE s.client_id = ${clientId}
      `;
    }
    
    const sessionIds = sessionsResult.map(row => row.id);
    
    // If no sessions found, return default values
    if (sessionIds.length === 0) {
      return {
        physicalActivity: 0,
        cooperation: 0,
        focus: 0,
        mood: 0
      };
    }
    
    // Get observation scores from session notes using sql tagged template
    const notesResult = await sql`
      SELECT 
        AVG(COALESCE(physical_activity_rating, 0)) as avg_physical,
        AVG(COALESCE(cooperation_rating, 0)) as avg_cooperation,
        AVG(COALESCE(focus_rating, 0)) as avg_focus,
        AVG(COALESCE(mood_rating, 0)) as avg_mood
      FROM session_notes
      WHERE session_id = ANY(${sessionIds})
    `;
    
    if (notesResult.length === 0) {
      return {
        physicalActivity: 0,
        cooperation: 0,
        focus: 0,
        mood: 0
      };
    }
    
    // Format results
    const row = notesResult[0];
    
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
  clientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<CancellationsData> {
  try {
    // Get sessions for the client using sql tagged template
    let result;
    if (startDate && endDate) {
      result = await sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM sessions
        WHERE client_id = ${clientId}
        AND created_at >= ${toSqlDateString(startDate)}
        AND created_at <= ${toSqlDateString(endDate)}
        GROUP BY status
      `;
    } else if (startDate) {
      result = await sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM sessions
        WHERE client_id = ${clientId}
        AND created_at >= ${toSqlDateString(startDate)}
        GROUP BY status
      `;
    } else if (endDate) {
      result = await sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM sessions
        WHERE client_id = ${clientId}
        AND created_at <= ${toSqlDateString(endDate)}
        GROUP BY status
      `;
    } else {
      result = await sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM sessions
        WHERE client_id = ${clientId}
        GROUP BY status
      `;
    }
    
    // Count totals and calculate percentages
    let total = 0;
    let completed = 0;
    let waived = 0;
    let changed = 0;
    
    for (const row of result) {
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
  clientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<StrategiesData> {
  try {
    // Get sessions for the client using sql tagged template
    let sessionsResult;
    if (startDate && endDate) {
      sessionsResult = await sql`
        SELECT id FROM sessions
        WHERE client_id = ${clientId}
        AND created_at >= ${toSqlDateString(startDate)}
        AND created_at <= ${toSqlDateString(endDate)}
      `;
    } else if (startDate) {
      sessionsResult = await sql`
        SELECT id FROM sessions
        WHERE client_id = ${clientId}
        AND created_at >= ${toSqlDateString(startDate)}
      `;
    } else if (endDate) {
      sessionsResult = await sql`
        SELECT id FROM sessions
        WHERE client_id = ${clientId}
        AND created_at <= ${toSqlDateString(endDate)}
      `;
    } else {
      sessionsResult = await sql`
        SELECT id FROM sessions
        WHERE client_id = ${clientId}
      `;
    }
    
    const sessionIds = sessionsResult.map(row => row.id);
    
    // If no sessions found, return empty array
    if (sessionIds.length === 0) {
      return { strategies: [] };
    }
    
    // Get strategies used in sessions and their average scores using sql tagged template
    // The strategies are stored as an array of strategy names directly in the performance_assessments table
    const strategyResult = await sql`
      WITH strategy_usages AS (
        -- Unnest the strategies array to get individual strategy uses
        SELECT 
          pa.rating,
          unnest(pa.strategies) as strategy_name
        FROM performance_assessments pa
        JOIN session_notes sn ON pa.session_note_id = sn.id
        JOIN sessions s ON sn.session_id = s.id
        WHERE s.client_id = ${clientId}
        AND ARRAY[s.id] && ARRAY[${sessionIds}]::int[]
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
    
    // Format strategy results
    const strategies = strategyResult.map(row => ({
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
  clientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<GoalsData> {
  try {
    // Get goals for the client
    const goalsResult = await db
      .select()
      .from(goals)
      .where(eq(goals.clientId, clientId));
    
    // If no goals found, return empty array
    if (goalsResult.length === 0) {
      return { goals: [] };
    }
    
    // Get sessions for the client using sql tagged template
    let sessionsResult;
    if (startDate && endDate) {
      sessionsResult = await sql`
        SELECT id FROM sessions
        WHERE client_id = ${clientId}
        AND created_at >= ${toSqlDateString(startDate)}
        AND created_at <= ${toSqlDateString(endDate)}
      `;
    } else if (startDate) {
      sessionsResult = await sql`
        SELECT id FROM sessions
        WHERE client_id = ${clientId}
        AND created_at >= ${toSqlDateString(startDate)}
      `;
    } else if (endDate) {
      sessionsResult = await sql`
        SELECT id FROM sessions
        WHERE client_id = ${clientId}
        AND created_at <= ${toSqlDateString(endDate)}
      `;
    } else {
      sessionsResult = await sql`
        SELECT id FROM sessions
        WHERE client_id = ${clientId}
      `;
    }
    
    const sessionIds = sessionsResult.map(row => row.id);
    
    // Calculate scores for each goal based on performance assessments
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
        
        // Get performance assessments for this goal's subgoals
        let avgScore = 0;
        
        // Use sql tagged template to get performance assessments by subgoal IDs
        const subgoalIds = subgoalsList.map(s => s.id);
        
        // Use SQL tagged template
        const scoreResult = await sql`
          SELECT AVG(COALESCE(pa.rating, 0)) as avg_score
          FROM performance_assessments pa
          JOIN session_notes sn ON pa.session_note_id = sn.id
          WHERE 
            sn.session_id = ANY(${sessionIds}) AND
            pa.goal_id = ${goal.id}
        `;
        
        if (scoreResult.length > 0 && scoreResult[0].avg_score) {
          avgScore = parseFloat(scoreResult[0].avg_score);
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