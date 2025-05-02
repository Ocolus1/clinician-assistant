/**
 * Expiring Budgets Query Test
 * 
 * This script tests the chatbot's ability to correctly identify and respond to
 * queries about patients with expiring budgets.
 */

import loadEnv from './utils/load-env.js';

// Load environment variables from .env file
const envLoaded = loadEnv();
if (!envLoaded) {
  console.error('Failed to load environment variables. Exiting test.');
  process.exit(1);
}

import { db } from '../../db.js';
import { patients, budgetSettings } from '../../../shared/schema.js';
import { entityExtractionService } from '../../services/entityExtractionService.js';
import { patientQueriesService } from '../../services/patientQueriesService.js';
import { ChatbotService } from '../../services/chatbotService.js';
import { sql } from 'drizzle-orm';
import chalk from 'chalk';

// Create a new chatbot instance for testing
const chatbot = new ChatbotService();
let sessionId;

// Test queries for expiring budgets in different phrasings
const expiringBudgetQueries = [
  'Which patients have expiring budgets?',
  'Show me patients with budgets about to expire',
  'List all patients with expiring budgets',
  'Who has a budget that will expire soon?',
  'Patients with budgets ending soon',
  'Expiring budget patients',
  'Show expiring budgets',
  'Which patients need budget renewal?'
];

/**
 * Initialize the test environment
 */
async function initializeTests() {
  try {
    // Create a test session
    sessionId = await chatbot.createSession(1, "Expiring Budgets Test Session");
    console.log(chalk.green(`Created test session with ID: ${sessionId}`));
    
    // Get the actual count of patients with expiring budgets
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const result = await db
      .select({
        count: sql`count(DISTINCT ${patients.id})`
      })
      .from(patients)
      .innerJoin(
        budgetSettings,
        sql`${budgetSettings.patientId} = ${patients.id} AND 
            ${budgetSettings.endOfPlan} <= ${thirtyDaysFromNow.toISOString()} AND
            ${budgetSettings.endOfPlan} >= ${new Date().toISOString()} AND
            ${budgetSettings.isActive} = true`
      );
    
    const expiringCount = result[0].count;
    console.log(chalk.blue(`Actual count of patients with expiring budgets: ${expiringCount}`));
    
    return expiringCount;
  } catch (error) {
    console.error(chalk.red(`Failed to initialize tests: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Test entity extraction for expiring budget queries
 */
async function testEntityExtraction() {
  console.log(chalk.blue('\n----- Testing Entity Extraction -----'));
  
  for (const query of expiringBudgetQueries) {
    try {
      const entities = await entityExtractionService.extractEntities(query);
      console.log(`Query: "${query}"`);
      console.log(`Extracted query type: ${entities.queryType}`);
      
      if (entities.queryType === 'EXPIRING_BUDGETS') {
        console.log(chalk.green('✓ Correctly identified as EXPIRING_BUDGETS'));
      } else {
        console.log(chalk.red(`✗ Incorrectly identified as ${entities.queryType}`));
      }
      console.log('---');
    } catch (error) {
      console.error(chalk.red(`Error extracting entities for "${query}": ${error.message}`));
    }
  }
}

/**
 * Test expiring budgets query responses
 */
async function testExpiringBudgetResponses(expiringCount) {
  console.log(chalk.blue('\n----- Testing Expiring Budgets Responses -----'));
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const query of expiringBudgetQueries) {
    try {
      console.log(`Query: "${query}"`);
      const response = await chatbot.processMessage(query);
      console.log(`Response: "${response}"`);
      
      // Check if the response is appropriate
      if (expiringCount > 0) {
        // If there are expiring budgets, the response should mention patients
        if (response.includes('patient') && 
            (response.includes('expiring') || response.includes('expire') || 
             response.includes('ending') || response.includes('renewal'))) {
          console.log(chalk.green('✓ Response correctly mentions patients with expiring budgets'));
          passedTests++;
        } else {
          console.log(chalk.red('✗ Response does not properly address expiring budgets'));
          failedTests++;
        }
      } else {
        // If there are no expiring budgets, the response should indicate that
        if (response.includes('no patients') || 
            response.includes('not found') || 
            response.includes('0 patients')) {
          console.log(chalk.green('✓ Response correctly indicates no expiring budgets'));
          passedTests++;
        } else {
          console.log(chalk.red('✗ Response does not properly indicate no expiring budgets'));
          failedTests++;
        }
      }
      console.log('---');
    } catch (error) {
      console.error(chalk.red(`Error processing query "${query}": ${error.message}`));
      failedTests++;
    }
  }
  
  return { passedTests, failedTests };
}

/**
 * Run all tests
 */
async function runAllTests() {
  const expiringCount = await initializeTests();
  
  // Test entity extraction
  await testEntityExtraction();
  
  // Test expiring budgets responses
  const { passedTests, failedTests } = await testExpiringBudgetResponses(expiringCount);
  
  // Print summary
  console.log(chalk.blue('\n----- Test Summary -----'));
  console.log(chalk.green(`Passed: ${passedTests}`));
  console.log(chalk.red(`Failed: ${failedTests}`));
  console.log(chalk.blue(`Total: ${expiringBudgetQueries.length}`));
  
  if (failedTests === 0) {
    console.log(chalk.green('\nAll expiring budgets tests passed! The implementation is working correctly.'));
  } else {
    console.log(chalk.yellow('\nSome tests failed. The expiring budgets query may need improvements.'));
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
