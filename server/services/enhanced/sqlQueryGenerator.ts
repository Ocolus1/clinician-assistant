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
import { schemaProvider } from '../schemaProvider';
import { sql } from '../../db';
import { schemaMetadataService } from './schemaMetadata';
import { queryTemplateService } from './queryTemplates';
import { multiQueryEngine } from './multiQueryEngine';

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
    temperature: 0.2
  };
  
  /**
   * Generate an SQL query based on a natural language question
   */
  async generateQuery(
    question: string,
    options: QueryGenerationOptions = {}
  ): Promise<string> {
    // Merge options with defaults
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // Step 1: Try to use templates if enabled
      if (mergedOptions.useTemplates) {
        const templateResult = await queryTemplateService.processQuestion(question);
        
        if (templateResult.matched && templateResult.generatedQuery) {
          console.log('[Enhanced] Using template for query generation');
          return templateResult.generatedQuery;
        }
      }
      
      // Step 2: Try to use multi-query patterns if enabled
      if (mergedOptions.useMultiQuery) {
        const multiQueryChain = multiQueryEngine.createChainForQuestion(question);
        
        if (multiQueryChain) {
          console.log('[Enhanced] Using multi-query pattern for query generation');
          // For multi-query, just return the first step's query as a preview
          const firstStep = multiQueryChain.steps[0];
          return firstStep.query;
        }
      }
      
      // Step 3: Fall back to direct LLM query generation
      console.log('[Enhanced] Using direct LLM generation for query');
      
      // Get schema information for context
      let schemaInfo = schemaProvider.getSchemaDescription();
      
      // Add business context if enabled
      if (mergedOptions.useBusinessContext) {
        schemaInfo = `${schemaInfo}\n\n${schemaMetadataService.getDescription()}`;
      }
      
      // Prepare the prompt for query generation
      const prompt = `
        Generate a PostgreSQL query to answer the following question:
        "${question}"
        
        Database schema information:
        ${schemaInfo}
        
        Requirements:
        1. Return only the SQL query without explanations or markdown formatting
        2. Ensure the query is valid PostgreSQL syntax
        3. Include proper JOINs when querying related tables
        4. Use aliases for table names to make the query more readable
        5. Apply sensible LIMIT clauses for queries that could return many rows
        6. When dealing with dates, ensure proper formatting and date functions
        
        The output query should be focused on answering the specific question asked.
      `;
      
      // Generate the SQL query using OpenAI
      const response = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are an expert SQL query generator for PostgreSQL. Generate only valid SQL queries without explanations or markdown formatting.' },
        { role: 'user', content: prompt }
      ]);
      
      // Extract the SQL query from the response
      const query = this.sanitizeQuery(response);
      return query;
    } catch (error: any) {
      console.error('[Enhanced] Error generating SQL query:', error);
      throw new Error(`Failed to generate SQL query: ${error.message}`);
    }
  }
  
  /**
   * Sanitize and validate a generated SQL query
   */
  private sanitizeQuery(query: string): string {
    // Remove any markdown code block formatting
    let sanitized = query.replace(/```sql|```/g, '').trim();
    
    // Ensure the query ends with a semicolon
    if (!sanitized.endsWith(';')) {
      sanitized += ';';
    }
    
    // Check if this is a multi-line comment or has hidden content
    if (sanitized.includes('/*') && sanitized.includes('*/')) {
      sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    }
    
    // Remove any single-line comments
    sanitized = sanitized.replace(/--.*$/gm, '').trim();
    
    // Validate that this is a SELECT query (for safety)
    const firstWord = sanitized.split(' ')[0].toUpperCase();
    if (firstWord !== 'SELECT' && firstWord !== 'WITH') {
      throw new Error('Only SELECT queries are allowed');
    }
    
    // Check for dangerous commands
    const dangerousPatterns = [
      /\bDROP\b/i,
      /\bDELETE\b/i,
      /\bTRUNCATE\b/i,
      /\bALTER\b/i,
      /\bCREATE\b/i,
      /\bINSERT\b/i,
      /\bUPDATE\b/i,
      /\bGRANT\b/i,
      /\bREVOKE\b/i,
      /\bCOPY\b/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Query contains potentially dangerous operations');
      }
    }
    
    return sanitized;
  }
  
  /**
   * User-friendly error message for SQL errors
   */
  private formatErrorMessage(error: any, query: string): string {
    const errorMessage = error.message || String(error);
    
    // Check for common SQL errors
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      const match = errorMessage.match(/relation "(.*?)" does not exist/);
      if (match && match[1]) {
        return `The table "${match[1]}" referenced in the query does not exist in the database.`;
      }
      return 'One of the tables referenced in the query does not exist.';
    } else if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      const match = errorMessage.match(/column "(.*?)" does not exist/);
      if (match && match[1]) {
        return `The column "${match[1]}" referenced in the query does not exist in the database.`;
      }
      return 'One of the columns referenced in the query does not exist.';
    } else if (errorMessage.includes('syntax error')) {
      return 'There is a syntax error in the SQL query. The query structure may be incorrect.';
    }
    
    // Default error message
    return `Error executing SQL query: ${errorMessage}`;
  }
  
  /**
   * Execute an SQL query with safeguards
   */
  async executeQuery(
    query: string,
    options: QueryGenerationOptions = {}
  ): Promise<SQLQueryResult> {
    const startTime = Date.now();
    
    try {
      // First, check if this query matches a template
      const templateResult = options.useTemplates 
        ? await queryTemplateService.processQuestion(query)
        : { matched: false };
      
      let fromTemplate = false;
      let fromMultiQuery = false;
      let usedBusinessContext = !!options.useBusinessContext;
      let sqlQuery = query;
      
      // If it matches a template, use the template-generated query
      if (templateResult.matched && templateResult.generatedQuery) {
        sqlQuery = templateResult.generatedQuery;
        fromTemplate = true;
      } 
      // Or check for multi-query patterns
      else if (options.useMultiQuery) {
        const multiQueryChain = multiQueryEngine.createChainForQuestion(query);
        
        if (multiQueryChain) {
          // Execute the full chain
          const executedChain = await multiQueryEngine.executeQueryChain(multiQueryChain);
          
          // If chain executed successfully and has final results
          if (executedChain.finalResults) {
            // Return the results from the final step
            return {
              query: executedChain.steps.map(step => step.query).join('\n\n'),
              data: executedChain.finalResults,
              executionTime: executedChain.totalExecutionTime,
              fromTemplate: false,
              fromMultiQuery: true,
              usedBusinessContext
            };
          } 
          // If chain failed
          else if (executedChain.error) {
            return {
              query: executedChain.steps.map(step => step.query).join('\n\n'),
              data: [],
              error: executedChain.error,
              executionTime: executedChain.totalExecutionTime,
              fromTemplate: false,
              fromMultiQuery: true,
              usedBusinessContext
            };
          }
        }
      }
      
      // Sanitize the query for safety
      const sanitizedQuery = this.sanitizeQuery(sqlQuery);
      
      // Execute the query
      const result = await sql`${sanitizedQuery}`;
      const executionTime = Date.now() - startTime;
      
      return {
        query: sanitizedQuery,
        data: result,
        executionTime,
        fromTemplate,
        fromMultiQuery,
        usedBusinessContext
      };
    } catch (error: any) {
      console.error('[Enhanced] Error executing SQL query:', error);
      
      return {
        query,
        data: [],
        error: this.formatErrorMessage(error, query),
        originalError: error.message,
        executionTime: Date.now() - startTime,
        fromTemplate: false,
        fromMultiQuery: false,
        usedBusinessContext: !!options.useBusinessContext
      };
    }
  }
}

// Create singleton instance
export const enhancedSQLQueryGenerator = new EnhancedSQLQueryGenerator();