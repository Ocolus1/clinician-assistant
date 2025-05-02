import { reactAgentService } from "../services/reactAgentService";
import { db } from "../db";
import { patients } from "../../shared/schema";
import { eq, like } from "drizzle-orm";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

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

// Main test function
async function runTests() {
  console.log('\n🧪 STARTING BASIC AGENT RESPONSE TESTS 🧪\n');
  
  try {
    // Get real patient names to use in tests
    const realPatients = await getRealPatientNames(5);
    
    if (realPatients.length === 0) {
      throw new Error('No patients found in the database. Cannot run tests.');
    }
    
    // Sample patient data for tests
    const testPatient = realPatients[0];
    console.log(`Using test patient: ${testPatient.name} (ID: ${testPatient.id})`);
    
    // Define a small set of test questions
    const testQuestions = [
      // Goal Tracking
      `What goals is ${testPatient.name} currently working on?`,
      
      // Strategy Insights
      `What strategies were used most frequently with ${testPatient.name}?`,
      
      // Session Engagement
      `How many sessions has ${testPatient.name} attended this month?`,
      
      // Report Generation
      `What's ${testPatient.name}'s progress summary across all goals?`,
      
      // Budget Tracking
      `How much funding is left in ${testPatient.name}'s budget plan?`
    ];
    
    console.log(`Running ${testQuestions.length} test questions...\n`);
    
    // Run each test question
    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\nTEST ${i + 1}/${testQuestions.length}: "${question}"`);
      
      try {
        // Process the question with the ReactAgentService
        console.log('Processing question...');
        const answer = await reactAgentService.processQuery(question, TEST_SESSION_ID);
        
        console.log('\nANSWER:');
        console.log('='.repeat(80));
        console.log(answer);
        console.log('='.repeat(80));
        
      } catch (error) {
        console.error(`Error processing question "${question}":`, error);
      }
      
      console.log('\n' + '-'.repeat(80));
    }
    
    console.log('\n🧪 TEST COMPLETE 🧪');
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
console.log('Starting agent tests...');
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
});
