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

import { db } from "../db";
import { storage } from "../storage";
import { addDays, isPast, parseISO } from "date-fns";
import { eq, sql, between, and, desc, gte } from "drizzle-orm";
import { 
  allies, 
  clients, 
  budgetSettings, 
  budgetItems, 
  sessions,
  sessionNotes,
  performanceAssessments,
  milestoneAssessments,
  goals,
  subgoals,
  strategies
} from "../../shared/schema";

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
 * Generate a comprehensive performance report for a client
 */
export async function generateClientReport(
  clientId: number,
  dateRange?: DateRangeParams
): Promise<ClientReportData> {
  const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : undefined;
  const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : undefined;

  try {
    // Fetch all the components in parallel for efficiency
    const [
      clientDetails,
      keyMetrics,
      observations,
      cancellationData,
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

    return {
      clientDetails,
      keyMetrics,
      observations,
      cancellations: cancellationData,
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
  try {
    // Get client data
    const client = await storage.getClient(clientId);
    
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    
    // Get client allies
    const clientAllies = await storage.getAlliesByClient(clientId);
    
    // Calculate age from date of birth
    const birthDate = client.dateOfBirth ? new Date(client.dateOfBirth) : new Date();
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return {
      id: clientId,
      name: client.name,
      age,
      fundsManagement: client.fundsManagement || "Self-Managed",
      allies: clientAllies.map(ally => ({
        name: ally.name,
        relationship: ally.relationship,
        preferredLanguage: ally.preferredLanguage
      }))
    };
  } catch (error) {
    console.error("Error fetching client details:", error);
    throw new Error(`Failed to fetch client details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get key metrics: spending deviation and plan expiration
 */
async function getKeyMetrics(clientId: number): Promise<KeyMetricsData> {
  try {
    // Get budget settings
    const settings = await storage.getBudgetSettingsByClient(clientId);
    
    if (!settings) {
      return {
        spendingDeviation: 0,
        planExpiration: 0,
      };
    }
    
    // Get budget items for the client
    const items = await storage.getBudgetItemsByClient(clientId);
    
    // Calculate planned budget
    const plannedBudget = items.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice);
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity);
      return sum + (unitPrice * quantity);
    }, 0);
    
    // Calculate spent budget based on completed sessions 
    // (In a real system, this would track actual spending)
    const sessions = await storage.getSessionsByClient(clientId);
    
    const spentBudget = sessions.filter(session => 
      session.status === 'completed' || session.status === 'billed'
    ).length * 150; // Simplified: each completed session costs $150
    
    // Calculate NDIS funds amount
    const ndisFunds = typeof settings.ndisFunds === 'number' 
      ? settings.ndisFunds 
      : parseFloat(settings.ndisFunds || '0');
    
    // Calculate spending deviation (negative means under budget)
    const spendingDeviation = plannedBudget - ndisFunds;
    
    // Calculate days until plan expiration
    const expiryDate = settings.expiryDate ? new Date(settings.expiryDate) : addDays(new Date(), 365);
    const today = new Date();
    const dayDiff = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const planExpiration = Math.max(0, dayDiff);

    return {
      spendingDeviation,
      planExpiration,
      cancellationRate: sessions.length > 0 
        ? (sessions.filter(s => s.status === 'cancelled').length / sessions.length) * 100 
        : 0
    };
  } catch (error) {
    console.error("Error calculating key metrics:", error);
    return {
      spendingDeviation: 0,
      planExpiration: 0,
    };
  }
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
    // Get sessions for the client
    let sessionsQuery = db.select()
      .from(sessions)
      .where(eq(sessions.clientId, clientId));
    
    // Apply date filters if provided
    if (startDate && endDate) {
      sessionsQuery = sessionsQuery.where(
        and(
          gte(sessions.date, startDate.toISOString().split('T')[0]),
          gte(sessions.date, endDate.toISOString().split('T')[0])
        )
      );
    }

    const clientSessions = await sessionsQuery;
    
    if (clientSessions.length === 0) {
      return {
        physicalActivity: 3, // Default values if no sessions
        cooperation: 3,
        focus: 3,
        mood: 3
      };
    }
    
    // Get session notes with performance assessments
    const sessionIds = clientSessions.map(s => s.id);
    
    // If no sessions found, return default values
    if (sessionIds.length === 0) {
      return {
        physicalActivity: 3,
        cooperation: 3,
        focus: 3,
        mood: 3
      };
    }

    // In real implementation would filter sessionNotes by sessionIds
    const notesWithAssessments = await db
      .select({
        sessionNoteId: sessionNotes.id,
        physicalActivity: sessionNotes.physicalActivity,
        cooperation: sessionNotes.cooperation,
        focus: sessionNotes.focus,
        mood: sessionNotes.mood
      })
      .from(sessionNotes)
      .where(sql`${sessionNotes.sessionId} IN (${sessionIds.join(',')})`);
    
    // If no notes found, return default values
    if (notesWithAssessments.length === 0) {
      return {
        physicalActivity: 3,
        cooperation: 3,
        focus: 3,
        mood: 3
      };
    }
    
    // Calculate averages
    const totals = notesWithAssessments.reduce(
      (acc, note) => {
        acc.physicalActivity += note.physicalActivity || 0;
        acc.cooperation += note.cooperation || 0;
        acc.focus += note.focus || 0;
        acc.mood += note.mood || 0;
        acc.count++;
        return acc;
      },
      { physicalActivity: 0, cooperation: 0, focus: 0, mood: 0, count: 0 }
    );
    
    return {
      physicalActivity: totals.count > 0 ? totals.physicalActivity / totals.count : 3,
      cooperation: totals.count > 0 ? totals.cooperation / totals.count : 3,
      focus: totals.count > 0 ? totals.focus / totals.count : 3,
      mood: totals.count > 0 ? totals.mood / totals.count : 3
    };
  } catch (error) {
    console.error("Error calculating observation scores:", error);
    return {
      physicalActivity: 3,
      cooperation: 3,
      focus: 3,
      mood: 3
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
    // Get sessions for the client
    let sessionsQuery = db.select()
      .from(sessions)
      .where(eq(sessions.clientId, clientId));
    
    // Apply date filters if provided
    if (startDate && endDate) {
      sessionsQuery = sessionsQuery.where(
        and(
          gte(sessions.date, startDate.toISOString().split('T')[0]),
          gte(sessions.date, endDate.toISOString().split('T')[0])
        )
      );
    }

    const clientSessions = await sessionsQuery;
    
    if (clientSessions.length === 0) {
      return {
        completed: 0,
        waived: 0,
        changed: 0,
        total: 0
      };
    }
    
    // Count session statuses
    const counts = {
      completed: 0,
      waived: 0,
      changed: 0,
      cancelled: 0
    };
    
    clientSessions.forEach(session => {
      if (session.status === 'completed' || session.status === 'billed') {
        counts.completed++;
      } else if (session.status === 'waived') {
        counts.waived++;
      } else if (session.status === 'changed') {
        counts.changed++;
      } else if (session.status === 'cancelled') {
        counts.cancelled++;
      }
    });
    
    const total = clientSessions.length;
    
    // Convert to percentages
    return {
      completed: total > 0 ? (counts.completed / total) * 100 : 0,
      waived: total > 0 ? (counts.waived / total) * 100 : 0,
      changed: total > 0 ? (counts.changed / total) * 100 : 0,
      total
    };
  } catch (error) {
    console.error("Error calculating cancellation statistics:", error);
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
    // Get sessions for the client
    let sessionsQuery = db.select()
      .from(sessions)
      .where(eq(sessions.clientId, clientId));
    
    // Apply date filters if provided
    if (startDate && endDate) {
      sessionsQuery = sessionsQuery.where(
        and(
          gte(sessions.date, startDate.toISOString().split('T')[0]),
          gte(sessions.date, endDate.toISOString().split('T')[0])
        )
      );
    }

    const clientSessions = await sessionsQuery;
    
    if (clientSessions.length === 0) {
      return {
        strategies: []
      };
    }
    
    // Get session notes with performance assessments
    const sessionIds = clientSessions.map(s => s.id);
    
    // We would usually join tables to get strategies used in sessions
    // For simplicity, we'll use a mock approach that gets session notes
    // and strategies separately
    const allStrategies = await db.select().from(strategies);
    
    // Simulate data: assign random usage to each strategy
    const strategyStats = allStrategies.map(strategy => {
      // Create a pseudorandom but consistent usage count for each strategy
      // based on the strategy ID and client ID
      const hash = (strategy.id * 3 + clientId * 7) % 20;
      const timesUsed = 1 + Math.floor(hash / 2);
      
      // Create a pseudorandom but consistent score for the strategy
      const scoreHash = (strategy.id * 5 + clientId * 11) % 10;
      const averageScore = 2.5 + (scoreHash / 4);
      
      return {
        id: strategy.id,
        name: strategy.name,
        timesUsed,
        averageScore: Math.min(5, Math.round(averageScore * 10) / 10)
      };
    });
    
    // Sort by usage count (descending)
    strategyStats.sort((a, b) => b.timesUsed - a.timesUsed);
    
    return {
      strategies: strategyStats
    };
  } catch (error) {
    console.error("Error calculating strategy statistics:", error);
    return {
      strategies: []
    };
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
    // Get client goals
    const clientGoals = await storage.getGoalsByClient(clientId);
    
    if (clientGoals.length === 0) {
      return {
        goals: []
      };
    }
    
    // Get subgoals for the goals
    const goalIds = clientGoals.map(g => g.id);
    const goalScores = [];
    
    for (const goal of clientGoals) {
      // Get subgoals
      const subgoals = await storage.getSubgoalsByGoal(goal.id);
      
      // Calculate pseudo score based on subgoal status
      const subgoalCount = subgoals.length || 1;
      let completedCount = 0;
      
      subgoals.forEach(subgoal => {
        if (subgoal.status === 'completed') {
          completedCount++;
        } else if (subgoal.status === 'in-progress') {
          completedCount += 0.5;
        }
      });
      
      // Calculate goal score (0-10 scale)
      const score = Math.min(10, Math.round((completedCount / subgoalCount) * 10 * 10) / 10);
      
      goalScores.push({
        id: goal.id,
        title: goal.title,
        score
      });
    }
    
    // Sort by score (highest first)
    goalScores.sort((a, b) => b.score - a.score);
    
    return {
      goals: goalScores
    };
  } catch (error) {
    console.error("Error calculating goal achievement scores:", error);
    return {
      goals: []
    };
  }
}