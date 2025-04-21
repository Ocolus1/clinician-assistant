/**
 * Multi-Query Engine
 * 
 * This module provides the capability to execute multiple interdependent SQL queries
 * to resolve complex questions that can't be answered with a single query.
 */

import { QueryChain, QueryStep } from '../../../shared/enhancedAssistantTypes';
import { randomUUID } from 'crypto';
import { sql } from '../../db';
import { openaiService } from '../openaiService';

/**
 * Result of a single query execution
 */
export interface QueryResult {
  success: boolean;
  data: any[];
  error?: string;
  originalError?: string;
  executionTime?: number;
}

/**
 * Map of dependency values for parameter replacement
 */
export interface DependencyMap {
  [stepId: string]: any;
}

/**
 * Types of queries that might be needed
 */
export enum QueryType {
  ENTITY_IDENTIFICATION = 'entity_identification',
  ENTITY_DETAILS = 'entity_details',
  ENTITY_COUNT = 'entity_count',
  ENTITY_RELATIONSHIP = 'entity_relationship',
  ENTITY_STATUS = 'entity_status',
  DATA_AGGREGATION = 'data_aggregation',
  TEMPORAL_ANALYSIS = 'temporal_analysis'
}

/**
 * Execute a single SQL query with safeguards
 */
export async function executeQuery(queryText: string): Promise<QueryResult> {
  const startTime = Date.now();
  
  try {
    // Clean up the query
    const cleanQuery = queryText.trim();
    
    // Execute query
    const result = await sql`${cleanQuery}`;
    
    // Calculate execution time
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      data: result.rows,
      executionTime
    };
  } catch (error: any) {
    console.error('Error executing SQL query:', error);
    
    return {
      success: false,
      data: [],
      error: generateUserFriendlyError(error),
      originalError: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Generate a user-friendly error message
 */
function generateUserFriendlyError(error: any): string {
  const errorMessage = error.message || String(error);
  
  // Check for common SQL errors
  if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
    return 'The table or view referenced in the query does not exist.';
  } else if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
    return 'One of the columns referenced in the query does not exist.';
  } else if (errorMessage.includes('permission denied')) {
    return 'The query was denied due to insufficient permissions.';
  } else if (errorMessage.includes('syntax error')) {
    return 'There is a syntax error in the SQL query.';
  }
  
  // Default error message
  return 'An error occurred while executing the query.';
}

/**
 * Replace parameters in a query with values from previous steps
 */
export function replaceParameters(query: string, dependencies: DependencyMap): string {
  let result = query;
  
  // Find all parameter placeholders in the form of ${stepId.field}
  const paramMatches = query.match(/\${([^}]+)}/g) || [];
  
  for (const match of paramMatches) {
    // Extract step ID and field name
    const placeholder = match.substring(2, match.length - 1);
    const [stepId, field] = placeholder.split('.');
    
    // Check if dependency exists
    if (dependencies[stepId]) {
      let replacementValue: any;
      
      // Handle array results
      if (Array.isArray(dependencies[stepId])) {
        if (field === 'all') {
          // All rows as a comma-separated list of values
          const allValues = dependencies[stepId]
            .map(row => Object.values(row)[0])
            .filter(val => val !== null && val !== undefined)
            .map(val => typeof val === 'string' ? `'${val}'` : val);
          
          replacementValue = allValues.join(', ');
        } else if (field === 'first') {
          // First row's first column
          const firstRow = dependencies[stepId][0];
          replacementValue = firstRow ? Object.values(firstRow)[0] : null;
          
          if (typeof replacementValue === 'string') {
            replacementValue = `'${replacementValue}'`;
          }
        } else if (dependencies[stepId][0] && field in dependencies[stepId][0]) {
          // Specific field from the first row
          const value = dependencies[stepId][0][field];
          replacementValue = typeof value === 'string' ? `'${value}'` : value;
        } else {
          // Default to empty if field not found
          replacementValue = 'NULL';
        }
      } else {
        // Single value dependency
        replacementValue = typeof dependencies[stepId] === 'string' 
          ? `'${dependencies[stepId]}'` 
          : dependencies[stepId];
      }
      
      // Replace in the query
      result = result.replace(match, replacementValue !== null && replacementValue !== undefined 
        ? String(replacementValue) 
        : 'NULL');
    }
  }
  
  return result;
}

/**
 * Create a new query chain from a question
 */
export function createQueryChain(question: string, initialSteps: Partial<QueryStep>[]): QueryChain {
  const chainId = randomUUID();
  const now = Date.now();
  
  const steps: QueryStep[] = initialSteps.map(step => ({
    id: step.id || randomUUID(),
    purpose: step.purpose || 'Unknown purpose',
    query: step.query || '',
    dependsOn: step.dependsOn || [],
  }));
  
  return {
    id: chainId,
    originalQuestion: question,
    steps,
    maxSteps: 10,
    currentStep: 0,
    complete: false,
    startTime: now
  };
}

/**
 * Check if all dependencies for a step are satisfied
 */
export function areDependenciesSatisfied(step: QueryStep, chain: QueryChain): boolean {
  if (step.dependsOn.length === 0) {
    return true;
  }
  
  return step.dependsOn.every(depId => {
    const depStep = chain.steps.find(s => s.id === depId);
    return depStep && depStep.results !== undefined;
  });
}

/**
 * Build a dependency map from previous steps
 */
export function buildDependencyMap(chain: QueryChain): DependencyMap {
  const dependencies: DependencyMap = {};
  
  for (const step of chain.steps) {
    if (step.results !== undefined) {
      dependencies[step.id] = step.results;
    }
  }
  
  return dependencies;
}

/**
 * Execute the next step in a query chain
 */
export async function executeNextStep(chain: QueryChain): Promise<QueryChain> {
  if (chain.complete) {
    return chain;
  }
  
  // Find the next executable step
  const executableSteps = chain.steps.filter(step => 
    step.results === undefined && 
    !step.error && 
    areDependenciesSatisfied(step, chain)
  );
  
  if (executableSteps.length === 0) {
    // No more steps to execute, check if any failed
    const failedSteps = chain.steps.filter(step => step.error);
    
    if (failedSteps.length > 0) {
      chain.error = `Chain execution failed: ${failedSteps[0].error}`;
    } else {
      // Collect results from the final step(s)
      const finalSteps = chain.steps.filter(step => 
        !chain.steps.some(otherStep => otherStep.dependsOn.includes(step.id))
      );
      
      if (finalSteps.length > 0) {
        chain.finalResults = finalSteps[0].results;
      }
    }
    
    chain.complete = true;
    chain.endTime = Date.now();
    chain.totalExecutionTime = chain.endTime - chain.startTime;
    
    return chain;
  }
  
  // Execute the first executable step
  const stepToExecute = executableSteps[0];
  chain.currentStep++;
  
  // Build dependency map
  const dependencies = buildDependencyMap(chain);
  
  // Replace parameter placeholders with actual values
  const parametrizedQuery = replaceParameters(stepToExecute.query, dependencies);
  
  try {
    // Execute the step
    const startTime = Date.now();
    const result = await executeQuery(parametrizedQuery);
    const executionTime = Date.now() - startTime;
    
    // Update the step with results
    const updatedStep: QueryStep = {
      ...stepToExecute,
      query: parametrizedQuery, // Store the parametrized query
      executionTime,
      results: result.success ? result.data : undefined,
      error: result.success ? undefined : result.error
    };
    
    // Update the chain
    const updatedSteps = chain.steps.map(step => 
      step.id === updatedStep.id ? updatedStep : step
    );
    
    return {
      ...chain,
      steps: updatedSteps
    };
  } catch (error: any) {
    // Update the step with error
    const updatedStep: QueryStep = {
      ...stepToExecute,
      query: parametrizedQuery, // Store the parametrized query
      error: error.message || 'Unknown error'
    };
    
    // Update the chain
    const updatedSteps = chain.steps.map(step => 
      step.id === updatedStep.id ? updatedStep : step
    );
    
    return {
      ...chain,
      steps: updatedSteps
    };
  }
}

/**
 * Execute all steps in a query chain
 */
export async function executeQueryChain(chain: QueryChain): Promise<QueryChain> {
  let currentChain = { ...chain };
  
  while (!currentChain.complete && currentChain.currentStep < currentChain.maxSteps) {
    currentChain = await executeNextStep(currentChain);
  }
  
  return currentChain;
}

/**
 * Create standard steps for entity identification
 */
export function createEntityIdentificationStep(entityType: string, entityIdentifier: string): QueryStep {
  let query = '';
  let purpose = '';
  
  switch (entityType) {
    case 'client':
      query = `
        SELECT id, name, onboarding_status 
        FROM clients 
        WHERE name LIKE '%${entityIdentifier}%' OR id = '${entityIdentifier}'
        LIMIT 1
      `;
      purpose = `Identify client with name or ID containing "${entityIdentifier}"`;
      break;
    case 'goal':
      query = `
        SELECT id, title, client_id, status 
        FROM goals 
        WHERE title LIKE '%${entityIdentifier}%' OR id = '${entityIdentifier}'
        LIMIT 1
      `;
      purpose = `Identify goal with title or ID containing "${entityIdentifier}"`;
      break;
    case 'session':
      query = `
        SELECT id, client_id, session_date, status 
        FROM sessions 
        WHERE id = '${entityIdentifier}'
        LIMIT 1
      `;
      purpose = `Identify session with ID "${entityIdentifier}"`;
      break;
    default:
      query = `
        SELECT 'entity_not_supported' as error_message
      `;
      purpose = `Entity type "${entityType}" not supported for identification`;
  }
  
  return {
    id: `identify_${entityType}_${randomUUID().slice(0, 8)}`,
    purpose,
    query,
    dependsOn: []
  };
}

/**
 * Create chain for client's goals
 */
export function createClientGoalsChain(clientIdentifier: string, goalStatus?: string): QueryChain {
  const steps: Partial<QueryStep>[] = [
    // Step 1: Identify the client
    {
      id: 'identify_client',
      purpose: `Identify client "${clientIdentifier}"`,
      query: `
        SELECT id, name 
        FROM clients 
        WHERE name LIKE '%${clientIdentifier}%' OR id = '${clientIdentifier}'
        LIMIT 1
      `,
      dependsOn: []
    },
    // Step 2: Get the client's goals
    {
      id: 'get_client_goals',
      purpose: 'Get goals for the identified client',
      query: `
        SELECT g.id, g.title, g.description, g.status, g.priority, g.created_at, g.target_date
        FROM goals g
        WHERE g.client_id = '\${identify_client.id}'
        ${goalStatus ? `AND g.status = '${goalStatus}'` : ''}
        ORDER BY 
          CASE 
            WHEN g.status = 'in_progress' THEN 1
            WHEN g.status = 'not_started' THEN 2
            WHEN g.status = 'achieved' THEN 3
            ELSE 4
          END,
          CASE 
            WHEN g.priority = 'high' THEN 1
            WHEN g.priority = 'medium' THEN 2
            WHEN g.priority = 'low' THEN 3
            ELSE 4
          END
      `,
      dependsOn: ['identify_client']
    }
  ];
  
  return createQueryChain(`Get goals for client "${clientIdentifier}"`, steps);
}

/**
 * Create chain for client's progress on a specific goal
 */
export function createGoalProgressChain(clientIdentifier: string, goalKeyword: string): QueryChain {
  const steps: Partial<QueryStep>[] = [
    // Step 1: Identify the client
    {
      id: 'identify_client',
      purpose: `Identify client "${clientIdentifier}"`,
      query: `
        SELECT id, name 
        FROM clients 
        WHERE name LIKE '%${clientIdentifier}%' OR id = '${clientIdentifier}'
        LIMIT 1
      `,
      dependsOn: []
    },
    // Step 2: Find the specific goal
    {
      id: 'identify_goal',
      purpose: `Find goal containing "${goalKeyword}" for the client`,
      query: `
        SELECT id, title, description, status, priority, target_date
        FROM goals
        WHERE client_id = '\${identify_client.id}'
          AND title LIKE '%${goalKeyword}%'
        LIMIT 1
      `,
      dependsOn: ['identify_client']
    },
    // Step 3: Get progress assessments for the goal
    {
      id: 'get_goal_progress',
      purpose: 'Get progress assessments for the goal',
      query: `
        SELECT 
          gp.assessment_date,
          gp.score,
          gp.notes,
          s.session_date
        FROM goal_progress gp
        JOIN sessions s ON gp.session_id = s.id
        WHERE gp.goal_id = '\${identify_goal.id}'
        ORDER BY gp.assessment_date DESC
      `,
      dependsOn: ['identify_goal']
    },
    // Step 4: Get subgoals for the goal
    {
      id: 'get_subgoals',
      purpose: 'Get subgoals for the goal',
      query: `
        SELECT 
          id,
          title,
          status,
          priority
        FROM subgoals
        WHERE goal_id = '\${identify_goal.id}'
        ORDER BY
          CASE 
            WHEN status = 'in_progress' THEN 1
            WHEN status = 'not_started' THEN 2
            WHEN status = 'achieved' THEN 3
            ELSE 4
          END
      `,
      dependsOn: ['identify_goal']
    }
  ];
  
  return createQueryChain(`Get progress on "${goalKeyword}" goal for client "${clientIdentifier}"`, steps);
}

/**
 * Create chain for budget information
 */
export function createBudgetInfoChain(clientIdentifier: string): QueryChain {
  const steps: Partial<QueryStep>[] = [
    // Step 1: Identify the client
    {
      id: 'identify_client',
      purpose: `Identify client "${clientIdentifier}"`,
      query: `
        SELECT id, name 
        FROM clients 
        WHERE name LIKE '%${clientIdentifier}%' OR id = '${clientIdentifier}'
        LIMIT 1
      `,
      dependsOn: []
    },
    // Step 2: Get active budget settings
    {
      id: 'get_budget_settings',
      purpose: 'Get active budget settings for the client',
      query: `
        SELECT 
          id,
          name,
          total_amount,
          start_date,
          end_date,
          funding_source
        FROM budget_settings
        WHERE client_id = '\${identify_client.id}'
          AND active = true
        LIMIT 1
      `,
      dependsOn: ['identify_client']
    },
    // Step 3: Get budget items
    {
      id: 'get_budget_items',
      purpose: 'Get budget items for the active budget',
      query: `
        SELECT 
          name,
          product_code,
          quantity,
          usage,
          (quantity - usage) as remaining,
          ROUND((usage / quantity) * 100, 1) as usage_percentage,
          unit_price,
          total_amount
        FROM budget_items
        WHERE budget_settings_id = '\${get_budget_settings.id}'
        ORDER BY usage_percentage DESC
      `,
      dependsOn: ['get_budget_settings']
    }
  ];
  
  return createQueryChain(`Get budget information for client "${clientIdentifier}"`, steps);
}

/**
 * Create chain for strategy effectiveness
 */
export function createStrategyEffectivenessChain(clientIdentifier: string, strategyName?: string): QueryChain {
  const steps: Partial<QueryStep>[] = [
    // Step 1: Identify the client
    {
      id: 'identify_client',
      purpose: `Identify client "${clientIdentifier}"`,
      query: `
        SELECT id, name 
        FROM clients 
        WHERE name LIKE '%${clientIdentifier}%' OR id = '${clientIdentifier}'
        LIMIT 1
      `,
      dependsOn: []
    },
    // Step 2: Get strategies used with this client
    {
      id: 'get_strategies',
      purpose: 'Get strategies used with the client',
      query: `
        SELECT 
          st.id,
          st.name,
          st.description,
          COUNT(ss.id) as usage_count
        FROM strategies st
        JOIN session_strategies ss ON st.id = ss.strategy_id
        JOIN sessions s ON ss.session_id = s.id
        WHERE s.client_id = '\${identify_client.id}'
        ${strategyName ? `AND st.name LIKE '%${strategyName}%'` : ''}
        GROUP BY st.id, st.name, st.description
        ORDER BY usage_count DESC
      `,
      dependsOn: ['identify_client']
    },
    // Step 3: Get effectiveness ratings
    {
      id: 'get_effectiveness',
      purpose: 'Get effectiveness ratings for strategies',
      query: `
        SELECT 
          st.name as strategy_name,
          AVG(ss.effectiveness_rating) as avg_rating,
          COUNT(ss.id) as rating_count
        FROM strategies st
        JOIN session_strategies ss ON st.id = ss.strategy_id
        JOIN sessions s ON ss.session_id = s.id
        WHERE s.client_id = '\${identify_client.id}'
        ${strategyName ? `AND st.name LIKE '%${strategyName}%'` : ''}
        GROUP BY st.name
        ORDER BY avg_rating DESC
      `,
      dependsOn: ['identify_client']
    }
  ];
  
  const questionDescription = strategyName 
    ? `Get effectiveness of "${strategyName}" strategy for client "${clientIdentifier}"`
    : `Get strategy effectiveness for client "${clientIdentifier}"`;
  
  return createQueryChain(questionDescription, steps);
}

/**
 * Create chain for recent sessions
 */
export function createRecentSessionsChain(clientIdentifier: string, periodDays: number = 30): QueryChain {
  const steps: Partial<QueryStep>[] = [
    // Step 1: Identify the client
    {
      id: 'identify_client',
      purpose: `Identify client "${clientIdentifier}"`,
      query: `
        SELECT id, name 
        FROM clients 
        WHERE name LIKE '%${clientIdentifier}%' OR id = '${clientIdentifier}'
        LIMIT 1
      `,
      dependsOn: []
    },
    // Step 2: Get recent sessions
    {
      id: 'get_recent_sessions',
      purpose: `Get sessions from the last ${periodDays} days`,
      query: `
        SELECT 
          id,
          session_date,
          session_type,
          duration_minutes,
          status
        FROM sessions
        WHERE client_id = '\${identify_client.id}'
          AND session_date >= CURRENT_DATE - INTERVAL '${periodDays} days'
        ORDER BY session_date DESC
      `,
      dependsOn: ['identify_client']
    },
    // Step 3: Get session notes for context
    {
      id: 'get_session_notes',
      purpose: 'Get notes for the recent sessions',
      query: `
        SELECT 
          sn.session_id,
          sn.note_text,
          sn.created_at
        FROM session_notes sn
        JOIN sessions s ON sn.session_id = s.id
        WHERE s.client_id = '\${identify_client.id}'
          AND s.session_date >= CURRENT_DATE - INTERVAL '${periodDays} days'
        ORDER BY sn.created_at DESC
      `,
      dependsOn: ['identify_client']
    }
  ];
  
  return createQueryChain(`Get recent sessions for client "${clientIdentifier}" in the last ${periodDays} days`, steps);
}

/**
 * Create a multi-query chain based on a question pattern
 */
export function createChainForQuestion(question: string): QueryChain | null {
  // Client goals pattern
  const clientGoalsMatch = question.match(/(?:what|show|list|get)\s+(?:are|is|the)?\s*(?:goals|objectives)\s+(?:for|of)\s+(?:client|patient)?\s*(?:named|called)?\s*['""]?([a-zA-Z0-9\s-]+)['""]?/i);
  if (clientGoalsMatch) {
    return createClientGoalsChain(clientGoalsMatch[1].trim());
  }
  
  // Goal progress pattern
  const goalProgressMatch = question.match(/(?:how|what)\s+(?:is|are)\s+(?:the)?\s*(?:progress|status)\s+(?:on|of|for)\s+(?:goal|objective)?\s*['""]?([a-zA-Z0-9\s-]+)['""]?\s+(?:for|of)\s+(?:client|patient)?\s*(?:named|called)?\s*['""]?([a-zA-Z0-9\s-]+)['""]?/i);
  if (goalProgressMatch) {
    return createGoalProgressChain(goalProgressMatch[2].trim(), goalProgressMatch[1].trim());
  }
  
  // Budget information pattern
  const budgetMatch = question.match(/(?:what|show|get)\s+(?:is|are|the)?\s*(?:budget|funds|funding)\s+(?:for|of)\s+(?:client|patient)?\s*(?:named|called)?\s*['""]?([a-zA-Z0-9\s-]+)['""]?/i);
  if (budgetMatch) {
    return createBudgetInfoChain(budgetMatch[1].trim());
  }
  
  // Strategy effectiveness pattern
  const strategyMatch = question.match(/(?:how|what)\s+(?:effective|is)\s+(?:the|is)?\s*(?:strategy|approach|technique)\s+['""]?([a-zA-Z0-9\s-]+)['""]?\s+(?:for|with)\s+(?:client|patient)?\s*(?:named|called)?\s*['""]?([a-zA-Z0-9\s-]+)['""]?/i);
  if (strategyMatch) {
    return createStrategyEffectivenessChain(strategyMatch[2].trim(), strategyMatch[1].trim());
  }
  
  // Recent sessions pattern
  const recentSessionsMatch = question.match(/(?:what|show|list|get)\s+(?:are|the)?\s*(?:recent|latest|last)\s+(?:sessions|appointments|visits)\s+(?:for|of)\s+(?:client|patient)?\s*(?:named|called)?\s*['""]?([a-zA-Z0-9\s-]+)['""]?(?:\s+in\s+the\s+last\s+(\d+)\s+days)?/i);
  if (recentSessionsMatch) {
    const periodDays = recentSessionsMatch[2] ? parseInt(recentSessionsMatch[2], 10) : 30;
    return createRecentSessionsChain(recentSessionsMatch[1].trim(), periodDays);
  }
  
  // No match
  return null;
}

// Export the module as a single object
export const multiQueryEngine = {
  executeQuery,
  replaceParameters,
  createQueryChain,
  areDependenciesSatisfied,
  buildDependencyMap,
  executeNextStep,
  executeQueryChain,
  createEntityIdentificationStep,
  createClientGoalsChain,
  createGoalProgressChain,
  createBudgetInfoChain,
  createStrategyEffectivenessChain,
  createRecentSessionsChain,
  createChainForQuestion
};