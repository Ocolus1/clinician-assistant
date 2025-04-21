/**
 * Multi-Query Engine
 * 
 * This service enables complex multi-step query execution for questions
 * that cannot be answered with a single SQL query. It can break down
 * complex questions into a series of dependent query steps and synthesize
 * the results.
 */

import { v4 as uuidv4 } from 'uuid';
import { openaiService } from '../openaiService';
import { enhancedSQLQueryGenerator } from './sqlQueryGenerator';
import { schemaMetadataService } from './schemaMetadata';
import { sql } from '../../db';
import { QueryChain, QueryStep } from '@shared/enhancedAssistantTypes';

/**
 * Result of checking if a question needs multi-query approach
 */
interface MultiQueryCheckResult {
  needsMultiQuery: boolean;
  reason?: string;
}

/**
 * Multi-Query Engine service class
 */
export class MultiQueryEngine {
  /**
   * Get database schema in simplified format for planning
   */
  private async getSimplifiedSchema(): Promise<any> {
    try {
      const fullSchema = await schemaMetadataService.getSchemaMetadata();
      
      // Simplify the schema for planning
      return fullSchema.map(table => {
        const simpleTable = {
          name: table.name,
          description: table.description,
          columns: table.columns.map(col => ({
            name: col.name,
            type: col.type,
            description: col.description
          }))
        };
        
        return simpleTable;
      });
    } catch (error) {
      console.error('[MultiQuery] Error getting simplified schema:', error);
      return [];
    }
  }
  
  /**
   * Check if a question requires multiple queries to answer
   */
  async checkIfMultiQueryNeeded(question: string): Promise<MultiQueryCheckResult> {
    try {
      // Get simplified schema
      const schema = await this.getSimplifiedSchema();
      
      // Create prompt for OpenAI to analyze if multi-query is needed
      const prompt = `
Analyze this natural language question and determine if it requires multiple SQL queries to be answered completely:

Question: "${question}"

A question needs multiple queries if:
1. It involves aggregating data from disconnected tables or multiple time periods
2. It requires conditional processing (e.g., "Find X and if Y, show Z")
3. It asks for comparisons between different datasets
4. It has temporal logic that's difficult to express in a single query
5. It requires intermediate calculations or post-processing
6. It references a client or therapist by name instead of ID, requiring a lookup step
7. It asks about goals, budgets, or sessions for a specific client identified by name
8. It asks for aggregated metrics across relationships (e.g., goal progress for a named client)

Important: Pay special attention to questions involving clients identified by name rather than ID.
When a client is identified by name, we typically need a first query to get their ID before
retrieving their related data (goals, budgets, sessions, etc.) in subsequent queries.

Respond with either:
NEEDS_MULTI_QUERY: <reason>
SINGLE_QUERY_SUFFICIENT
`;
      
      const response = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are an expert SQL analyst.' },
        { role: 'user', content: prompt }
      ]);
      
      if (response.includes('NEEDS_MULTI_QUERY')) {
        const reason = response.replace('NEEDS_MULTI_QUERY:', '').trim();
        return { needsMultiQuery: true, reason };
      } else {
        return { needsMultiQuery: false };
      }
    } catch (error) {
      console.error('[MultiQuery] Error checking if multi-query needed:', error);
      return { needsMultiQuery: false };
    }
  }
  
  /**
   * Generate a plan for multiple queries to answer a complex question
   */
  async generateMultiQueryPlan(question: string): Promise<QueryChain> {
    try {
      // Get simplified schema
      const schema = await this.getSimplifiedSchema();
      
      // Create prompt for OpenAI to generate a query plan
      const planningPrompt = `
I need to answer this complex question with multiple SQL queries: "${question}"

Create a step-by-step query plan where each step builds on previous results. 
For each step, define:
1. What specific data that step retrieves
2. How it relates to the question
3. How later steps will use its results

Important patterns to follow:
- For client-related queries where the client is identified by name, first retrieve the client ID in an early step.
- When asking about client goals, first get the client ID, then query the goals table with that ID.
- When asking about budget items or utilization, retrieve client and/or budget information first.
- For therapist-related queries, follow the same pattern - get the therapist ID first if they're identified by name.

Rules:
- Break it down into 2-5 logical steps
- Order steps from most basic to most specific
- Each step should be answerable with a single SQL query
- Later steps can use results from earlier steps
- Make sure to include client lookup steps when clients are referenced by name

Format your response as:
STEP 1: <purpose>
STEP 2: <purpose>
...etc.
`;
      
      // Generate plan steps
      const planResponse = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are an expert database analyst.' },
        { role: 'user', content: planningPrompt }
      ]);
      
      // Parse the steps from the response
      const stepLines = planResponse.split('\n')
        .filter(line => line.trim().startsWith('STEP'))
        .map(line => line.trim());
      
      // Create query steps
      const steps: QueryStep[] = [];
      for (let i = 0; i < stepLines.length; i++) {
        const line = stepLines[i];
        const purposeMatch = line.match(/STEP \d+: (.*)/);
        
        if (purposeMatch && purposeMatch[1]) {
          const purpose = purposeMatch[1].trim();
          steps.push({
            id: `step-${i + 1}`,
            purpose,
            query: '', // Will be generated later
            dependsOn: i > 0 ? [`step-${i}`] : []
          });
        }
      }
      
      // Create chain object
      const chain: QueryChain = {
        id: uuidv4(),
        originalQuestion: question,
        steps,
        maxSteps: steps.length,
        currentStep: 0,
        complete: false,
        startTime: Date.now()
      };
      
      return chain;
    } catch (error) {
      console.error('[MultiQuery] Error generating multi-query plan:', error);
      
      // Return a simple fallback plan
      return {
        id: uuidv4(),
        originalQuestion: question,
        steps: [
          {
            id: 'step-1',
            purpose: 'Retrieve data related to the question',
            query: '',
            dependsOn: []
          }
        ],
        maxSteps: 1,
        currentStep: 0,
        complete: false,
        startTime: Date.now()
      };
    }
  }
  
  /**
   * Execute a query chain
   */
  async executeQueryChain(chain: QueryChain): Promise<QueryChain> {
    try {
      // Make a copy of the chain to avoid modifying the original
      const workingChain = { ...chain, steps: [...chain.steps] };
      
      // Get simplified schema
      const schema = await this.getSimplifiedSchema();
      
      // For each step in the chain
      for (let i = 0; i < workingChain.steps.length; i++) {
        const step = workingChain.steps[i];
        workingChain.currentStep = i;
        
        // Get previous step results if any
        const prevResults: Record<string, any[]> = {};
        if (step.dependsOn && Array.isArray(step.dependsOn)) {
          for (const depId of step.dependsOn) {
            const depStep = workingChain.steps.find(s => s.id === depId);
            if (depStep && depStep.results) {
              prevResults[depId] = depStep.results;
            }
          }
        }
        
        // Generate SQL query for this step
        try {
          const query = await this.generateStepQuery(workingChain.originalQuestion, step, prevResults, schema);
          step.query = query;
          
          // Execute the query
          console.log(`[MultiQuery] Executing step ${i + 1}/${workingChain.steps.length}: ${step.purpose}`);
          const startTime = Date.now();
          
          try {
            const results = await sql.unsafe(query);
            step.results = Array.isArray(results) ? results : [results];
            step.executionTime = Date.now() - startTime;
            console.log(`[MultiQuery] Step ${i + 1} completed, got ${step.results.length} results`);
          } catch (error: any) {
            console.error(`[MultiQuery] Error executing step ${i + 1}:`, error);
            step.error = `Error executing query: ${error.message}`;
            
            // Don't continue with further steps if this one failed
            workingChain.error = `Failed at step ${i + 1}: ${error.message}`;
            break;
          }
        } catch (error: any) {
          console.error(`[MultiQuery] Error generating query for step ${i + 1}:`, error);
          step.error = `Error generating query: ${error.message}`;
          
          // Don't continue with further steps if this one failed
          workingChain.error = `Failed at step ${i + 1}: ${error.message}`;
          break;
        }
      }
      
      // Finish the chain
      workingChain.complete = !workingChain.error;
      workingChain.endTime = Date.now();
      workingChain.totalExecutionTime = workingChain.endTime - workingChain.startTime;
      
      // If all steps succeeded, generate final result set
      if (workingChain.complete) {
        try {
          workingChain.finalResults = await this.synthesizeFinalResults(workingChain);
        } catch (error: any) {
          console.error('[MultiQuery] Error synthesizing final results:', error);
          workingChain.error = `Error synthesizing final results: ${error.message}`;
          workingChain.complete = false;
        }
      }
      
      return workingChain;
    } catch (error: any) {
      console.error('[MultiQuery] Error executing query chain:', error);
      
      return {
        ...chain,
        error: `Error executing query chain: ${error.message}`,
        complete: false,
        endTime: Date.now(),
        totalExecutionTime: Date.now() - chain.startTime
      };
    }
  }
  
  /**
   * Generate SQL query for a specific step
   */
  private async generateStepQuery(
    originalQuestion: string,
    step: QueryStep,
    prevResults: Record<string, any[]>,
    schema: any
  ): Promise<string> {
    // Create context for query generation
    const prevResultsFormatted = Object.entries(prevResults).map(([stepId, results]) => {
      const resultSample = results.length > 3 
        ? results.slice(0, 3) 
        : results;
      
      return `${stepId} results (${results.length} rows):\n${JSON.stringify(resultSample, null, 2)}`;
    }).join('\n\n');
    
    // Create prompt for query generation
    const prompt = `
Generate a PostgreSQL query for step ${step.id} in a multi-query plan to answer:
"${originalQuestion}"

Step purpose: ${step.purpose}

${prevResults && Object.keys(prevResults).length > 0 
  ? `Previous steps results:\n${prevResultsFormatted}\n` 
  : 'This is the first step.'}

Context-aware patterns to follow:
- If this step needs client IDs from previous steps, reference them using appropriate WHERE clauses
- If this step builds on previous steps finding a client, use the client ID as a filter parameter
- For client name lookups, consider using LIKE or ILIKE with wildcards for partial matches
- Use LEFT JOIN when looking up potentially missing related data

Create a SQL query that:
1. Focuses ONLY on the specific purpose of this step
2. Produces results that are needed for later steps
3. Uses proper table joins, filtering, and aggregations
4. Handles NULL values safely
5. If referring to previous steps' results, explicitly uses those values in WHERE clauses

Return ONLY the SQL query, with no explanations or comments.
`;
    
    // Generate query using OpenAI
    const generatedQuery = await openaiService.createChatCompletion([
      { role: 'system', content: 'You are an expert SQL query writer.' },
      { role: 'user', content: prompt }
    ]);
    
    // Extract and sanitize the query
    return this.sanitizeStepQuery(generatedQuery);
  }
  
  /**
   * Sanitize a generated step query
   */
  private sanitizeStepQuery(query: string): string {
    // Extract SQL from markdown code blocks if present
    if (query.includes('```')) {
      const matches = query.match(/```(?:sql)?\s*([\s\S]*?)```/);
      if (matches && matches[1]) {
        query = matches[1].trim();
      }
    }
    
    // Ensure query ends with semicolon
    if (!query.trim().endsWith(';')) {
      query += ';';
    }
    
    return query;
  }
  
  /**
   * Synthesize final results from all step results
   */
  private async synthesizeFinalResults(chain: QueryChain): Promise<any[]> {
    try {
      // If there's only one step, use its results directly
      if (chain.steps.length === 1 && chain.steps[0].results) {
        return chain.steps[0].results;
      }
      
      // Check if the last step returned meaningful results
      const lastStep = chain.steps[chain.steps.length - 1];
      if (lastStep.results && lastStep.results.length > 0) {
        return lastStep.results;
      }
      
      // If the last step didn't return results but earlier steps did,
      // generate a combined result that acknowledges the multi-step process
      const stepsWithResults = chain.steps.filter(step => step.results && step.results.length > 0);
      
      if (stepsWithResults.length > 0) {
        // Create a special synthesized result that provides context from all steps
        const combinedResult = {
          _synthesized: true,
          _originalQuestion: chain.originalQuestion,
          _steps: stepsWithResults.map(step => ({
            purpose: step.purpose,
            resultCount: step.results?.length || 0
          })),
          results: stepsWithResults.flatMap(step => step.results || [])
        };
        
        return [combinedResult];
      }
      
      // Fallback in case there are no results
      return [];
    } catch (error) {
      console.error('[MultiQuery] Error synthesizing final results:', error);
      return [];
    }
  }
}

// Create singleton instance
export const multiQueryEngine = new MultiQueryEngine();