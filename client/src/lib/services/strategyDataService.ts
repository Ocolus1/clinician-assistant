import { apiRequest } from '@/lib/queryClient';
import { Client, Goal, Subgoal, Strategy } from '@shared/schema';

/**
 * Service for therapy strategy recommendations with enhanced intelligence
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
   * Get recommended strategies for a specific goal with enhanced NLP
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
      
      // Extract key terms from goal and subgoals with domain-specific weights
      const keyTerms = this.extractKeyTerms(goal, subgoals);
      
      // Score and sort strategies by relevance to the key terms
      return this.scoreStrategiesByRelevance(strategies, keyTerms);
    } catch (error) {
      console.error(`Error getting recommended strategies for goal ${goalId}:`, error);
      return [];
    }
  },

  /**
   * Get recommended strategies for client based on goals, progress, and client attributes
   */
  async getRecommendedStrategiesForClient(clientId: number): Promise<Record<string, Strategy[]>> {
    try {
      // Get the client's goals
      const goalsResponse = await apiRequest('GET', `/api/goals/client/${clientId}`);
      const goals = goalsResponse as unknown as Goal[];
      
      if (!goals || goals.length === 0) return {};
      
      // Get client data for personalization
      let client = null;
      try {
        const clientResponse = await apiRequest('GET', `/api/clients/${clientId}`);
        client = clientResponse as unknown as Client;
      } catch (error) {
        console.warn('Client data not available for personalization, proceeding with basic recommendations');
      }
      
      // Get progress data if available to identify areas needing focus
      let progressData = null;
      try {
        // Try to fetch progress data if available
        const progressResponse = await apiRequest('GET', `/api/clients/${clientId}/progress`);
        progressData = progressResponse;
      } catch (error) {
        // Continue without progress data
        console.warn('Progress data not available, proceeding with basic recommendations');
      }
      
      // Get recommendations for each goal
      const recommendationsByGoal: Record<string, Strategy[]> = {};
      
      for (const goal of goals) {
        // Get base strategy recommendations
        let strategies = await this.getRecommendedStrategiesForGoal(goal.id);
        
        // If we have progress data, enhance recommendations based on progress
        if (progressData) {
          const goalProgress = (progressData as any).goalProgress?.find((g: any) => g.goalId === goal.id);
          
          if (goalProgress) {
            if (goalProgress.progress < 30) {
              // For goals with low progress, prioritize foundational strategies
              strategies = this.prioritizeFoundationalStrategies(strategies);
            } else if (goalProgress.progress > 70) {
              // For goals with high progress, prioritize advanced strategies
              strategies = this.prioritizeAdvancedStrategies(strategies);
            }
          }
        }
        
        // If we have client data, personalize strategies
        if (client) {
          strategies = this.personalizeStrategiesForClient(strategies, client);
        }
        
        recommendationsByGoal[goal.title] = strategies.slice(0, 5); // Top 5 strategies per goal
      }
      
      // Add general recommendations if we have strategies
      const generalStrategies = await this.getGeneralRecommendations();
      if (generalStrategies.length > 0) {
        recommendationsByGoal['General Approaches'] = generalStrategies.slice(0, 3);
      }
      
      return recommendationsByGoal;
    } catch (error) {
      console.error(`Error getting recommendations for client ${clientId}:`, error);
      return {};
    }
  },
  
  /**
   * Get general recommendation strategies applicable across goals
   */
  async getGeneralRecommendations(): Promise<Strategy[]> {
    try {
      // Get all strategies
      const allStrategies = await this.getAllStrategies();
      
      // Filter to strategies marked as general or foundational
      return allStrategies.filter(strategy => 
        strategy.category === 'General' || 
        strategy.category === 'Foundational' ||
        (strategy.description && 
         (strategy.description.toLowerCase().includes('general approach') ||
          strategy.description.toLowerCase().includes('widely applicable'))));
    } catch (error) {
      console.error('Error getting general recommendations:', error);
      return [];
    }
  },
  
  /**
   * Prioritize foundational strategies for early-stage goals
   */
  prioritizeFoundationalStrategies(strategies: Strategy[]): Strategy[] {
    // Create a scoring function that favors foundational strategies
    const isFoundational = (strategy: Strategy): boolean => {
      if (strategy.category === 'Foundational' || strategy.category === 'Basic') return true;
      if (!strategy.description) return false;
      
      const desc = strategy.description.toLowerCase();
      return desc.includes('basic') || 
             desc.includes('foundational') || 
             desc.includes('beginner') ||
             desc.includes('initial') ||
             desc.includes('first step');
    };
    
    // Sort strategies with foundational ones first
    return [...strategies].sort((a, b) => {
      const aIsFoundational = isFoundational(a);
      const bIsFoundational = isFoundational(b);
      
      if (aIsFoundational && !bIsFoundational) return -1;
      if (!aIsFoundational && bIsFoundational) return 1;
      return 0;
    });
  },
  
  /**
   * Prioritize advanced strategies for late-stage goals
   */
  prioritizeAdvancedStrategies(strategies: Strategy[]): Strategy[] {
    // Create a scoring function that favors advanced strategies
    const isAdvanced = (strategy: Strategy): boolean => {
      if (strategy.category === 'Advanced' || strategy.category === 'Expert') return true;
      if (!strategy.description) return false;
      
      const desc = strategy.description.toLowerCase();
      return desc.includes('advanced') || 
             desc.includes('expert') || 
             desc.includes('sophisticated') ||
             desc.includes('complex') ||
             desc.includes('next step');
    };
    
    // Sort strategies with advanced ones first
    return [...strategies].sort((a, b) => {
      const aIsAdvanced = isAdvanced(a);
      const bIsAdvanced = isAdvanced(b);
      
      if (aIsAdvanced && !bIsAdvanced) return -1;
      if (!aIsAdvanced && bIsAdvanced) return 1;
      return 0;
    });
  },
  
  /**
   * Personalize strategies based on client attributes
   */
  personalizeStrategiesForClient(strategies: Strategy[], client: Client): Strategy[] {
    // If no client data, return original strategies
    if (!client) return strategies;
    
    // Calculate client age for age-appropriate strategies
    const age = this.calculateAge(client.dateOfBirth);
    
    // Create a scoring function based on client attributes
    const getRelevanceScore = (strategy: Strategy): number => {
      let score = 0;
      
      // Age-appropriate strategies
      if (age !== null) {
        if (age < 5 && this.isEarlyChildhoodStrategy(strategy)) score += 3;
        if (age >= 5 && age < 12 && this.isChildStrategy(strategy)) score += 3;
        if (age >= 12 && age < 18 && this.isAdolescentStrategy(strategy)) score += 3;
        if (age >= 18 && this.isAdultStrategy(strategy)) score += 3;
      }
      
      // Consider language preferences if available
      if (client.preferredLanguage && strategy.description) {
        if (strategy.description.toLowerCase().includes(client.preferredLanguage.toLowerCase())) {
          score += 2;
        }
      }
      
      return score;
    };
    
    // Score each strategy
    const scoredStrategies = strategies.map(strategy => ({
      strategy,
      score: getRelevanceScore(strategy)
    }));
    
    // Sort first by personalization score, then preserve original order where scores are tied
    scoredStrategies.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return strategies.indexOf(a.strategy) - strategies.indexOf(b.strategy);
    });
    
    return scoredStrategies.map(item => item.strategy);
  },
  
  /**
   * Calculate client age from date of birth
   */
  calculateAge(dateOfBirth: string | undefined): number | null {
    if (!dateOfBirth) return null;
    
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return null;
    }
  },
  
  /**
   * Check if strategy is appropriate for early childhood
   */
  isEarlyChildhoodStrategy(strategy: Strategy): boolean {
    if (!strategy.description && !strategy.category) return false;
    
    const terms = ['toddler', 'preschool', 'early childhood', 'young child', 'pediatric'];
    const desc = strategy.description?.toLowerCase() || '';
    const category = strategy.category?.toLowerCase() || '';
    
    return terms.some(term => desc.includes(term) || category.includes(term));
  },
  
  /**
   * Check if strategy is appropriate for school-age children
   */
  isChildStrategy(strategy: Strategy): boolean {
    if (!strategy.description && !strategy.category) return false;
    
    const terms = ['child', 'elementary', 'school-age', 'pediatric'];
    const desc = strategy.description?.toLowerCase() || '';
    const category = strategy.category?.toLowerCase() || '';
    
    return terms.some(term => desc.includes(term) || category.includes(term));
  },
  
  /**
   * Check if strategy is appropriate for adolescents
   */
  isAdolescentStrategy(strategy: Strategy): boolean {
    if (!strategy.description && !strategy.category) return false;
    
    const terms = ['adolescent', 'teen', 'teenage', 'youth', 'high school'];
    const desc = strategy.description?.toLowerCase() || '';
    const category = strategy.category?.toLowerCase() || '';
    
    return terms.some(term => desc.includes(term) || category.includes(term));
  },
  
  /**
   * Check if strategy is appropriate for adults
   */
  isAdultStrategy(strategy: Strategy): boolean {
    if (!strategy.description && !strategy.category) return false;
    
    const terms = ['adult', 'mature', 'elder', 'professional', 'workplace'];
    const desc = strategy.description?.toLowerCase() || '';
    const category = strategy.category?.toLowerCase() || '';
    
    return terms.some(term => desc.includes(term) || category.includes(term));
  },

  /**
   * Extract key terms from goal and subgoals for strategy matching
   * with enhanced therapy domain-specific terms
   */
  extractKeyTerms(goal: Goal, subgoals: Subgoal[] = []): string[] {
    const terms = new Set<string>();
    
    // Domain-specific important terms for speech therapy context
    const therapyTerms = [
      'speech', 'language', 'communication', 'articulation', 'fluency',
      'stutter', 'phonology', 'vocabulary', 'syntax', 'pragmatic',
      'motor', 'sensory', 'cognitive', 'social', 'behavioral',
      'receptive', 'expressive', 'comprehension', 'production',
      'voice', 'swallow', 'memory', 'attention', 'executive',
      'literacy', 'reading', 'writing', 'academic',
      'autism', 'developmental', 'delay', 'disorder', 'impairment'
    ];
    
    // Extract terms from goal title and description with domain relevance
    if (goal.title) {
      goal.title.toLowerCase().split(/\s+/).forEach(term => {
        if (term.length > 3 || therapyTerms.includes(term)) {
          terms.add(term);
        }
      });
    }
    
    if (goal.description) {
      goal.description.toLowerCase().split(/\s+/).forEach(term => {
        if (term.length > 3 || therapyTerms.includes(term)) {
          terms.add(term);
        }
      });
    }
    
    // Extract terms from subgoals with domain relevance
    subgoals.forEach(subgoal => {
      if (subgoal.title) {
        subgoal.title.toLowerCase().split(/\s+/).forEach(term => {
          if (term.length > 3 || therapyTerms.includes(term)) {
            terms.add(term);
          }
        });
      }
      
      if (subgoal.description) {
        subgoal.description.toLowerCase().split(/\s+/).forEach(term => {
          if (term.length > 3 || therapyTerms.includes(term)) {
            terms.add(term);
          }
        });
      }
    });
    
    // Extract multi-word therapy terminology
    const combinedText = [
      goal.title, 
      goal.description, 
      ...subgoals.map(sg => sg.title),
      ...subgoals.map(sg => sg.description)
    ].filter(Boolean).join(' ').toLowerCase();
    
    const multiWordTerms = [
      'speech therapy', 'language delay', 'developmental delay',
      'fine motor', 'gross motor', 'sensory processing',
      'executive function', 'social skills', 'expressive language',
      'receptive language', 'augmentative communication', 'alternative communication',
      'phonological awareness', 'articulation disorder', 'fluency disorder'
    ];
    
    multiWordTerms.forEach(term => {
      if (combinedText.includes(term)) {
        terms.add(term);
      }
    });
    
    // Filter out common words and very short terms
    const commonWords = ['the', 'and', 'for', 'with', 'this', 'that', 'will', 'able', 'have', 'from', 'then', 'than', 'when'];
    return Array.from(terms).filter(term => !commonWords.includes(term));
  },

  /**
   * Score strategies by relevance to extracted key terms with enhanced domain-specific weights
   */
  scoreStrategiesByRelevance(strategies: Strategy[], keyTerms: string[]): Strategy[] {
    if (keyTerms.length === 0 || strategies.length === 0) return strategies;
    
    // Domain-specific term importance weights
    const termImportance: Record<string, number> = {
      'speech': 2,
      'language': 2,
      'motor': 2,
      'sensory': 2,
      'autism': 3,
      'phonological': 2,
      'articulation': 2,
      'fluency': 2,
      'cognitive': 2,
      'developmental': 2,
      'communication': 2,
      'social': 1.5,
      'behavioral': 1.5,
      // Multi-word terms have higher importance
      'speech therapy': 3,
      'language delay': 3,
      'developmental delay': 3,
      'fine motor': 3,
      'gross motor': 3,
      'sensory processing': 3,
      'executive function': 3,
      'social skills': 3,
      'expressive language': 3,
      'receptive language': 3
    };
    
    // Calculate a relevance score for each strategy with enhanced matching
    const scoredStrategies = strategies.map(strategy => {
      let score = 0;
      
      // Prepare strategy text for matching
      const strategyText = `${strategy.name || ''} ${strategy.description || ''} ${strategy.category || ''}`.toLowerCase();
      
      // Check for key term matches with weighting
      keyTerms.forEach(term => {
        // Get term importance multiplier
        const importanceMultiplier = termImportance[term] || 1;
        
        // Count occurrences of the term
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = strategyText.match(regex);
        
        if (matches) {
          // Add to score based on number of matches and term importance
          score += matches.length * 2 * importanceMultiplier;
          
          // Bonus points for term appearing in name or category (more significant locations)
          if (strategy.name?.toLowerCase().match(regex)) {
            score += 3 * importanceMultiplier;
          }
          
          if (strategy.category?.toLowerCase().match(regex)) {
            score += 4 * importanceMultiplier;
          }
        }
      });
      
      // Evidence-based boost
      if (strategy.description && 
          (strategy.description.toLowerCase().includes('evidence-based') || 
           strategy.description.toLowerCase().includes('research') ||
           strategy.description.toLowerCase().includes('study') ||
           strategy.description.toLowerCase().includes('effective'))) {
        score += 5; // Significant boost for evidence-based approaches
      }
      
      return { strategy, score };
    });
    
    // Sort by score (highest first) and return just the strategies
    return scoredStrategies
      .filter(item => item.score > 0) // Only include relevant strategies
      .sort((a, b) => b.score - a.score)
      .map(item => item.strategy);
  }
};