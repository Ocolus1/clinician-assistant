// Direct API test script for ReactAgentService
// This script tests the agent's ability to answer common questions via API calls

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Test results file
const testResultsFile = path.join(tempDir, 'api_test_results.json');

// Test questions with real patient names
const testQuestions = [
  {
    category: "Report Generation - Basic",
    question: "What's Radwan-563004's progress summary across all goals?",
    expectedKeywords: ["progress", "goal", "Radwan-563004"]
  },
  {
    category: "Report Generation - Detailed",
    question: "Can you generate a detailed progress report for Radwan-563004 showing progress on each goal?",
    expectedKeywords: ["progress", "report", "goal", "Radwan-563004"]
  },
  {
    category: "Report Generation - Specific Goal",
    question: "What progress has Radwan-563004 made on their communication goal?",
    expectedKeywords: ["progress", "communication", "Radwan-563004"]
  },
  {
    category: "Report Generation - Status Check",
    question: "Check if all the data needed for Radwan-563004's progress report is available",
    expectedKeywords: ["report", "status", "Radwan-563004"]
  },
  {
    category: "Report Generation - Recommendations",
    question: "What recommendations do you have based on Radwan-563004's progress?",
    expectedKeywords: ["recommendation", "progress", "Radwan-563004"]
  }
];

// Helper function to validate answer
function validateAnswer(answer, expectedKeywords) {
  if (!answer) return { success: false, foundKeywords: [], missingKeywords: expectedKeywords };
  
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
    
    fs.writeFileSync(testResultsFile, JSON.stringify(data, null, 2));
    console.log(`Test results saved to ${testResultsFile}`);
  } catch (error) {
    console.error('Error saving test results:', error);
  }
}

// Function to test a question via the API
async function testQuestion(question) {
  try {
    const response = await fetch('http://localhost:5000/api/chatbot/react/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: question,
        sessionId: 1
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error(`Error calling API: ${error.message}`);
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log('\n🧪 STARTING API TESTS 🧪\n');
  
  try {
    console.log(`Running ${testQuestions.length} test questions...\n`);
    
    // Store test results
    const testResults = [];
    
    // Run each test question
    for (let i = 0; i < testQuestions.length; i++) {
      const test = testQuestions[i];
      console.log(`Test ${i + 1}/${testQuestions.length}: ${test.category} - "${test.question}"`);
      
      try {
        // Process the question via the API
        const answer = await testQuestion(test.question);
        
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
      
      // Add a small delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
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
console.log('Starting API tests...');
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
});
