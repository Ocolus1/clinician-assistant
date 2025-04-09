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
      
      // Define system prompt
      const systemPrompt = `
        You are an SQL expert assistant that generates PostgreSQL queries based on user questions.
        You have access to the following database schema:
        
        ${schemaDescription}
        
        Important rules to follow:
        1. NEVER use DELETE, UPDATE, INSERT, CREATE, ALTER, DROP, or any other mutations - ONLY use SELECT statements.
        2. Always use explicit column names instead of * in your queries.
        3. Return ONLY the SQL query, without any explanations, formatting, code blocks, etc.
        4. When querying multiple tables, always use JOINs to ensure proper relationships.
        5. Prioritize security by avoiding SQL injection vectors.
        6. If you don't have enough information, generate the most reasonable query that would provide relevant data.
        7. Use appropriate WHERE clauses to filter data based on the user's question.
        8. Use aliases when joining tables to make the query more readable.
        9. Limit the number of rows returned to 100 by default unless otherwise specified.
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
    
    // Reject queries with mutation statements
    const mutationKeywords = ['DELETE', 'DROP', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE'];
    for (const keyword of mutationKeywords) {
      if (sanitized.toUpperCase().includes(keyword)) {
        throw new Error(`SQL mutation operation (${keyword}) is not allowed`);
      }
    }
    
    // Ensure the query is a SELECT statement
    if (!sanitized.toUpperCase().trim().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }
    
    // Add a LIMIT if not present
    if (!sanitized.toUpperCase().includes('LIMIT')) {
      sanitized = `${sanitized} LIMIT 100`;
    }
    
    return sanitized;
  }
  
  /**
   * Execute an SQL query with safeguards
   */
  async executeQuery(sqlQuery: string): Promise<SQLQueryResult> {
    try {
      // Sanitize the query one more time
      const sanitizedQuery = this.sanitizeQuery(sqlQuery);
      
      // Execute the query
      const result = await sql.unsafe(sanitizedQuery);
      
      return {
        query: sanitizedQuery,
        data: result
      };
    } catch (error: any) {
      console.error('Error executing SQL query:', error);
      
      return {
        query: sqlQuery,
        data: [],
        error: error.message || 'Failed to execute SQL query'
      };
    }
  }
}

// Create a singleton instance
export const sqlQueryGenerator = new SQLQueryGenerator();