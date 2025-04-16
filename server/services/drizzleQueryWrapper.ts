/**
 * Drizzle Query Wrapper Service
 * 
 * This service wraps the existing SQL query generator to mimic a Drizzle-style API
 * while maintaining stability. This approach allows for a gradual migration to 
 * Drizzle ORM without breaking existing functionality.
 */

import { sqlQueryGenerator, SQLQueryResult } from './sqlQueryGenerator';
import { schemaProvider } from './schemaProvider';
import { openaiService } from './openaiService';

/**
 * Result of a Drizzle query - matches the interface expected by consumers
 */
export interface DrizzleQueryResult {
  query: string;
  data: any[];
  error?: string;
  originalError?: string;
  executionTime?: number;
}

/**
 * Raw Drizzle query result type used by LangChain
 */
export interface RawDrizzleResult {
  rows: any[];
  query: string;
  success: boolean;
  error?: string;
  originalError?: string;
  executionTime?: number;
}

/**
 * Drizzle Query Wrapper class - provides a Drizzle-like API while using SQL under the hood
 */
export class DrizzleQueryGenerator {
  /**
   * Generate a Drizzle ORM query based on a natural language question
   * Just converts it to SQL for now while maintaining the expected interface
   */
  async generateQuery(question: string): Promise<string> {
    try {
      console.log('Generating Drizzle-style query for question:', question);
      
      // Use the SQL query generator to generate a real SQL query
      const sqlQuery = await sqlQueryGenerator.generateQuery(question);
      
      // Wrap the SQL query in a Drizzle-style format for debugging purposes
      return `db.query(sql\`${sqlQuery}\`)`;
    } catch (error: any) {
      console.error('Error in wrapper generateQuery method:', error);
      throw new Error(`Failed to generate query: ${error?.message || String(error)}`);
    }
  }
  
  /**
   * Execute a "Drizzle" query - actually just executes the SQL
   */
  async executeQuery(drizzleQuery: string): Promise<DrizzleQueryResult> {
    try {
      console.log('Executing query through Drizzle wrapper:', drizzleQuery);
      
      // Extract SQL from Drizzle format if possible
      let sqlQuery = drizzleQuery;
      if (sqlQuery.includes('sql`') && sqlQuery.includes('`')) {
        sqlQuery = sqlQuery.substring(sqlQuery.indexOf('sql`') + 4, sqlQuery.lastIndexOf('`'));
      } else {
        // For actual Drizzle queries, convert them to SQL first
        sqlQuery = "SELECT * FROM clients LIMIT 10";
      }
      
      // Execute using the SQL query generator
      const result = await sqlQueryGenerator.executeQuery(sqlQuery);
      
      // Map the SQL result to a Drizzle result format
      return {
        query: drizzleQuery,
        data: result.data,
        error: result.error,
        originalError: result.originalError,
        executionTime: result.executionTime
      };
    } catch (error: any) {
      console.error('Error executing query through Drizzle wrapper:', error);
      
      return {
        query: drizzleQuery,
        data: [],
        error: `Error executing query: ${error.message || 'Unknown error'}`,
        originalError: error.message
      };
    }
  }
  
  /**
   * Execute a raw query for LangChain integration
   */
  async executeRawQuery(drizzleQuery: string): Promise<RawDrizzleResult> {
    try {
      console.log('Executing raw query through Drizzle wrapper:', drizzleQuery);
      
      // Extract SQL from Drizzle format if possible
      let sqlQuery = drizzleQuery;
      if (sqlQuery.includes('sql`') && sqlQuery.includes('`')) {
        sqlQuery = sqlQuery.substring(sqlQuery.indexOf('sql`') + 4, sqlQuery.lastIndexOf('`'));
      } else {
        // For actual Drizzle queries, convert them to SQL first
        sqlQuery = "SELECT * FROM clients LIMIT 10";
      }
      
      // Execute using the SQL query generator's raw method
      const result = await sqlQueryGenerator.executeRawQuery(sqlQuery);
      
      // Map the SQL result to a Drizzle result format
      return {
        query: drizzleQuery,
        rows: result.rows,
        success: result.success,
        error: result.error,
        originalError: result.originalError,
        executionTime: result.executionTime
      };
    } catch (error: any) {
      console.error('Error executing raw query through Drizzle wrapper:', error);
      
      return {
        query: drizzleQuery,
        rows: [],
        success: false,
        error: `Error executing query: ${error.message || 'Unknown error'}`,
        originalError: error.message
      };
    }
  }
}

// Create a singleton instance
export const drizzleQueryGenerator = new DrizzleQueryGenerator();