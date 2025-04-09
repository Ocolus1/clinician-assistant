/**
 * SQL Query Generator Service
 * 
 * This service generates SQL queries from natural language questions
 * and executes them against the database.
 */

import { pool } from '../db';
import { getOpenAIService } from './openaiService';
import { getSchemaProvider } from './schemaProvider';
import { SQLQueryResult } from '@shared/assistantTypes';

/**
 * SQL Query Generator class
 */
export class SQLQueryGenerator {
  constructor() {}

  /**
   * Generate and execute an SQL query from a natural language question
   */
  async generateAndExecute(question: string): Promise<SQLQueryResult> {
    try {
      const schemaProvider = getSchemaProvider();
      const openaiService = getOpenAIService();
      
      // Get database schema
      const databaseSchema = await schemaProvider.getFormattedSchema();
      
      // Generate SQL query
      const sqlQuery = await openaiService.generateSQL(question, databaseSchema);
      
      try {
        // Execute the query with a timeout
        const queryTimeout = 10000; // 10 seconds
        const result = await Promise.race([
          pool.query(sqlQuery),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Query execution timed out')), queryTimeout);
          })
        ]);
        
        // Return successful result
        return {
          sqlQuery,
          data: result.rows,
        };
      } catch (queryError) {
        console.error('Error executing SQL query:', queryError);
        
        // Return error
        return {
          sqlQuery,
          data: [],
          error: queryError instanceof Error ? queryError.message : 'Unknown error executing query',
        };
      }
    } catch (error) {
      console.error('Error generating SQL query:', error);
      
      // Return error
      return {
        sqlQuery: '',
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error generating query',
      };
    }
  }

  /**
   * Explain the results of an SQL query
   */
  async explainResults(question: string, sqlQuery: string, results: any[]): Promise<string> {
    try {
      const schemaProvider = getSchemaProvider();
      const openaiService = getOpenAIService();
      
      // Get database schema
      const databaseSchema = await schemaProvider.getFormattedSchema();
      
      // Generate explanation
      const explanation = await openaiService.explainQueryResults(
        question,
        sqlQuery,
        results,
        databaseSchema
      );
      
      return explanation;
    } catch (error) {
      console.error('Error explaining query results:', error);
      return 'I was unable to generate an explanation for the query results.';
    }
  }
}

// Create a singleton instance
let sqlQueryGeneratorInstance: SQLQueryGenerator | null = null;

/**
 * Get the SQL Query Generator instance
 */
export function getSQLQueryGenerator(): SQLQueryGenerator {
  if (!sqlQueryGeneratorInstance) {
    sqlQueryGeneratorInstance = new SQLQueryGenerator();
  }
  return sqlQueryGeneratorInstance;
}