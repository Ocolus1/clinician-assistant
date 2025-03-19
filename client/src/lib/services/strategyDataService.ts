import { Goal, Strategy, Subgoal } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

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
      // Get goal details
      const goal = await apiRequest('GET', `/api/goals/${goalId}`) as unknown as Goal;
      if (!goal) {
        return [];
      }
      
      // Get subgoals for this goal
      const subgoals = await apiRequest('GET', `/api/goals/${goalId}/subgoals`) as unknown as Subgoal[];
      
      // Get all available strategies
      const allStrategies = await this.getAllStrategies();
      
      // Extract key terms from goal and subgoals
      const keyTerms = this.extractKeyTerms(goal, subgoals);
      
      // Score strategies by relevance
      return this.scoreStrategiesByRelevance(allStrategies, keyTerms);
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
      const goals = await apiRequest('GET', `/api/clients/${clientId}/goals`) as unknown as Goal[];
      
      if (!goals || goals.length === 0) {
        return {};
      }
      
      // For each goal, get recommended strategies
      const recommendations: Record<string, Strategy[]> = {};
      
      for (const goal of goals) {
        const strategies = await this.getRecommendedStrategiesForGoal(goal.id);
        if (strategies.length > 0) {
          recommendations[goal.title] = strategies;
        }
      }
      
      return recommendations;
    } catch (error) {
      console.error(`Error getting strategy recommendations for client ${clientId}:`, error);
      return {};
    }
  },
  
  /**
   * Extract key terms from goal and subgoals for strategy matching
   */
  extractKeyTerms(goal: Goal, subgoals: Subgoal[] = []): string[] {
    const terms: Set<string> = new Set();
    
    // Process goal title and description
    if (goal.title) {
      goal.title.toLowerCase().split(/\s+/).forEach(term => {
        if (term.length > 3) {
          terms.add(term);
        }
      });
    }
    
    if (goal.description) {
      goal.description.toLowerCase().split(/\s+/).forEach(term => {
        if (term.length > 3) {
          terms.add(term);
        }
      });
    }
    
    // Process subgoal titles and descriptions
    subgoals.forEach(subgoal => {
      if (subgoal.title) {
        subgoal.title.toLowerCase().split(/\s+/).forEach(term => {
          if (term.length > 3) {
            terms.add(term);
          }
        });
      }
      
      if (subgoal.description) {
        subgoal.description.toLowerCase().split(/\s+/).forEach(term => {
          if (term.length > 3) {
            terms.add(term);
          }
        });
      }
    });
    
    return Array.from(terms);
  },
  
  /**
   * Score strategies by relevance to extracted key terms
   */
  scoreStrategiesByRelevance(strategies: Strategy[], keyTerms: string[]): Strategy[] {
    if (keyTerms.length === 0 || strategies.length === 0) {
      return strategies;
    }
    
    // Score each strategy based on how many key terms it contains
    const scoredStrategies = strategies.map(strategy => {
      let score = 0;
      const strategyText = `${strategy.name} ${strategy.description} ${strategy.category}`.toLowerCase();
      
      keyTerms.forEach(term => {
        if (strategyText.includes(term)) {
          score += 1;
        }
      });
      
      return { strategy, score };
    });
    
    // Sort by score (descending)
    scoredStrategies.sort((a, b) => b.score - a.score);
    
    // Return top strategies (those with at least one matching term)
    return scoredStrategies
      .filter(item => item.score > 0)
      .map(item => item.strategy);
  }
};