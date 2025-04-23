/**
 * Agent Query Service
 * 
 * This service handles specific query patterns for the agent, particularly
 * focused on goal tracking, milestone progress, and budget information.
 */
import { db } from "../drizzle";
import { sql } from "../db";
import { storage } from "../storage";
import { 
  clients, 
  goals, 
  subgoals, 
  sessions,
  sessionNotes,
  performanceAssessments,
  milestoneAssessments,
  strategies,
  budgetItems,
  budgetSettings
} from "@shared/schema";
import { eq, and, desc, gte, lte, isNull, isNotNull } from "drizzle-orm";
import { format, subDays, subMonths, parseISO } from "date-fns";

/**
 * Interface for goal milestone progress data
 */
interface MilestoneProgress {
  milestoneId: number;
  milestoneTitle: string;
  rating: number | null;
  date: Date;
  strategies: string[];
}

/**
 * Interface for goal progress data
 */
interface GoalProgress {
  id: number;
  title: string;
  description: string;
  priority: string;
  milestones: MilestoneProgress[];
  latestScore: number | null;
  averageScore: number | null;
}

/**
 * Interface for client sessions data
 */
interface ClientSession {
  id: number;
  title: string;
  date: Date;
  status: string;
  duration: number;
}

/**
 * Interface for budget item data
 */
interface BudgetSummary {
  totalFunds: number;
  usedFunds: number;
  remainingFunds: number;
  expiryDate: string | null;
  itemsCount: number;
  itemsUsed: number;
}

export class AgentQueryService {
  /**
   * Find a client by name, supporting partial matches
   */
  async findClientByName(name: string): Promise<number | null> {
    try {
      // Try to find exact or partial match using name fields
      const result = await sql`
        SELECT id FROM clients 
        WHERE name ILIKE ${`%${name}%`}
        OR original_name ILIKE ${`%${name}%`}
        OR unique_identifier = ${name}
        LIMIT 1
      `;
      
      if (result.length > 0) {
        return result[0].id;
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding client by name '${name}':`, error);
      return null;
    }
  }
  
  /**
   * Get all goals for a client with their latest milestone progress
   */
  async getClientGoals(clientId: number): Promise<GoalProgress[]> {
    try {
      // Get all goals for the client
      const clientGoals = await storage.getGoalsByClient(clientId);
      
      // For each goal, get the subgoals and milestone assessments
      const goalsWithProgress: GoalProgress[] = [];
      
      for (const goal of clientGoals) {
        // Get subgoals for this goal
        const subgoalsList = await storage.getSubgoalsByGoal(goal.id);
        
        // Get milestone assessments for each subgoal
        const milestoneProgressItems: MilestoneProgress[] = [];
        let totalScore = 0;
        let scoreCount = 0;
        let latestScore = null;
        
        // Query performance assessments for this goal
        const performanceResults = await db
          .select({
            id: performanceAssessments.id,
            rating: performanceAssessments.rating,
            score: performanceAssessments.score,
            subgoalId: performanceAssessments.subgoalId,
            sessionNoteId: performanceAssessments.sessionNoteId,
            strategies: performanceAssessments.strategies
          })
          .from(performanceAssessments)
          .innerJoin(sessionNotes, eq(performanceAssessments.sessionNoteId, sessionNotes.id))
          .where(and(
            eq(performanceAssessments.goalId, goal.id),
            eq(sessionNotes.clientId, clientId)
          ))
          .orderBy(desc(sessionNotes.createdAt));
        
        // Process performance assessments
        for (const perf of performanceResults) {
          // Find the subgoal (if any)
          const subgoal = subgoalsList.find(sg => sg.id === perf.subgoalId);
          
          if (perf.score !== null) {
            totalScore += perf.score;
            scoreCount++;
            
            // Update latest score if not set yet
            if (latestScore === null) {
              latestScore = perf.score;
            }
          }
          
          // Get session date
          const sessionNote = await db
            .select({
              createdAt: sessionNotes.createdAt
            })
            .from(sessionNotes)
            .where(eq(sessionNotes.id, perf.sessionNoteId))
            .limit(1);
          
          // Get milestone assessments for this performance assessment
          const milestoneResults = await db
            .select({
              id: milestoneAssessments.id,
              milestoneId: milestoneAssessments.milestoneId,
              rating: milestoneAssessments.rating,
              strategies: milestoneAssessments.strategies
            })
            .from(milestoneAssessments)
            .where(eq(milestoneAssessments.performanceAssessmentId, perf.id));
          
          // Add milestone progress data
          for (const milestone of milestoneResults) {
            milestoneProgressItems.push({
              milestoneId: milestone.milestoneId,
              milestoneTitle: subgoal ? subgoal.title : `Milestone ${milestone.milestoneId}`,
              rating: milestone.rating,
              date: sessionNote.length > 0 ? new Date(sessionNote[0].createdAt) : new Date(),
              strategies: milestone.strategies || []
            });
          }
        }
        
        // Calculate average score
        const averageScore = scoreCount > 0 ? totalScore / scoreCount : null;
        
        goalsWithProgress.push({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          priority: goal.priority,
          milestones: milestoneProgressItems,
          latestScore,
          averageScore
        });
      }
      
      return goalsWithProgress;
    } catch (error) {
      console.error(`Error getting goals for client ${clientId}:`, error);
      return [];
    }
  }
  
  /**
   * Get client session count for a specific time period
   */
  async getClientSessionCount(clientId: number, period: 'week' | 'month' | 'year'): Promise<number> {
    try {
      let startDate: Date;
      const now = new Date();
      
      switch (period) {
        case 'week':
          startDate = subDays(now, 7);
          break;
        case 'month':
          startDate = subMonths(now, 1);
          break;
        case 'year':
          startDate = subMonths(now, 12);
          break;
      }
      
      const result = await sql`
        SELECT COUNT(*) as count FROM sessions 
        WHERE client_id = ${clientId}
        AND session_date >= ${format(startDate, 'yyyy-MM-dd')}
        AND status = 'completed'
      `;
      
      return parseInt(result[0]?.count || '0');
    } catch (error) {
      console.error(`Error getting session count for client ${clientId}:`, error);
      return 0;
    }
  }
  
  /**
   * Get client budget information
   */
  async getClientBudgetInfo(clientId: number): Promise<BudgetSummary | null> {
    try {
      // Get active budget settings
      const settings = await db
        .select()
        .from(budgetSettings)
        .where(and(
          eq(budgetSettings.clientId, clientId),
          eq(budgetSettings.isActive, true)
        ))
        .limit(1);
      
      if (settings.length === 0) {
        return null;
      }
      
      const budgetSetting = settings[0];
      
      // Get budget items
      const items = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.budgetSettingsId, budgetSetting.id));
      
      // Calculate funds
      let totalAllocated = 0;
      let totalUsed = 0;
      let itemsWithUsage = 0;
      
      for (const item of items) {
        const itemTotal = item.quantity * parseFloat(item.unitPrice.toString());
        const itemUsed = (item.usedQuantity || 0) * parseFloat(item.unitPrice.toString());
        
        totalAllocated += itemTotal;
        totalUsed += itemUsed;
        
        if (item.usedQuantity > 0) {
          itemsWithUsage++;
        }
      }
      
      return {
        totalFunds: parseFloat(budgetSetting.ndisFunds.toString()),
        usedFunds: totalUsed,
        remainingFunds: parseFloat(budgetSetting.ndisFunds.toString()) - totalUsed,
        expiryDate: budgetSetting.endOfPlan,
        itemsCount: items.length,
        itemsUsed: itemsWithUsage
      };
    } catch (error) {
      console.error(`Error getting budget info for client ${clientId}:`, error);
      return null;
    }
  }
  
  /**
   * Get most frequently used strategies for a client
   */
  async getClientTopStrategies(clientId: number, limit: number = 5): Promise<{name: string, count: number}[]> {
    try {
      // This requires a more complex query that's easier with raw SQL
      const result = await sql`
        WITH all_strategies AS (
          SELECT unnest(strategies) as strategy_name
          FROM milestone_assessments ma
          JOIN performance_assessments pa ON ma.performance_assessment_id = pa.id
          JOIN session_notes sn ON pa.session_note_id = sn.id
          WHERE sn.client_id = ${clientId}
        )
        SELECT strategy_name, COUNT(*) as usage_count
        FROM all_strategies
        GROUP BY strategy_name
        ORDER BY usage_count DESC
        LIMIT ${limit}
      `;
      
      return result.map(row => ({
        name: row.strategy_name,
        count: parseInt(row.usage_count)
      }));
    } catch (error) {
      console.error(`Error getting top strategies for client ${clientId}:`, error);
      return [];
    }
  }
  
  /**
   * Get the most recent session for a client
   */
  async getClientMostRecentSession(clientId: number): Promise<ClientSession | null> {
    try {
      const result = await db
        .select({
          id: sessions.id,
          title: sessions.title,
          sessionDate: sessions.sessionDate,
          status: sessions.status,
          duration: sessions.duration
        })
        .from(sessions)
        .where(eq(sessions.clientId, clientId))
        .orderBy(desc(sessions.sessionDate))
        .limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      return {
        id: result[0].id,
        title: result[0].title,
        date: new Date(result[0].sessionDate),
        status: result[0].status,
        duration: result[0].duration
      };
    } catch (error) {
      console.error(`Error getting most recent session for client ${clientId}:`, error);
      return null;
    }
  }
  
  /**
   * Get goals that haven't been updated in X months
   */
  async getStaleGoals(clientId: number, months: number = 1): Promise<{id: number, title: string, lastUpdate: Date | null}[]> {
    try {
      const clientGoals = await storage.getGoalsByClient(clientId);
      const staleGoals = [];
      
      for (const goal of clientGoals) {
        // Find the most recent assessment for this goal
        const assessment = await db
          .select({
            createdAt: sessionNotes.createdAt
          })
          .from(performanceAssessments)
          .innerJoin(sessionNotes, eq(performanceAssessments.sessionNoteId, sessionNotes.id))
          .where(eq(performanceAssessments.goalId, goal.id))
          .orderBy(desc(sessionNotes.createdAt))
          .limit(1);
        
        let lastUpdate = null;
        if (assessment.length > 0) {
          lastUpdate = new Date(assessment[0].createdAt);
        }
        
        // Check if the goal hasn't been updated in the specified period
        const cutoffDate = subMonths(new Date(), months);
        
        if (!lastUpdate || lastUpdate < cutoffDate) {
          staleGoals.push({
            id: goal.id,
            title: goal.title,
            lastUpdate
          });
        }
      }
      
      return staleGoals;
    } catch (error) {
      console.error(`Error getting stale goals for client ${clientId}:`, error);
      return [];
    }
  }
}

// Create singleton instance
export const agentQueryService = new AgentQueryService();