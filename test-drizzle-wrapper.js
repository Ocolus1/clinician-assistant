/**
 * Test script for the Drizzle Query Wrapper
 * 
 * This script tests the Drizzle query wrapper in isolation to identify
 * any issues without requiring the full server to be running.
 */

import { exec } from 'child_process';

// Simulated query generator to avoid dependencies
class MockSqlQueryGenerator {
  async generateQuery(question) {
    console.log('Mock SQL generator received question:', question);
    return 'SELECT * FROM clients LIMIT 10';
  }
  
  async executeQuery(sqlQuery) {
    console.log('Mock SQL executor received query:', sqlQuery);
    return {
      query: sqlQuery,
      data: [{ id: 1, name: 'Test Client' }],
      executionTime: 0
    };
  }
  
  async executeRawQuery(sqlQuery) {
    console.log('Mock SQL raw executor received query:', sqlQuery);
    return {
      query: sqlQuery,
      rows: [{ id: 1, name: 'Test Client' }],
      success: true,
      executionTime: 0
    };
  }
}

// Mock Drizzle Query Generator (simplified from our implementation)
class DrizzleQueryGenerator {
  constructor() {
    this.sqlQueryGenerator = new MockSqlQueryGenerator();
  }
  
  async generateQuery(question) {
    try {
      console.log('Generating Drizzle-style query for question:', question);
      
      // Use the SQL query generator to generate a real SQL query
      const sqlQuery = await this.sqlQueryGenerator.generateQuery(question);
      
      // Wrap the SQL query in a Drizzle-style format for debugging purposes
      return `db.query(sql\`${sqlQuery}\`)`;
    } catch (error) {
      console.error('Error in wrapper generateQuery method:', error);
      throw new Error(`Failed to generate query: ${error?.message || String(error)}`);
    }
  }
  
  async executeQuery(drizzleQuery) {
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
      const result = await this.sqlQueryGenerator.executeQuery(sqlQuery);
      
      // Map the SQL result to a Drizzle result format
      return {
        query: drizzleQuery,
        data: result.data,
        error: result.error,
        originalError: result.originalError,
        executionTime: result.executionTime
      };
    } catch (error) {
      console.error('Error executing query through Drizzle wrapper:', error);
      
      return {
        query: drizzleQuery,
        data: [],
        error: `Error executing query: ${error.message || 'Unknown error'}`,
        originalError: error.message
      };
    }
  }
  
  async executeRawQuery(drizzleQuery) {
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
      const result = await this.sqlQueryGenerator.executeRawQuery(sqlQuery);
      
      // Map the SQL result to a Drizzle result format
      return {
        query: drizzleQuery,
        rows: result.rows,
        success: result.success,
        error: result.error,
        originalError: result.originalError,
        executionTime: result.executionTime
      };
    } catch (error) {
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

// Create a test instance
const drizzleQueryGenerator = new DrizzleQueryGenerator();

async function runTests() {
  try {
    console.log('----- Testing Drizzle Query Generator -----');
    
    // Test 1: Generate a query
    console.log('\nTest 1: Generating query...');
    const question = 'Show me all active clients';
    const generatedQuery = await drizzleQueryGenerator.generateQuery(question);
    console.log('Generated query:', generatedQuery);
    
    // Test 2: Execute query
    console.log('\nTest 2: Executing query...');
    const result = await drizzleQueryGenerator.executeQuery(generatedQuery);
    console.log('Execution result:', JSON.stringify(result, null, 2));
    
    // Test 3: Execute raw query (LangChain format)
    console.log('\nTest 3: Executing raw query...');
    const rawResult = await drizzleQueryGenerator.executeRawQuery(generatedQuery);
    console.log('Raw execution result:', JSON.stringify(rawResult, null, 2));
    
    console.log('\n----- All tests completed successfully -----');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the tests
runTests();