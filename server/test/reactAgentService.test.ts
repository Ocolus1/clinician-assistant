import { ReactAgentService } from '../services/reactAgentService';
import { db } from '../db';
import { patients, goals, sessions, budgetSettings } from '../../shared/schema';
import { eq, desc, like } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the ReactAgentService
const reactAgentService = new ReactAgentService();

// Test session ID for memory
const TEST_SESSION_ID = 999;

// Categories of questions to test
const CATEGORIES = {
  GOAL_TRACKING: 'Goal & Milestone Tracking',
  STRATEGY_INSIGHTS: 'Strategy Insights',
  SESSION_ENGAGEMENT: 'Session & Therapy Engagement',
  REPORT_GENERATION: 'Report & Feedback Generation',
  BUDGET_TRACKING: 'Budget Tracking'
};

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
async function getPatientGoals(patientId: number): Promise<string[]> {
  try {
    const goalData = await db.select({
      title: goals.title
    })
    .from(goals)
    .where(eq(goals.patientId, patientId))
    .limit(3);
    
    return goalData.map(g => g.title);
  } catch (error) {
    console.error(`Error fetching goals for patient ${patientId}:`, error);
    return [];
  }
}

// Helper function to log test results
function logTestResult(category: string, question: string, answer: string, success: boolean) {
  console.log('\n' + '='.repeat(80));
  console.log(`CATEGORY: ${category}`);
  console.log(`QUESTION: ${question}`);
  console.log('-'.repeat(80));
  console.log(`ANSWER: ${answer}`);
  console.log('-'.repeat(80));
  console.log(`RESULT: ${success ? '✅ SUCCESS' : '❌ FAILURE'}`);
  console.log('='.repeat(80) + '\n');
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
    
    // Get some real goals for the test patients
    const patientGoals = await getPatientGoals(testPatient1.id);
    const goalName = patientGoals.length > 0 ? patientGoals[0] : "communication";
    
    // Test questions for each category
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
        expectedKeywords: ['progress', testPatient2.name]
      },
      {
        category: CATEGORIES.GOAL_TRACKING,
        question: `What milestone did ${testPatient3.name} work on most recently?`,
        expectedKeywords: ['milestone', testPatient3.name]
      },
      
      // Strategy Insights Questions
      {
        category: CATEGORIES.STRATEGY_INSIGHTS,
        question: `What strategies were used most frequently with ${testPatient1.name}?`,
        expectedKeywords: ['strateg', testPatient1.name]
      },
      {
        category: CATEGORIES.STRATEGY_INSIGHTS,
        question: `Which strategies work best for ${testPatient2.name} under the "${goalName}" goal?`,
        expectedKeywords: ['strateg', testPatient2.name, goalName]
      },
      
      // Session Engagement Questions
      {
        category: CATEGORIES.SESSION_ENGAGEMENT,
        question: `How many sessions has ${testPatient1.name} attended this month?`,
        expectedKeywords: ['session', testPatient1.name]
      },
      {
        category: CATEGORIES.SESSION_ENGAGEMENT,
        question: `Who missed their last scheduled session?`,
        expectedKeywords: ['miss', 'session']
      },
      {
        category: CATEGORIES.SESSION_ENGAGEMENT,
        question: `When was the last session for ${testPatient3.name}?`,
        expectedKeywords: ['session', testPatient3.name]
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
        question: `Which clients have less than 20% of their budget left?`,
        expectedKeywords: ['budget', 'percent', 'left']
      }
    ];
    
    // Run each test question
    console.log(`Found ${realPatients.length} patients for testing`);
    console.log(`Test patients: ${testPatient1.name}, ${testPatient2.name}, ${testPatient3.name}`);
    console.log(`Running ${testQuestions.length} test questions...\n`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const [index, test] of testQuestions.entries()) {
      console.log(`Test ${index + 1}/${testQuestions.length}: ${test.category} - "${test.question}"`);
      
      try {
        // Process the question with the ReactAgentService
        const answer = await reactAgentService.processQuery(test.question, TEST_SESSION_ID);
        
        // Check if the answer contains the expected keywords
        const success = test.expectedKeywords.every(keyword => 
          answer.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
        
        // Log the test result
        logTestResult(test.category, test.question, answer, success);
        
      } catch (error) {
        console.error(`Error processing question "${test.question}":`, error);
        logTestResult(test.category, test.question, `ERROR: ${error.message}`, false);
        failureCount++;
      }
    }
    
    // Print summary
    console.log('\n🧪 TEST SUMMARY 🧪');
    console.log(`Total Tests: ${testQuestions.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log(`Success Rate: ${((successCount / testQuestions.length) * 100).toFixed(2)}%\n`);
    
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
