/**
 * Multi-Query Engine
 * 
 * This module provides the capability to execute multiple interdependent SQL queries
 * to resolve complex questions that can't be answered with a single query.
 */

import { sql } from '../../db';
import { schemaMetadataService } from './schemaMetadata';

/**
 * Step in a query chain
 */
export interface QueryStep {
  id: string;
  purpose: string;
  query: string;
  dependsOn: string[];
  results?: any[];
  error?: string;
  executionTime?: number;
}

/**
 * Full query chain definition
 */
export interface QueryChain {
  id: string;
  originalQuestion: string;
  steps: QueryStep[];
  maxSteps: number;
  currentStep: number;
  complete: boolean;
  startTime: number;
  endTime?: number;
  totalExecutionTime?: number;
  finalResults?: any[];
  error?: string;
}

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
  try {
    const startTime = Date.now();
    
    // Execute the query with a timeout safety
    const queryPromise = sql.unsafe(queryText);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout - exceeded 10 seconds')), 10000);
    });
    
    // Race between query and timeout
    const result = await Promise.race([queryPromise, timeoutPromise]) as any[];
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      data: result,
      executionTime
    };
  } catch (error: any) {
    console.error('Error executing SQL query:', error);
    
    return {
      success: false,
      data: [],
      error: error.message,
      originalError: error.toString()
    };
  }
}

/**
 * Replace parameters in a query with values from previous steps
 */
export function replaceParameters(query: string, dependencies: DependencyMap): string {
  let result = query;
  
  // Find and replace {step:stepId.field} patterns
  const paramRegex = /\{step:([^.}]+)\.([^}]+)\}/g;
  
  result = result.replace(paramRegex, (match, stepId, field) => {
    if (!dependencies[stepId]) {
      throw new Error(`Missing dependency: ${stepId}`);
    }
    
    // If the dependency has multiple rows, use the first one
    const data = Array.isArray(dependencies[stepId]) ? dependencies[stepId][0] : dependencies[stepId];
    
    if (data[field] === undefined) {
      throw new Error(`Field ${field} not found in step ${stepId}`);
    }
    
    // Return the value, properly escaped if it's a string
    const value = data[field];
    return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
  });
  
  return result;
}

/**
 * Create a new query chain from a question
 */
export function createQueryChain(question: string, initialSteps: Partial<QueryStep>[]): QueryChain {
  return {
    id: `chain-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    originalQuestion: question,
    steps: initialSteps.map((step, index) => ({
      id: step.id || `step-${index + 1}`,
      purpose: step.purpose || `Step ${index + 1}`,
      query: step.query || '',
      dependsOn: step.dependsOn || [],
      results: step.results
    })),
    maxSteps: 7, // Maximum number of steps allowed
    currentStep: 0,
    complete: false,
    startTime: Date.now()
  };
}

/**
 * Check if all dependencies for a step are satisfied
 */
export function areDependenciesSatisfied(step: QueryStep, chain: QueryChain): boolean {
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
  // Clone the chain to avoid modifying the original
  const updatedChain = { ...chain };
  
  // Check if chain is already complete
  if (updatedChain.complete) {
    return updatedChain;
  }
  
  // Check if we've reached the maximum number of steps
  if (updatedChain.currentStep >= updatedChain.maxSteps) {
    updatedChain.complete = true;
    updatedChain.error = 'Maximum number of steps reached';
    updatedChain.endTime = Date.now();
    updatedChain.totalExecutionTime = updatedChain.endTime - updatedChain.startTime;
    return updatedChain;
  }
  
  // Find the next executable step
  let nextStep: QueryStep | undefined;
  
  for (let i = 0; i < updatedChain.steps.length; i++) {
    const step = updatedChain.steps[i];
    
    // Skip steps that already have results
    if (step.results !== undefined) {
      continue;
    }
    
    // Check if all dependencies are satisfied
    if (areDependenciesSatisfied(step, updatedChain)) {
      nextStep = step;
      break;
    }
  }
  
  // If no step can be executed, the chain is complete
  if (!nextStep) {
    updatedChain.complete = true;
    updatedChain.endTime = Date.now();
    updatedChain.totalExecutionTime = updatedChain.endTime - updatedChain.startTime;
    
    // Set the final results to the results of the last step
    const lastStepWithResults = [...updatedChain.steps]
      .reverse()
      .find(s => s.results !== undefined);
      
    if (lastStepWithResults) {
      updatedChain.finalResults = lastStepWithResults.results;
    }
    
    return updatedChain;
  }
  
  // Build dependency map
  const dependencies = buildDependencyMap(updatedChain);
  
  try {
    // Replace parameters in the query
    const query = replaceParameters(nextStep.query, dependencies);
    
    // Execute the query
    const result = await executeQuery(query);
    const stepIndex = updatedChain.steps.findIndex(s => s.id === nextStep!.id);
    
    // Update the step with the results
    updatedChain.steps[stepIndex] = {
      ...nextStep,
      query, // Store the processed query
      results: result.success ? result.data : [],
      error: result.error,
      executionTime: result.executionTime
    };
    
    // Increment the current step
    updatedChain.currentStep++;
    
  } catch (error: any) {
    // Handle errors in parameter replacement
    const stepIndex = updatedChain.steps.findIndex(s => s.id === nextStep!.id);
    
    updatedChain.steps[stepIndex] = {
      ...nextStep,
      error: `Error processing step: ${error.message}`
    };
    
    // Mark the chain as complete with an error
    updatedChain.complete = true;
    updatedChain.error = `Failed at step ${nextStep.id}: ${error.message}`;
    updatedChain.endTime = Date.now();
    updatedChain.totalExecutionTime = updatedChain.endTime - updatedChain.startTime;
  }
  
  return updatedChain;
}

/**
 * Execute all steps in a query chain
 */
export async function executeQueryChain(chain: QueryChain): Promise<QueryChain> {
  let currentChain = { ...chain };
  
  while (!currentChain.complete) {
    currentChain = await executeNextStep(currentChain);
  }
  
  return currentChain;
}

/**
 * Create standard steps for entity identification
 */
export function createEntityIdentificationStep(entityType: string, entityIdentifier: string): QueryStep {
  let query = '';
  
  switch (entityType) {
    case 'client':
      query = `
        SELECT id, name, unique_identifier, date_of_birth, onboarding_status
        FROM clients
        WHERE name LIKE '%${entityIdentifier}%' 
           OR unique_identifier = '${entityIdentifier}'
        LIMIT 5
      `;
      break;
      
    case 'goal':
      query = `
        SELECT id, title, description, status, progress_percentage, client_id
        FROM goals
        WHERE title LIKE '%${entityIdentifier}%'
           OR description LIKE '%${entityIdentifier}%'
        LIMIT 5
      `;
      break;
      
    case 'clinician':
      query = `
        SELECT id, name, title, email, specialization
        FROM clinicians
        WHERE name LIKE '%${entityIdentifier}%'
           OR email LIKE '%${entityIdentifier}%'
        LIMIT 5
      `;
      break;
      
    case 'session':
      query = `
        SELECT id, title, description, session_date, client_id
        FROM sessions
        WHERE title LIKE '%${entityIdentifier}%'
           OR id::text = '${entityIdentifier}'
        LIMIT 5
      `;
      break;
      
    case 'strategy':
      query = `
        SELECT id, name, category, description
        FROM strategies
        WHERE name LIKE '%${entityIdentifier}%'
           OR category LIKE '%${entityIdentifier}%'
        LIMIT 5
      `;
      break;
      
    default:
      // Generic entity identification
      query = `
        SELECT *
        FROM ${entityType}
        WHERE name LIKE '%${entityIdentifier}%'
           OR id::text = '${entityIdentifier}'
        LIMIT 5
      `;
  }
  
  return {
    id: `identify_${entityType}`,
    purpose: `Identify ${entityType} matching "${entityIdentifier}"`,
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
    createEntityIdentificationStep('client', clientIdentifier),
    
    // Step 2: Retrieve client's goals
    {
      id: 'get_client_goals',
      purpose: 'Retrieve goals for the client',
      query: `
        SELECT g.id, g.title, g.description, g.status, g.progress_percentage, 
               g.start_date, g.target_date
        FROM goals g
        WHERE g.client_id = {step:identify_client.id}
        ${goalStatus ? `AND g.status = '${goalStatus}'` : ''}
        ORDER BY g.start_date DESC
      `,
      dependsOn: ['identify_client']
    }
  ];
  
  return createQueryChain(`Find goals for client ${clientIdentifier}`, steps);
}

/**
 * Create chain for client's progress on a specific goal
 */
export function createGoalProgressChain(clientIdentifier: string, goalKeyword: string): QueryChain {
  const steps: Partial<QueryStep>[] = [
    // Step 1: Identify the client
    createEntityIdentificationStep('client', clientIdentifier),
    
    // Step 2: Find the specific goal
    {
      id: 'find_goal',
      purpose: `Find goal related to "${goalKeyword}"`,
      query: `
        SELECT g.id, g.title, g.description, g.status, g.progress_percentage
        FROM goals g
        WHERE g.client_id = {step:identify_client.id}
        AND (g.title LIKE '%${goalKeyword}%' OR g.description LIKE '%${goalKeyword}%')
        ORDER BY g.start_date DESC
        LIMIT 1
      `,
      dependsOn: ['identify_client']
    },
    
    // Step 3: Get progress assessments for the goal
    {
      id: 'get_goal_progress',
      purpose: 'Retrieve progress assessments for the goal',
      query: `
        SELECT pa.id, pa.rating, pa.score, pa.notes, 
               sn.session_id, s.session_date
        FROM performance_assessments pa
        JOIN session_notes sn ON pa.session_note_id = sn.id
        JOIN sessions s ON sn.session_id = s.id
        WHERE pa.goal_id = {step:find_goal.id}
        ORDER BY s.session_date DESC
      `,
      dependsOn: ['find_goal']
    }
  ];
  
  return createQueryChain(`Track progress for ${clientIdentifier} on goal related to ${goalKeyword}`, steps);
}

/**
 * Create chain for budget information
 */
export function createBudgetInfoChain(clientIdentifier: string): QueryChain {
  const steps: Partial<QueryStep>[] = [
    // Step 1: Identify the client
    createEntityIdentificationStep('client', clientIdentifier),
    
    // Step 2: Get budget settings
    {
      id: 'get_budget_settings',
      purpose: 'Retrieve budget settings for the client',
      query: `
        SELECT bs.id, bs.start_date, bs.end_date, bs.settings
        FROM budget_settings bs
        WHERE bs.client_id = {step:identify_client.id}
        ORDER BY bs.end_date DESC
        LIMIT 1
      `,
      dependsOn: ['identify_client']
    },
    
    // Step 3: Get budget items and usage
    {
      id: 'get_budget_items',
      purpose: 'Retrieve budget items and usage',
      query: `
        SELECT bi.id, bi.product_code, bi.item_number, 
               bi.quantity, bi.total_allocated, bi.total_used,
               (bi.total_allocated - bi.total_used) as remaining
        FROM budget_items bi
        WHERE bi.budget_settings_id = {step:get_budget_settings.id}
        ORDER BY bi.total_allocated DESC
      `,
      dependsOn: ['get_budget_settings']
    }
  ];
  
  return createQueryChain(`Budget information for ${clientIdentifier}`, steps);
}

/**
 * Create chain for strategy effectiveness
 */
export function createStrategyEffectivenessChain(clientIdentifier: string, strategyName?: string): QueryChain {
  const steps: Partial<QueryStep>[] = [
    // Step 1: Identify the client
    createEntityIdentificationStep('client', clientIdentifier),
    
    // Step 2: Get strategies used with this client
    {
      id: 'get_client_strategies',
      purpose: 'Identify strategies used with this client',
      query: `
        SELECT DISTINCT unnest(pa.strategies) as strategy_name
        FROM performance_assessments pa
        JOIN session_notes sn ON pa.session_note_id = sn.id
        JOIN sessions s ON sn.session_id = s.id
        WHERE s.client_id = {step:identify_client.id}
        ${strategyName ? `AND unnest(pa.strategies) LIKE '%${strategyName}%'` : ''}
      `,
      dependsOn: ['identify_client']
    },
    
    // Step 3: Get strategy details and ratings
    {
      id: 'get_strategy_effectiveness',
      purpose: 'Analyze effectiveness of strategies',
      query: `
        SELECT 
          s.name as strategy_name,
          s.category,
          AVG(pa.rating) as avg_rating,
          AVG(pa.score) as avg_score,
          COUNT(*) as usage_count
        FROM performance_assessments pa
        JOIN session_notes sn ON pa.session_note_id = sn.id
        JOIN sessions sess ON sn.session_id = sess.id
        JOIN strategies s ON s.name = ANY(pa.strategies)
        WHERE sess.client_id = {step:identify_client.id}
        GROUP BY s.name, s.category
        ORDER BY avg_rating DESC, usage_count DESC
      `,
      dependsOn: ['identify_client']
    }
  ];
  
  return createQueryChain(`Strategy effectiveness for ${clientIdentifier}`, steps);
}

/**
 * Create chain for recent sessions
 */
export function createRecentSessionsChain(clientIdentifier: string, periodDays: number = 30): QueryChain {
  const steps: Partial<QueryStep>[] = [
    // Step 1: Identify the client
    createEntityIdentificationStep('client', clientIdentifier),
    
    // Step 2: Get recent sessions
    {
      id: 'get_recent_sessions',
      purpose: `Get sessions in the last ${periodDays} days`,
      query: `
        SELECT s.id, s.title, s.description, s.session_date, s.duration,
               s.status, s.location
        FROM sessions s
        WHERE s.client_id = {step:identify_client.id}
        AND s.session_date >= CURRENT_DATE - INTERVAL '${periodDays} days'
        ORDER BY s.session_date DESC
      `,
      dependsOn: ['identify_client']
    },
    
    // Step 3: Get session notes for context
    {
      id: 'get_session_notes',
      purpose: 'Get detailed notes for the sessions',
      query: `
        SELECT sn.id, sn.session_id, sn.notes, sn.mood_rating, 
               sn.physical_activity_rating, sn.focus_rating, sn.cooperation_rating
        FROM session_notes sn
        JOIN sessions s ON sn.session_id = s.id
        WHERE s.client_id = {step:identify_client.id}
        AND s.session_date >= CURRENT_DATE - INTERVAL '${periodDays} days'
        ORDER BY s.session_date DESC
      `,
      dependsOn: ['identify_client']
    }
  ];
  
  return createQueryChain(`Recent sessions for ${clientIdentifier} in the last ${periodDays} days`, steps);
}

/**
 * Create a multi-query chain based on a question pattern
 */
export function createChainForQuestion(question: string): QueryChain | null {
  // Normalize the question
  const normalizedQuestion = question.toLowerCase().trim();
  
  // Look for client identifiers
  const clientMatch = normalizedQuestion.match(/\b([a-z]+)[- ](\d{6})\b/i) || // Pattern like "Name-123456"
                 normalizedQuestion.match(/\b([a-z]+)['']?s?\b/i);  // Pattern like "Name's" or "Name"
  
  const clientIdentifier = clientMatch ? clientMatch[0] : null;
  
  // Check for common question patterns
  
  // 1. Questions about client goals
  if (normalizedQuestion.includes('goal') && clientIdentifier) {
    const goalStatus = normalizedQuestion.includes('active') ? 'active' : 
                    normalizedQuestion.includes('completed') ? 'completed' : null;
                    
    return createClientGoalsChain(clientIdentifier, goalStatus || undefined);
  }
  
  // 2. Questions about goal progress
  if ((normalizedQuestion.includes('progress') || normalizedQuestion.includes('improvement')) && 
      clientIdentifier && normalizedQuestion.includes('goal')) {
    // Extract goal keyword
    const goalKeywords = [
      'communication', 'social', 'speech', 'language', 'mobility',
      'motor', 'sensory', 'cognitive', 'behavior', 'self-care'
    ];
    
    let goalKeyword = '';
    for (const keyword of goalKeywords) {
      if (normalizedQuestion.includes(keyword)) {
        goalKeyword = keyword;
        break;
      }
    }
    
    if (goalKeyword) {
      return createGoalProgressChain(clientIdentifier, goalKeyword);
    }
  }
  
  // 3. Questions about budget or funding
  if ((normalizedQuestion.includes('budget') || normalizedQuestion.includes('fund') || 
       normalizedQuestion.includes('funding') || normalizedQuestion.includes('ndis')) && 
      clientIdentifier) {
    return createBudgetInfoChain(clientIdentifier);
  }
  
  // 4. Questions about strategies
  if (normalizedQuestion.includes('strateg') && clientIdentifier) {
    // Check for specific strategy
    let strategyName;
    if (normalizedQuestion.includes('visual')) strategyName = 'visual';
    else if (normalizedQuestion.includes('sensory')) strategyName = 'sensory';
    else if (normalizedQuestion.includes('social')) strategyName = 'social';
    
    return createStrategyEffectivenessChain(clientIdentifier, strategyName);
  }
  
  // 5. Questions about recent sessions
  if ((normalizedQuestion.includes('session') || normalizedQuestion.includes('appointment') || 
       normalizedQuestion.includes('visit')) && clientIdentifier) {
    // Check for time period
    let periodDays = 30; // Default to last 30 days
    
    if (normalizedQuestion.includes('week')) {
      periodDays = 7;
    } else if (normalizedQuestion.includes('month')) {
      periodDays = 30;
    } else if (normalizedQuestion.includes('year')) {
      periodDays = 365;
    }
    
    return createRecentSessionsChain(clientIdentifier, periodDays);
  }
  
  // No matching pattern found
  return null;
}

// Singleton instance
export const multiQueryEngine = {
  createQueryChain,
  executeNextStep,
  executeQueryChain,
  createChainForQuestion
};