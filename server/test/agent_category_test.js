// Comprehensive test script for testing the improved ReactAgentService
// This script tests the agent's ability to answer questions across different categories

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Test results file
const testResultsFile = path.join(tempDir, 'agent_category_test_results.json');

// Test questions for each category
const testQuestions = [
  // Basic patient info queries (should work with our simplified service)
  {
    category: "Patient Info",
    question: "Can you tell me about patient with ID 5?",
    expectedKeywords: ["patient", "ID", "5"]
  },
  {
    category: "Patient Info",
    question: "Who is Radwan-563004?",
    expectedKeywords: ["Radwan-563004", "patient"]
  },
  
  // Patient goals queries (using the specialized tool)
  {
    category: "Patient Goals",
    question: "What are the goals for patient with ID 5?",
    expectedKeywords: ["goals", "patient", "5"]
  },
  {
    category: "Patient Goals",
    question: "Show me the goals for Radwan-563004",
    expectedKeywords: ["goals", "Radwan-563004"]
  },
  
  // Flexible query builder queries (with increased maxIterations)
  {
    category: "Flexible Query Builder",
    question: "Can you use the flexible query builder to find all patients with pending onboarding status?",
    expectedKeywords: ["pending", "onboarding", "patients"]
  },
  {
    category: "Flexible Query Builder",
    question: "Use the flexible query builder to show me sessions for patient ID 5",
    expectedKeywords: ["sessions", "patient", "5"]
  }
];

// Helper function to validate if the response contains expected keywords
function validateResponse(response, expectedKeywords) {
  const lowerResponse = response.toLowerCase();
  const foundKeywords = [];
  const missingKeywords = [];
  
  for (const keyword of expectedKeywords) {
    if (lowerResponse.includes(keyword.toLowerCase())) {
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

// Function to test a question
async function testQuestion(question) {
  try {
    console.log(`Testing question: "${question}"`);
    
    const response = await fetch('http://localhost:5000/api/chatbot/react/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: question,
        sessionId: 999
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error(`Error testing "${question}":`, error);
    return `Error: ${error.message}`;
  }
}

// Helper function to log test results
function logTestResult(result) {
  console.log('\n' + '='.repeat(80));
  console.log(`CATEGORY: ${result.category}`);
  console.log(`QUESTION: ${result.question}`);
  console.log('-'.repeat(80));
  console.log(`ANSWER: ${result.answer.substring(0, 200)}${result.answer.length > 200 ? '...' : ''}`);
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
    
    fs.writeFileSync(testResultsFile, JSON.stringify(data, null, 2));
    console.log(`Test results saved to ${testResultsFile}`);
  } catch (error) {
    console.error('Error saving test results:', error);
  }
}

// Main test function
async function runTests() {
  console.log("\n🧪 STARTING AGENT CATEGORY TESTS 🧪\n");
  
  try {
    console.log(`Running ${testQuestions.length} test questions...\n`);
    
    // Store test results
    const testResults = [];
    
    // Run each test question
    for (let i = 0; i < testQuestions.length; i++) {
      const test = testQuestions[i];
      console.log(`Test ${i + 1}/${testQuestions.length}: ${test.category} - "${test.question}"`);
      
      try {
        // Process the question
        const answer = await testQuestion(test.question);
        
        // Validate the answer
        const validation = validateResponse(answer, test.expectedKeywords);
        
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

// Run the tests
console.log('Starting agent category tests...');
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
});
