// Direct test script for ReactAgentService without API
// This script directly tests the agent's ability to answer common questions

import { reactAgentService } from '../services/reactAgentService.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Test results file
const testResultsFile = path.join(tempDir, 'direct_agent_test_results.json');

// Initialize the ReactAgentService
// const reactAgentService = new ReactAgentService();

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
  },
  // Additional detailed questions for Report Generation
  {
    category: "Report Generation - Detailed",
    question: "Can you generate a detailed progress report for Radwan-765193 showing progress on each goal?",
    expectedKeywords: ["progress", "report", "goal", "Radwan-765193"]
  },
  {
    category: "Report Generation - Specific",
    question: "What progress has Radwan-765193 made on their communication goal?",
    expectedKeywords: ["progress", "communication", "Radwan-765193"]
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
    
    fs.writeFileSync(testResultsFile, JSON.stringify(data, null, 2));
    console.log(`Test results saved to ${testResultsFile}`);
  } catch (error) {
    console.error('Error saving test results:', error);
  }
}

// Function to test a question directly with the ReactAgentService
async function testQuestion(question, sessionId = 1) {
  try {
    // Process the question with the ReactAgentService
    const answer = await reactAgentService.processQuery(question, sessionId);
    return answer;
  } catch (error) {
    console.error(`Error processing question with ReactAgentService: ${error.message}`);
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log('\n🧪 STARTING DIRECT AGENT TESTS 🧪\n');
  
  try {
    console.log(`Running ${testQuestions.length} test questions...\n`);
    
    // Initialize the agent if needed
    if (!reactAgentService.agent) {
      console.log('Initializing ReactAgentService...');
      await reactAgentService.initializeAgent();
      console.log('ReactAgentService initialized successfully.');
    } else {
      console.log('ReactAgentService already initialized.');
    }
    
    // Store test results
    const testResults = [];
    
    // Run each test question
    for (let i = 0; i < testQuestions.length; i++) {
      const test = testQuestions[i];
      console.log(`Test ${i + 1}/${testQuestions.length}: ${test.category} - "${test.question}"`);
      
      try {
        // Process the question directly with the ReactAgentService
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
console.log('Starting direct agent tests...');
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
});
