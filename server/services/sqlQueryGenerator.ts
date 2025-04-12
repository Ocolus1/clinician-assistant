/**
 * SQL Query Generator Service
 * 
 * This service generates SQL queries based on user questions using OpenAI.
 * It applies safety checks and validations to prevent SQL injection and other issues.
 */

import { sql } from '../db';
import { openaiService } from './openaiService';
import { schemaProvider } from './schemaProvider';

/**
 * Result of an SQL query
 */
export interface SQLQueryResult {
  query: string;
  data: any[];
  error?: string;
  originalError?: string;
  executionTime?: number;
}

/**
 * Raw SQL query result type used by LangChain
 */
export interface RawSQLResult {
  rows: any[];
  query: string;
  success: boolean;
  error?: string;
  originalError?: string;
  executionTime?: number;
}

/**
 * SQL Query Generator class
 */
export class SQLQueryGenerator {
  /**
   * Generate an SQL query based on a natural language question
   */
  async generateQuery(question: string): Promise<string> {
    try {
      // Get database schema description
      const schemaDescription = schemaProvider.getSchemaDescription();
      
      // Define system prompt with enhanced guidance
      const systemPrompt = `
        You are an SQL expert assistant that generates PostgreSQL queries based on user questions.
        You have access to the following database schema:
        
        ${schemaDescription}
        
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
        7. Use LIMIT 100 by default unless the user specifically requests more or fewer results.
        8. For date comparisons, use proper date functions like EXTRACT() or DATE_TRUNC() as needed.
        9. For text searches, use ILIKE for case-insensitive matching when appropriate.
        10. Always check that referenced tables and columns exist in the provided schema.
        
        ERROR HANDLING:
        1. If you don't have enough information to generate a precise query, provide a query that would return
           relevant data with clear column names and add filters that could easily be adjusted.
        2. If a requested calculation or metric doesn't seem possible with the given schema, provide
           the closest approximation that can be achieved with the available data.
      `;
      
      // Call OpenAI to generate the SQL query
      const generatedQuery = await openaiService.createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ]);
      
      // Format and sanitize the query
      return this.sanitizeQuery(generatedQuery);
    } catch (error) {
      console.error('Error generating SQL query:', error);
      throw new Error('Failed to generate SQL query');
    }
  }
  
  /**
   * Sanitize and validate a generated SQL query
   */
  private sanitizeQuery(query: string): string {
    // Remove any Markdown formatting that might be present
    let sanitized = query.replace(/```sql/gi, '')
                          .replace(/```/g, '')
                          .trim();
    
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
        throw new Error(`SQL mutation operation (${keyword}) is not allowed`);
      }
    }
    
    // Ensure the query is a SELECT statement (improved check)
    const selectPattern = /^\s*SELECT\b/i;
    if (!selectPattern.test(sanitized)) {
      throw new Error('Only SELECT queries are allowed');
    }
    
    // Prevent execution of multiple statements with semicolons
    if (sanitized.indexOf(';') !== sanitized.lastIndexOf(';')) {
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
        throw new Error('Potentially dangerous SQL pattern detected');
      }
    }
    
    // Add a LIMIT if not present to prevent large result sets
    if (!sanitized.toUpperCase().includes('LIMIT')) {
      sanitized = `${sanitized} LIMIT 100`;
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
  async executeQuery(sqlQuery: string): Promise<SQLQueryResult> {
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
      console.log(`SQL query executed in ${executionTime}ms: ${sanitizedQuery.substring(0, 100)}...`);
      
      return {
        query: sanitizedQuery,
        data: result,
        executionTime
      };
    } catch (error: any) {
      console.error('Error executing SQL query:', error);
      const friendlyError = this.formatErrorMessage(error, sanitizedQuery);
      
      return {
        query: sanitizedQuery,
        data: [],
        error: friendlyError,
        originalError: error.message
      };
    }
  }
  
  /**
   * Execute a raw SQL query with safety checks for LangChain integration
   * Returns a format compatible with LangChain tools
   */
  async executeRawQuery(sqlQuery: string): Promise<RawSQLResult> {
    let sanitizedQuery = sqlQuery;
    try {
      // Sanitize the query for safety
      sanitizedQuery = this.sanitizeQuery(sqlQuery);
      
      // Add timing for debugging/monitoring
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
      console.log(`Raw SQL query executed in ${executionTime}ms: ${sanitizedQuery.substring(0, 100)}...`);
      
      return {
        query: sanitizedQuery,
        rows: result,
        success: true,
        executionTime
      };
    } catch (error: any) {
      console.error('Error executing raw SQL query:', error);
      const friendlyError = this.formatErrorMessage(error, sanitizedQuery);
      
      return {
        query: sanitizedQuery,
        rows: [],
        success: false,
        error: friendlyError,
        originalError: error.message
      };
    }
  }
}

// Create a singleton instance
export const sqlQueryGenerator = new SQLQueryGenerator();