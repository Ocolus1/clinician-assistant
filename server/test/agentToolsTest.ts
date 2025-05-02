import { ReactAgentService } from '../services/reactAgentService';
import { db } from '../db';
import { patients, goals, sessions, budgetSettings, sessionNotes, subgoals, strategies } from '../../shared/schema';
import { eq, desc, like, and, or, gte, lte, not, isNull } from 'drizzle-orm';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize the ReactAgentService
const reactAgentService = new ReactAgentService();

// Test session ID for memory
const TEST_SESSION_ID = 999;

// Path for test results
const TEST_RESULTS_DIR = path.join(__dirname, '../../temp');
const TEST_RESULTS_FILE = path.join(TEST_RESULTS_DIR, 'agent_test_results.json');

// Make sure the temp directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// Categories of questions to test
const CATEGORIES = {
  GOAL_TRACKING: 'Goal & Milestone Tracking',
  STRATEGY_INSIGHTS: 'Strategy Insights',
  SESSION_ENGAGEMENT: 'Session & Therapy Engagement',
  REPORT_GENERATION: 'Report & Feedback Generation',
  BUDGET_TRACKING: 'Budget Tracking'
};

// Test result interface
interface TestResult {
  category: string;
  question: string;
  answer: string;
  success: boolean;
  expectedKeywords: string[];
  foundKeywords: string[];
  missingKeywords: string[];
  timestamp: string;
}

// Helper function to get real patient names from the database
async function getRealPatientNames(limit = 5): Promise<{id: number, name: string}[]> {
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

// Helper function to get real goal titles for a patient
async function getPatientGoals(patientId: number): Promise<{id: number, title: string}[]> {
  try {
    const goalData = await db.select({
      id: goals.id,
      title: goals.title
    })
    .from(goals)
    .where(eq(goals.patientId, patientId))
    .limit(3);
    
    return goalData;
  } catch (error) {
    console.error(`Error fetching goals for patient ${patientId}:`, error);
    return [];
  }
}

// Helper function to get real session data
async function getPatientSessions(patientId: number): Promise<any[]> {
  try {
    const sessionData = await db.select({
      id: sessions.id,
      title: sessions.title,
      date: sessions.sessionDate,
      status: sessions.status
    })
    .from(sessions)
    .where(eq(sessions.patientId, patientId))
    .orderBy(desc(sessions.sessionDate))
    .limit(3);
    
    return sessionData;
  } catch (error) {
    console.error(`Error fetching sessions for patient ${patientId}:`, error);
    return [];
  }
}

// Helper function to get budget data
async function getPatientBudget(patientId: number): Promise<any | null> {
  try {
    const budgetData = await db.select({
      id: budgetSettings.id,
      planCode: budgetSettings.planCode,
      endOfPlan: budgetSettings.endOfPlan
    })
    .from(budgetSettings)
    .where(eq(budgetSettings.patientId, patientId))
    .limit(1);
    
    return budgetData.length > 0 ? budgetData[0] : null;
  } catch (error) {
    console.error(`Error fetching budget for patient ${patientId}:`, error);
    return null;
  }
}

// Helper function to log test results
function logTestResult(result: TestResult) {
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
function saveTestResults(results: TestResult[]) {
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
function validateAnswer(answer: string, expectedKeywords: string[]): {
  success: boolean;
  foundKeywords: string[];
  missingKeywords: string[];
} {
  const lowerAnswer = answer.toLowerCase();
  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];
  
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
  console.log('\n🧪 STARTING COMPREHENSIVE AGENT RESPONSE TESTS 🧪\n');
  
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
    
    // Get real goals for the test patients
    const patient1Goals = await getPatientGoals(testPatient1.id);
    const goalName = patient1Goals.length > 0 ? patient1Goals[0].title : "communication";
    
    // Get real session data
    const patient1Sessions = await getPatientSessions(testPatient1.id);
    
    // Get budget data
    const patient1Budget = await getPatientBudget(testPatient1.id);
    
    console.log(`Found ${realPatients.length} patients for testing`);
    console.log(`Test patients: ${testPatient1.name}, ${testPatient2.name}, ${testPatient3.name}`);
    
    if (patient1Goals.length > 0) {
      console.log(`Found ${patient1Goals.length} goals for ${testPatient1.name}`);
    }
    
    if (patient1Sessions.length > 0) {
      console.log(`Found ${patient1Sessions.length} sessions for ${testPatient1.name}`);
    }
    
    if (patient1Budget) {
      console.log(`Found budget for ${testPatient1.name} with plan code ${patient1Budget.planCode}`);
    }
    
    // Generate test questions for each category
    const testQuestions = [
      // Goal Tracking Questions
      {
        category: CATEGORIES.GOAL_TRACKING,
        question: `What goals is ${testPatient1.name} currently working on?`,
        expectedKeywords: ['goal', testPatient1.name]
      },
      {
        category: CATEGORIES.GOAL_TRACKING,
        question: `Has ${testPatient2.name} made progress on their goals?`,
        expectedKeywords: ['progress', testPatient2.name, 'goal']
      },
      {
        category: CATEGORIES.GOAL_TRACKING,
        question: `What milestone did ${testPatient3.name} work on most recently?`,
        expectedKeywords: ['milestone', testPatient3.name]
      },
      {
        category: CATEGORIES.GOAL_TRACKING,
        question: `Which subgoals were scored for ${testPatient1.name} in their last session?`,
        expectedKeywords: ['subgoal', testPatient1.name, 'session']
      },
      {
        category: CATEGORIES.GOAL_TRACKING,
        question: `Are there any goals that haven't been updated in over a month?`,
        expectedKeywords: ['goal', 'update', 'month']
      },
      
      // Strategy Insights Questions
      {
        category: CATEGORIES.STRATEGY_INSIGHTS,
        question: `What strategies were used most frequently with ${testPatient1.name}?`,
        expectedKeywords: ['strateg', testPatient1.name]
      },
      {
        category: CATEGORIES.STRATEGY_INSIGHTS,
        question: `Which strategies work best for ${testPatient2.name}?`,
        expectedKeywords: ['strateg', testPatient2.name]
      },
      {
        category: CATEGORIES.STRATEGY_INSIGHTS,
        question: `What are the top strategies that worked for ${testPatient3.name}?`,
        expectedKeywords: ['strateg', testPatient3.name]
      },
      {
        category: CATEGORIES.STRATEGY_INSIGHTS,
        question: `Which strategies were used in the last sessions for ${testPatient1.name}?`,
        expectedKeywords: ['strateg', testPatient1.name, 'session']
      },
      
      // Session Engagement Questions
      {
        category: CATEGORIES.SESSION_ENGAGEMENT,
        question: `How many sessions has ${testPatient1.name} attended this month?`,
        expectedKeywords: ['session', testPatient1.name, 'month']
      },
      {
        category: CATEGORIES.SESSION_ENGAGEMENT,
        question: `Who missed their last scheduled session?`,
        expectedKeywords: ['miss', 'session']
      },
      {
        category: CATEGORIES.SESSION_ENGAGEMENT,
        question: `Which clients haven't attended therapy in 3 weeks?`,
        expectedKeywords: ['attend', 'week']
      },
      {
        category: CATEGORIES.SESSION_ENGAGEMENT,
        question: `When was the last session for ${testPatient3.name}?`,
        expectedKeywords: ['session', testPatient3.name, 'last']
      },
      {
        category: CATEGORIES.SESSION_ENGAGEMENT,
        question: `What's the frequency of ${testPatient1.name}'s sessions?`,
        expectedKeywords: ['session', testPatient1.name, 'frequenc']
      },
      
      // Report Generation Questions
      {
        category: CATEGORIES.REPORT_GENERATION,
        question: `What's ${testPatient1.name}'s progress summary across all goals?`,
        expectedKeywords: ['progress', 'goal', testPatient1.name]
      },
      {
        category: CATEGORIES.REPORT_GENERATION,
        question: `When was the last parent summary created for ${testPatient2.name}?`,
        expectedKeywords: ['summary', 'report', testPatient2.name]
      },
      {
        category: CATEGORIES.REPORT_GENERATION,
        question: `Has a school feedback report been generated for ${testPatient3.name}?`,
        expectedKeywords: ['report', 'school', testPatient3.name]
      },
      {
        category: CATEGORIES.REPORT_GENERATION,
        question: `Which clients are due for a report this month?`,
        expectedKeywords: ['report', 'due', 'month']
      },
      
      // Budget Tracking Questions
      {
        category: CATEGORIES.BUDGET_TRACKING,
        question: `How much funding is left in ${testPatient1.name}'s budget plan?`,
        expectedKeywords: ['budget', 'fund', testPatient1.name]
      },
      {
        category: CATEGORIES.BUDGET_TRACKING,
        question: `When does ${testPatient2.name}'s budget plan expire?`,
        expectedKeywords: ['budget', 'expire', testPatient2.name]
      },
      {
        category: CATEGORIES.BUDGET_TRACKING,
        question: `How many sessions are remaining for ${testPatient3.name}?`,
        expectedKeywords: ['session', 'remain', testPatient3.name]
      },
      {
        category: CATEGORIES.BUDGET_TRACKING,
        question: `Which clients have less than 20% of their budget left?`,
        expectedKeywords: ['budget', 'percent', 'left']
      },
      {
        category: CATEGORIES.BUDGET_TRACKING,
        question: `Who hasn't used any sessions in the past 30 days?`,
        expectedKeywords: ['session', 'day', 'use']
      }
    ];
    
    // Add some custom questions based on the real data we found
    if (patient1Goals.length > 0) {
      testQuestions.push({
        category: CATEGORIES.GOAL_TRACKING,
        question: `Has ${testPatient1.name} made progress on their "${patient1Goals[0].title}" goal?`,
        expectedKeywords: ['progress', testPatient1.name, patient1Goals[0].title]
      });
    }
    
    if (patient1Budget) {
      testQuestions.push({
        category: CATEGORIES.BUDGET_TRACKING,
        question: `What's the status of ${testPatient1.name}'s budget with plan code ${patient1Budget.planCode}?`,
        expectedKeywords: ['budget', testPatient1.name, patient1Budget.planCode]
      });
    }
    
    console.log(`Running ${testQuestions.length} test questions...\n`);
    
    // Store test results
    const testResults: TestResult[] = [];
    
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
        const result: TestResult = {
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
        
      } catch (error: any) {
        console.error(`Error processing question "${test.question}":`, error);
        
        // Create failure result
        const result: TestResult = {
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
  } finally {
    // Clean up
    process.exit(0);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
  process.exit(1);
});
