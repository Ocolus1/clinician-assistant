/**
 * Test Script for Clinical Questions Tool
 * 
 * This script tests the new clinical questions capability of the agent service,
 * specifically verifying its ability to answer questions about client goals and progress.
 * 
 * Usage: node test-clinical-questions.js
 */

import axios from 'axios';

// Sample clinical questions to test
const testQuestions = [
  {
    description: "Basic current goals question",
    question: "What goals is Olivia currently working on?"
  },
  {
    description: "Progress tracking question",
    question: "Has Leo made progress on his speech goal?"
  },
  {
    description: "Milestone score question",
    question: "What milestone scores does Sofia have?"
  }
];

async function runTests() {
  console.log("Testing Clinical Questions Tool");
  console.log("===============================\n");
  
  for (const test of testQuestions) {
    try {
      console.log(`Testing: ${test.description}`);
      console.log(`Question: "${test.question}"`);
      
      // Use the agent API to process the question
      const response = await axios.post('http://localhost:5000/api/debug/agent/test-agent-query', {
        question: test.question
      });
      
      console.log(`\nResponse: ${response.data.result}`);
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