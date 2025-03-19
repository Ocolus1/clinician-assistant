/**
 * Server-side Knowledge Service
 * 
 * This service provides database aggregation and analysis capabilities 
 * to power the agent's responses with real data from the therapy practice.
 */
import { db } from '../db';
import * as schema from '../../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Knowledge Service for database-backed agent responses
 */
export const knowledgeService = {
  /**
   * Get aggregated budget information
   */
  async getBudgetInfo(subtopic?: string): Promise<any> {
    try {
      // Initialize data object
      let data: any = {};
      
      if (!subtopic || subtopic === 'overview') {
        // Get budget categories
        const categories = await db.query(sql`
          SELECT DISTINCT category FROM ${schema.budgetItems}
          WHERE category IS NOT NULL
          ORDER BY category
        `);
        
        // Get average allocations by category
        const allocations = await db.query(sql`
          SELECT category, AVG(unit_price * quantity) as avg_allocation
          FROM ${schema.budgetItems}
          WHERE category IS NOT NULL
          GROUP BY category
          ORDER BY avg_allocation DESC
        `);
        
        // Get top funding sources
        const fundingSources = await db.query(sql`
          SELECT funds_management as funding_source, COUNT(*) as count
          FROM ${schema.budgetSettings}
          WHERE funds_management IS NOT NULL
          GROUP BY funds_management
          ORDER BY count DESC
          LIMIT 1
        `);
        
        // Calculate average budget size
        const avgBudgetSize = await db.query(sql`
          SELECT AVG(ndisfunds) as avg_budget
          FROM ${schema.budgetSettings}
          WHERE ndisfunds IS NOT NULL
        `);
        
        data = {
          categories: categories.map((c: any) => c.category).join(', '),
          avgAllocationByCategory: allocations.reduce((acc: any, curr: any) => {
            acc[curr.category] = curr.avg_allocation;
            return acc;
          }, {}),
          topFundingSource: fundingSources[0]?.funding_source || 'Self-Managed',
          avgBudgetSize: avgBudgetSize[0]?.avg_budget || 0,
          totalBudgets: await db.query(sql`SELECT COUNT(*) as count FROM ${schema.budgetSettings}`).then(res => res[0]?.count || 0)
        };
      }
      
      if (!subtopic || subtopic === 'process') {
        // This would typically come from settings or application data
        // We're using static data for now
        data = {
          ...data,
          budgetingApproach: 'client-centered allocation',
          budgetingDescription: 'analyzing client needs, prioritizing goals, and allocating resources based on evidence-based practices',
        };
      }
      
      if (!subtopic || subtopic === 'utilization') {
        // Calculate utilization statistics - this is a simplified calculation
        // In a real app, this would be based on actual spending records
        const budgetItems = await db.query(sql`
          SELECT bi.id, bi.quantity, bi.unit_price, bi.budget_settings_id
          FROM ${schema.budgetItems} bi
        `);
        
        const budgetSettings = await db.query(sql`
          SELECT id, ndisfunds
          FROM ${schema.budgetSettings}
        `);
        
        // Map budget items to their settings
        const itemsBySettingsId: Record<number, { allocated: number }> = {};
        
        budgetItems.forEach((item: any) => {
          const settingsId = item.budget_settings_id;
          if (!settingsId) return;
          
          if (!itemsBySettingsId[settingsId]) {
            itemsBySettingsId[settingsId] = { allocated: 0 };
          }
          
          const amount = (item.quantity || 0) * (item.unit_price || 0);
          itemsBySettingsId[settingsId].allocated += amount;
        });
        
        // Calculate utilization rates
        let totalUtilization = 0;
        let budgetCount = 0;
        
        budgetSettings.forEach((settings: any) => {
          const settingsId = settings.id;
          const totalBudget = settings.ndisfunds || 0;
          
          if (itemsBySettingsId[settingsId] && totalBudget > 0) {
            const allocated = itemsBySettingsId[settingsId].allocated;
            // This is a simplification - actual utilization would be based on spending records
            const utilization = allocated / totalBudget;
            totalUtilization += utilization;
            budgetCount++;
          }
        });
        
        const avgUtilizationRate = budgetCount > 0 ? totalUtilization / budgetCount : 0;
        
        data = {
          ...data,
          avgUtilizationRate: avgUtilizationRate * 100, // Convert to percentage
          utilizationDescription: avgUtilizationRate > 0.7 
            ? 'efficiently allocated with high utilization' 
            : 'conservatively allocated with utilization opportunities',
        };
      }
      
      return data;
    } catch (error) {
      console.error('Error retrieving budget knowledge:', error);
      throw error;
    }
  },
  
  /**
   * Get aggregated progress information
   */
  async getProgressInfo(subtopic?: string): Promise<any> {
    try {
      let data: any = {};
      
      if (!subtopic || subtopic === 'overview') {
        // Get goal counts
        const goalCounts = await db.query(sql`
          SELECT COUNT(*) as count FROM ${schema.goals}
        `);
        
        // Get subgoal counts
        const subgoalCounts = await db.query(sql`
          SELECT goal_id, COUNT(*) as count
          FROM ${schema.subgoals}
          GROUP BY goal_id
        `);
        
        // Calculate average subgoals per goal
        const totalSubgoals = subgoalCounts.reduce((sum: number, curr: any) => sum + curr.count, 0);
        const totalGoals = goalCounts[0]?.count || 0;
        const avgSubgoalsPerGoal = totalGoals > 0 ? totalSubgoals / totalGoals : 0;
        
        // Get goal categories
        const goalCategories = await db.query(sql`
          SELECT category, COUNT(*) as count
          FROM ${schema.goals}
          WHERE category IS NOT NULL
          GROUP BY category
          ORDER BY count DESC
        `);
        
        // Get client counts
        const clientCounts = await db.query(sql`
          SELECT COUNT(DISTINCT client_id) as count FROM ${schema.goals}
        `);
        
        const uniqueClients = clientCounts[0]?.count || 0;
        const avgGoalsPerClient = uniqueClients > 0 ? totalGoals / uniqueClients : 0;
        
        data = {
          totalGoals,
          avgSubgoalsPerGoal,
          avgGoalsPerClient,
          topGoalCategories: goalCategories.slice(0, 3).map((c: any) => c.category),
        };
      }
      
      if (!subtopic || subtopic === 'attendance') {
        // Get session statistics
        const sessionStats = await db.query(sql`
          SELECT status, COUNT(*) as count
          FROM ${schema.sessions}
          GROUP BY status
        `);
        
        const completedSessions = sessionStats.find((s: any) => s.status === 'completed')?.count || 0;
        const cancelledSessions = sessionStats.find((s: any) => s.status === 'cancelled')?.count || 0;
        const totalSessions = completedSessions + cancelledSessions;
        const attendanceRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
        
        data = {
          ...data,
          attendanceRate,
          completedSessions,
          cancelledSessions,
          totalSessions,
        };
      }
      
      return data;
    } catch (error) {
      console.error('Error retrieving progress knowledge:', error);
      throw error;
    }
  },
  
  /**
   * Get aggregated strategy information
   */
  async getStrategyInfo(subtopic?: string): Promise<any> {
    try {
      let data: any = {};
      
      if (!subtopic || subtopic === 'overview') {
        // Get strategy counts
        const strategyCounts = await db.query(sql`
          SELECT COUNT(*) as count FROM ${schema.strategies}
        `);
        
        // Get strategy categories
        const strategyCategories = await db.query(sql`
          SELECT category, COUNT(*) as count
          FROM ${schema.strategies}
          WHERE category IS NOT NULL
          GROUP BY category
          ORDER BY count DESC
        `);
        
        // Get most recent strategies
        const recentStrategies = await db.query(sql`
          SELECT name, description, category
          FROM ${schema.strategies}
          ORDER BY id DESC
          LIMIT 5
        `);
        
        data = {
          totalStrategies: strategyCounts[0]?.count || 0,
          strategyCategories: strategyCategories.map((c: any) => c.category),
          strategyCount: strategyCategories.reduce((acc: any, curr: any) => {
            acc[curr.category] = curr.count;
            return acc;
          }, {}),
          recentStrategies: recentStrategies.map((s: any) => s.name),
        };
      }
      
      return data;
    } catch (error) {
      console.error('Error retrieving strategy knowledge:', error);
      throw error;
    }
  },
  
  /**
   * Get database schema metadata
   */
  async getDatabaseMetadata(table?: string): Promise<any> {
    try {
      let metadata: any = {};
      
      if (table) {
        // Get specific table metadata
        const tableSchema = schema[table];
        if (!tableSchema) {
          throw new Error(`Table ${table} not found in schema`);
        }
        
        metadata = {
          name: table,
          columns: Object.keys(tableSchema),
        };
      } else {
        // Get all tables in the schema
        metadata = {
          tables: [
            'clients',
            'allies',
            'goals',
            'subgoals',
            'budgetSettings',
            'budgetItems',
            'budgetItemCatalog',
            'sessions',
            'sessionNotes',
            'performanceAssessments',
            'milestoneAssessments',
            'strategies',
          ],
        };
      }
      
      return metadata;
    } catch (error) {
      console.error('Error retrieving database metadata:', error);
      throw error;
    }
  },
  
  /**
   * Get therapy domain concepts
   */
  async getTherapyDomainConcepts(concept?: string): Promise<any> {
    try {
      // This would typically come from a knowledge base or terminology database
      // We're using static data for now
      const concepts = {
        'speech therapy': {
          definition: 'Assessment and treatment of communication problems and speech disorders',
          relatedConcepts: ['articulation', 'fluency', 'voice', 'language'],
        },
        'articulation': {
          definition: 'The physical production of speech sounds',
          relatedConcepts: ['phonology', 'motor speech', 'apraxia'],
        },
        'fluency': {
          definition: 'The smoothness or flow with which sounds, syllables, words and phrases are joined together during speech',
          relatedConcepts: ['stuttering', 'cluttering', 'rate of speech'],
        },
        'language': {
          definition: 'The use of a system of communication which consists of a set of symbols (words, grammar) with rules for combining these symbols',
          relatedConcepts: ['receptive language', 'expressive language', 'pragmatics'],
        },
        'ndis': {
          definition: 'National Disability Insurance Scheme - An Australian government scheme that provides support to eligible people with intellectual, physical, sensory, cognitive and psychosocial disability',
          relatedConcepts: ['funding', 'budget', 'support coordination'],
        },
        'therapy goals': {
          definition: 'Specific, measurable objectives established for clients to track progress in therapy',
          relatedConcepts: ['smart goals', 'treatment objectives', 'progress tracking'],
        },
        'progress notes': {
          definition: 'Documentation of client sessions including observations, interventions, client response, and assessment of progress',
          relatedConcepts: ['session notes', 'clinical documentation', 'treatment records'],
        },
      };
      
      if (concept && concepts[concept.toLowerCase()]) {
        return concepts[concept.toLowerCase()];
      }
      
      return { availableConcepts: Object.keys(concepts) };
    } catch (error) {
      console.error('Error retrieving therapy concepts:', error);
      throw error;
    }
  },
};

export default knowledgeService;