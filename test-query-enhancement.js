/**
 * Test Script for Query Enhancement Logic
 * 
 * This script tests the SQL query enhancement logic for client identifiers
 * to ensure it correctly formats queries with table aliases.
 */

import axios from 'axios';

// Sample queries to test
const testQueries = [
  {
    description: "Query with client table alias",
    question: "What goals is Olivia currently working on?"
  },
  {
    description: "Query with hyphenated client name",  
    question: "What milestones has Radwan-585666 worked on?"
  },
  {
    description: "Query with numeric identifier",
    question: "Show me goals for client 12345"
  }
];

async function runTests() {
  console.log("Testing Query Enhancement Logic");
  console.log("===============================\n");
  
  for (const test of testQueries) {
    try {
      console.log(`Testing: ${test.description}`);
      console.log(`Question: "${test.question}"`);
      
      // Use the generate-sql endpoint to test
      const response = await axios.post('http://localhost:5000/api/debug/agent/generate-sql', {
        question: test.question
      });
      
      if (response.data.success) {
        console.log(`\nGenerated SQL: ${response.data.sqlResult.query}`);
        if (response.data.queryResult) {
          console.log(`\nQuery returned ${response.data.queryResult.length} results`);
        }
      } else {
        console.log(`\nError: ${response.data.sqlResult?.errorMessage || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`\nError calling API: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    console.log("\n" + "-".repeat(80) + "\n");
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Test script error:', err);
});