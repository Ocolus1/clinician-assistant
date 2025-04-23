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
      // Handle possessive forms and plural forms by removing trailing 's'
      const normalizedName = name.replace(/s$/, '');
      console.log(`Finding client by name: "${name}" (normalized: "${normalizedName}")`);
      
      // Try with the original name first
      // Try to find exact match on original_name first (highest priority)
      let result = await sql`
        SELECT id, original_name FROM clients 
        WHERE original_name ILIKE ${name}
        LIMIT 1
      `;
      
      if (result.length > 0) {
        console.log(`Found exact match on original_name: ${result[0].original_name}`);
        return result[0].id;
      }
      
      // If nothing found and name was normalized, try with the normalized version
      if (normalizedName !== name) {
        result = await sql`
          SELECT id, original_name FROM clients 
          WHERE original_name ILIKE ${normalizedName}
          LIMIT 1
        `;
        
        if (result.length > 0) {
          console.log(`Found exact match with normalized name: ${result[0].original_name}`);
          return result[0].id;
        }
      }
      
      // Try to find partial match prioritizing original_name
      result = await sql`
        SELECT id, original_name FROM clients 
        WHERE original_name ILIKE ${`${normalizedName}%`}
        LIMIT 1
      `;
      
      if (result.length > 0) {
        console.log(`Found partial match (starts with) on original_name: ${result[0].original_name}`);
        return result[0].id;
      }
      
      // More flexible matching (contains)
      result = await sql`
        SELECT id, original_name FROM clients 
        WHERE original_name ILIKE ${`%${normalizedName}%`}
        LIMIT 1
      `;
      
      if (result.length > 0) {
        console.log(`Found flexible match (contains) on original_name: ${result[0].original_name}`);
        return result[0].id;
      }
      
      // Fall back to checking other fields
      result = await sql`
        SELECT id, name, original_name FROM clients 
        WHERE name ILIKE ${`%${normalizedName}%`}
        OR unique_identifier = ${normalizedName}
        LIMIT 1
      `;
      
      if (result.length > 0) {
        console.log(`Found match on other fields: ${result[0].name}`);
        return result[0].id;
      }
      
      console.log(`No client found with name: "${name}" or normalized "${normalizedName}"`);
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
        
        // For each subgoal, get milestone progress data from our milestone_progress table using SQL directly
        for (const subgoal of subgoalsList) {
          console.log(`Getting milestone progress for subgoal ${subgoal.id}`);
          
          // Query milestone_progress for this subgoal using SQL
          const milestoneResults = await sql`
            SELECT * FROM milestone_progress 
            WHERE subgoal_id = ${subgoal.id} 
            ORDER BY date DESC
          `;
          
          console.log(`Found ${milestoneResults.length} milestone progress records for subgoal ${subgoal.id}`);
          
          // Process milestone progress data
          for (const milestone of milestoneResults) {
            // Convert rating to score (rating is 1-5, score is 1-10)
            const score = milestone.rating * 2;
            
            totalScore += score;
            scoreCount++;
            
            // Update latest score if not set yet or if this is more recent
            if (latestScore === null) {
              latestScore = score;
            }
            
            // Add milestone progress data
            milestoneProgressItems.push({
              milestoneId: subgoal.id,
              milestoneTitle: subgoal.title,
              rating: milestone.rating,
              date: new Date(milestone.date),
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