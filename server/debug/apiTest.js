// API Test script for ReactAgentService
// This script tests the agent through the API while the server is running

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for test results
const TEST_RESULTS_DIR = path.join(__dirname, '../../temp');
const TEST_RESULTS_FILE = path.join(TEST_RESULTS_DIR, 'api_test_results.json');

// Make sure the temp directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

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

// Helper function to save test results to a file
function saveTestResults(results) {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      successfulTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      successRate: ((results.filter(r => r.success).length / results.length) * 100).toFixed(2) + '%',
      results: results
    };
    
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(data, null, 2));
    console.log(`Test results saved to ${TEST_RESULTS_FILE}`);
  } catch (error) {
    console.error('Error saving test results:', error);
  }
}

// Function to test the agent via the API
async function testAgentViaAPI(question, sessionId = 1) {
  try {
    const response = await fetch('http://localhost:5000/api/chatbot/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: question,
        sessionId: sessionId,
        useReactAgent: true
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error testing agent via API:', error);
    throw error;
  }
}

// Check if server is running
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('\n🧪 STARTING API AGENT TESTS 🧪\n');
  
  try {
    // Check if server is running
    const isServerRunning = await checkServerStatus();
    
    if (!isServerRunning) {
      console.log('Server is not running. Please start the server with "npm run dev" before running this test.');
      process.exit(1);
    }
    
    console.log('Server is running. Starting tests...');
    console.log(`Running ${testQuestions.length} test questions...\n`);
    
    // Store test results
    const testResults = [];
    
    // Create a session for testing
    console.log('Creating a test session...');
    let sessionId;
    try {
      const response = await fetch('http://localhost:5000/api/chatbot/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Agent Test Session',
          clinicianId: 1
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }
      
      const data = await response.json();
      sessionId = data.id;
      console.log(`Created test session with ID: ${sessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      sessionId = 1; // Fallback to session ID 1
      console.log(`Using fallback session ID: ${sessionId}`);
    }
    
    // Run each test question
    for (let i = 0; i < testQuestions.length; i++) {
      const test = testQuestions[i];
      console.log(`Test ${i + 1}/${testQuestions.length}: ${test.category} - "${test.question}"`);
      
      try {
        // Process the question with the ReactAgentService via API
        const answer = await testAgentViaAPI(test.question, sessionId);
        
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
          missingKeywords: validation.missingKeywords,
          timestamp: new Date().toISOString()
        };
        
        // Log and store the result
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
          missingKeywords: test.expectedKeywords,
          timestamp: new Date().toISOString()
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
    
    // Save results to file
    saveTestResults(testResults);
    
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

// Run the main function
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
