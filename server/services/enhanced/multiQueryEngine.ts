/**
 * Multi-Query Engine
 * 
 * This service provides the ability to break down complex queries into multiple
 * interconnected steps. It allows the clinician assistant to answer questions
 * that require multiple database operations to solve.
 */

import { openaiService } from '../openaiService';
import { schemaMetadataService } from './schemaMetadata';
import { QueryChain, QueryStep } from '@shared/enhancedAssistantTypes';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '../../db';

/**
 * Multi-Query Engine class
 */
export class MultiQueryEngine {
  private MAX_STEPS = 5;
  
  /**
   * Check if a question requires multiple queries to answer
   */
  async checkIfMultiQueryNeeded(question: string): Promise<{ needsMultiQuery: boolean; reason?: string }> {
    try {
      // Get schema information
      const schema = await schemaMetadataService.getSchema();
      
      // Create a prompt to analyze query complexity
      const prompt = `
        Analyze the following user question and determine if it requires multiple SQL queries to answer completely:
        
        Question: "${question}"
        
        Database Schema Summary:
        ${JSON.stringify(schema.map(table => ({
          name: table.name,
          primaryKey: table.primaryKey,
          columns: table.columns.map(col => col.name)
        })), null, 2)}
        
        A question requires multiple queries if:
        1. It involves aggregation across different granularities (e.g., "Which therapist has the most clients AND what is their average session duration?")
        2. It requires intermediate temporary results (e.g., "How many clients who missed appointments this month have overdue payments?")
        3. It compares results between different data subsets (e.g., "Compare budget utilization for clients with and without insurance coverage")
        4. It involves temporal sequences that can't be captured in a single query (e.g., "Find clients who had improved assessment scores after their budget was increased")
        
        Respond with only a JSON object in this format:
        {
          "needsMultiQuery": true/false,
          "reason": "Brief explanation of why multiple queries are needed or why a single query is sufficient"
        }
      `;
      
      // Call the OpenAI API
      const responseText = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are a query complexity analyzer that determines if questions require multiple SQL queries to answer. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      
      try {
        const response = JSON.parse(responseText);
        return {
          needsMultiQuery: response.needsMultiQuery === true,
          reason: response.reason
        };
      } catch (parseError) {
        console.error('[MultiQuery] Failed to parse response as JSON:', parseError);
        return { needsMultiQuery: false };
      }
    } catch (error) {
      console.error('[MultiQuery] Error checking multi-query need:', error);
      return { needsMultiQuery: false };
    }
  }
  
  /**
   * Generate a multi-query plan for a complex question
   */
  async generateMultiQueryPlan(question: string): Promise<QueryChain> {
    // Create a new query chain
    const queryChain: QueryChain = {
      id: uuidv4(),
      originalQuestion: question,
      steps: [],
      maxSteps: this.MAX_STEPS,
      currentStep: 0,
      complete: false,
      startTime: Date.now()
    };
    
    try {
      // Get schema information with business context
      const schema = await schemaMetadataService.getSchemaWithBusinessContext();
      
      // Create a prompt to generate a multi-query plan
      const prompt = `
        Create a multi-step query plan to answer this complex question:
        "${question}"
        
        Database Schema:
        ${JSON.stringify(schema, null, 2)}
        
        Please break down the solution into discrete SQL query steps. For each step:
        1. Describe its purpose
        2. Provide the complete SQL query
        3. Explain how this step's results will be used in subsequent steps
        
        Respond with only a JSON array of step objects:
        [
          {
            "id": "step1",
            "purpose": "Brief description of what this step accomplishes",
            "query": "The complete SQL query for this step",
            "dependsOn": [] // Empty for the first step
          },
          {
            "id": "step2",
            "purpose": "Purpose of the second step",
            "query": "SQL query that may use results from step1",
            "dependsOn": ["step1"] // This step depends on step1
          },
          ...
        ]
      `;
      
      // Call the OpenAI API
      const responseText = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are a query planning assistant that breaks down complex questions into multiple SQL query steps. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      
      try {
        const steps: QueryStep[] = JSON.parse(responseText);
        
        if (Array.isArray(steps) && steps.length > 0) {
          // Validate and add each step to the chain
          for (const step of steps.slice(0, this.MAX_STEPS)) {
            queryChain.steps.push({
              id: step.id || `step${queryChain.steps.length + 1}`,
              purpose: step.purpose,
              query: step.query,
              dependsOn: step.dependsOn || []
            });
          }
        } else {
          // Fallback: create a single step
          queryChain.steps.push({
            id: 'step1',
            purpose: 'Answer the complete question',
            query: await this.generateFallbackQuery(question),
            dependsOn: []
          });
        }
      } catch (parseError) {
        console.error('[MultiQuery] Failed to parse steps as JSON:', parseError);
        
        // Fallback: create a single step
        queryChain.steps.push({
          id: 'step1',
          purpose: 'Answer the complete question',
          query: await this.generateFallbackQuery(question),
          dependsOn: []
        });
      }
      
      return queryChain;
    } catch (error) {
      console.error('[MultiQuery] Error generating multi-query plan:', error);
      
      // Fallback: create a single step
      queryChain.steps.push({
        id: 'step1',
        purpose: 'Answer the complete question',
        query: await this.generateFallbackQuery(question),
        dependsOn: []
      });
      
      return queryChain;
    }
  }
  
  /**
   * Generate a fallback query when multi-query generation fails
   */
  private async generateFallbackQuery(question: string): Promise<string> {
    try {
      // Get schema information
      const schema = await schemaMetadataService.getSchema();
      
      // Create a prompt to generate a single query
      const prompt = `
        Generate a single SQL query to answer this question as best as possible:
        "${question}"
        
        Database Schema:
        ${JSON.stringify(schema, null, 2)}
        
        Create the most complete query possible even though this might be better answered with multiple queries.
        Return only the SQL query without explanations.
      `;
      
      // Call the OpenAI API
      const response = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are an SQL query generator. Return only the SQL query without explanations.' },
        { role: 'user', content: prompt }
      ]);
      
      // Clean up the response
      return this.sanitizeQuery(response);
    } catch (error) {
      console.error('[MultiQuery] Error generating fallback query:', error);
      return `SELECT 'Error generating query' AS error`;
    }
  }
  
  /**
   * Execute a multi-query chain
   */
  async executeQueryChain(chain: QueryChain): Promise<QueryChain> {
    try {
      // Mark the chain as in progress
      chain.complete = false;
      
      // Execute steps in order
      for (let i = 0; i < chain.steps.length; i++) {
        const step = chain.steps[i];
        chain.currentStep = i;
        
        console.log(`[MultiQuery] Executing step ${i + 1}/${chain.steps.length}: ${step.id}`);
        
        // Check dependencies
        for (const dependencyId of step.dependsOn) {
          const dependencyStep = chain.steps.find(s => s.id === dependencyId);
          if (!dependencyStep || !dependencyStep.results) {
            throw new Error(`Dependency step ${dependencyId} not found or has no results`);
          }
        }
        
        // If the query contains placeholders for previous results, replace them
        let finalQuery = step.query;
        
        for (const dependencyId of step.dependsOn) {
          const dependencyStep = chain.steps.find(s => s.id === dependencyId);
          if (dependencyStep && dependencyStep.results) {
            // Look for placeholders like {{step1.result[0].column}}
            const placeholderRegex = new RegExp(`{{${dependencyId}\\.result\\[(\\d+)\\]\\.(\\w+)}}`, 'g');
            
            finalQuery = finalQuery.replace(placeholderRegex, (match, resultIndex, columnName) => {
              if (dependencyStep.results && 
                  dependencyStep.results[parseInt(resultIndex)] && 
                  dependencyStep.results[parseInt(resultIndex)][columnName] !== undefined) {
                return JSON.stringify(dependencyStep.results[parseInt(resultIndex)][columnName]);
              }
              return 'NULL';
            });
          }
        }
        
        // Execute the query
        const startTime = Date.now();
        try {
          const results = await sql`${finalQuery}`;
          step.results = Array.isArray(results) ? results : [results];
          step.executionTime = Date.now() - startTime;
        } catch (error: any) {
          step.error = error.message;
          step.executionTime = Date.now() - startTime;
          
          // Stop execution if a step fails
          break;
        }
      }
      
      // Mark the chain as complete
      chain.complete = true;
      chain.endTime = Date.now();
      chain.totalExecutionTime = chain.endTime - chain.startTime;
      
      // Set the final results to the results of the last successful step
      for (let i = chain.steps.length - 1; i >= 0; i--) {
        if (chain.steps[i].results) {
          chain.finalResults = chain.steps[i].results;
          break;
        }
      }
      
      return chain;
    } catch (error: any) {
      console.error('[MultiQuery] Error executing query chain:', error);
      
      chain.complete = true;
      chain.error = error.message;
      chain.endTime = Date.now();
      chain.totalExecutionTime = chain.endTime - chain.startTime;
      
      return chain;
    }
  }
  
  /**
   * Clean up SQL query output from LLM
   */
  private sanitizeQuery(query: string): string {
    // Remove markdown code blocks if present
    let cleanQuery = query.replace(/```sql/g, '').replace(/```/g, '').trim();
    
    // Find the actual SQL query if there's explanation text
    if (cleanQuery.toLowerCase().includes('select ')) {
      const selectIndex = cleanQuery.toLowerCase().indexOf('select ');
      cleanQuery = cleanQuery.substring(selectIndex);
      
      // Find the end of the query
      const endIndex = cleanQuery.lastIndexOf(';');
      if (endIndex !== -1) {
        cleanQuery = cleanQuery.substring(0, endIndex + 1);
      }
    }
    
    return cleanQuery;
  }
}

// Create singleton instance
export const multiQueryEngine = new MultiQueryEngine();