/**
 * Knowledge Service for Database-Powered Assistant
 * 
 * This service provides methods to access database information in a way that's
 * useful for generating intelligent responses in the agent system.
 */
import { apiRequest } from '../../lib/queryClient';
import { 
  BudgetSettings, 
  BudgetItem, 
  Goal,
  Subgoal,
  Strategy,
  Session
} from '../../../shared/schema';
import { formatCurrency } from '../../lib/utils';

/**
 * Interface for general budget information
 */
export interface BudgetKnowledge {
  // Overview data
  categories?: string[];
  avgAllocationByCategory?: Record<string, number>;
  topFundingSource?: string;
  avgBudgetSize?: number;
  
  // Process data
  budgetingApproach?: string;
  budgetingDescription?: string;
  
  // Utilization data
  avgUtilizationRate?: number;
  highUsageCategories?: string[];
  typicalDepletion?: string;
  utilizationPatterns?: Record<string, any>;
  
  // Stats
  totalBudgets?: number;
  budgetCount?: number;
  budgetsCreatedLastMonth?: number;
  budgetsTrendData?: any[];
}

/**
 * Interface for general progress information
 */
export interface ProgressKnowledge {
  // Overview data
  avgOverallProgress?: number;
  avgAttendanceRate?: number;
  avgSessionsPerGoal?: number;
  
  // Goal data
  topGoalCategories?: string[];
  avgGoalsPerClient?: number;
  avgSubgoalsPerGoal?: number;
  
  // Trends
  progressTrends?: Record<string, any>;
  
  // Stats
  totalGoals?: number;
  goalsCreatedLastMonth?: number;
  goalsCompletedLastMonth?: number;
}

/**
 * Interface for general strategy information
 */
export interface StrategyKnowledge {
  // Overview data
  strategyCategories?: string[];
  strategyCount?: Record<string, number>;
  
  // Effectiveness data
  effectiveStrategies?: Array<{name: string, effectiveness: number}>;
  
  // Usage data
  mostUsedStrategies?: Array<{name: string, usageCount: number}>;
  
  // Stats
  totalStrategies?: number;
  strategiesCreatedLastMonth?: number;
}

/**
 * Knowledge service for accessing database information for agentic responses
 */
export const knowledgeService = {
  /**
   * Get general information about budgets
   */
  async getGeneralBudgetInfo(subtopic?: string): Promise<BudgetKnowledge> {
    try {
      // Query API for aggregated budget data
      const data = await apiRequest('GET', '/api/knowledge/budgets', { subtopic });
      return data;
    } catch (error) {
      console.error('Error fetching general budget info:', error);
      // Return minimal data to avoid breaking the agent
      return {
        categories: [],
        avgBudgetSize: 0,
        budgetCount: 0
      };
    }
  },
  
  /**
   * Get general information about client progress
   */
  async getGeneralProgressInfo(subtopic?: string): Promise<ProgressKnowledge> {
    try {
      // Query API for aggregated progress data
      const data = await apiRequest('GET', '/api/knowledge/progress', { subtopic });
      return data;
    } catch (error) {
      console.error('Error fetching general progress info:', error);
      // Return minimal data to avoid breaking the agent
      return {
        avgOverallProgress: 0,
        avgAttendanceRate: 0,
        totalGoals: 0
      };
    }
  },
  
  /**
   * Get general information about therapy strategies
   */
  async getGeneralStrategyInfo(subtopic?: string): Promise<StrategyKnowledge> {
    try {
      // Query API for aggregated strategy data
      const data = await apiRequest('GET', '/api/knowledge/strategies', { subtopic });
      return data;
    } catch (error) {
      console.error('Error fetching general strategy info:', error);
      // Return minimal data to avoid breaking the agent
      return {
        strategyCategories: [],
        totalStrategies: 0
      };
    }
  },
  
  /**
   * Get metadata about database schema
   */
  async getDatabaseMetadata(table?: string): Promise<any> {
    try {
      const metadata = await apiRequest('GET', '/api/knowledge/metadata', { table });
      return metadata;
    } catch (error) {
      console.error('Error fetching database metadata:', error);
      return {};
    }
  },
  
  /**
   * Get information about therapy domain concepts
   */
  async getTherapyDomainConcepts(concept?: string): Promise<any> {
    try {
      const conceptsData = await apiRequest('GET', '/api/knowledge/concepts', { concept });
      return conceptsData;
    } catch (error) {
      console.error('Error fetching therapy concepts:', error);
      return {};
    }
  },
  
  /**
   * Get aggregate statistics about clients
   */
  async getClientStatistics(): Promise<any> {
    try {
      const stats = await apiRequest('GET', '/api/knowledge/clients/stats');
      return stats;
    } catch (error) {
      console.error('Error fetching client statistics:', error);
      return {};
    }
  },
  
  /**
   * Get relationships between different data entities
   * (e.g. how goals relate to budgets, how strategies affect progress)
   */
  async getEntityRelationships(entity1: string, entity2: string): Promise<any> {
    try {
      const relationshipData = await apiRequest(
        'GET', 
        '/api/knowledge/relationships', 
        { entity1, entity2 }
      );
      return relationshipData;
    } catch (error) {
      console.error('Error fetching entity relationships:', error);
      return {};
    }
  },
  
  /**
   * Generate insights from combined data sources
   */
  async generateDataInsights(dataTypes: string[]): Promise<any> {
    try {
      const insights = await apiRequest(
        'GET',
        '/api/knowledge/insights',
        { dataTypes: dataTypes.join(',') }
      );
      return insights;
    } catch (error) {
      console.error('Error generating data insights:', error);
      return {};
    }
  },
  
  /**
   * Calculate aggregated metrics across the practice
   */
  async calculateAggregateMetrics(metricType: string): Promise<any> {
    try {
      const metrics = await apiRequest(
        'GET',
        '/api/knowledge/metrics',
        { type: metricType }
      );
      return metrics;
    } catch (error) {
      console.error('Error calculating aggregate metrics:', error);
      return {};
    }
  },
  
  /**
   * Get common patterns in the data
   */
  async detectDataPatterns(dataType: string): Promise<any> {
    try {
      const patterns = await apiRequest(
        'GET',
        '/api/knowledge/patterns',
        { type: dataType }
      );
      return patterns;
    } catch (error) {
      console.error('Error detecting data patterns:', error);
      return {};
    }
  },
  
  /**
   * Calculate local statistical implementations until backend is ready
   */
  async calculateLocalBudgetStats(budgetItems: BudgetItem[], budgetSettings: BudgetSettings[]): Promise<BudgetKnowledge> {
    // Get categories from budget items
    const categories = [...new Set(budgetItems.map(item => item.category))];
    
    // Calculate average allocation by category
    const allocations: Record<string, number[]> = {};
    categories.forEach(category => {
      allocations[category] = [];
    });
    
    budgetItems.forEach(item => {
      if (item.category && item.quantity && item.unitPrice) {
        const amount = item.quantity * item.unitPrice;
        allocations[item.category].push(amount);
      }
    });
    
    const avgAllocationByCategory: Record<string, number> = {};
    Object.entries(allocations).forEach(([category, amounts]) => {
      if (amounts.length > 0) {
        const sum = amounts.reduce((acc, val) => acc + val, 0);
        avgAllocationByCategory[category] = sum / amounts.length;
      } else {
        avgAllocationByCategory[category] = 0;
      }
    });
    
    // Calculate average budget size
    const budgetSizes = budgetSettings.map(bs => bs.ndisfunds || 0);
    const avgBudgetSize = budgetSizes.length > 0 
      ? budgetSizes.reduce((acc, val) => acc + val, 0) / budgetSizes.length 
      : 0;
    
    // Determine top funding sources
    const fundingSources = budgetSettings.map(bs => bs.fundsManagement).filter(Boolean) as string[];
    const sourceCount: Record<string, number> = {};
    fundingSources.forEach(source => {
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });
    
    let topFundingSource = '';
    let maxCount = 0;
    Object.entries(sourceCount).forEach(([source, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topFundingSource = source;
      }
    });
    
    return {
      categories,
      avgAllocationByCategory,
      topFundingSource,
      avgBudgetSize,
      budgetCount: budgetSettings.length,
      budgetingApproach: 'client-centered allocation',
      budgetingDescription: 'analyzing client needs, prioritizing goals, and allocating resources based on evidence-based practices'
    };
  },
  
  /**
   * Calculate local progress statistics until backend is ready
   */
  async calculateLocalProgressStats(goals: Goal[], subgoals: Subgoal[], sessions: Session[]): Promise<ProgressKnowledge> {
    // Calculate average goals per client
    const clientIds = [...new Set(goals.map(goal => goal.clientId))];
    const avgGoalsPerClient = clientIds.length > 0 
      ? goals.length / clientIds.length 
      : 0;
    
    // Calculate average subgoals per goal
    const goalCounts: Record<number, number> = {};
    subgoals.forEach(subgoal => {
      goalCounts[subgoal.goalId] = (goalCounts[subgoal.goalId] || 0) + 1;
    });
    
    const subgoalCounts = Object.values(goalCounts);
    const avgSubgoalsPerGoal = subgoalCounts.length > 0
      ? subgoalCounts.reduce((acc, val) => acc + val, 0) / subgoalCounts.length
      : 0;
    
    // Extract goal categories
    const goalCategories = goals.map(goal => goal.category).filter(Boolean) as string[];
    const categoryCount: Record<string, number> = {};
    goalCategories.forEach(category => {
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    // Sort categories by frequency
    const sortedCategories = Object.entries(categoryCount)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([category]) => category);
    
    // Calculate attendance rate from sessions
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const totalSessions = sessions.length;
    const avgAttendanceRate = totalSessions > 0 
      ? (completedSessions / totalSessions) * 100 
      : 0;
    
    return {
      avgGoalsPerClient,
      avgSubgoalsPerGoal,
      topGoalCategories: sortedCategories,
      avgAttendanceRate,
      totalGoals: goals.length,
      avgSessionsPerGoal: totalSessions > 0 && goals.length > 0 
        ? totalSessions / goals.length 
        : 0
    };
  },
  
  /**
   * Calculate local strategy statistics until backend is ready
   */
  async calculateLocalStrategyStats(strategies: Strategy[]): Promise<StrategyKnowledge> {
    // Extract strategy categories
    const categories = [...new Set(strategies.map(s => s.category))];
    
    // Count strategies by category
    const strategyCount: Record<string, number> = {};
    categories.forEach(category => {
      strategyCount[category] = strategies.filter(s => s.category === category).length;
    });
    
    // Most used strategies (for now, we'll use a random subset as we don't have usage data)
    const mostUsedStrategies = strategies
      .slice(0, Math.min(5, strategies.length))
      .map(s => ({
        name: s.name,
        usageCount: Math.floor(Math.random() * 10) + 1 // Placeholder until we have real data
      }));
    
    return {
      strategyCategories: categories,
      strategyCount,
      mostUsedStrategies,
      totalStrategies: strategies.length,
      strategiesCreatedLastMonth: Math.floor(strategies.length * 0.1) // Placeholder
    };
  }
};

export default knowledgeService;