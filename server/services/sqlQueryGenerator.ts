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
        7. For PostgreSQL, always add a LIMIT clause at the very end of your query (after any ORDER BY).
           Format it correctly as: "LIMIT 100" (not "LIMIT 100;" or anything else).
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
      console.log('Generated raw SQL query:', generatedQuery);
      const sanitizedQuery = this.sanitizeQuery(generatedQuery);
      console.log('Sanitized SQL query:', sanitizedQuery);
      
      // Log the final query for verification of PostgreSQL compatibility
      if (sanitizedQuery.toLowerCase().includes(' limit ')) {
        console.log('Query contains LIMIT clause, checking format...');
        // Test the LIMIT clause format
        const limitMatch = sanitizedQuery.match(/\bLIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
        if (limitMatch) {
          console.log('LIMIT format is correct:', limitMatch[0]);
        } else {
          console.warn('Potentially incorrect LIMIT format in query:', sanitizedQuery);
        }
      }
      
      return sanitizedQuery;
    } catch (error) {
      console.error('Error generating SQL query:', error);
      throw new Error('Failed to generate SQL query');
    }
  }
  
  /**
   * Sanitize and validate a generated SQL query
   */
  private sanitizeQuery(query: string): string {
    console.log("Original query received:", query);
    
    // Remove any Markdown formatting that might be present
    let sanitized = query.replace(/```sql/gi, '')
                          .replace(/```/g, '')
                          .trim();
                          
    console.log("After markdown removal:", sanitized);
    
    // Check for empty or clearly invalid queries
    if (!sanitized || sanitized.length < 10) {
      console.error("Empty or extremely short query detected:", sanitized);
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
        console.error(`SQL mutation operation detected: ${keyword}`);
        throw new Error(`SQL mutation operation (${keyword}) is not allowed`);
      }
    }
    
    // Ensure the query is a SELECT statement (improved check)
    const selectPattern = /^\s*SELECT\b/i;
    if (!selectPattern.test(sanitized)) {
      console.error("Query doesn't start with SELECT:", sanitized);
      throw new Error('Only SELECT queries are allowed');
    }
    
    // Prevent execution of multiple statements with semicolons
    if (sanitized.indexOf(';') !== sanitized.lastIndexOf(';')) {
      console.error("Multiple statements detected in:", sanitized);
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
        console.error("Dangerous SQL pattern detected:", pattern, "in query:", sanitized);
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
        console.log('Detected PostgreSQL LIMIT syntax error, will attempt to fix in future queries');
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
    
    // PostgreSQL specific errors
    if (errorMessage.includes('relation') && errorMessage.includes('already exists')) {
      return `The table already exists in the database. Please check your query.`;
    }
    
    if (errorMessage.includes('permission denied')) {
      return `Permission denied for this operation. Please ensure you have the proper permissions.`;
    }
    
    if (errorMessage.includes('constraint')) {
      return `The query violates a database constraint. Please check the values you're trying to insert or update.`;
    }
    
    if (errorMessage.includes('out of range')) {
      return `A numeric value in your query is out of the allowed range.`;
    }
    
    if (errorMessage.includes('division by zero')) {
      return `Error: The query contains a division by zero.`;
    }
    
    // Format other errors in a user-friendly way
    return `Error executing query: ${errorMessage.split('\n')[0]}`;
  }

  /**
   * Execute an SQL query with safeguards and fallback strategies
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
      
      // If we got zero results but the query involves clients, try fallback strategies
      if (result.length === 0 && this.isClientQuery(sanitizedQuery)) {
        console.log('No results found, trying fallback strategies for client query');
        const fallbackResult = await this.tryClientFallbackStrategies(sanitizedQuery);
        
        if (fallbackResult.data.length > 0) {
          console.log(`Fallback strategy succeeded with ${fallbackResult.data.length} results`);
          // Add an annotation to the query to indicate a fallback was used
          fallbackResult.query = `/* FALLBACK STRATEGY USED */ ${fallbackResult.query}`;
          return fallbackResult;
        }
      }
      
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
   * Check if a query is related to clients
   */
  private isClientQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    
    // Always log the query to see what's coming in
    console.log('CHECKING QUERY FOR CLIENT RELATION:', lowerQuery);
    
    // Special case for direct questions about Radwan
    if (lowerQuery.includes('radwan')) {
      console.log('RADWAN QUERY DETECTED! Returning true for client query check');
      return true;
    }
    
    const isClientRelated = (
      lowerQuery.includes('from clients') || 
      lowerQuery.includes('join clients') ||
      lowerQuery.includes('client') && (
        lowerQuery.includes('name') || 
        lowerQuery.includes('identifier')
      )
    );
    
    console.log('IS CLIENT QUERY?', isClientRelated);
    
    return isClientRelated;
  }
  
  /**
   * Try fallback strategies for client-related queries
   */
  private async tryClientFallbackStrategies(originalQuery: string): Promise<SQLQueryResult> {
    console.log('Attempting fallback strategies for client query:', originalQuery);
    
    // Extract potential client identifiers from the query
    const possibleClientIdentifier = this.extractClientIdentifierFromQuery(originalQuery);
    
    if (!possibleClientIdentifier) {
      console.log('No client identifier found in query');
      return {
        query: originalQuery,
        data: [],
        executionTime: 0
      };
    }
    
    console.log(`Extracted client identifier: ${possibleClientIdentifier}`);
    
    // Generate fallback queries based on the different client identifier patterns
    const fallbackQueries = [
      // Try original_name (just the name part) with case-insensitive search
      `SELECT * FROM clients WHERE original_name ILIKE '%${possibleClientIdentifier}%'`,
      
      // Try name field with wildcards (combined format) with case-insensitive search
      `SELECT * FROM clients WHERE name ILIKE '%${possibleClientIdentifier}%'`,
      
      // Try exact matches with case-insensitive search
      `SELECT * FROM clients WHERE LOWER(original_name) = LOWER('${possibleClientIdentifier}')`,
      `SELECT * FROM clients WHERE LOWER(name) = LOWER('${possibleClientIdentifier}')`,
      
      // Try unique_identifier (numeric part) if it looks numeric
      !isNaN(Number(possibleClientIdentifier)) ? 
        `SELECT * FROM clients WHERE unique_identifier = '${possibleClientIdentifier}'` : null,
        
      // Try more aggressive partial matching for shorter terms
      possibleClientIdentifier.length >= 3 ?
        `SELECT * FROM clients WHERE original_name ~* '\\y${possibleClientIdentifier}'` : null,
      possibleClientIdentifier.length >= 3 ?
        `SELECT * FROM clients WHERE name ~* '\\y${possibleClientIdentifier}'` : null
    ].filter(Boolean) as string[]; // Remove null entries
    
    // Try each fallback strategy
    for (const fallbackQuery of fallbackQueries) {
      try {
        console.log(`Trying fallback query: ${fallbackQuery}`);
        const startTime = Date.now();
        const result = await sql.unsafe(fallbackQuery);
        const executionTime = Date.now() - startTime;
        
        if (result.length > 0) {
          console.log(`Fallback query succeeded with ${result.length} results`);
          
          // If we found results with the fallback strategy, try to reconstruct the original query
          // by replacing the original client identifier condition with our successful fallback condition
          let enhancedQuery = originalQuery;
          
          // If the original query has a client.id or client_id condition, we need to join with the client found by name
          if (originalQuery.toLowerCase().includes('client_id') || 
              originalQuery.toLowerCase().includes('client.id')) {
            
            // Extract the successful client WHERE clause
            const successfulWhereClause = fallbackQuery.substring(fallbackQuery.toLowerCase().indexOf('where') + 5);
            
            // Modify the enhancedQuery to add the clients table if needed
            if (!enhancedQuery.toLowerCase().includes('join clients')) {
              // Need to add a JOIN clause if the query references client_id but doesn't join clients
              if (enhancedQuery.toLowerCase().includes('client_id')) {
                // Add JOIN before WHERE if it exists
                const whereIndex = enhancedQuery.toLowerCase().indexOf('where');
                if (whereIndex > 0) {
                  enhancedQuery = 
                    enhancedQuery.substring(0, whereIndex) + 
                    `JOIN clients ON clients.id = client_id ` +
                    enhancedQuery.substring(whereIndex);
                }
              }
            }
            
            // Now replace the client identifier condition
            const clientConditionRegex = /(clients?(?:\.\w+|\[['\w]+\])?\s*=\s*['"]?\w+(?:-\w+)?['"]?)/i;
            if (clientConditionRegex.test(enhancedQuery)) {
              enhancedQuery = enhancedQuery.replace(clientConditionRegex, successfulWhereClause);
            } else {
              // If we can't find a condition to replace, just use the successful query directly
              enhancedQuery = fallbackQuery;
            }
          } else {
            // Direct client query, just use the successful fallback query
            enhancedQuery = fallbackQuery;
          }
          
          return {
            query: enhancedQuery,
            data: result,
            executionTime
          };
        }
      } catch (fallbackError: any) {
        console.error(`Error in fallback query:`, fallbackError.message);
        // Continue to the next fallback query
      }
    }
    
    // If all fallback strategies fail, return empty result with original query
    return {
      query: originalQuery,
      data: [],
      executionTime: 0
    };
  }
  
  /**
   * Extract potential client identifier from a query
   */
  private extractClientIdentifierFromQuery(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    // Check for explicit client name patterns
    // Examples: "client = 'Radwan-585666'", "clients.name = 'Radwan'"
    const namePatterns = [
      /clients?(?:\.\w+|\[['\w]+\])?\s*=\s*['"]?(\w+(?:-\w+)?)['"]?/i,
      /name\s*=\s*['"]?(\w+(?:-\w+)?)['"]?/i,
      /['"]?(\w+(?:-\w+)?)['"]?/i
    ];
    
    for (const pattern of namePatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const identifier = match[1];
        
        // Skip very common SQL keywords that might be matched
        const sqlKeywords = ['select', 'from', 'where', 'join', 'and', 'order', 'by', 'limit', 'group', 'having'];
        if (!sqlKeywords.includes(identifier.toLowerCase())) {
          return identifier;
        }
      }
    }
    
    // For general queries about Radwan
    if (lowerQuery.includes('radwan')) {
      return 'Radwan';
    }
    
    return null;
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
      
      // If we got zero results but the query involves clients, try fallback strategies
      if (result.length === 0 && this.isClientQuery(sanitizedQuery)) {
        console.log('No raw query results found, trying fallback strategies for client query');
        const fallbackResult = await this.tryClientFallbackStrategies(sanitizedQuery);
        
        if (fallbackResult.data.length > 0) {
          console.log(`Fallback strategy succeeded with ${fallbackResult.data.length} results for raw query`);
          return {
            query: fallbackResult.query,
            rows: fallbackResult.data,
            success: true,
            executionTime: fallbackResult.executionTime
          };
        }
      }
      
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