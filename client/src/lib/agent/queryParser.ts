import { QueryContext, QueryIntent } from './types';

// Term dictionaries for intent classification
const BUDGET_TERMS = [
  'budget', 'funds', 'money', 'spending', 'cost', 'expense', 'financial', 
  'allocation', 'remaining', 'balance', 'plan', 'available', 'afford'
];

const BUDGET_REMAINING_TERMS = [
  'remaining', 'left', 'available', 'balance', 'how much', 'current'
];

const BUDGET_FORECAST_TERMS = [
  'forecast', 'prediction', 'estimate', 'projected', 'when', 'depletion',
  'run out', 'exhaust', 'future'
];

const BUDGET_UTILIZATION_TERMS = [
  'utilization', 'usage', 'spent', 'spending', 'used', 'allocation', 'category'
];

const PROGRESS_TERMS = [
  'progress', 'improvement', 'growth', 'development', 'advancement', 
  'achievement', 'goal', 'milestone', 'performance', 'assessment'
];

const STRATEGY_TERMS = [
  'strategy', 'approach', 'technique', 'method', 'recommendation', 'suggest',
  'idea', 'advice', 'therapy', 'intervention', 'activity', 'exercise'
];

/**
 * Parse user query to determine intent
 */
export function parseQueryIntent(query: string, context: QueryContext): QueryIntent {
  const normalizedQuery = query.toLowerCase();
  
  // Check for budget-related terms
  if (containsAny(normalizedQuery, BUDGET_TERMS)) {
    // Check for specific budget queries
    if (containsAny(normalizedQuery, BUDGET_REMAINING_TERMS)) {
      return { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId, specificQuery: 'REMAINING' };
    } else if (containsAny(normalizedQuery, BUDGET_FORECAST_TERMS)) {
      return { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId, specificQuery: 'FORECAST' };
    } else if (containsAny(normalizedQuery, BUDGET_UTILIZATION_TERMS)) {
      return { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId, specificQuery: 'UTILIZATION' };
    }
    
    // General budget query
    const intent: QueryIntent = { type: 'BUDGET_ANALYSIS', clientId: context.activeClientId };
    return intent;
  }
  
  // Check for progress-related terms
  if (containsAny(normalizedQuery, PROGRESS_TERMS)) {
    // TODO: Add more specific progress query detection
    const intent: QueryIntent = { type: 'PROGRESS_TRACKING', clientId: context.activeClientId };
    return intent;
  }
  
  // Check for strategy-related terms
  if (containsAny(normalizedQuery, STRATEGY_TERMS)) {
    // TODO: Add more specific strategy query detection
    const intent: QueryIntent = { type: 'STRATEGY_RECOMMENDATION', clientId: context.activeClientId };
    return intent;
  }
  
  // Default to general question
  return { type: 'GENERAL_QUESTION' };
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