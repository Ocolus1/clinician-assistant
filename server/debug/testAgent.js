// Direct test script for ReactAgentService
// This script directly tests the ReactAgentService without requiring the server to be running

import { reactAgentService } from '../services/reactAgentService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test session ID
const TEST_SESSION_ID = 999;

// Test questions with real patient names
const testQuestions = [
  {
    category: "Goal & Milestone Tracking",
    question: "What goals is Radwan-563004 currently working on?",
    expectedKeywords: ["goal", "Radwan-563004"]
  },
  {
    category: "Strategy Insights",
    question: "What strategies were used most frequently with Radwan-475376?",
    expectedKeywords: ["strateg", "Radwan-475376"]
  },
  {
    category: "Session Engagement",
    question: "How many sessions has Radwan-768090 attended this month?",
    expectedKeywords: ["session", "Radwan-768090", "month"]
  },
  {
    category: "Report Generation",
    question: "What's Radwan-765193's progress summary across all goals?",
    expectedKeywords: ["progress", "goal", "Radwan-765193"]
  },
  {
    category: "Budget Tracking",
    question: "How much funding is left in Radwan-585666's budget plan?",
    expectedKeywords: ["budget", "fund", "Radwan-585666"]
  }
];

// Helper function to validate answer
function validateAnswer(answer, expectedKeywords) {
  const lowerAnswer = answer.toLowerCase();
  const foundKeywords = [];
  const missingKeywords = [];
  
  for (const keyword of expectedKeywords) {
    if (lowerAnswer.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }
  
  return {
    success: missingKeywords.length === 0,
    foundKeywords,
    missingKeywords
  };
}

// Helper function to log test results
function logTestResult(result) {
  console.log('\n' + '='.repeat(80));
  console.log(`CATEGORY: ${result.category}`);
  console.log(`QUESTION: ${result.question}`);
  console.log('-'.repeat(80));
  console.log(`ANSWER: ${result.answer}`);
  console.log('-'.repeat(80));
  console.log(`EXPECTED KEYWORDS: ${result.expectedKeywords.join(', ')}`);
  console.log(`FOUND KEYWORDS: ${result.foundKeywords.join(', ')}`);
  console.log(`MISSING KEYWORDS: ${result.missingKeywords.join(', ')}`);
  console.log('-'.repeat(80));
  console.log(`RESULT: ${result.success ? '✅ SUCCESS' : '❌ FAILURE'}`);
  console.log('='.repeat(80) + '\n');
}

// Main test function
async function runTests() {
  console.log('\n🧪 STARTING DIRECT AGENT TESTS 🧪\n');
  
  try {
    console.log(`Running ${testQuestions.length} test questions...\n`);
    
    // Store test results
    const testResults = [];
    
    // Run each test question
    for (let i = 0; i < testQuestions.length; i++) {
      const test = testQuestions[i];
      console.log(`Test ${i + 1}/${testQuestions.length}: ${test.category} - "${test.question}"`);
      
      try {
        // Process the question with the ReactAgentService
        const answer = await reactAgentService.processQuery(test.question, TEST_SESSION_ID);
        
        // Validate the answer
        const validation = validateAnswer(answer, test.expectedKeywords);
        
        // Create test result
        const result = {
          category: test.category,
          question: test.question,
          answer: answer,
          success: validation.success,
          expectedKeywords: test.expectedKeywords,
          foundKeywords: validation.foundKeywords,
          missingKeywords: validation.missingKeywords
        };
        
        // Log the result
        logTestResult(result);
        testResults.push(result);
        
      } catch (error) {
        console.error(`Error processing question "${test.question}":`, error);
        
        // Create failure result
        const result = {
          category: test.category,
          question: test.question,
          answer: `ERROR: ${error.message}`,
          success: false,
          expectedKeywords: test.expectedKeywords,
          foundKeywords: [],
          missingKeywords: test.expectedKeywords
        };
        
        logTestResult(result);
        testResults.push(result);
      }
    }
    
    // Print summary
    const successCount = testResults.filter(r => r.success).length;
    const failureCount = testResults.filter(r => !r.success).length;
    
    console.log('\n🧪 TEST SUMMARY 🧪');
    console.log(`Total Tests: ${testResults.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log(`Success Rate: ${((successCount / testResults.length) * 100).toFixed(2)}%\n`);
    
    // Category breakdown
    console.log('\n📊 CATEGORY BREAKDOWN 📊');
    const categories = [...new Set(testResults.map(r => r.category))];
    for (const category of categories) {
      const categoryTests = testResults.filter(r => r.category === category);
      const categorySuccess = categoryTests.filter(r => r.success).length;
      const successRate = categoryTests.length > 0 
        ? ((categorySuccess / categoryTests.length) * 100).toFixed(2) 
        : '0.00';
      
      console.log(`${category}: ${categorySuccess}/${categoryTests.length} (${successRate}%)`);
    }
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
console.log('Starting agent tests...');
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
});
