/**
 * Query Template System
 * 
 * This module provides templated queries for common question patterns,
 * improving accuracy and performance for frequently asked questions.
 */

/**
 * Parameter types for template processing
 */
export type ParameterValue = string | number | boolean | string[] | null;

/**
 * Template parameter extraction and validation
 */
export interface TemplateParameter {
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'string[]';
  default?: ParameterValue;
  validation?: RegExp | ((value: any) => boolean);
  transform?: (value: any) => any;
}

/**
 * Result processor function type
 */
export type ResultProcessor = (results: any[], parameters: Record<string, ParameterValue>) => any;

/**
 * Core query template structure
 */
export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  questionPatterns: string[];
  parameters: TemplateParameter[];
  sqlTemplate: string;
  resultProcessor: ResultProcessor;
}

/**
 * Query template categories
 */
export enum TemplateCategory {
  ENTITY_COUNT = 'entity_count',
  ENTITY_DETAILS = 'entity_details',
  ENTITY_LIST = 'entity_list',
  CLIENT_GOALS = 'client_goals',
  CLIENT_SESSIONS = 'client_sessions',
  BUDGET_STATUS = 'budget_status',
  PROGRESS_TRACKING = 'progress_tracking',
  STRATEGY_ANALYSIS = 'strategy_analysis',
  STAFF_WORKLOAD = 'staff_workload',
  TEMPORAL_ANALYSIS = 'temporal_analysis'
}

/**
 * Default result processors for common query patterns
 */
export const resultProcessors = {
  // Process a simple count result
  basicCount: (results: any[], parameters: Record<string, ParameterValue>) => {
    const count = results.length > 0 ? Number(results[0].count) : 0;
    return {
      count,
      entityType: parameters.entityType || 'items',
      entityContext: parameters.entityContext || null
    };
  },
  
  // Process a list of entities
  entityList: (results: any[], parameters: Record<string, ParameterValue>) => {
    return {
      items: results,
      count: results.length,
      entityType: parameters.entityType || 'items',
      entityContext: parameters.entityContext || null
    };
  },
  
  // Process a client's goals
  clientGoals: (results: any[], parameters: Record<string, ParameterValue>) => {
    // Group goals by status
    const statusGroups: Record<string, any[]> = {};
    
    for (const goal of results) {
      const status = goal.status || 'unknown';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(goal);
    }
    
    return {
      client: parameters.client,
      goals: results,
      goalsByStatus: statusGroups,
      totalGoals: results.length
    };
  },
  
  // Process session information
  sessionSummary: (results: any[], parameters: Record<string, ParameterValue>) => {
    const periodStart = parameters.periodStart ? new Date(parameters.periodStart as string) : null;
    const periodEnd = parameters.periodEnd ? new Date(parameters.periodEnd as string) : null;
    
    return {
      sessions: results,
      count: results.length,
      client: parameters.client,
      periodDescription: parameters.periodDescription || 'specified period',
      periodStart,
      periodEnd
    };
  },
  
  // Process budget information
  budgetStatus: (results: any[], parameters: Record<string, ParameterValue>) => {
    if (results.length === 0) {
      return {
        client: parameters.client,
        hasBudget: false
      };
    }
    
    // For simplicity, take the first budget if multiple exist
    const budget = results[0];
    
    // Calculate additional metrics if available
    let usagePercentage = null;
    let remainingPercentage = null;
    
    if (budget.total_allocated && budget.total_used !== undefined) {
      usagePercentage = (budget.total_used / budget.total_allocated) * 100;
      remainingPercentage = 100 - usagePercentage;
    }
    
    return {
      client: parameters.client,
      hasBudget: true,
      budget,
      usagePercentage,
      remainingPercentage,
      allBudgets: results.length > 1 ? results : null
    };
  },
  
  // Process progress information
  progressTracking: (results: any[], parameters: Record<string, ParameterValue>) => {
    // Calculate average scores if available
    let averageScore = null;
    const scores = results.map(r => r.score).filter(s => s !== null && s !== undefined);
    
    if (scores.length > 0) {
      averageScore = scores.reduce((sum, score) => sum + Number(score), 0) / scores.length;
    }
    
    return {
      assessments: results,
      count: results.length,
      averageScore,
      client: parameters.client,
      goal: parameters.goal
    };
  },
  
  // Process strategy information
  strategyAnalysis: (results: any[], parameters: Record<string, ParameterValue>) => {
    // Group strategies by category
    const categoryGroups: Record<string, any[]> = {};
    
    for (const strategy of results) {
      const category = strategy.category || 'uncategorized';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(strategy);
    }
    
    return {
      strategies: results,
      strategiesByCategory: categoryGroups,
      count: results.length,
      client: parameters.client
    };
  }
};

/**
 * Query templates for common client questions
 */
export const queryTemplates: QueryTemplate[] = [
  // -- GOAL TRACKING TEMPLATES --
  
  // What goals is [client] currently working on?
  {
    id: 'client_active_goals',
    name: 'Client Active Goals',
    description: 'Retrieve all active goals for a specific client',
    category: TemplateCategory.CLIENT_GOALS,
    questionPatterns: [
      "What goals is {client} currently working on?",
      "What goals is {client} working on?",
      "Show me {client}'s active goals",
      "List all goals for {client}",
      "What is {client} working on currently?",
      "Show active goals for {client}"
    ],
    parameters: [
      {
        name: 'client',
        description: 'Client name or identifier',
        required: true,
        type: 'string'
      },
      {
        name: 'entityType',
        description: 'Type of entity being counted',
        required: false,
        type: 'string',
        default: 'goals'
      },
      {
        name: 'entityContext',
        description: 'Context for the entities',
        required: false,
        type: 'string',
        default: 'active'
      }
    ],
    sqlTemplate: `
      SELECT g.id, g.title, g.description, g.status, g.progress_percentage,
             g.start_date, g.target_date, g.completed_date
      FROM goals g
      JOIN clients c ON g.client_id = c.id
      WHERE (c.name LIKE '%{client}%' OR c.unique_identifier = '{client}')
      AND g.status = 'active'
      ORDER BY g.start_date DESC
    `,
    resultProcessor: resultProcessors.clientGoals
  },
  
  // Has [client] made progress on their [goal] goal?
  {
    id: 'client_goal_progress',
    name: 'Client Goal Progress',
    description: 'Check progress on a specific goal for a client',
    category: TemplateCategory.PROGRESS_TRACKING,
    questionPatterns: [
      "Has {client} made progress on {goal}?",
      "Has {client} made progress on their {goal} goal?",
      "What's the progress on {client}'s {goal} goal?",
      "How is {client} doing with {goal}?",
      "Show me progress for {client} on {goal}"
    ],
    parameters: [
      {
        name: 'client',
        description: 'Client name or identifier',
        required: true,
        type: 'string'
      },
      {
        name: 'goal',
        description: 'Goal name or keyword',
        required: true,
        type: 'string'
      }
    ],
    sqlTemplate: `
      SELECT g.id, g.title, g.description, g.status, g.progress_percentage,
             pa.rating, pa.score, pa.notes, sn.session_date
      FROM goals g
      JOIN clients c ON g.client_id = c.id
      LEFT JOIN performance_assessments pa ON pa.goal_id = g.id
      LEFT JOIN session_notes sn ON pa.session_note_id = sn.id
      WHERE (c.name LIKE '%{client}%' OR c.unique_identifier = '{client}')
      AND g.title LIKE '%{goal}%'
      ORDER BY sn.session_date DESC
    `,
    resultProcessor: resultProcessors.progressTracking
  },
  
  // Which subgoals were scored for [client] in their last session?
  {
    id: 'client_last_session_subgoals',
    name: 'Client Last Session Subgoals',
    description: 'Retrieve subgoals scored in client\'s most recent session',
    category: TemplateCategory.PROGRESS_TRACKING,
    questionPatterns: [
      "Which subgoals were scored for {client} in their last session?",
      "What subgoals did {client} work on in the last session?",
      "Show me subgoals from {client}'s most recent session",
      "What was assessed for {client} in the last session?"
    ],
    parameters: [
      {
        name: 'client',
        description: 'Client name or identifier',
        required: true,
        type: 'string'
      }
    ],
    sqlTemplate: `
      WITH last_session AS (
        SELECT s.id
        FROM sessions s
        JOIN clients c ON s.client_id = c.id
        WHERE (c.name LIKE '%{client}%' OR c.unique_identifier = '{client}')
        ORDER BY s.session_date DESC
        LIMIT 1
      )
      SELECT sg.id, sg.title, sg.description, sg.status, 
             pa.rating, pa.score, pa.notes, s.session_date
      FROM subgoals sg
      JOIN goals g ON sg.goal_id = g.id
      JOIN performance_assessments pa ON pa.subgoal_id = sg.id
      JOIN session_notes sn ON pa.session_note_id = sn.id
      JOIN sessions s ON sn.session_id = s.id
      JOIN last_session ls ON s.id = ls.id
      ORDER BY pa.rating DESC
    `,
    resultProcessor: resultProcessors.entityList
  },
  
  // -- SESSION TRACKING TEMPLATES --
  
  // How many sessions has [client] attended this month?
  {
    id: 'client_sessions_this_month',
    name: 'Client Sessions This Month',
    description: 'Count sessions attended by a client in the current month',
    category: TemplateCategory.CLIENT_SESSIONS,
    questionPatterns: [
      "How many sessions has {client} attended this month?",
      "How many sessions did {client} have this month?",
      "Count {client}'s sessions for this month",
      "Number of sessions for {client} in the current month"
    ],
    parameters: [
      {
        name: 'client',
        description: 'Client name or identifier',
        required: true,
        type: 'string'
      },
      {
        name: 'periodDescription',
        description: 'Description of the time period',
        required: false,
        type: 'string',
        default: 'this month'
      }
    ],
    sqlTemplate: `
      SELECT s.id, s.title, s.session_date, s.duration, s.status, s.location
      FROM sessions s
      JOIN clients c ON s.client_id = c.id
      WHERE (c.name LIKE '%{client}%' OR c.unique_identifier = '{client}')
      AND s.status = 'completed'
      AND s.session_date >= date_trunc('month', CURRENT_DATE)
      AND s.session_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
      ORDER BY s.session_date DESC
    `,
    resultProcessor: resultProcessors.sessionSummary
  },
  
  // When was the last session for [client]?
  {
    id: 'client_last_session',
    name: 'Client Last Session',
    description: 'Find the most recent session for a specific client',
    category: TemplateCategory.CLIENT_SESSIONS,
    questionPatterns: [
      "When was the last session for {client}?",
      "When did {client} last attend a session?",
      "What was {client}'s most recent appointment?",
      "Show me {client}'s last session details"
    ],
    parameters: [
      {
        name: 'client',
        description: 'Client name or identifier',
        required: true,
        type: 'string'
      }
    ],
    sqlTemplate: `
      SELECT s.id, s.title, s.description, s.session_date, s.duration, s.status, s.location, 
             sn.notes, sn.mood_rating, sn.focus_rating, sn.cooperation_rating
      FROM sessions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN session_notes sn ON sn.session_id = s.id
      WHERE (c.name LIKE '%{client}%' OR c.unique_identifier = '{client}')
      ORDER BY s.session_date DESC
      LIMIT 1
    `,
    resultProcessor: (results, parameters) => {
      if (results.length === 0) {
        return {
          found: false,
          client: parameters.client,
          message: "No sessions found for this client"
        };
      }
      
      const session = results[0];
      return {
        found: true,
        client: parameters.client,
        session,
        daysSince: Math.round((Date.now() - new Date(session.session_date).getTime()) / (1000 * 60 * 60 * 24))
      };
    }
  },
  
  // -- BUDGET TEMPLATES --
  
  // How much funding is left in [client]'s budget plan?
  {
    id: 'client_remaining_budget',
    name: 'Client Remaining Budget',
    description: 'Calculate remaining funding in a client\'s budget',
    category: TemplateCategory.BUDGET_STATUS,
    questionPatterns: [
      "How much funding is left in {client}'s budget plan?",
      "What's the remaining budget for {client}?",
      "How much of {client}'s funding is left?",
      "Show me {client}'s remaining NDIS funds"
    ],
    parameters: [
      {
        name: 'client',
        description: 'Client name or identifier',
        required: true,
        type: 'string'
      }
    ],
    sqlTemplate: `
      SELECT 
        c.name as client_name, 
        bs.id as budget_settings_id,
        bs.start_date, 
        bs.end_date,
        SUM(bi.total_allocated) as total_allocated,
        SUM(bi.total_used) as total_used,
        SUM(bi.total_allocated - bi.total_used) as remaining_funds
      FROM clients c
      JOIN budget_settings bs ON bs.client_id = c.id
      JOIN budget_items bi ON bi.budget_settings_id = bs.id
      WHERE (c.name LIKE '%{client}%' OR c.unique_identifier = '{client}')
      AND bs.end_date >= CURRENT_DATE
      GROUP BY c.name, bs.id, bs.start_date, bs.end_date
      ORDER BY bs.end_date ASC
    `,
    resultProcessor: resultProcessors.budgetStatus
  },
  
  // When does [client]'s budget plan expire?
  {
    id: 'client_budget_expiration',
    name: 'Client Budget Expiration',
    description: 'Determine when a client\'s budget plan expires',
    category: TemplateCategory.BUDGET_STATUS,
    questionPatterns: [
      "When does {client}'s budget plan expire?",
      "What's the expiration date for {client}'s funding?",
      "When will {client}'s budget end?",
      "How much time is left on {client}'s budget?"
    ],
    parameters: [
      {
        name: 'client',
        description: 'Client name or identifier',
        required: true,
        type: 'string'
      }
    ],
    sqlTemplate: `
      SELECT 
        c.name as client_name,
        bs.id as budget_settings_id,
        bs.start_date, 
        bs.end_date,
        SUM(bi.total_allocated) as total_allocated,
        SUM(bi.total_used) as total_used
      FROM clients c
      JOIN budget_settings bs ON bs.client_id = c.id
      JOIN budget_items bi ON bi.budget_settings_id = bs.id
      WHERE (c.name LIKE '%{client}%' OR c.unique_identifier = '{client}')
      GROUP BY c.name, bs.id, bs.start_date, bs.end_date
      ORDER BY bs.end_date ASC
    `,
    resultProcessor: (results, parameters) => {
      if (results.length === 0) {
        return {
          found: false,
          client: parameters.client,
          message: "No budget plans found for this client"
        };
      }
      
      const budget = results[0];
      const now = new Date();
      const endDate = new Date(budget.end_date);
      const daysRemaining = Math.round((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        found: true,
        client: parameters.client,
        budget,
        daysRemaining,
        hasExpired: daysRemaining < 0,
        expirationMessage: daysRemaining < 0 
          ? `Budget expired ${Math.abs(daysRemaining)} days ago` 
          : `Budget expires in ${daysRemaining} days`
      };
    }
  },
  
  // -- STRATEGY TEMPLATES --
  
  // What strategies were used most frequently with [client]?
  {
    id: 'client_most_used_strategies',
    name: 'Client Most Used Strategies',
    description: 'Identify strategies used most frequently with a client',
    category: TemplateCategory.STRATEGY_ANALYSIS,
    questionPatterns: [
      "What strategies were used most frequently with {client}?",
      "Which strategies are most common for {client}?",
      "What are the top strategies used with {client}?",
      "Show me most-used strategies for {client}"
    ],
    parameters: [
      {
        name: 'client',
        description: 'Client name or identifier',
        required: true,
        type: 'string'
      },
      {
        name: 'limit',
        description: 'Number of strategies to return',
        required: false,
        type: 'number',
        default: 10
      }
    ],
    sqlTemplate: `
      WITH strategy_counts AS (
        SELECT 
          s.name as strategy_name,
          s.category as strategy_category,
          s.description as strategy_description,
          COUNT(*) as usage_count
        FROM performance_assessments pa
        JOIN session_notes sn ON pa.session_note_id = sn.id
        JOIN sessions sess ON sn.session_id = sess.id
        JOIN clients c ON sess.client_id = c.id
        JOIN strategies s ON s.name = ANY(pa.strategies)
        WHERE (c.name LIKE '%{client}%' OR c.unique_identifier = '{client}')
        GROUP BY s.name, s.category, s.description
        ORDER BY usage_count DESC
        LIMIT {limit}
      )
      SELECT * FROM strategy_counts
    `,
    resultProcessor: resultProcessors.strategyAnalysis
  }
  
  // Additional templates can be added here...
];

/**
 * Find a template that matches a given question
 */
export function findMatchingTemplate(question: string): QueryTemplate | null {
  // Normalize the question
  const normalizedQuestion = question.toLowerCase().trim();
  
  // Try to find a template with a matching question pattern
  for (const template of queryTemplates) {
    for (const pattern of template.questionPatterns) {
      // Convert the pattern to a regex by replacing {param} with wildcard matchers
      const regexPattern = pattern
        .replace(/\{([^}]+)\}/g, '(.+?)') // Replace {param} with capturing groups
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape other regex special chars
        .replace(/\\\(\\\.\\\+\\\?\\\)/g, '(.+?)'); // Fix the escaped capturing groups
      
      const regex = new RegExp(regexPattern, 'i');
      
      if (regex.test(normalizedQuestion)) {
        return template;
      }
    }
  }
  
  return null;
}

/**
 * Extract parameters from a question based on a template pattern
 */
export function extractParameters(
  question: string, 
  template: QueryTemplate
): Record<string, ParameterValue> {
  const parameters: Record<string, ParameterValue> = {};
  
  // Initialize with defaults
  for (const param of template.parameters) {
    if (param.default !== undefined) {
      parameters[param.name] = param.default;
    }
  }
  
  // Extract values from the question
  for (const pattern of template.questionPatterns) {
    // Convert the pattern to a regex with named capture groups
    const paramNames: string[] = [];
    const regexPattern = pattern.replace(/\{([^}]+)\}/g, (match, paramName) => {
      paramNames.push(paramName);
      return '(.+?)';
    });
    
    const regex = new RegExp(regexPattern, 'i');
    const match = question.match(regex);
    
    if (match) {
      // Skip the first element which is the full match
      for (let i = 0; i < paramNames.length; i++) {
        if (match[i + 1]) {
          parameters[paramNames[i]] = match[i + 1].trim();
        }
      }
      break;
    }
  }
  
  // Validate required parameters
  const missingParams = template.parameters
    .filter(p => p.required && (parameters[p.name] === undefined || parameters[p.name] === null))
    .map(p => p.name);
  
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }
  
  return parameters;
}

/**
 * Apply parameters to a template SQL query
 */
export function applyParameters(
  sqlTemplate: string,
  parameters: Record<string, ParameterValue>
): string {
  let sql = sqlTemplate;
  
  // Replace each parameter in the template
  for (const [name, value] of Object.entries(parameters)) {
    if (value !== null && value !== undefined) {
      // Handle different types of values
      let replaceValue: string;
      
      if (Array.isArray(value)) {
        replaceValue = value.map(v => `'${String(v)}'`).join(', ');
      } else if (typeof value === 'string') {
        replaceValue = value;
      } else {
        replaceValue = String(value);
      }
      
      // Replace all occurrences
      const regex = new RegExp(`\\{${name}\\}`, 'g');
      sql = sql.replace(regex, replaceValue);
    }
  }
  
  return sql;
}

/**
 * Process a natural language question using templates
 */
export interface TemplateQueryResult {
  usedTemplate: boolean;
  templateId?: string;
  sql?: string;
  parameters?: Record<string, ParameterValue>;
  error?: string;
}

/**
 * Process a natural language question using templates
 */
export function processQuestion(question: string): TemplateQueryResult {
  try {
    // Find a matching template
    const template = findMatchingTemplate(question);
    
    if (!template) {
      return { usedTemplate: false };
    }
    
    // Extract parameters
    const parameters = extractParameters(question, template);
    
    // Apply parameters to the template
    const sql = applyParameters(template.sqlTemplate, parameters);
    
    return {
      usedTemplate: true,
      templateId: template.id,
      sql,
      parameters
    };
  } catch (error: any) {
    return {
      usedTemplate: false,
      error: error.message
    };
  }
}

// Singleton instance
export const queryTemplateService = {
  getTemplates: () => queryTemplates,
  findMatchingTemplate,
  extractParameters,
  applyParameters,
  processQuestion
};