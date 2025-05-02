/**
 * Patient Count Query Test
 * 
 * This script specifically tests the chatbot's ability to correctly respond to
 * patient count queries in different phrasings.
 */

import loadEnv from './utils/load-env.js';

// Load environment variables from .env file
const envLoaded = loadEnv();
if (!envLoaded) {
  console.error('Failed to load environment variables. Exiting test.');
  process.exit(1);
}

import { db } from '../../db.js';
import { patients } from '../../../shared/schema.js';
import { entityExtractionService } from '../../services/entityExtractionService.js';
import { patientQueriesService } from '../../services/patientQueriesService.js';
import { ChatbotService } from '../../services/chatbotService.js';
import { sql } from 'drizzle-orm';
import chalk from 'chalk';

// Create a new chatbot instance for testing
const chatbot = new ChatbotService();
let sessionId;

// Test queries for patient count in different phrasings
const patientCountQueries = [
  'How many patients do we have?',
  'What is the total number of patients?',
  'Count the patients in our system',
  'Tell me the patient count',
  'How many patients are registered?',
  'Total patients in the database?',
  'Number of patients we have',
  'Patient count'
];

/**
 * Initialize the test environment
 */
async function initializeTests() {
  try {
    // Create a test session
    sessionId = await chatbot.createSession(1, "Patient Count Test Session");
    console.log(chalk.green(`Created test session with ID: ${sessionId}`));
    
    // Get the actual patient count from the database
    const result = await db
      .select({ count: sql`count(*)` })
      .from(patients);
    
    const actualCount = result[0].count;
    console.log(chalk.blue(`Actual patient count in database: ${actualCount}`));
    
    return actualCount;
  } catch (error) {
    console.error(chalk.red(`Failed to initialize tests: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Test entity extraction for patient count queries
 */
async function testEntityExtraction() {
  console.log(chalk.blue('\n----- Testing Entity Extraction -----'));
  
  for (const query of patientCountQueries) {
    try {
      const entities = await entityExtractionService.extractEntities(query);
      console.log(`Query: "${query}"`);
      console.log(`Extracted query type: ${entities.queryType}`);
      
      if (entities.queryType === 'PATIENT_COUNT') {
        console.log(chalk.green('✓ Correctly identified as PATIENT_COUNT'));
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
 * Test patient count query responses
 */
async function testPatientCountResponses(actualCount) {
  console.log(chalk.blue('\n----- Testing Patient Count Responses -----'));
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const query of patientCountQueries) {
    try {
      console.log(`Query: "${query}"`);
      const response = await chatbot.processMessage(query);
      console.log(`Response: "${response}"`);
      
      // Check if the response contains the correct count
      if (response.includes(`${actualCount} patient`)) {
        console.log(chalk.green('✓ Response contains correct patient count'));
        passedTests++;
      } else {
        console.log(chalk.red(`✗ Response doesn't contain correct patient count (${actualCount})`));
        failedTests++;
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
  const actualCount = await initializeTests();
  
  // Test entity extraction
  await testEntityExtraction();
  
  // Test patient count responses
  const { passedTests, failedTests } = await testPatientCountResponses(actualCount);
  
  // Print summary
  console.log(chalk.blue('\n----- Test Summary -----'));
  console.log(chalk.green(`Passed: ${passedTests}`));
  console.log(chalk.red(`Failed: ${failedTests}`));
  console.log(chalk.blue(`Total: ${patientCountQueries.length}`));
  
  if (failedTests === 0) {
    console.log(chalk.green('\nAll patient count tests passed! The fix is working correctly.'));
  } else {
    console.log(chalk.yellow('\nSome tests failed. The patient count query may need further improvements.'));
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
