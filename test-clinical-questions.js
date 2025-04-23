/**
 * Test Script for Clinical Questions Tool
 * 
 * This script tests the new clinical questions capability of the agent service,
 * specifically verifying its ability to answer questions about client goals and progress.
 * 
 * Usage: node test-clinical-questions.js
 */

import axios from 'axios';

// Test questions to run
const TEST_QUESTIONS = [
  {
    question: "What goals is Olivia currently working on?",
    description: "Basic current goals question"
  },
  {
    question: "Has Leo made any progress on his language goal?",
    description: "Goal progress with specific goal"
  },
  {
    question: "What's the most recent milestone Sofia worked on?",
    description: "Recent milestone"
  },
  {
    question: "Which of Noah's subgoals have been completed?",
    description: "Completed subgoals"
  },
  {
    question: "Is Emma making progress on her therapy goals?",
    description: "General progress question"
  }
];

async function runTests() {
  console.log("Testing Clinical Questions Tool");
  console.log("===============================\n");
  
  // Create a test conversation ID
  const conversationId = "clinical-questions-test-" + Date.now();
  
  for (const test of TEST_QUESTIONS) {
    try {
      console.log(`Testing: ${test.description}`);
      console.log(`Question: "${test.question}"`);
      
      // Call the agent query endpoint
      const response = await axios.post('http://localhost:5000/api/agent/debug/test-agent-query', {
        question: test.question,
        conversationId
      });
      
      if (response.data.success) {
        console.log(`\nResponse: ${response.data.result}`);
        console.log(`Required agent: ${response.data.requiresAgent}`);
      } else {
        console.log(`\nError: ${response.data.error}`);
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