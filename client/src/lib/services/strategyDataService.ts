import { apiRequest } from '@/lib/queryClient';
import { Patient, Goal, Subgoal, Strategy } from '@shared/schema';

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
   * Get recommended strategies for patient based on goals, progress, and patient attributes
   */
  async getRecommendedStrategiesForPatient(patientId: number): Promise<Record<string, Strategy[]>> {
    try {
      // Get the patient's goals
      const goalsResponse = await apiRequest('GET', `/api/goals/patient/${patientId}`);
      const goals = goalsResponse as unknown as Goal[];
      
      if (!goals || goals.length === 0) return {};
      
      // Get patient data for personalization
      let patient = null;
      try {
        const patientResponse = await apiRequest('GET', `/api/patients/${patientId}`);
        patient = patientResponse as unknown as Patient;
      } catch (error) {
        console.warn('Patient data not available for personalization, proceeding with basic recommendations');
      }
      
      // Get progress data if available to identify areas needing focus
      let progressData = null;
      try {
        // Try to fetch progress data if available
        const progressResponse = await apiRequest('GET', `/api/patients/${patientId}/progress`);
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
        
        // Personalize strategies based on patient attributes if available
        if (patient) {
          strategies = this.personalizeStrategiesForPatient(strategies, patient);
        }
        
        recommendationsByGoal[goal.title] = strategies.slice(0, 5); // Limit to top 5 strategies per goal
      }
      
      // Add general recommendations
      const generalStrategies = await this.getGeneralRecommendations();
      recommendationsByGoal['General Recommendations'] = generalStrategies;
      
      return recommendationsByGoal;
    } catch (error) {
      console.error(`Error getting recommended strategies for patient ${patientId}:`, error);
      return {};
    }
  },

  /**
   * Get general recommendation strategies applicable across goals
   */
  async getGeneralRecommendations(): Promise<Strategy[]> {
    try {
      // Get general strategies from a specific category
      const generalStrategies = await this.getStrategiesByCategory('general');
      
      // If no general category exists, get a subset of strategies from all categories
      if (!generalStrategies || generalStrategies.length === 0) {
        const allStrategies = await this.getAllStrategies();
        
        // Filter for strategies that mention being broadly applicable
        return allStrategies.filter(strategy => {
          const text = `${strategy.name} ${strategy.description}`.toLowerCase();
          return text.includes('general') || 
                 text.includes('broad') || 
                 text.includes('universal') ||
                 text.includes('fundamental');
        });
      }
      
      return generalStrategies;
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
      const text = `${strategy.name} ${strategy.description} ${strategy.category}`.toLowerCase();
      return text.includes('basic') || 
             text.includes('foundation') || 
             text.includes('fundamental') ||
             text.includes('beginner') ||
             text.includes('initial') ||
             text.includes('introductory') ||
             text.includes('early stage');
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
      const text = `${strategy.name} ${strategy.description} ${strategy.category}`.toLowerCase();
      return text.includes('advanced') || 
             text.includes('complex') || 
             text.includes('sophisticated') ||
             text.includes('expert') ||
             text.includes('mastery') ||
             text.includes('high level') ||
             text.includes('late stage');
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
   * Personalize strategies based on patient attributes
   */
  personalizeStrategiesForPatient(strategies: Strategy[], patient: Patient): Strategy[] {
    if (!patient) return strategies;
    
    // Calculate patient age for age-appropriate strategies
    const age = this.calculateAge(patient.dateOfBirth);
    
    // Create a scoring function based on patient attributes
    const getRelevanceScore = (strategy: Strategy): number => {
      let score = 0;
      
      // Age-appropriate matching
      if (age !== null) {
        if (age < 5 && this.isEarlyChildhoodStrategy(strategy)) score += 3;
        else if (age >= 5 && age < 13 && this.isChildStrategy(strategy)) score += 3;
        else if (age >= 13 && age < 18 && this.isAdolescentStrategy(strategy)) score += 3;
        else if (age >= 18 && this.isAdultStrategy(strategy)) score += 3;
      }
      
      // Add additional personalization factors based on patient attributes
      // This is a simplified example - in a real system, this would be more sophisticated
      const strategyText = `${strategy.name} ${strategy.description}`.toLowerCase();
      
      // Check for specific condition matches if diagnoses exist
      // Safely check if diagnoses property exists and is an array
      if (patient && 'diagnoses' in patient && Array.isArray((patient as any).diagnoses)) {
        ((patient as any).diagnoses as string[]).forEach((diagnosis: string) => {
          if (strategyText.includes(diagnosis.toLowerCase())) {
            score += 5; // High relevance for diagnosis-specific strategies
          }
        });
      }
      
      return score;
    };
    
    // Sort strategies by relevance score
    return [...strategies].sort((a, b) => {
      const scoreA = getRelevanceScore(a);
      const scoreB = getRelevanceScore(b);
      return scoreB - scoreA; // Higher scores first
    });
  },

  /**
   * Calculate patient age from date of birth
   */
  calculateAge(dateOfBirth: string | undefined): number | null {
    if (!dateOfBirth) return null;
    
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      
      // Check if date is valid
      if (isNaN(birthDate.getTime())) {
        console.warn('Invalid date of birth:', dateOfBirth);
        return null;
      }
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred yet this year
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
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
    const text = `${strategy.name} ${strategy.description} ${strategy.category}`.toLowerCase();
    return text.includes('early childhood') || 
           text.includes('toddler') || 
           text.includes('preschool');
  },

  /**
   * Check if strategy is appropriate for school-age children
   */
  isChildStrategy(strategy: Strategy): boolean {
    const text = `${strategy.name} ${strategy.description} ${strategy.category}`.toLowerCase();
    return text.includes('child') || 
           text.includes('school-age') || 
           text.includes('elementary');
  },

  /**
   * Check if strategy is appropriate for adolescents
   */
  isAdolescentStrategy(strategy: Strategy): boolean {
    const text = `${strategy.name} ${strategy.description} ${strategy.category}`.toLowerCase();
    return text.includes('adolescent') || 
           text.includes('teen') || 
           text.includes('youth');
  },

  /**
   * Check if strategy is appropriate for adults
   */
  isAdultStrategy(strategy: Strategy): boolean {
    const text = `${strategy.name} ${strategy.description} ${strategy.category}`.toLowerCase();
    return text.includes('adult') || 
           text.includes('mature') || 
           !text.includes('child');
  },

  /**
   * Extract key terms from goal and subgoals for strategy matching
   * with enhanced therapy domain-specific terms
   */
  extractKeyTerms(goal: Goal, subgoals: Subgoal[] = []): string[] {
    if (!goal) return [];
    
    const terms = new Set<string>();
    
    // Extract terms from goal title and description
    const extractTermsFromText = (text: string | undefined) => {
      if (!text) return;
      
      // Split text into words and clean them
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .split(/\s+/) // Split by whitespace
        .filter(word => word.length > 2); // Filter out very short words
      
      // Add individual words
      words.forEach(word => terms.add(word));
      
      // Add adjacent word pairs for context
      for (let i = 0; i < words.length - 1; i++) {
        terms.add(`${words[i]} ${words[i + 1]}`);
      }
    };
    
    // Process goal text
    extractTermsFromText(goal.title);
    extractTermsFromText(goal.description);
    
    // Process subgoal text
    subgoals.forEach(subgoal => {
      extractTermsFromText(subgoal.title);
      extractTermsFromText(subgoal.description);
    });
    
    // Add therapy domain-specific terms with higher weight
    const domainTerms = [
      'speech', 'language', 'motor', 'sensory', 'cognitive',
      'behavioral', 'social', 'emotional', 'communication',
      'articulation', 'fluency', 'voice', 'swallowing',
      'phonological', 'literacy', 'auditory', 'visual',
      'attention', 'memory', 'executive', 'processing',
      'autism', 'developmental', 'delay', 'disorder'
    ];
    
    // Check if domain terms are present in the goal or subgoals
    domainTerms.forEach(term => {
      const goalText = `${goal.title} ${goal.description}`.toLowerCase();
      if (goalText.includes(term)) {
        terms.add(term);
      }
      
      // Check in subgoals
      subgoals.forEach(subgoal => {
        const subgoalText = `${subgoal.title} ${subgoal.description}`.toLowerCase();
        if (subgoalText.includes(term)) {
          terms.add(term);
        }
      });
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
