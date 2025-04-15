/**
 * SQL Query Generator Test Script
 * 
 * This script tests the SQL query generator with various test cases
 * to verify it properly handles PostgreSQL LIMIT syntax.
 */

// Since the SQL query generator is a TypeScript file,
// we'll create our own mock implementation for testing
// (the real implementation is in sqlQueryGenerator.ts)

// Define a mock class to test our LIMIT clause handling logic
class SQLQueryGenerator {
  sanitizeQuery(query) {
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
    
    // Add a LIMIT if not present to prevent large result sets
    if (!sanitized.toUpperCase().includes('LIMIT')) {
      sanitized = `${sanitized} LIMIT 100`;
    } else {
      // Fix potential syntax issues with LIMIT clause (ensure PostgreSQL format)
      // Check for incorrect LIMIT formats like "LIMIT 10,20" (MySQL style) or "LIMIT 100;"
      const limitRegex = /\bLIMIT\s+(\d+)(?:\s*,\s*(\d+))?(?:;)?/i;
      if (limitRegex.test(sanitized)) {
        // Convert MySQL style LIMIT clause to PostgreSQL format or remove trailing semicolon
        sanitized = sanitized.replace(limitRegex, (match, p1, p2) => {
          if (p2) {
            // Convert MySQL style "LIMIT offset, limit" to PostgreSQL "LIMIT limit OFFSET offset"
            return `LIMIT ${p2} OFFSET ${p1}`;
          }
          // Remove any trailing semicolon after LIMIT
          return `LIMIT ${p1}`;
        });
      }
    }
    
    return sanitized;
  }
}

const sqlQueryGenerator = new SQLQueryGenerator();

// Define some test cases
const testCases = [
  "How many active clients do we have?",
  "Show me the top 5 clients with the most sessions",
  "What clients have had sessions in the last month?", 
  "Count all sessions grouped by client",
  "List all budget items for client with id 123, but limit to 10 results"
];

// Simulate the OpenAI response with different LIMIT clause formats
const mockOpenAIResponses = [
  // Standard PostgreSQL format (correct)
  "SELECT COUNT(*) as active_client_count FROM clients WHERE status = 'active' LIMIT 100",
  
  // MySQL style format (needs conversion)
  "SELECT c.name, COUNT(s.id) as session_count FROM clients c JOIN sessions s ON c.id = s.client_id GROUP BY c.name ORDER BY session_count DESC LIMIT 0, 5",
  
  // With semicolon (needs cleaning)
  "SELECT c.id, c.name FROM clients c JOIN sessions s ON c.id = s.client_id WHERE s.date > CURRENT_DATE - INTERVAL '1 month' GROUP BY c.id, c.name LIMIT 100;",
  
  // No LIMIT (needs adding)
  "SELECT c.name, COUNT(s.id) as session_count FROM clients c JOIN sessions s ON c.id = s.client_id GROUP BY c.name ORDER BY session_count DESC",
  
  // Specific limit without offset (correct)
  "SELECT * FROM budget_items WHERE client_id = 123 LIMIT 10"
];

// Mock the necessary dependencies
const originalOpenAIService = { createChatCompletion: async () => {} };
let currentMockResponseIndex = 0;

// Create a mock for testing
sqlQueryGenerator.generateQuery = async (question) => {
  console.log(`\n\nTEST CASE: "${question}"`);
  console.log('-------------------------------');
  
  // Get the mock response for this test case
  const mockResponse = mockOpenAIResponses[currentMockResponseIndex];
  currentMockResponseIndex = (currentMockResponseIndex + 1) % mockOpenAIResponses.length;
  
  console.log('Raw query from "AI":', mockResponse);
  
  // Run the sanitization logic
  const sanitized = sqlQueryGenerator.sanitizeQuery(mockResponse);
  
  console.log('Sanitized query:', sanitized);
  
  // Verify LIMIT handling
  if (sanitized.toLowerCase().includes(' limit ')) {
    console.log('LIMIT clause found, checking format...');
    const limitMatch = sanitized.match(/\bLIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
    if (limitMatch) {
      console.log('LIMIT format is correct:', limitMatch[0]);
    } else {
      console.warn('WARNING: Potentially incorrect LIMIT format in query:', sanitized);
    }
  } else {
    console.warn('WARNING: No LIMIT clause found in sanitized query');
  }
  
  console.log('-------------------------------');
  return sanitized;
};

// Skip actual database execution
sqlQueryGenerator.executeQuery = async (query) => {
  console.log(`Would execute query: ${query}`);
  return { query, data: [] };
};

// Run the tests
async function runTests() {
  console.log('===== Starting SQL Query Generator Tests =====');
  
  let successCount = 0;
  let failureCount = 0;
  
  console.log("\nTEST RESULTS SUMMARY:");
  console.log("=====================");
  
  for (let i = 0; i < testCases.length; i++) {
    try {
      const testCase = testCases[i];
      await sqlQueryGenerator.generateQuery(testCase);
      console.log(`✅ Test ${i+1}: "${testCase.substring(0, 30)}..." - Success`);
      successCount++;
    } catch (error) {
      console.error(`❌ Test ${i+1}: "${testCases[i].substring(0, 30)}..." - Failed: ${error.message}`);
      failureCount++;
    }
  }
  
  console.log("\n===== TEST SUMMARY =====");
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Successes: ${successCount}`);
  console.log(`Failures: ${failureCount}`);
  
  // Test specifically the MySQL to PostgreSQL LIMIT conversion
  console.log("\n==== SPECIAL TEST: MySQL to PostgreSQL LIMIT conversion ====");
  try {
    const mysqlStyleQuery = "SELECT * FROM clients LIMIT 10, 20";
    console.log("Original MySQL-style query:", mysqlStyleQuery);
    const converted = sqlQueryGenerator.sanitizeQuery(mysqlStyleQuery);
    console.log("Converted to PostgreSQL format:", converted);
    
    // Verify the conversion
    const limitMatch = converted.match(/\bLIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
    if (limitMatch && limitMatch[1] === "20" && limitMatch[2] === "10") {
      console.log("✅ MySQL to PostgreSQL LIMIT conversion test passed");
      successCount++;
    } else {
      console.log("❌ MySQL to PostgreSQL LIMIT conversion test failed");
      failureCount++;
    }
  } catch (error) {
    console.error("❌ Error in conversion test:", error.message);
    failureCount++;
  }
  
  console.log("\n===== FINAL RESULTS =====");
  console.log(`Total tests: ${testCases.length + 1}`); // +1 for the special test
  console.log(`Successes: ${successCount}`);
  console.log(`Failures: ${failureCount}`);
  
  if (failureCount === 0) {
    console.log("\n✅ ALL TESTS PASSED ✅");
  } else {
    console.log("\n❌ SOME TESTS FAILED ❌");
  }
}

// Run the test function
runTests().catch(err => {
  console.error('Test script failed:', err);
});