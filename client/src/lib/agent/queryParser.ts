import { QueryContext, QueryIntent } from './types';

/**
 * Natural language query parser for the agent
 * Determines intent and entities from user queries
 */

// Intent detection terms
const BUDGET_TERMS = [
  'budget', 'spending', 'funds', 'money', 'cost', 'expense', 'financial',
  'payment', 'pricing', 'allocate', 'allocation', 'spend', 'spent', 'remaining',
  'pay', 'paid', 'ndis', 'funding'
];

const PROGRESS_TERMS = [
  'progress', 'goal', 'milestone', 'improve', 'improvement', 'achievement',
  'target', 'measure', 'metric', 'tracking', 'result', 'outcome', 'performance',
  'assessment', 'evaluation', 'success', 'subgoal', 'therapy', 'development'
];

const STRATEGY_TERMS = [
  'strategy', 'approach', 'method', 'technique', 'practice', 'plan',
  'recommendation', 'suggest', 'advice', 'help', 'guide', 'therapy',
  'treatment', 'intervention', 'program', 'routine', 'exercise', 'activity',
  'tool', 'resource'
];

// Sub-intent detection terms
const BUDGET_REMAINING_TERMS = ['remaining', 'left', 'available', 'balance', 'unused'];
const BUDGET_FORECAST_TERMS = ['forecast', 'predict', 'projection', 'future', 'run out', 'deplete'];
const BUDGET_UTILIZATION_TERMS = ['utilization', 'usage', 'efficiency', 'using', 'used', 'spend rate'];

const PROGRESS_OVERALL_TERMS = ['overall', 'general', 'summary', 'total', 'all goals'];
const PROGRESS_ATTENDANCE_TERMS = ['attendance', 'show up', 'session', 'appointment', 'consistent'];

const STRATEGY_GENERAL_TERMS = ['general', 'overall', 'all', 'summary', 'suggest', 'recommend'];

/**
 * Parse user query to determine intent
 */
export function parseQueryIntent(query: string, context: QueryContext): QueryIntent {
  const normalizedQuery = query.toLowerCase();
  
  // Count occurrences of terms for each intent category
  const budgetScore = countTerms(normalizedQuery, BUDGET_TERMS);
  const progressScore = countTerms(normalizedQuery, PROGRESS_TERMS);
  const strategyScore = countTerms(normalizedQuery, STRATEGY_TERMS);
  
  // Determine primary intent based on highest score
  if (budgetScore >= progressScore && budgetScore >= strategyScore && budgetScore > 0) {
    const intent: QueryIntent = { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId };
    
    // Determine sub-intent if any
    if (containsAny(normalizedQuery, BUDGET_REMAINING_TERMS)) {
      intent.specificQuery = 'REMAINING';
    } else if (containsAny(normalizedQuery, BUDGET_FORECAST_TERMS)) {
      intent.specificQuery = 'FORECAST';
    } else if (containsAny(normalizedQuery, BUDGET_UTILIZATION_TERMS)) {
      intent.specificQuery = 'UTILIZATION';
    }
    
    return intent;
  }
  
  if (progressScore >= budgetScore && progressScore >= strategyScore && progressScore > 0) {
    const intent: QueryIntent = { type: 'PROGRESS_TRACKING', clientId: context.activeClientId };
    
    // Determine sub-intent if any
    if (containsAny(normalizedQuery, PROGRESS_OVERALL_TERMS)) {
      intent.specificQuery = 'OVERALL';
    } else if (containsAny(normalizedQuery, PROGRESS_ATTENDANCE_TERMS)) {
      intent.specificQuery = 'ATTENDANCE';
    } else {
      // Check if query mentions a specific goal
      // This would require goal data to be available
      intent.specificQuery = 'GOAL_SPECIFIC';
    }
    
    return intent;
  }
  
  if (strategyScore > 0) {
    const intent: QueryIntent = { type: 'STRATEGY_RECOMMENDATION', clientId: context.activeClientId };
    
    // Determine sub-intent if any
    if (containsAny(normalizedQuery, STRATEGY_GENERAL_TERMS)) {
      intent.specificQuery = 'GENERAL';
    } else {
      // Check if query mentions a specific goal
      intent.specificQuery = 'GOAL_SPECIFIC';
    }
    
    return intent;
  }
  
  // Default to general question if no clear intent
  return { 
    type: 'GENERAL_QUESTION',
    topic: detectTopic(normalizedQuery)
  };
}

/**
 * Detect a general topic from the query if no clear intent is found
 */
function detectTopic(query: string): string | undefined {
  if (query.includes('help') || query.includes('assistant') || query.includes('what can you do')) {
    return 'HELP';
  }
  
  if (query.includes('greeting') || query.includes('hello') || query.includes('hi')) {
    return 'GREETING';
  }
  
  return undefined;
}

/**
 * Count occurrences of terms in text
 */
function countTerms(text: string, terms: string[]): number {
  return terms.reduce((count, term) => {
    // Check if the term appears as a whole word
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = text.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

/**
 * Check if text contains any of the specified terms
 */
function containsAny(text: string, terms: string[]): boolean {
  return terms.some(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    return regex.test(text);
  });
}