/**
 * Test Script for Client Identifier Handling in Two-Phase Query Generation
 * 
 * This script specifically tests how our enhanced schema analysis and query generation 
 * handles the three different formats of client identifiers.
 */

import { sqlQueryGenerationService } from './server/services/sqlQueryGenerationService';
import { schemaAnalysisService } from './server/services/schemaAnalysisService';
import { sql } from './server/db';

// Test questions to evaluate different client identifier patterns
const testQuestions = [
  // Using combined format (name field)
  "Show me all goals for client Radwan-585666",
  
  // Using just the numeric part (unique_identifier field)
  "List the budget items for client with identifier 585666",
  
  // Using just the name part (original_name field)
  "How many clients are named Radwan?",
  
  // Complex query with client identifier
  "What's the total used budget for client Radwan-585666?",
  
  // Query that would fail without proper handling
  "Find the latest session notes for Radwan"
];

// Main test function
async function runTests() {
  console.log("TESTING CLIENT IDENTIFIER HANDLING IN QUERIES");
  console.log("============================================\n");
  
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
          console.log("Query Result:", JSON.stringify(queryResult.slice(0, 3), null, 2));
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
  
  console.log("\nClient Identifier Handling Test Complete");
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});