import { QueryIntent, QueryContext } from './types';

// Common terms related to budget analysis
const BUDGET_TERMS = [
  'budget', 'funds', 'money', 'spending', 'cost', 'expense', 'financial', 
  'allocation', 'afford', 'spend', 'pay', 'payment', 'dollars', 'ndis', 
  'remaining', 'left', 'balance', 'forecast', 'predict', 'run out', 'depleted'
];

// Common terms related to progress tracking
const PROGRESS_TERMS = [
  'progress', 'improvement', 'development', 'growth', 'advance', 'milestone', 
  'goal', 'achievement', 'objective', 'target', 'outcome', 'result', 'success',
  'measure', 'track', 'monitor', 'rate', 'score', 'assessment', 'evaluation',
  'performance', 'how well', 'improved', 'better', 'worse', 'change'
];

// Common terms related to strategy recommendations
const STRATEGY_TERMS = [
  'strategy', 'approach', 'technique', 'method', 'practice', 'intervention',
  'therapy', 'treatment', 'plan', 'recommendation', 'suggest', 'advise', 
  'guidance', 'help', 'assist', 'support', 'improve', 'enhance', 'optimize',
  'best practice', 'effective', 'evidence-based', 'proven', 'recommended',
  'what should', 'how to', 'how should', 'what works'
];

/**
 * Parse user query to determine intent
 */
export function parseQueryIntent(query: string, context: QueryContext): QueryIntent {
  // Convert to lowercase for easier matching
  const lowerQuery = query.toLowerCase();
  
  // Count occurrences of terms in each category
  const budgetCount = countTerms(lowerQuery, BUDGET_TERMS);
  const progressCount = countTerms(lowerQuery, PROGRESS_TERMS);
  const strategyCount = countTerms(lowerQuery, STRATEGY_TERMS);
  
  // Determine the dominant category
  const maxCount = Math.max(budgetCount, progressCount, strategyCount);
  
  // Detect specific sub-intents
  if (maxCount === 0) {
    // No clear intent detected
    return { type: 'GENERAL_QUESTION', topic: 'unknown' };
  }
  
  // Budget analysis intent
  if (budgetCount === maxCount) {
    const intent: QueryIntent = { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId };
    
    // Detect specific queries
    if (containsAny(lowerQuery, ['remaining', 'left', 'available', 'balance'])) {
      intent.specificQuery = 'REMAINING';
    } else if (containsAny(lowerQuery, ['forecast', 'predict', 'run out', 'when will', 'how long'])) {
      intent.specificQuery = 'FORECAST';
    } else if (containsAny(lowerQuery, ['utilization', 'spending', 'rate', 'using', 'spent'])) {
      intent.specificQuery = 'UTILIZATION';
    }
    
    return intent;
  }
  
  // Progress tracking intent
  if (progressCount === maxCount) {
    const intent: QueryIntent = { type: 'PROGRESS_TRACKING', clientId: context.activeClientId };
    
    // Detect specific queries
    if (containsAny(lowerQuery, ['goal', 'specific', 'objective'])) {
      intent.specificQuery = 'GOAL_SPECIFIC';
      
      // Try to extract goal ID from query
      intent.goalId = context.activeGoalId;
    } else if (containsAny(lowerQuery, ['attendance', 'show up', 'cancel', 'reschedule'])) {
      intent.specificQuery = 'ATTENDANCE';
    } else {
      intent.specificQuery = 'OVERALL';
    }
    
    return intent;
  }
  
  // Strategy recommendation intent
  if (strategyCount === maxCount) {
    const intent: QueryIntent = { type: 'STRATEGY_RECOMMENDATION', clientId: context.activeClientId };
    
    // Detect specific queries
    if (containsAny(lowerQuery, ['goal', 'specific', 'objective'])) {
      intent.specificQuery = 'GOAL_SPECIFIC';
      intent.goalId = context.activeGoalId;
    } else {
      intent.specificQuery = 'GENERAL';
    }
    
    return intent;
  }
  
  // Default to general question
  return { 
    type: 'GENERAL_QUESTION',
    topic: budgetCount > 0 ? 'budget' : progressCount > 0 ? 'progress' : 'strategy'
  };
}

/**
 * Count occurrences of terms in text
 */
function countTerms(text: string, terms: string[]): number {
  return terms.reduce((count, term) => {
    return text.includes(term) ? count + 1 : count;
  }, 0);
}

/**
 * Check if text contains any of the specified terms
 */
function containsAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term));
}