// Test script for ReactAgentService
// This is a simple script to test the agent's ability to answer common questions

import { ReactAgentService } from '../services/reactAgentService.js';
import { db } from '../db.js';
import { patients, goals, sessions } from '../../shared/schema.js';
import { eq, desc, like } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for test results
const TEST_RESULTS_DIR = path.join(__dirname, '../../temp');
const TEST_RESULTS_FILE = path.join(TEST_RESULTS_DIR, 'agent_test_results.json');

// Make sure the temp directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// Initialize the ReactAgentService
const reactAgentService = new ReactAgentService();

// Test session ID for memory
const TEST_SESSION_ID = 999;

// Categories of questions
const CATEGORIES = {
  GOAL_TRACKING: 'Goal & Milestone Tracking',
  STRATEGY_INSIGHTS: 'Strategy Insights',
  SESSION_ENGAGEMENT: 'Session & Therapy Engagement',
  REPORT_GENERATION: 'Report & Feedback Generation',
  BUDGET_TRACKING: 'Budget Tracking'
};

// Helper function to get real patient names from the database
async function getRealPatientNames(limit = 5) {
  try {
    const patientData = await db.select({
      id: patients.id,
      name: patients.name
    })
    .from(patients)
    .limit(limit);
    
    return patientData;
  } catch (error) {
    console.error('Error fetching patient names:', error);
    return [];
  }
}

// Helper function to log test results
function logTestResult(category, question, answer, success, expectedKeywords, foundKeywords, missingKeywords) {
  console.log('\n' + '='.repeat(80));
  console.log(`CATEGORY: ${category}`);
  console.log(`QUESTION: ${question}`);
  console.log('-'.repeat(80));
  console.log(`ANSWER: ${answer}`);
  console.log('-'.repeat(80));
  console.log(`EXPECTED KEYWORDS: ${expectedKeywords.join(', ')}`);
  console.log(`FOUND KEYWORDS: ${foundKeywords.join(', ')}`);
  console.log(`MISSING KEYWORDS: ${missingKeywords.join(', ')}`);
  console.log('-'.repeat(80));
  console.log(`RESULT: ${success ? '✅ SUCCESS' : '❌ FAILURE'}`);
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

// Helper function to check if the answer contains the expected keywords
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

// Main test function
async function runTests() {
  console.log('\n🧪 STARTING AGENT RESPONSE TESTS 🧪\n');
  
  try {
    // Get real patient names to use in tests
    const realPatients = await getRealPatientNames(10);
    
    if (realPatients.length === 0) {
      throw new Error('No patients found in the database. Cannot run tests.');
    }
    
    // Sample patient data for tests
    const testPatient1 = realPatients[0];
    const testPatient2 = realPatients.length > 1 ? realPatients[1] : testPatient1;
    const testPatient3 = realPatients.length > 2 ? realPatients[2] : testPatient1;
    
    console.log(`Found ${realPatients.length} patients for testing`);
    console.log(`Test patients: ${testPatient1.name}, ${testPatient2.name}, ${testPatient3.name}`);
    
    // Define a smaller set of test questions for quick testing
    const testQuestions = [
      // Goal Tracking Questions
      {
        category: CATEGORIES.GOAL_TRACKING,
        question: `What goals is ${testPatient1.name} currently working on?`,
        expectedKeywords: ['goal', testPatient1.name]
      },
      
      // Strategy Insights Questions
      {
        category: CATEGORIES.STRATEGY_INSIGHTS,
        question: `What strategies were used most frequently with ${testPatient1.name}?`,
        expectedKeywords: ['strateg', testPatient1.name]
      },
      
      // Session Engagement Questions
      {
        category: CATEGORIES.SESSION_ENGAGEMENT,
        question: `How many sessions has ${testPatient1.name} attended this month?`,
        expectedKeywords: ['session', testPatient1.name, 'month']
      },
      
      // Report Generation Questions
      {
        category: CATEGORIES.REPORT_GENERATION,
        question: `What's ${testPatient1.name}'s progress summary across all goals?`,
        expectedKeywords: ['progress', 'goal', testPatient1.name]
      },
      
      // Budget Tracking Questions
      {
        category: CATEGORIES.BUDGET_TRACKING,
        question: `How much funding is left in ${testPatient1.name}'s budget plan?`,
        expectedKeywords: ['budget', 'fund', testPatient1.name]
      }
    ];
    
    console.log(`Running ${testQuestions.length} test questions...\n`);
    
    // Store test results
    const testResults = [];
    
    // Run each test question
    for (let index = 0; index < testQuestions.length; index++) {
      const test = testQuestions[index];
      console.log(`Test ${index + 1}/${testQuestions.length}: ${test.category} - "${test.question}"`);
      
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
          missingKeywords: validation.missingKeywords,
          timestamp: new Date().toISOString()
        };
        
        // Log and store the result
        logTestResult(
          result.category, 
          result.question, 
          result.answer, 
          result.success, 
          result.expectedKeywords, 
          result.foundKeywords, 
          result.missingKeywords
        );
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
        
        logTestResult(
          result.category, 
          result.question, 
          result.answer, 
          result.success, 
          result.expectedKeywords, 
          result.foundKeywords, 
          result.missingKeywords
        );
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
    const categories = Object.values(CATEGORIES);
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
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
});
