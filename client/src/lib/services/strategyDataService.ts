import { apiRequest } from '@/lib/queryClient';
import { Goal, Subgoal, Strategy } from '@shared/schema';

/**
 * Service for therapy strategy recommendations
 */
export const strategyDataService = {
  /**
   * Get all available therapy strategies
   */
  async getAllStrategies(): Promise<Strategy[]> {
    try {
      const response = await apiRequest('GET', '/api/strategies');
      return response as unknown as Strategy[];
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
      const response = await apiRequest('GET', `/api/strategies/category/${category}`);
      return response as unknown as Strategy[];
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
      // First, get the goal and its subgoals
      const goalResponse = await apiRequest('GET', `/api/goals/${goalId}`);
      const goal = goalResponse as unknown as Goal;
      
      const subgoalsResponse = await apiRequest('GET', `/api/subgoals/goal/${goalId}`);
      const subgoals = subgoalsResponse as unknown as Subgoal[];
      
      // Get all strategies
      const strategies = await this.getAllStrategies();
      
      // Extract key terms from goal and subgoals
      const keyTerms = this.extractKeyTerms(goal, subgoals);
      
      // Score and sort strategies by relevance to the key terms
      return this.scoreStrategiesByRelevance(strategies, keyTerms);
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
      // Get the client's goals
      const goalsResponse = await apiRequest('GET', `/api/goals/client/${clientId}`);
      const goals = goalsResponse as unknown as Goal[];
      
      // Get recommendations for each goal
      const recommendationsByGoal: Record<string, Strategy[]> = {};
      
      for (const goal of goals) {
        const strategies = await this.getRecommendedStrategiesForGoal(goal.id);
        recommendationsByGoal[goal.title] = strategies.slice(0, 3); // Top 3 strategies per goal
      }
      
      return recommendationsByGoal;
    } catch (error) {
      console.error(`Error getting recommendations for client ${clientId}:`, error);
      return {};
    }
  },

  /**
   * Extract key terms from goal and subgoals for strategy matching
   */
  extractKeyTerms(goal: Goal, subgoals: Subgoal[] = []): string[] {
    const terms = new Set<string>();
    
    // Extract terms from goal title and description
    if (goal.title) {
      goal.title.toLowerCase().split(/\s+/).forEach(term => {
        if (term.length > 3) terms.add(term);
      });
    }
    
    if (goal.description) {
      goal.description.toLowerCase().split(/\s+/).forEach(term => {
        if (term.length > 3) terms.add(term);
      });
    }
    
    // Extract terms from subgoals
    subgoals.forEach(subgoal => {
      if (subgoal.title) {
        subgoal.title.toLowerCase().split(/\s+/).forEach(term => {
          if (term.length > 3) terms.add(term);
        });
      }
      
      if (subgoal.description) {
        subgoal.description.toLowerCase().split(/\s+/).forEach(term => {
          if (term.length > 3) terms.add(term);
        });
      }
    });
    
    // Filter out common words and very short terms
    const commonWords = ['the', 'and', 'for', 'with', 'this', 'that', 'will', 'able', 'have', 'from'];
    return Array.from(terms).filter(term => !commonWords.includes(term));
  },

  /**
   * Score strategies by relevance to extracted key terms
   */
  scoreStrategiesByRelevance(strategies: Strategy[], keyTerms: string[]): Strategy[] {
    if (keyTerms.length === 0 || strategies.length === 0) return strategies;
    
    // Calculate a relevance score for each strategy
    const scoredStrategies = strategies.map(strategy => {
      let score = 0;
      
      // Check strategy name and description for key terms
      const strategyText = `${strategy.name} ${strategy.description}`.toLowerCase();
      
      keyTerms.forEach(term => {
        // Count occurrences of the term
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = strategyText.match(regex);
        
        if (matches) {
          // Add to score based on number of matches
          score += matches.length * 2;
        }
      });
      
      return { strategy, score };
    });
    
    // Sort by score (highest first) and return just the strategies
    return scoredStrategies
      .sort((a, b) => b.score - a.score)
      .map(item => item.strategy);
  }
};