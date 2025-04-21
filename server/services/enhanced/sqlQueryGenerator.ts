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
import { schemaProvider } from '../schemaProvider';
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
    options: Partial<QueryGenerationOptions> = {}
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      console.log(`[Enhanced] Generating query for: "${question}"`);
      
      // 1. First, try to match a template
      if (opts.useTemplates) {
        const templateResult = queryTemplateService.processQuestion(question);
        
        if (templateResult.usedTemplate && templateResult.sql) {
          console.log(`[Enhanced] Used template: ${templateResult.templateId}`);
          return templateResult.sql;
        }
      }
      
      // 2. Next, try to create a multi-query chain
      if (opts.useMultiQuery) {
        const queryChain = multiQueryEngine.createChainForQuestion(question);
        
        if (queryChain) {
          // Execute the chain
          const completedChain = await multiQueryEngine.executeQueryChain(queryChain);
          
          if (completedChain.finalResults && completedChain.finalResults.length > 0) {
            // Use the query from the last successful step
            const lastSuccessfulStep = [...completedChain.steps]
              .reverse()
              .find(step => step.results && step.results.length > 0);
              
            if (lastSuccessfulStep) {
              console.log(`[Enhanced] Used multi-query chain: ${completedChain.id}`);
              return lastSuccessfulStep.query;
            }
          }
        }
      }
      
      // 3. Fall back to direct LLM query generation with enhanced context
      // Get technical schema description
      const technicalSchema = schemaProvider.getSchemaDescription();
      
      // Get enhanced business context if enabled
      const businessContext = opts.useBusinessContext 
        ? schemaMetadataService.getDescription()
        : '';
      
      // Define system prompt with enhanced guidance
      const systemPrompt = `
        You are an SQL expert assistant that generates PostgreSQL queries based on user questions.
        
        ${opts.useBusinessContext ? '# BUSINESS CONTEXT\n' + businessContext : ''}
        
        # TECHNICAL SCHEMA
        ${technicalSchema}
        
        CRITICAL SECURITY RULES:
        1. NEVER use DELETE, UPDATE, INSERT, CREATE, ALTER, DROP, GRANT, REVOKE, or any other mutations - ONLY use SELECT statements.
        2. Never use SQL comments (-- or /* */) in your queries.
        3. Never use multiple SQL statements separated by semicolons.
        4. Never include UNION statements unless specifically required to address the user's question.
        
        QUALITY AND FORMAT RULES:
        1. Always use explicit column names instead of * in your queries.
        2. Return ONLY the SQL query, without any explanations, formatting, code blocks, etc.
        3. When querying multiple tables, always use JOINs with proper ON conditions to ensure correct relationships.
        4. Use appropriate WHERE clauses to filter data based on the user's question.
        5. Use table aliases to make the query more readable (e.g., SELECT c.name FROM clients c).
        6. Include ORDER BY when the question implies sorting (like "most", "least", "top", "recent").
        7. For PostgreSQL, always add a LIMIT clause at the very end of your query (after any ORDER BY).
           Format it correctly as: "LIMIT 100" (not "LIMIT 100;" or anything else).

        GUIDANCE FOR CLIENT REFERENCES:
        1. Client identifiers often follow the pattern "Name-123456" or just "Name"
        2. When searching for clients, use this pattern:
           WHERE (c.name LIKE '%ClientName%' OR c.unique_identifier = 'Identifier')

        GUIDANCE FOR DATE HANDLING:
        1. For "this month" use: date_trunc('month', CURRENT_DATE)
        2. For "last month" use: date_trunc('month', CURRENT_DATE - interval '1 month')
        3. For "this year" use: date_trunc('year', CURRENT_DATE)
      `;
      
      // Call OpenAI to generate the SQL query
      const generatedQuery = await openaiService.createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ], {
        temperature: opts.temperature,
        max_tokens: opts.maxTokens
      });
      
      // Format and sanitize the query
      console.log('[Enhanced] Generated raw SQL query:', generatedQuery);
      const sanitizedQuery = this.sanitizeQuery(generatedQuery);
      console.log('[Enhanced] Sanitized SQL query:', sanitizedQuery);
      
      return sanitizedQuery;
    } catch (error) {
      console.error('[Enhanced] Error generating SQL query:', error);
      throw new Error('Failed to generate SQL query');
    }
  }
  
  /**
   * Sanitize and validate a generated SQL query
   */
  private sanitizeQuery(query: string): string {
    console.log("[Enhanced] Original query received:", query);
    
    // Remove any Markdown formatting that might be present
    let sanitized = query.replace(/```sql/gi, '')
                         .replace(/```/g, '')
                         .trim();
                         
    console.log("[Enhanced] After markdown removal:", sanitized);
    
    // Check for empty or clearly invalid queries
    if (!sanitized || sanitized.length < 10) {
      console.error("[Enhanced] Empty or extremely short query detected:", sanitized);
      throw new Error("Query is too short or invalid");
    }
    
    // Remove trailing semicolons which can cause issues
    sanitized = sanitized.replace(/;+\s*$/, '');
    
    // Reject queries with mutation statements (with enhanced detection)
    const mutationKeywords = [
      'DELETE', 'DROP', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 
      'GRANT', 'REVOKE', 'CONNECT', 'COPY', 'VACUUM'
    ];
    
    // More thorough check for mutation statements with word boundary detection
    const mutationRegexes = mutationKeywords.map(keyword => 
      new RegExp(`\\b${keyword}\\b`, 'i')
    );
    
    for (const regex of mutationRegexes) {
      if (regex.test(sanitized)) {
        const keyword = regex.toString().replace(/\\b|\\/g, '');
        console.error(`[Enhanced] SQL mutation operation detected: ${keyword}`);
        throw new Error(`SQL mutation operation (${keyword}) is not allowed`);
      }
    }
    
    // Ensure the query is a SELECT statement (improved check)
    const selectPattern = /^\s*SELECT\b/i;
    if (!selectPattern.test(sanitized)) {
      console.error("[Enhanced] Query doesn't start with SELECT:", sanitized);
      throw new Error('Only SELECT queries are allowed');
    }
    
    // Prevent execution of multiple statements with semicolons
    if (sanitized.indexOf(';') !== sanitized.lastIndexOf(';')) {
      console.error("[Enhanced] Multiple statements detected in:", sanitized);
      throw new Error('Multiple SQL statements are not allowed');
    }
    
    // Check for SQL injection attempts
    const dangerousPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,           // UNION-based injections
      /(\bOR\b\s+\d+\s*=\s*\d+)/i,           // OR 1=1 type injections
      /(--)/,                                // SQL comments
      /(\/\*|\*\/)/                          // Block comments
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        console.error("[Enhanced] Dangerous SQL pattern detected:", pattern, "in query:", sanitized);
        throw new Error('Potentially dangerous SQL pattern detected');
      }
    }
    
    // Add a LIMIT if not present to prevent large result sets
    if (!sanitized.toUpperCase().includes('LIMIT')) {
      sanitized = `${sanitized} LIMIT 100`;
    } else {
      // Fix potential syntax issues with LIMIT clause (ensure PostgreSQL format)
      
      // First check for trailing semicolons anywhere in the query and remove them
      sanitized = sanitized.replace(/;/g, '');
      
      // Check for incorrect LIMIT formats like "LIMIT 10,20" (MySQL style)
      const limitRegex = /\bLIMIT\s+(\d+)(?:\s*,\s*(\d+))?/i;
      if (limitRegex.test(sanitized)) {
        // Convert MySQL style LIMIT clause to PostgreSQL format
        sanitized = sanitized.replace(limitRegex, (match, p1, p2) => {
          if (p2) {
            // Convert MySQL style "LIMIT offset, limit" to PostgreSQL "LIMIT limit OFFSET offset"
            return `LIMIT ${p2} OFFSET ${p1}`;
          }
          return `LIMIT ${p1}`;
        });
      }
      
      // Ensure LIMIT is properly positioned at the end of the query
      // and is correctly formatted for PostgreSQL
      const limitMatch = sanitized.match(/\bLIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
      if (limitMatch) {
        // Extract the LIMIT clause
        const limitClause = limitMatch[0];
        // Extract the base query without the LIMIT clause
        const baseQuery = sanitized.replace(limitClause, '').trim();
        // Rebuild the query with properly formatted LIMIT clause at the end
        sanitized = `${baseQuery} ${limitClause}`;
      }
    }
    
    return sanitized;
  }
  
  /**
   * User-friendly error message for SQL errors
   */
  private formatErrorMessage(error: any, query: string): string {
    if (typeof error === 'string') {
      return error;
    }
    
    // Extract the core message from PostgreSQL errors which can be verbose
    let errorMessage = error.message || 'Failed to execute SQL query';
    
    // Check for common error types
    if (errorMessage.includes('does not exist')) {
      if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        const matches = errorMessage.match(/relation\s+"([^"]+)"/);
        const tableName = matches ? matches[1] : 'specified table';
        return `The table '${tableName}' does not exist in the database.`;
      }
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        const matches = errorMessage.match(/column\s+"([^"]+)"/);
        const columnName = matches ? matches[1] : 'specified column';
        return `The column '${columnName}' does not exist in the database.`;
      }
    }
    
    // Syntax errors
    if (errorMessage.includes('syntax error')) {
      // Check for specific PostgreSQL syntax issues with LIMIT
      if (errorMessage.includes('syntax error at or near "LIMIT"')) {
        console.log('[Enhanced] Detected PostgreSQL LIMIT syntax error, will attempt to fix in future queries');
        return `SQL syntax error with LIMIT clause. I'll try to correct the format in future queries.`;
      }
      return `SQL syntax error in the query. Please rephrase your question.`;
    }
    
    // Type conversion errors
    if (errorMessage.includes('invalid input syntax') || errorMessage.includes('cannot cast')) {
      return `Data type mismatch in the query. Please be more specific about data types.`;
    }
    
    // Connection errors
    if (errorMessage.includes('connection') && errorMessage.includes('closed')) {
      return `Database connection error. Please try again in a moment.`;
    }
    
    // Timeout errors
    if (errorMessage.includes('timeout')) {
      return `The query took too long to execute. Try simplifying your question.`;
    }
    
    // Format other errors in a user-friendly way
    return `Error executing query: ${errorMessage.split('\n')[0]}`;
  }
  
  /**
   * Execute an SQL query with safeguards
   */
  async executeQuery(
    sqlQuery: string, 
    options: Partial<QueryGenerationOptions> = {}
  ): Promise<SQLQueryResult> {
    let sanitizedQuery = sqlQuery;
    try {
      // Sanitize the query one more time
      sanitizedQuery = this.sanitizeQuery(sqlQuery);
      
      // Add timing for debugging/monitoring (can help identify slow queries)
      const startTime = Date.now();
      
      // Execute the query with a timeout safety
      const queryPromise = sql.unsafe(sanitizedQuery);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout - exceeded 10 seconds')), 10000);
      });
      
      // Race between query and timeout
      const result = await Promise.race([queryPromise, timeoutPromise]) as any[];
      const executionTime = Date.now() - startTime;
      
      // Log execution time for monitoring
      console.log(`[Enhanced] SQL query executed in ${executionTime}ms: ${sanitizedQuery.substring(0, 100)}...`);
      
      return {
        query: sanitizedQuery,
        data: result,
        executionTime,
        fromTemplate: options.useTemplates || false,
        fromMultiQuery: options.useMultiQuery || false,
        usedBusinessContext: options.useBusinessContext || false
      };
    } catch (error: any) {
      console.error('[Enhanced] Error executing SQL query:', error);
      const friendlyError = this.formatErrorMessage(error, sanitizedQuery);
      
      return {
        query: sanitizedQuery,
        data: [],
        error: friendlyError,
        originalError: error.message,
        fromTemplate: options.useTemplates || false,
        fromMultiQuery: options.useMultiQuery || false,
        usedBusinessContext: options.useBusinessContext || false
      };
    }
  }
}

// Create singleton instance
export const enhancedSQLQueryGenerator = new EnhancedSQLQueryGenerator();