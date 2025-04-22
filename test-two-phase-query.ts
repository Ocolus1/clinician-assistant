/**
 * Test Script for Two-Phase Query Generation
 * 
 * This script directly tests the SQL query generation service with the new 
 * two-phase approach that generates and validates queries.
 */

import { sqlQueryGenerationService } from './server/services/sqlQueryGenerationService';
import { schemaAnalysisService } from './server/services/schemaAnalysisService';
import { sql } from './server/db';

// Test questions to evaluate
const testQuestions = [
  "How many active clients do we have?",
  "Show me all clients with the name containing 'Radwan'",
  "List all goals for client with ID 88",
  "Count the number of budget items for client with the name 'Radwan-585666'",
  "Find all sessions created in the last 30 days",
  "What is the total used budget across all clients?",
  "Who is the client with the most goals?"
];

// Main test function
async function runTests() {
  console.log("TESTING TWO-PHASE QUERY GENERATION");
  console.log("==================================\n");
  
  // Initialize services if needed
  if (!schemaAnalysisService.isInitialized()) {
    console.log("Initializing schema analysis service...");
    await schemaAnalysisService.initialize();
  }
  
  // Get OpenAI API key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }
  
  if (!sqlQueryGenerationService.isInitialized()) {
    console.log("Initializing SQL query generation service...");
    await sqlQueryGenerationService.initialize(apiKey);
  }
  
  console.log("Services initialized successfully\n");
  
  // Run tests for each question
  for (const question of testQuestions) {
    console.log(`\n----- Testing Question: "${question}" -----\n`);
    
    try {
      // Generate query using the two-phase approach
      console.log("Phase 1: Generating initial SQL query...");
      const result = await sqlQueryGenerationService.generateQuery({ question });
      
      console.log("Generated Query:", result.query);
      console.log("Success:", result.success);
      console.log("Reasoning:", result.reasoning);
      
      if (result.success && result.query) {
        // Execute the query to show results
        console.log("\nExecuting query...");
        try {
          const queryResult = await sql.unsafe(result.query);
          console.log("Query Result:", JSON.stringify(queryResult, null, 2));
          console.log(`Returned ${queryResult.length} rows`);
        } catch (e: any) {
          console.error("Error executing query:", e.message);
        }
      } else if (result.errorMessage) {
        console.error("Error:", result.errorMessage);
      }
    } catch (error) {
      console.error("Error testing question:", error);
    }
    
    console.log("\n----- End of Test -----");
  }
  
  console.log("\nTwo-Phase Query Generation Test Complete");
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});