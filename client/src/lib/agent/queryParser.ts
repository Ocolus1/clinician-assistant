import { QueryContext, QueryIntent } from './types';

/**
 * Parse user query to determine intent
 */
export function parseQueryIntent(query: string, context: QueryContext): QueryIntent {
  const lowerQuery = query.toLowerCase();
  
  // Check for budget-related queries
  if (containsAny(lowerQuery, [
    'budget', 'fund', 'money', 'spending', 'cost', 'expense', 'financial', 'pay', 'payment',
    'allocation', 'remaining', 'depletion', 'forecast', 'ndis'
  ])) {
    // Determine specific budget query type
    let specificQuery: 'REMAINING' | 'FORECAST' | 'UTILIZATION' | undefined;
    
    if (containsAny(lowerQuery, ['remaining', 'left', 'available', 'balance'])) {
      specificQuery = 'REMAINING';
    } else if (containsAny(lowerQuery, ['forecast', 'predict', 'future', 'run out', 'deplete'])) {
      specificQuery = 'FORECAST';
    } else if (containsAny(lowerQuery, ['utilization', 'usage', 'used', 'spent', 'efficiency'])) {
      specificQuery = 'UTILIZATION';
    }
    
    const intent: QueryIntent = { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId };
    if (specificQuery) {
      intent.specificQuery = specificQuery;
    }
    return intent;
  }
  
  // Check for progress-related queries
  if (containsAny(lowerQuery, [
    'progress', 'goal', 'achievement', 'milestone', 'improve', 'development',
    'therapy', 'session', 'attendance', 'outcome', 'result', 'growth'
  ])) {
    // Determine specific progress query type
    let specificQuery: 'OVERALL' | 'GOAL_SPECIFIC' | 'ATTENDANCE' | undefined;
    
    if (containsAny(lowerQuery, ['overall', 'general', 'all goals', 'total', 'summary'])) {
      specificQuery = 'OVERALL';
    } else if (containsAny(lowerQuery, ['specific goal', 'particular goal', 'this goal'])) {
      specificQuery = 'GOAL_SPECIFIC';
    } else if (containsAny(lowerQuery, ['attendance', 'show up', 'cancel', 'missed', 'present'])) {
      specificQuery = 'ATTENDANCE';
    }
    
    const intent: QueryIntent = { 
      type: 'PROGRESS_TRACKING', 
      clientId: context.activeClientId,
      goalId: context.activeGoalId
    };
    
    if (specificQuery) {
      intent.specificQuery = specificQuery;
    }
    
    return intent;
  }
  
  // Check for strategy-related queries
  if (containsAny(lowerQuery, [
    'strategy', 'technique', 'approach', 'method', 'recommendation', 'suggest',
    'exercise', 'activity', 'practice', 'intervention', 'treatment'
  ])) {
    // Determine specific strategy query type
    let specificQuery: 'GENERAL' | 'GOAL_SPECIFIC' | undefined;
    
    if (containsAny(lowerQuery, ['all', 'general', 'summary', 'overview'])) {
      specificQuery = 'GENERAL';
    } else if (containsAny(lowerQuery, ['goal', 'specific', 'particular', 'this goal'])) {
      specificQuery = 'GOAL_SPECIFIC';
    }
    
    const intent: QueryIntent = { 
      type: 'STRATEGY_RECOMMENDATION', 
      clientId: context.activeClientId,
      goalId: context.activeGoalId
    };
    
    if (specificQuery) {
      intent.specificQuery = specificQuery;
    }
    
    return intent;
  }
  
  // Default to general question with a detected topic
  return { 
    type: 'GENERAL_QUESTION',
    topic: detectTopic(lowerQuery)
  };
}

/**
 * Detect a general topic from the query if no clear intent is found
 */
function detectTopic(query: string): string | undefined {
  // Map of topics to related terms
  const topicTerms: Record<string, string[]> = {
    'billing': ['bill', 'invoice', 'payment', 'claim', 'rebate', 'receipt'],
    'scheduling': ['appointment', 'schedule', 'booking', 'calendar', 'availability', 'time', 'date'],
    'reporting': ['report', 'documentation', 'paperwork', 'form', 'assessment', 'evaluate', 'document'],
    'client': ['client', 'patient', 'child', 'individual', 'person', 'family', 'parent'],
    'therapy': ['therapy', 'treatment', 'session', 'intervention', 'approach', 'exercise', 'practice'],
    'communication': ['contact', 'email', 'phone', 'message', 'call', 'communication', 'connect']
  };
  
  // Find the most relevant topic based on term counts
  let bestTopic: string | undefined;
  let bestScore = 0;
  
  for (const [topic, terms] of Object.entries(topicTerms)) {
    const score = countTerms(query, terms);
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }
  
  return bestScore > 0 ? bestTopic : undefined;
}

/**
 * Count occurrences of terms in text
 */
function countTerms(text: string, terms: string[]): number {
  let count = 0;
  for (const term of terms) {
    // Count how many times the term appears in the text
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Check if text contains any of the specified terms
 */
function containsAny(text: string, terms: string[]): boolean {
  for (const term of terms) {
    if (text.includes(term)) {
      return true;
    }
  }
  return false;
}