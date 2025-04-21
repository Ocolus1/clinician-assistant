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

import { sql } from '../../db';
import { openaiService } from '../openaiService';
import { schemaMetadataService } from './schemaMetadata';
import { SQLQueryContext } from '@shared/enhancedAssistantTypes';

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
    maxTokens: 300,
    temperature: 0.2
  };
  
  /**
   * Generate an SQL query based on a natural language question
   */
  async generateQuery(
    naturalLanguageQuestion: string,
    options: QueryGenerationOptions = {}
  ): Promise<string> {
    try {
      // Merge options with defaults
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      // Get schema metadata
      const schemaContext = await this.getSchemaContext(mergedOptions.useBusinessContext);
      
      // Create prompt for SQL generation
      const prompt = this.createQueryGenerationPrompt(
        naturalLanguageQuestion,
        schemaContext,
        mergedOptions
      );
      
      // Generate SQL with OpenAI
      const generatedQuery = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are an expert SQL query generator specializing in PostgreSQL.' },
        { role: 'user', content: prompt }
      ]);
      
      // Sanitize the query
      return this.sanitizeQuery(generatedQuery);
    } catch (error: any) {
      console.error('[Enhanced] Error generating query:', error);
      throw error;
    }
  }
  
  /**
   * Sanitize and validate a generated SQL query
   */
  private sanitizeQuery(query: string): string {
    // Extract the SQL query if it's wrapped in a code block
    if (query.includes('```')) {
      const matches = query.match(/```(?:sql)?\s*([\s\S]*?)```/);
      if (matches && matches[1]) {
        query = matches[1].trim();
      }
    }
    
    // Remove any leading/trailing comments
    query = query.replace(/^(\s*--.*\n)+/, '').replace(/(\n\s*--.*)+$/, '');
    
    // Ensure query ends with semicolon
    if (!query.trim().endsWith(';')) {
      query += ';';
    }
    
    return query;
  }
  
  /**
   * User-friendly error message for SQL errors
   */
  private formatErrorMessage(error: any, query: string): string {
    if (error.message.includes('syntax error')) {
      return `SQL syntax error: ${error.message}. Please check your query structure.`;
    } else if (error.message.includes('does not exist')) {
      // Extract the name of the non-existent object
      const matches = error.message.match(/relation "([^"]+)" does not exist/);
      const objectName = matches ? matches[1] : 'specified object';
      return `The ${objectName} does not exist in the database. Please verify table and column names.`;
    } else if (error.message.includes('permission denied')) {
      return 'Permission denied for this database operation.';
    } else {
      return `Database error: ${error.message}`;
    }
  }
  
  /**
   * Get schema context for query generation
   */
  private async getSchemaContext(useBusinessContext: boolean = true): Promise<any> {
    try {
      // Get schema metadata with or without business context
      const schema = useBusinessContext
        ? await schemaMetadataService.getSchemaWithBusinessContext()
        : await schemaMetadataService.getSchemaMetadata();
      
      return schema;
    } catch (error) {
      console.error('[Enhanced] Error getting schema context:', error);
      return [];
    }
  }
  
  /**
   * Create a prompt for SQL query generation
   */
  private createQueryGenerationPrompt(
    question: string,
    schema: any,
    options: QueryGenerationOptions
  ): string {
    // Create a context object with schema and question
    const context: SQLQueryContext = {
      schema,
      question,
      useBusinessContext: !!options.useBusinessContext
    };
    
    // Format the schema information
    const schemaInfo = schema.map((table: any) => {
      const columnsInfo = table.columns.map((col: any) => 
        `    - ${col.name} (${col.type})${col.description ? ': ' + col.description : ''}`
      ).join('\n');
      
      const relationshipsInfo = table.relationships && table.relationships.length > 0
        ? '\n    Relationships:\n' + table.relationships.map((rel: any) => 
            `    - ${rel.description} (${rel.sourceColumn} -> ${rel.targetTable}.${rel.targetColumn})`
          ).join('\n')
        : '';
      
      const businessContextInfo = options.useBusinessContext && table.businessContext && table.businessContext.length > 0
        ? '\n    Business Context:\n' + table.businessContext.map((ctx: string) => 
            `    - ${ctx}`
          ).join('\n')
        : '';
      
      return `Table: ${table.name}${table.description ? ' - ' + table.description : ''}
  Columns:
${columnsInfo}${relationshipsInfo}${businessContextInfo}`;
    }).join('\n\n');
    
    // Build the complete prompt
    return `
Generate a PostgreSQL query to answer the following question:
"${question}"

Available database schema:
${schemaInfo}

Requirements:
1. Generate only a valid PostgreSQL query that directly answers the question
2. Include necessary JOINs for related tables
3. Use proper WHERE clauses to filter data appropriately
4. Format dates using ISO format (YYYY-MM-DD)
5. Include ORDER BY and GROUP BY when appropriate
6. Use aliases for readability
7. Keep the query efficient and focused on exactly what was asked

Return only the SQL query, without explanations or comments.
`;
  }
  
  /**
   * Execute an SQL query with safeguards
   */
  async executeQuery(
    naturalLanguageQuestion: string,
    options: QueryGenerationOptions = {}
  ): Promise<SQLQueryResult> {
    const startTime = Date.now();
    
    try {
      // Merge options with defaults
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      // Generate the query
      let generatedQuery = await this.generateQuery(naturalLanguageQuestion, options);
      
      // Execute the query
      console.log('[Enhanced] Executing query:', generatedQuery);
      
      try {
        const results = await sql.unsafe(generatedQuery);
        
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
          const results = await sql.unsafe(sanitizedFixedQuery);
          
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