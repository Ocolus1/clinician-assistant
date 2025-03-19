import { QueryContext, QueryIntent } from './types';

/**
 * Parse user query to determine intent
 */
export function parseQueryIntent(query: string, context: QueryContext): QueryIntent {
  const lowerQuery = query.toLowerCase();
  
  // Check for budget-related queries
  if (containsAny(lowerQuery, [
    'budget', 'fund', 'money', 'spending', 'cost', 'expense', 'financial', 'pay', 'payment',
    'allocation', 'remaining', 'depletion', 'forecast', 'ndis', 'dollars', 'dollar', 'cents',
    'price', 'pricing', 'afford', 'expensive', 'cheap', 'value', 'invoice', 'bill', 'billing'
  ])) {
    // Determine specific budget query type
    let specificQuery: 'REMAINING' | 'FORECAST' | 'UTILIZATION' | undefined;
    
    if (containsAny(lowerQuery, [
      'remaining', 'left', 'available', 'balance', 'unused', 'still have', 'how much', 
      'amount left', 'surplus', 'remainder'
    ])) {
      specificQuery = 'REMAINING';
    } else if (containsAny(lowerQuery, [
      'forecast', 'predict', 'future', 'run out', 'deplete', 'when will', 'how long', 
      'last', 'expire', 'expiration', 'duration', 'projection', 'timeline'
    ])) {
      specificQuery = 'FORECAST';
    } else if (containsAny(lowerQuery, [
      'utilization', 'usage', 'used', 'spent', 'efficiency', 'percent', 'percentage', 'allocation',
      'breakdown', 'category', 'distribution', 'analysis', 'where', 'how much used'
    ])) {
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
    'progress', 'goal', 'achievement', 'milestone', 'improve', 'development', 'improvement',
    'therapy', 'session', 'attendance', 'outcome', 'result', 'growth', 'advance', 'tracking',
    'performance', 'score', 'rating', 'evaluation', 'assessment', 'measurement', 'metrics'
  ])) {
    // Determine specific progress query type
    let specificQuery: 'OVERALL' | 'GOAL_SPECIFIC' | 'ATTENDANCE' | undefined;
    
    if (containsAny(lowerQuery, [
      'overall', 'general', 'all goals', 'total', 'summary', 'combined', 'collective',
      'comprehensive', 'big picture', 'holistic', 'full', 'entire'
    ])) {
      specificQuery = 'OVERALL';
    } else if (containsAny(lowerQuery, [
      'specific goal', 'particular goal', 'this goal', 'individual goal', 'certain goal',
      'target goal', 'focused', 'specific area', 'particular area', 'this area'
    ])) {
      specificQuery = 'GOAL_SPECIFIC';
    } else if (containsAny(lowerQuery, [
      'attendance', 'show up', 'cancel', 'missed', 'present', 'absence', 'participation',
      'frequency', 'regular', 'consistency', 'appointment', 'schedule', 'session attendance'
    ])) {
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
    'strategy', 'technique', 'approach', 'method', 'recommendation', 'suggest', 'idea', 'advice',
    'exercise', 'activity', 'practice', 'intervention', 'treatment', 'plan', 'procedure',
    'protocol', 'guidance', 'direction', 'support', 'assistance', 'help', 'instruction'
  ])) {
    // Determine specific strategy query type
    let specificQuery: 'GENERAL' | 'GOAL_SPECIFIC' | undefined;
    
    if (containsAny(lowerQuery, [
      'all', 'general', 'summary', 'overview', 'options', 'alternatives', 'possibilities',
      'approaches', 'comprehensive', 'range', 'variety', 'different'
    ])) {
      specificQuery = 'GENERAL';
    } else if (containsAny(lowerQuery, [
      'goal', 'specific', 'particular', 'this goal', 'single', 'focused', 'targeted',
      'tailored', 'individual', 'customized', 'personalized'
    ])) {
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
  
  // Check for visualization requests
  if (containsAny(lowerQuery, [
    'visualize', 'visualization', 'chart', 'graph', 'plot', 'display', 'show me', 'picture',
    'bubble chart', 'progress chart', 'visual', 'representation', 'diagram', 'illustrate'
  ])) {
    // Determine what type of visualization they want
    if (containsAny(lowerQuery, ['budget', 'spending', 'funds', 'financial', 'money', 'cost'])) {
      return {
        type: 'BUDGET_ANALYSIS',
        clientId: context.activeClientId,
        specificQuery: 'UTILIZATION'
      };
    } else if (containsAny(lowerQuery, ['progress', 'goal', 'milestone', 'achievement'])) {
      return {
        type: 'PROGRESS_TRACKING',
        clientId: context.activeClientId,
        specificQuery: 'OVERALL'
      };
    }
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
  // Map of topics to related terms with expanded vocabulary
  const topicTerms: Record<string, string[]> = {
    'billing': [
      'bill', 'invoice', 'payment', 'claim', 'rebate', 'receipt', 'charge', 'fee', 'cost',
      'expense', 'transaction', 'billing', 'accounting', 'finance', 'reimbursement', 'fund',
      'medicare', 'ndis', 'insurance', 'price', 'charge', 'pay', 'paid', 'billing system'
    ],
    
    'scheduling': [
      'appointment', 'schedule', 'booking', 'calendar', 'availability', 'time', 'date',
      'reschedule', 'cancel', 'postpone', 'book', 'reserve', 'slot', 'timeslot', 'session time',
      'scheduling', 'planner', 'timetable', 'agenda', 'availability', 'when', 'next session'
    ],
    
    'reporting': [
      'report', 'documentation', 'paperwork', 'form', 'assessment', 'evaluate', 'document',
      'progress note', 'clinical note', 'session note', 'summary', 'evaluation', 'template',
      'record', 'tracking', 'measure', 'outcome', 'result', 'analysis', 'analytics', 'data'
    ],
    
    'client management': [
      'client', 'patient', 'child', 'individual', 'person', 'family', 'parent', 'caregiver',
      'profile', 'information', 'details', 'record', 'history', 'case', 'management', 'database',
      'list', 'register', 'demographic', 'contact', 'address', 'birthday', 'age', 'guardian'
    ],
    
    'therapy services': [
      'therapy', 'treatment', 'session', 'intervention', 'approach', 'exercise', 'practice',
      'program', 'service', 'therapeutic', 'clinical', 'speech', 'language', 'occupational',
      'physical', 'behavioral', 'sensory', 'motor', 'cognitive', 'communication', 'rehabilitation'
    ],
    
    'communication': [
      'contact', 'email', 'phone', 'message', 'call', 'communication', 'connect', 'reach out',
      'notification', 'alert', 'reminder', 'text', 'voice', 'mail', 'chat', 'video', 'telehealth',
      'virtual', 'remote', 'online', 'portal', 'platform', 'system', 'app', 'application'
    ],
    
    'system help': [
      'help', 'guide', 'tutorial', 'how to', 'instruction', 'documentation', 'manual', 'support',
      'assistance', 'trouble', 'problem', 'issue', 'error', 'bug', 'question', 'faq', 'learn',
      'navigate', 'use', 'feature', 'function', 'capability', 'tool', 'option', 'setting'
    ]
  };
  
  // Find the most relevant topic based on term counts and word proximity
  let bestTopic: string | undefined;
  let bestScore = 0;
  
  for (const [topic, terms] of Object.entries(topicTerms)) {
    // Basic term counting
    const termScore = countTerms(query, terms);
    
    // Word proximity - give extra weight to phrases that match exactly
    let proximityScore = 0;
    for (const term of terms) {
      if (term.includes(' ') && query.includes(term)) {
        // Multi-word terms that match exactly get extra weight
        proximityScore += term.split(' ').length * 2;
      }
    }
    
    const totalScore = termScore + proximityScore;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestTopic = topic;
    }
  }
  
  // If no good match found, use a default topic
  return bestScore > 0 ? bestTopic : 'general assistance';
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