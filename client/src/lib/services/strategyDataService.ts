import { apiRequest } from '@/lib/queryClient';
import { Strategy, Goal, Subgoal, SessionNote, PerformanceAssessment } from '@shared/schema';

/**
 * Service for therapy strategy recommendations
 */
export const strategyDataService = {
  /**
   * Get all available therapy strategies
   */
  async getAllStrategies(): Promise<Strategy[]> {
    try {
      return await apiRequest('GET', '/api/strategies');
    } catch (error) {
      console.error('Error fetching strategies:', error);
      return [];
    }
  },
  
  /**
   * Get strategies by category
   */
  async getStrategiesByCategory(category: string): Promise<Strategy[]> {
    try {
      return await apiRequest('GET', `/api/strategies/category/${category}`);
    } catch (error) {
      console.error(`Error fetching strategies for category ${category}:`, error);
      return [];
    }
  },
  
  /**
   * Get recommended strategies for a specific goal
   */
  async getRecommendedStrategiesForGoal(goalId: number): Promise<Strategy[]> {
    try {
      // Get the goal to understand its focus
      const goal = await apiRequest('GET', `/api/goals/${goalId}`);
      if (!goal) return [];
      
      // Get subgoals to understand specific areas
      const subgoals = await apiRequest('GET', `/api/subgoals/goal/${goalId}`);
      
      // Get all strategies
      const allStrategies = await this.getAllStrategies();
      
      // Extract key terms from goal and subgoals for matching
      const keyTerms = this.extractKeyTerms(goal, subgoals);
      
      // Score and rank strategies based on relevance to goal/subgoals
      const scoredStrategies = this.scoreStrategiesByRelevance(allStrategies, keyTerms);
      
      // Return top strategies (up to 5)
      return scoredStrategies.slice(0, 5);
    } catch (error) {
      console.error(`Error getting recommended strategies for goal ${goalId}:`, error);
      return [];
    }
  },
  
  /**
   * Get recommended strategies for client based on their goals and progress
   */
  async getRecommendedStrategiesForClient(clientId: number): Promise<Record<string, Strategy[]>> {
    try {
      // Get client's goals
      const goals = await apiRequest('GET', `/api/goals/client/${clientId}`);
      if (!goals || goals.length === 0) return {};
      
      // Get recommendations for each goal
      const recommendations: Record<string, Strategy[]> = {};
      
      for (const goal of goals) {
        const strategies = await this.getRecommendedStrategiesForGoal(goal.id);
        if (strategies.length > 0) {
          recommendations[goal.title] = strategies;
        }
      }
      
      return recommendations;
    } catch (error) {
      console.error(`Error getting recommended strategies for client ${clientId}:`, error);
      return {};
    }
  },
  
  /**
   * Extract key terms from goal and subgoals for strategy matching
   */
  extractKeyTerms(goal: Goal, subgoals: Subgoal[] = []): string[] {
    const terms: string[] = [];
    
    // Extract terms from goal title and description
    if (goal.title) {
      terms.push(...goal.title.toLowerCase().split(/\s+/));
    }
    
    if (goal.description) {
      terms.push(...goal.description.toLowerCase().split(/\s+/));
    }
    
    // Extract terms from subgoals
    subgoals.forEach(subgoal => {
      if (subgoal.title) {
        terms.push(...subgoal.title.toLowerCase().split(/\s+/));
      }
      
      if (subgoal.description) {
        terms.push(...subgoal.description.toLowerCase().split(/\s+/));
      }
    });
    
    // Filter out common words and short terms
    return terms
      .filter(term => term.length > 3)
      .filter(term => !['this', 'that', 'with', 'from', 'have', 'will'].includes(term));
  },
  
  /**
   * Score strategies by relevance to extracted key terms
   */
  scoreStrategiesByRelevance(strategies: Strategy[], keyTerms: string[]): Strategy[] {
    // No scoring needed if no key terms
    if (keyTerms.length === 0) return strategies;
    
    // Score each strategy based on term matches
    const scoredStrategies = strategies.map(strategy => {
      // Combine strategy name and description for matching
      const strategyText = `${strategy.name} ${strategy.description}`.toLowerCase();
      
      // Count matches
      const matchCount = keyTerms.reduce((count, term) => {
        return strategyText.includes(term) ? count + 1 : count;
      }, 0);
      
      return {
        strategy,
        score: matchCount
      };
    });
    
    // Sort by score (descending)
    scoredStrategies.sort((a, b) => b.score - a.score);
    
    // Return strategies in ranked order
    return scoredStrategies.map(item => item.strategy);
  }
};