import { QueryContext, QueryIntent } from './types';

/**
 * Parse user query to determine intent
 */
export function parseQueryIntent(query: string, context: QueryContext): QueryIntent {
  const lowercaseQuery = query.toLowerCase();
  
  // Budget Analysis Intent
  if (
    containsAny(lowercaseQuery, ['budget', 'funding', 'expense', 'spending', 'cost', 'money', 'financial', 'funds']) ||
    containsAny(lowercaseQuery, ['how much', 'remaining', 'available', 'utilization', 'allocation'])
  ) {
    // Specific budget queries
    if (containsAny(lowercaseQuery, ['remaining', 'left', 'available', 'balance'])) {
      const intent: QueryIntent = { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId, specificQuery: 'REMAINING' };
      return intent;
    }
    
    if (containsAny(lowercaseQuery, ['forecast', 'projection', 'predict', 'future', 'run out', 'depleted'])) {
      const intent: QueryIntent = { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId, specificQuery: 'FORECAST' };
      return intent;
    }
    
    if (containsAny(lowercaseQuery, ['utilization', 'spending', 'usage', 'allocation', 'breakdown', 'categories'])) {
      const intent: QueryIntent = { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId, specificQuery: 'UTILIZATION' };
      return intent;
    }
    
    // General budget query
    const intent: QueryIntent = { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId };
    return intent;
  }
  
  // Progress Tracking Intent
  if (
    containsAny(lowercaseQuery, ['progress', 'goal', 'achievement', 'milestone', 'improvement', 'outcome', 'target']) ||
    containsAny(lowercaseQuery, ['how is', 'status', 'improved', 'performing', 'attendance'])
  ) {
    // Specific progress queries
    if (containsAny(lowercaseQuery, ['overall', 'general', 'summary', 'broadly'])) {
      const intent: QueryIntent = { 
        type: 'PROGRESS_TRACKING', 
        clientId: context.activeClientId,
        specificQuery: 'OVERALL' 
      };
      return intent;
    }
    
    if (containsAny(lowercaseQuery, ['attendance', 'show up', 'present', 'absence', 'cancel'])) {
      const intent: QueryIntent = { 
        type: 'PROGRESS_TRACKING', 
        clientId: context.activeClientId,
        specificQuery: 'ATTENDANCE' 
      };
      return intent;
    }
    
    if (context.activeGoalId) {
      const intent: QueryIntent = { 
        type: 'PROGRESS_TRACKING', 
        clientId: context.activeClientId,
        goalId: context.activeGoalId,
        specificQuery: 'GOAL_SPECIFIC' 
      };
      return intent;
    }
    
    // General progress query
    const intent: QueryIntent = { 
      type: 'PROGRESS_TRACKING', 
      clientId: context.activeClientId 
    };
    return intent;
  }
  
  // Combined Insights Intent
  if (
    (containsAny(lowercaseQuery, ['analysis', 'insights', 'overview', 'summary', 'report', 'dashboard']) &&
    (containsAny(lowercaseQuery, ['comprehensive', 'combined', 'complete', 'full', 'both', 'all', 'together', 'overall']))) ||
    (containsAny(lowercaseQuery, ['budget', 'spending', 'funds']) && 
     containsAny(lowercaseQuery, ['progress', 'goals', 'achievement'])) ||
    containsAny(lowercaseQuery, ['big picture', 'full picture', 'overall status', 'return on investment', 'roi', 'cost effectiveness', 'value for money', 'cost per progress', 'therapy value'])
  ) {
    // Specific combined insight queries
    if (containsAny(lowercaseQuery, ['budget', 'fund', 'spending', 'cost', 'money', 'financial', 'roi', 'value for money']) && 
        !containsAny(lowercaseQuery, ['goal', 'progress', 'achievement', 'milestone'])) {
      const intent: QueryIntent = { 
        type: 'COMBINED_INSIGHTS', 
        clientId: context.activeClientId,
        specificQuery: 'BUDGET_FOCUS' 
      };
      return intent;
    }
    
    if (containsAny(lowercaseQuery, ['progress', 'goal', 'achievement', 'milestone', 'improvement']) && 
        !containsAny(lowercaseQuery, ['budget', 'fund', 'spending', 'cost', 'money'])) {
      const intent: QueryIntent = { 
        type: 'COMBINED_INSIGHTS', 
        clientId: context.activeClientId,
        specificQuery: 'PROGRESS_FOCUS' 
      };
      return intent;
    }
    
    // General combined insight query
    const intent: QueryIntent = { 
      type: 'COMBINED_INSIGHTS', 
      clientId: context.activeClientId,
      specificQuery: 'OVERALL' 
    };
    return intent;
  }
  
  // Strategy Recommendation Intent
  if (
    containsAny(lowercaseQuery, ['strategy', 'strategies', 'approach', 'technique', 'method', 'intervention', 'therapy']) ||
    containsAny(lowercaseQuery, ['recommend', 'suggest', 'advise', 'what should', 'ideas for'])
  ) {
    // Specific strategy queries
    if (context.activeGoalId) {
      const intent: QueryIntent = { 
        type: 'STRATEGY_RECOMMENDATION', 
        clientId: context.activeClientId,
        goalId: context.activeGoalId,
        specificQuery: 'GOAL_SPECIFIC' 
      };
      return intent;
    }
    
    // General strategy query
    const intent: QueryIntent = { 
      type: 'STRATEGY_RECOMMENDATION', 
      clientId: context.activeClientId,
      specificQuery: 'GENERAL' 
    };
    return intent;
  }
  
  // General Question Intent (fallback)
  const topic = detectTopic(lowercaseQuery);
  const intent: QueryIntent = { type: 'GENERAL_QUESTION', topic };
  return intent;
}

/**
 * Detect a general topic from the query if no clear intent is found
 */
function detectTopic(query: string): string | undefined {
  // List of topics to check against
  const topics = [
    { name: 'session planning', terms: ['session', 'plan', 'schedule', 'appointment'] },
    { name: 'report writing', terms: ['report', 'document', 'write', 'notes'] },
    { name: 'billing', terms: ['bill', 'invoice', 'payment', 'charge'] },
    { name: 'child development', terms: ['development', 'developmental', 'milestone', 'child'] },
    { name: 'autism', terms: ['autism', 'asd', 'spectrum', 'autistic'] },
    { name: 'speech therapy', terms: ['speech', 'language', 'communication', 'talk'] },
    { name: 'occupational therapy', terms: ['occupational', 'ot', 'sensory', 'motor'] },
  ];
  
  // Count term matches for each topic
  const topicCounts = topics.map(topic => ({
    name: topic.name,
    count: countTerms(query, topic.terms)
  }));
  
  // Find the topic with the most matches
  const bestMatch = topicCounts.sort((a, b) => b.count - a.count)[0];
  
  return bestMatch.count > 0 ? bestMatch.name : undefined;
}

/**
 * Count occurrences of terms in text
 */
function countTerms(text: string, terms: string[]): number {
  return terms.reduce((count, term) => {
    return count + (text.includes(term) ? 1 : 0);
  }, 0);
}

/**
 * Check if text contains any of the specified terms
 */
function containsAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term));
}