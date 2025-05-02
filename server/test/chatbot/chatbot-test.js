/**
 * Chatbot Functionality Test
 * 
 * This script tests the chatbot's ability to correctly respond to various types of queries.
 * It directly queries the database for ground truth and compares it with the chatbot's responses.
 */

import { db } from '../../db/index.js';
import { patients, goals, caregivers, clinicians, budgetSettings } from '../../../shared/schema.js';
import { entityExtractionService } from '../../services/entityExtractionService.js';
import { patientQueriesService } from '../../services/patientQueriesService.js';
import { responseGenerationService } from '../../services/responseGenerationService.js';
import { ChatbotService } from '../../services/chatbotService.js';
import { eq, count, sql } from 'drizzle-orm';
import chalk from 'chalk';

// Create a new chatbot instance for testing
const chatbot = new ChatbotService();
let sessionId;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Run a test case
 * @param {string} name - Test name
 * @param {string} query - User query to test
 * @param {Function} validator - Function to validate the response
 */
async function runTest(name, query, validator) {
  console.log(chalk.blue(`\nRunning test: ${name}`));
  console.log(`Query: "${query}"`);
  
  try {
    // Process the query through the chatbot
    const response = await chatbot.processMessage(query);
    console.log(`Chatbot response: "${response}"`);
    
    // Validate the response
    const result = await validator(response);
    
    if (result.success) {
      console.log(chalk.green('✓ Test passed'));
      testResults.passed++;
    } else {
      console.log(chalk.red('✗ Test failed'));
      console.log(chalk.yellow(`Reason: ${result.reason}`));
      testResults.failed++;
    }
    
    testResults.tests.push({
      name,
      query,
      response,
      result
    });
  } catch (error) {
    console.error(chalk.red(`Error in test "${name}": ${error.message}`));
    testResults.failed++;
    testResults.tests.push({
      name,
      query,
      error: error.message,
      result: { success: false, reason: 'Test threw an exception' }
    });
  }
}

/**
 * Initialize the test environment
 */
async function initializeTests() {
  try {
    // Create a test session
    sessionId = await chatbot.createSession(1, "Test Session");
    console.log(chalk.green(`Created test session with ID: ${sessionId}`));
  } catch (error) {
    console.error(chalk.red(`Failed to initialize tests: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  await initializeTests();
  
  // Test 1: Patient Count Query
  await runTest(
    'Patient Count Query',
    'How many patients do we have?',
    async (response) => {
      // Get the actual count from the database
      const result = await db
        .select({ count: sql`count(*)` })
        .from(patients);
      
      const actualCount = result[0].count;
      
      // Check if the response contains the correct count
      if (response.includes(`${actualCount} patient`)) {
        return { 
          success: true,
          actualCount
        };
      } else {
        return { 
          success: false, 
          reason: `Response doesn't contain the correct patient count (${actualCount})`,
          actualCount
        };
      }
    }
  );
  
  // Test 2: Patient Goals Query
  await runTest(
    'Patient Goals Query',
    'What are the goals for patient John Smith?',
    async (response) => {
      // First find if there's a patient named John Smith
      const patientResults = await db
        .select()
        .from(patients)
        .where(sql`lower(name) like '%john smith%'`);
      
      if (patientResults.length === 0) {
        // If no patient with this name exists, the response should indicate that
        if (response.toLowerCase().includes('no data') || 
            response.toLowerCase().includes('not found') || 
            response.toLowerCase().includes('no patient')) {
          return { success: true };
        } else {
          return { 
            success: false, 
            reason: 'No patient named John Smith exists, but response doesn\'t indicate that'
          };
        }
      } else {
        // If patient exists, check if their goals are mentioned
        const patientId = patientResults[0].id;
        const goalResults = await db
          .select()
          .from(goals)
          .where(eq(goals.patientId, patientId));
        
        if (goalResults.length === 0) {
          // Patient exists but has no goals
          if (response.toLowerCase().includes('no goals') || 
              response.toLowerCase().includes('doesn\'t have any goals') ||
              response.toLowerCase().includes('does not have any goals')) {
            return { success: true };
          } else {
            return { 
              success: false, 
              reason: 'Patient exists but has no goals, response doesn\'t indicate that'
            };
          }
        } else {
          // Check if at least one goal title is mentioned in the response
          const goalMentioned = goalResults.some(goal => 
            response.toLowerCase().includes(goal.title.toLowerCase())
          );
          
          if (goalMentioned) {
            return { success: true };
          } else {
            return { 
              success: false, 
              reason: 'Response doesn\'t mention any of the patient\'s goals'
            };
          }
        }
      }
    }
  );
  
  // Test 3: Expiring Budgets Query
  await runTest(
    'Expiring Budgets Query',
    'Which patients have budgets expiring soon?',
    async (response) => {
      // Get patients with budgets expiring in the next 30 days
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + 30);
      
      const currentDateStr = currentDate.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const expiringBudgets = await db
        .select({
          patientId: budgetSettings.patientId,
          patientName: patients.name,
          endOfPlan: budgetSettings.endOfPlan
        })
        .from(budgetSettings)
        .innerJoin(patients, eq(budgetSettings.patientId, patients.id))
        .where(
          sql`${budgetSettings.endOfPlan} >= ${currentDateStr} AND 
              ${budgetSettings.endOfPlan} <= ${futureDateStr} AND
              ${budgetSettings.isActive} = true AND
              ${budgetSettings.endOfPlan} IS NOT NULL`
        );
      
      if (expiringBudgets.length === 0) {
        // No budgets expiring soon
        if (response.toLowerCase().includes('no patients') || 
            response.toLowerCase().includes('no budgets') ||
            response.toLowerCase().includes('not found')) {
          return { success: true };
        } else {
          return { 
            success: false, 
            reason: 'No budgets are expiring soon, but response doesn\'t indicate that'
          };
        }
      } else {
        // Check if at least one patient name is mentioned in the response
        const patientMentioned = expiringBudgets.some(budget => 
          response.toLowerCase().includes(budget.patientName.toLowerCase())
        );
        
        if (patientMentioned) {
          return { success: true };
        } else {
          return { 
            success: false, 
            reason: 'Response doesn\'t mention any patients with expiring budgets'
          };
        }
      }
    }
  );
  
  // Test 4: Caregiver Information Query
  await runTest(
    'Caregiver Information Query',
    'Who are the caregivers for patient with ID 1?',
    async (response) => {
      // Check if patient with ID 1 exists
      const patientResult = await db
        .select()
        .from(patients)
        .where(eq(patients.id, 1));
      
      if (patientResult.length === 0) {
        // Patient doesn't exist
        if (response.toLowerCase().includes('no patient') || 
            response.toLowerCase().includes('not found')) {
          return { success: true };
        } else {
          return { 
            success: false, 
            reason: 'Patient with ID 1 doesn\'t exist, but response doesn\'t indicate that'
          };
        }
      } else {
        // Get caregivers for patient
        const caregiverResults = await db
          .select()
          .from(caregivers)
          .where(eq(caregivers.patientId, 1));
        
        if (caregiverResults.length === 0) {
          // Patient has no caregivers
          if (response.toLowerCase().includes('no caregivers') || 
              response.toLowerCase().includes('doesn\'t have any caregivers') ||
              response.toLowerCase().includes('does not have any caregivers')) {
            return { success: true };
          } else {
            return { 
              success: false, 
              reason: 'Patient has no caregivers, but response doesn\'t indicate that'
            };
          }
        } else {
          // Check if at least one caregiver name is mentioned in the response
          const caregiverMentioned = caregiverResults.some(caregiver => 
            response.toLowerCase().includes(caregiver.name.toLowerCase())
          );
          
          if (caregiverMentioned) {
            return { success: true };
          } else {
            return { 
              success: false, 
              reason: 'Response doesn\'t mention any of the patient\'s caregivers'
            };
          }
        }
      }
    }
  );

  // Test 5: General Question
  await runTest(
    'General Question',
    'What services do you provide?',
    async (response) => {
      // For general questions, we just check if the response is non-empty and makes sense
      if (response.length > 50 && 
          (response.toLowerCase().includes('service') || 
           response.toLowerCase().includes('assist') ||
           response.toLowerCase().includes('help') ||
           response.toLowerCase().includes('provide'))) {
        return { success: true };
      } else {
        return { 
          success: false, 
          reason: 'Response doesn\'t adequately answer the general question'
        };
      }
    }
  );
  
  // Print summary
  console.log(chalk.blue('\n----- Test Summary -----'));
  console.log(chalk.green(`Passed: ${testResults.passed}`));
  console.log(chalk.red(`Failed: ${testResults.failed}`));
  console.log(chalk.blue(`Total: ${testResults.passed + testResults.failed}`));
  
  // Detailed results for failed tests
  if (testResults.failed > 0) {
    console.log(chalk.yellow('\nFailed Tests:'));
    testResults.tests
      .filter(test => !test.result?.success)
      .forEach(test => {
        console.log(chalk.red(`- ${test.name}`));
        console.log(`  Query: "${test.query}"`);
        console.log(`  Response: "${test.response || 'Error'}"`);
        console.log(`  Reason: ${test.result?.reason || test.error}`);
      });
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error(chalk.red(`Test execution failed: ${error.message}`));
}).finally(() => {
  // Clean up
  console.log(chalk.blue('\nCleaning up test environment...'));
  process.exit(0);
});
