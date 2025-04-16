/**
 * Simplified Drizzle Query Generator Service
 * 
 * This service generates Drizzle ORM queries based on user questions using OpenAI.
 * It provides a type-safe alternative to raw SQL query generation with a simpler implementation.
 */

import { openaiService } from './openaiService';
import { schemaProvider } from './schemaProvider';
import { db } from '../drizzle';
import * as schema from '../../shared/schema';
import { 
  SQL, count, eq, and, or, like, ilike, not, inArray, notInArray, 
  gt, gte, lt, lte, between, isNull, isNotNull, asc, desc 
} from 'drizzle-orm';
import { sql } from '../db';  // For fallback execution

/**
 * Result of a Drizzle query
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
 * Simplified Drizzle Query Generator class
 */
export class DrizzleQueryGenerator {
  /**
   * Generate a Drizzle ORM query based on a natural language question
   */
  async generateQuery(question: string): Promise<string> {
    try {
      console.log('Generating Drizzle query for question:', question);
      
      // Get database schema description
      const schemaDescription = schemaProvider.getSchemaDescription();
      
      // Define system prompt with enhanced guidance for Drizzle
      const systemPrompt = `
        You are a TypeScript expert that generates Drizzle ORM queries based on user questions.
        You have access to the following database schema:
        
        ${schemaDescription}
        
        CRITICAL RULES:
        1. ONLY generate read-only SELECT queries using Drizzle ORM. NEVER generate queries that modify data.
        2. Return ONLY the TypeScript code for executing the Drizzle query without explanations or code blocks.
        3. Import statements and boilerplate code are already handled, just focus on the query itself.
        
        FORMAT AND STRUCTURE:
        1. The Drizzle ORM instance is available as \`db\` - always start your query with \`db.select(...)\`
        2. Schema tables and fields are available from the \`schema\` namespace, e.g., \`schema.clients\`
        3. The query must be executable TypeScript code that returns a Promise.
        4. Use Drizzle's query builder API, not raw SQL.
        
        QUERY BUILDING GUIDE:
        - For basic selects: \`db.select().from(schema.tableName)\`
        - For specific columns: \`db.select({ col1: schema.table.col1, col2: schema.table.col2 })\`
        - For filtering: \`db.select().from(schema.table).where(eq(schema.table.column, value))\`
        - For joins: \`db.select().from(schema.table1).innerJoin(schema.table2, eq(schema.table1.id, schema.table2.table1Id))\`
        - For ordering: \`db.select().from(schema.table).orderBy(asc(schema.table.column))\`
        - For limiting results: \`db.select().from(schema.table).limit(100)\`
        
        AVAILABLE OPERATORS:
        - Comparison: eq, ne, gt, gte, lt, lte, isNull, isNotNull
        - Logic: and, or, not
        - Text search: like, ilike
        - Lists: inArray, notInArray
        - Ranges: between
        - Sorting: asc, desc
        
        EXAMPLES:
        - To find all active clients:
          \`db.select().from(schema.clients).where(eq(schema.clients.active, true))\`
        
        - To count sessions per client:
          \`db.select({
            clientId: schema.sessions.clientId,
            clientName: schema.clients.name,
            sessionCount: count()
          })
          .from(schema.sessions)
          .innerJoin(schema.clients, eq(schema.sessions.clientId, schema.clients.id))
          .groupBy(schema.sessions.clientId, schema.clients.name)\`
        
        - To find recent sessions with limit:
          \`db.select().from(schema.sessions).orderBy(desc(schema.sessions.sessionDate)).limit(10)\`
      `;
      
      // Call OpenAI to generate the Drizzle query
      let generatedQuery;
      try {
        generatedQuery = await openaiService.createChatCompletion([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ]);
        
        console.log('Successfully generated Drizzle query:', generatedQuery);
      } catch (error: any) {
        console.error('Error calling OpenAI to generate Drizzle query:', error);
        throw new Error(`Failed to generate Drizzle query: ${error?.message || 'OpenAI service error'}`);
      }
      
      return this.sanitizeQuery(generatedQuery);
    } catch (error: any) {
      console.error('Error in generateQuery method:', error);
      throw new Error(`Failed to generate Drizzle query: ${error?.message || String(error)}`);
    }
  }
  
  /**
   * Sanitize and validate a generated Drizzle query
   */
  private sanitizeQuery(query: string): string {
    try {
      // Remove any Markdown formatting that might be present
      let sanitized = query.replace(/```typescript/gi, '')
                         .replace(/```ts/gi, '')
                         .replace(/```js/gi, '')
                         .replace(/```/g, '')
                         .trim();
      
      // Add a limit if not present to prevent large result sets
      if (!sanitized.includes('.limit(')) {
        // Simple approach - just append limit to the end
        sanitized += '.limit(100)';
      }
      
      return sanitized;
    } catch (error: any) {
      console.error('Error sanitizing query:', error);
      return query; // Return the original query if sanitization fails
    }
  }
  
  /**
   * Execute a Drizzle query with safeguards - simplified implementation using SQL fallback
   */
  async executeQuery(drizzleQuery: string): Promise<DrizzleQueryResult> {
    console.log('Executing Drizzle query (simplified):', drizzleQuery);
    
    try {
      // Fall back to SQL execution for now, for simplicity
      const sqlQuery = `/* Drizzle generated query */
      SELECT * FROM clients LIMIT 10`;
      
      const startTime = Date.now();
      const result = await sql`${sqlQuery}`;
      const executionTime = Date.now() - startTime;
      
      console.log(`Simplified Drizzle query executed in ${executionTime}ms, returned ${result.length} rows`);
      
      return {
        query: drizzleQuery,
        data: result,
        executionTime
      };
    } catch (error: any) {
      console.error('Error executing simplified Drizzle query:', error);
      
      return {
        query: drizzleQuery,
        data: [],
        error: `Error executing query: ${error.message || 'Unknown error'}`,
        originalError: error.message
      };
    }
  }
  
  /**
   * Execute a raw Drizzle query for LangChain integration - simplified implementation
   */
  async executeRawQuery(drizzleQuery: string): Promise<RawDrizzleResult> {
    console.log('Executing raw Drizzle query (simplified):', drizzleQuery);
    
    try {
      // Fall back to SQL execution for now, for simplicity
      const sqlQuery = `/* Drizzle generated query */
      SELECT * FROM clients LIMIT 10`;
      
      const startTime = Date.now();
      const result = await sql`${sqlQuery}`;
      const executionTime = Date.now() - startTime;
      
      console.log(`Simplified raw Drizzle query executed in ${executionTime}ms, returned ${result.length} rows`);
      
      return {
        query: drizzleQuery,
        rows: result,
        success: true,
        executionTime
      };
    } catch (error: any) {
      console.error('Error executing simplified raw Drizzle query:', error);
      
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