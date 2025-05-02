/**
 * Goal Tracking Tool Test Script
 * 
 * This script tests the Goal Tracking tool functionality with various test cases
 * to identify issues and verify performance.
 */

import { ReactAgentService } from '../services/reactAgentService.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the ReactAgentService
const reactAgentService = new ReactAgentService();

// Test cases for Goal Tracking
const testCases = [
  {
    category: "Goal Tracking",
    question: "Show me the goals for patient ID 5",
    expectedKeywords: ["goals", "patient", "5"]
  },
  {
    category: "Goal Tracking",
    question: "What are the current goals for Radwan-563004?",
    expectedKeywords: ["goals", "Radwan-563004"]
  },
  {
    category: "Goal Tracking",
    question: "List all goals for patient Radwan with ID 563004",
    expectedKeywords: ["goals", "Radwan", "563004"]
  },
  {
    category: "Goal Tracking",
    question: "What progress has been made on patient ID 5's mobility goals?",
    expectedKeywords: ["progress", "goals", "patient", "5", "mobility"]
  }
];

// Run the tests
async function runTests() {
  console.log('\n🔍 STARTING GOAL TRACKING TOOL TESTS 🔍\n'.cyan.bold);
  
  let successCount = 0;
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test ${i+1}/${testCases.length}: ${testCase.category} - "${testCase.question}"`);
    console.log('Testing question:'.yellow, `"${testCase.question}"`);
    console.log('='.repeat(76).gray);
    
    try {
      // Process the query
      const response = await reactAgentService.processQuery(testCase.question, 1);
      
      console.log('CATEGORY:'.cyan, testCase.category);
      console.log('QUESTION:'.cyan, testCase.question);
      console.log('-'.repeat(76).gray);
      console.log('ANSWER:'.cyan, response.substring(0, 300) + (response.length > 300 ? '...' : ''));
      console.log('-'.repeat(76).gray);
      
      // Check if all expected keywords are in the response
      const expectedKeywords = testCase.expectedKeywords;
      const foundKeywords = [];
      const missingKeywords = [];
      
      expectedKeywords.forEach(keyword => {
        if (response.toLowerCase().includes(keyword.toLowerCase())) {
          foundKeywords.push(keyword);
        } else {
          missingKeywords.push(keyword);
        }
      });
      
      console.log('EXPECTED KEYWORDS:'.cyan, expectedKeywords.join(', '));
      console.log('FOUND KEYWORDS:'.green, foundKeywords.join(', '));
      
      if (missingKeywords.length > 0) {
        console.log('MISSING KEYWORDS:'.red, missingKeywords.join(', '));
      }
      
      console.log('-'.repeat(76).gray);
      
      // Determine if the test passed
      const success = missingKeywords.length === 0;
      const result = success ? '✅ SUCCESS' : '❌ FAILURE';
      console.log('RESULT:'.cyan, success ? result.green : result.red);
      
      if (success) {
        successCount++;
      }
      
      results.push({
        category: testCase.category,
        question: testCase.question,
        success,
        response,
        expectedKeywords,
        foundKeywords,
        missingKeywords
      });
      
      console.log('='.repeat(76).gray);
      console.log('');
      
    } catch (error) {
      console.error('Error processing query:'.red, error);
      results.push({
        category: testCase.category,
        question: testCase.question,
        success: false,
        error: error.message
      });
      console.log('RESULT:'.cyan, '❌ FAILURE'.red);
      console.log('='.repeat(76).gray);
      console.log('');
    }
  }
  
  // Print summary
  console.log('📊 TEST SUMMARY 📊'.cyan.bold);
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${testCases.length - successCount}`);
  console.log(`Success Rate: ${((successCount / testCases.length) * 100).toFixed(2)}%`);
  
  // Save results to file
  const tempDir = path.join(__dirname, '../temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(tempDir, 'goal_tracking_test_results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`Test results saved to ${path.join(tempDir, 'goal_tracking_test_results.json')}`);
}

// Run the tests
runTests().catch(console.error);
