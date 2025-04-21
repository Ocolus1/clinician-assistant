/**
 * Enhanced SQL Query Generator
 * 
 * This service generates SQL queries from natural language questions using a multi-step approach:
 * 1. Check for template matches first
 * 2. If no template matches, check for multi-query chain patterns
 * 3. If neither matches, fall back to direct LLM query generation
 * 
 * The enhanced generator uses business context and domain knowledge to improve accuracy.
 */

import { openaiService } from '../openaiService';
import { schemaMetadataService } from './schemaMetadata';
import { queryTemplateService } from './queryTemplates';
import { multiQueryEngine } from './multiQueryEngine';
import { sql } from '../../db';

/**
 * Result of an SQL query
 */
export interface SQLQueryResult {
  query: string;
  data: any[];
  error?: string;
  originalError?: string;
  executionTime?: number;
  fromTemplate?: boolean;
  fromMultiQuery?: boolean;
  usedBusinessContext?: boolean;
}

/**
 * Enhanced query generation options
 */
export interface QueryGenerationOptions {
  useTemplates?: boolean;
  useMultiQuery?: boolean;
  useBusinessContext?: boolean;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Enhanced SQL Query Generator class
 */
export class EnhancedSQLQueryGenerator {
  private defaultOptions: QueryGenerationOptions = {
    useTemplates: true,
    useMultiQuery: true,
    useBusinessContext: true,
    maxTokens: 1000,
    temperature: 0.1
  };
  
  /**
   * Generate an SQL query based on a natural language question
   */
  async generateQuery(
    naturalLanguageQuestion: string,
    options: QueryGenerationOptions = {}
  ): Promise<string> {
    // Merge provided options with defaults
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // Step 1: Check if this matches a template
      if (mergedOptions.useTemplates) {
        const templateResult = await queryTemplateService.processQuestion(naturalLanguageQuestion);
        
        if (templateResult.matched && templateResult.query) {
          console.log('[Enhanced] Using template-based query:', templateResult.query);
          return templateResult.query;
        }
      }
      
      // Step 2: Check if this requires a multi-query approach
      if (mergedOptions.useMultiQuery) {
        const multiQueryCheck = await multiQueryEngine.checkIfMultiQueryNeeded(naturalLanguageQuestion);
        
        if (multiQueryCheck.needsMultiQuery) {
          console.log('[Enhanced] Multi-query approach needed');
          const multiQuery = await multiQueryEngine.generateMultiQueryPlan(naturalLanguageQuestion);
          
          if (multiQuery && multiQuery.steps.length > 0) {
            console.log('[Enhanced] Executing multi-query plan');
            
            // Execute the first step of the multi-query plan
            const firstStep = multiQuery.steps[0]; 
            return firstStep.query;
          }
        }
      }
      
      // Step 3: Use direct LLM query generation with schema context
      console.log('[Enhanced] Using direct LLM query generation');
      
      // Get schema metadata
      const schemaMetadata = mergedOptions.useBusinessContext 
        ? await schemaMetadataService.getSchemaWithBusinessContext()
        : await schemaMetadataService.getSchema();
      
      // Format the prompt
      const prompt = `
        Generate a single SQL query to answer the following question:
        "${naturalLanguageQuestion}"
        
        Database Schema:
        ${JSON.stringify(schemaMetadata, null, 2)}
        
        Requirements:
        1. Use only tables and columns from the provided schema
        2. Generate a single, complete SQL query with proper JOIN syntax
        3. Use explicit column names (never use SELECT *)
        4. Include appropriate WHERE clauses to filter results
        5. Do not use LIMIT unless specifically asked
        6. Ensure SQL is compatible with PostgreSQL
        7. Add comments to explain complex parts of the query
        8. Handle date/time comparisons properly
        9. Return only the SQL query, no explanation or other text
      `;
      
      // Generate the query
      const response = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are an SQL expert that generates accurate PostgreSQL queries to answer natural language questions.' },
        { role: 'user', content: prompt }
      ]);
      
      // Extract and clean the SQL query
      return this.sanitizeQuery(response);
    } catch (error: any) {
      console.error('[Enhanced] Error generating SQL query:', error);
      throw new Error(`Failed to generate SQL: ${error.message}`);
    }
  }
  
  /**
   * Sanitize and validate a generated SQL query
   */
  private sanitizeQuery(query: string): string {
    // Remove markdown code blocks if present
    let cleanQuery = query.replace(/```sql/g, '').replace(/```/g, '').trim();
    
    // Remove any explanatory text before or after the query
    if (cleanQuery.toLowerCase().includes('select ')) {
      const selectIndex = cleanQuery.toLowerCase().indexOf('select ');
      cleanQuery = cleanQuery.substring(selectIndex);
      
      // Find the end of the query (usually ends with a semicolon)
      const endIndex = cleanQuery.lastIndexOf(';');
      if (endIndex !== -1) {
        cleanQuery = cleanQuery.substring(0, endIndex + 1);
      }
    }
    
    // Make sure we have a valid SQL query
    if (!cleanQuery.toLowerCase().includes('select ')) {
      throw new Error('Generated text does not contain a valid SQL query');
    }
    
    return cleanQuery;
  }
  
  /**
   * User-friendly error message for SQL errors
   */
  private formatErrorMessage(error: any, query: string): string {
    if (!error) return 'Unknown error';
    
    const errorMessage = error.message || error.toString();
    
    // Common SQL error patterns
    if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      return 'The query references a column that does not exist in the database schema.';
    } else if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return 'The query references a table that does not exist in the database schema.';
    } else if (errorMessage.includes('syntax error')) {
      return 'There is a syntax error in the generated SQL query.';
    } else if (errorMessage.includes('permission denied')) {
      return 'The database user does not have permission to execute this query.';
    }
    
    // Default error message
    return `Database error: ${errorMessage}`;
  }
  
  /**
   * Execute an SQL query with safeguards
   */
  async executeQuery(
    naturalLanguageQuestion: string,
    options: QueryGenerationOptions = {}
  ): Promise<SQLQueryResult> {
    const startTime = Date.now();
    let generatedQuery: string;
    
    try {
      // Try to generate a query from templates first, if enabled
      if (options.useTemplates) {
        const templateResult = await queryTemplateService.processQuestion(naturalLanguageQuestion);
        
        if (templateResult.matched && templateResult.query) {
          generatedQuery = templateResult.query;
          
          // Execute the query
          try {
            console.log('[Enhanced] Executing template query:', generatedQuery);
            const results = await sql`${generatedQuery}`; 
            
            return {
              query: generatedQuery,
              data: Array.isArray(results) ? results : [results],
              executionTime: Date.now() - startTime,
              fromTemplate: true,
              usedBusinessContext: options.useBusinessContext
            };
          } catch (error: any) {
            console.error('[Enhanced] Error executing template query:', error);
            
            // Generate a fallback query
            generatedQuery = await this.generateQuery(naturalLanguageQuestion, options);
          }
        } else {
          generatedQuery = await this.generateQuery(naturalLanguageQuestion, options);
        }
      } else {
        generatedQuery = await this.generateQuery(naturalLanguageQuestion, options);
      }
      
      // Execute the query
      console.log('[Enhanced] Executing query:', generatedQuery);
      
      try {
        const results = await db.unsafe(generatedQuery);
        
        return {
          query: generatedQuery,
          data: Array.isArray(results) ? results : [results],
          executionTime: Date.now() - startTime,
          fromTemplate: false,
          fromMultiQuery: false,
          usedBusinessContext: options.useBusinessContext
        };
      } catch (dbError: any) {
        console.error('[Enhanced] Database error:', dbError);
        
        // Try to generate a safer query as a fallback
        console.log('[Enhanced] Attempting to generate a safer query...');
        
        const fallbackPrompt = `
          The following query failed with error: "${dbError.message}"
          
          Query: ${generatedQuery}
          
          Please fix the SQL query to avoid this error. The fixed query should:
          1. Correct any syntax errors
          2. Only use tables and columns that exist in the schema
          3. Handle NULL values safely
          4. Address the specific error mentioned
          
          Return only the fixed SQL query with no explanations.
        `;
        
        try {
          const fixedQuery = await openaiService.createChatCompletion([
            { role: 'system', content: 'You are an SQL expert that fixes problematic PostgreSQL queries.' },
            { role: 'user', content: fallbackPrompt }
          ]);
          
          const sanitizedFixedQuery = this.sanitizeQuery(fixedQuery);
          console.log('[Enhanced] Executing fixed query:', sanitizedFixedQuery);
          
          // Try the fixed query
          const results = await db.unsafe(sanitizedFixedQuery);
          
          return {
            query: sanitizedFixedQuery,
            data: Array.isArray(results) ? results : [results],
            executionTime: Date.now() - startTime,
            fromTemplate: false,
            fromMultiQuery: false,
            usedBusinessContext: options.useBusinessContext
          };
        } catch (fallbackError: any) {
          console.error('[Enhanced] Fallback query also failed:', fallbackError);
          
          return {
            query: generatedQuery,
            data: [],
            error: this.formatErrorMessage(dbError, generatedQuery),
            originalError: dbError.message,
            executionTime: Date.now() - startTime,
            fromTemplate: false,
            fromMultiQuery: false,
            usedBusinessContext: options.useBusinessContext
          };
        }
      }
    } catch (error: any) {
      console.error('[Enhanced] Error in query generation/execution:', error);
      
      return {
        query: error.query || '',
        data: [],
        error: `Failed to generate or execute query: ${error.message}`,
        executionTime: Date.now() - startTime,
        fromTemplate: false,
        fromMultiQuery: false,
        usedBusinessContext: options.useBusinessContext
      };
    }
  }
}

// Create singleton instance
export const enhancedSQLQueryGenerator = new EnhancedSQLQueryGenerator();