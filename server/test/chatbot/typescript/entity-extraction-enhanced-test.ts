/**
 * Enhanced Entity Extraction Test
 * 
 * This script tests the entity extraction service with a focus on the new
 * query types added in Phase 2 of the clinician chatbot implementation.
 */

import loadEnv from './load-env';

// Load environment variables from .env file
const envLoaded = loadEnv();
if (!envLoaded) {
  console.error('Failed to load environment variables. Exiting test.');
  process.exit(1);
}

import { entityExtractionService } from '../../../services/entityExtractionService';
import chalk from 'chalk';

// Define the test queries for different query types
const testQueries = {
  PATIENT_COUNT: [
    "How many patients do we have?",
    "What is our total patient count?",
    "Patient count"
  ],
  EXPIRING_BUDGETS: [
    "Which patients have expiring budgets?",
    "Show me patients with budgets about to expire",
    "List patients with expiring budgets",
    "Who has a budget that will expire soon?",
    "Patients with budgets that will be depleted?"
  ],
  PATIENT_GOAL_PROGRESS: [
    "How is John Smith progressing on their goals?",
    "Show me Sarah Johnson's goal progress",
    "What's the status of David Miller's goals?",
    "Update on Michael Brown's goal progress",
    "Has Emma Wilson made progress on their goals?",
    "Goal progress for Robert Davis",
    "How is Jennifer Taylor doing with their goals?",
    "William Anderson goal status"
  ],
  PATIENT_SEARCH: [
    "Find patient named John Smith",
    "Search for Sarah Johnson",
    "Look up David Miller in our system",
    "Find Michael Brown",
    "Search Emma Wilson",
    "Find patient Robert Davis",
    "Search for Jennifer Taylor",
    "Look up William Anderson"
  ]
};

async function runEnhancedEntityExtractionTest() {
  console.log(chalk.blue('===== Enhanced Entity Extraction Test =====\n'));
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  
  // Test each query type
  for (const [queryType, queries] of Object.entries(testQueries)) {
    console.log(chalk.yellow(`----- Testing ${queryType} Queries -----`));
    
    for (const query of queries) {
      console.log(chalk.cyan(`Query: "${query}"`));
      
      // Extract entities from the query
      const entities = await entityExtractionService.extractEntities(query);
      
      // Check if the query type is correctly identified
      if (entities.queryType === queryType) {
        console.log(chalk.green(`✓ Correctly identified as ${queryType}`));
        totalPassed++;
      } else {
        console.log(chalk.red(`✗ Incorrectly identified as ${entities.queryType} (expected ${queryType})`));
        totalFailed++;
      }
      
      console.log(chalk.gray('Extracted entities:'));
      console.log(chalk.gray(JSON.stringify(entities, null, 2)));
      console.log('---');
      
      totalTests++;
    }
  }
  
  // Print test summary
  console.log(chalk.blue('\n===== Test Summary ====='));
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Total: ${totalTests}`);
  console.log(`Pass Rate: ${(totalPassed / totalTests * 100).toFixed(2)}%`);
  
  if (totalFailed > 0) {
    console.log(chalk.yellow('\nSome tests failed. The entity extraction service may need improvements.'));
    console.log(chalk.yellow('\nSuggestions for improvement:'));
    console.log('1. Update the extraction prompt to better handle the failed query types');
    console.log('2. Add more examples to the training data for the problematic query types');
    console.log('3. Consider adding more specific entity types for specialized queries');
    console.log('4. Ensure all new query types from Phase 2 are properly supported in the entity extraction service');
    process.exit(1);
  } else {
    console.log(chalk.green('\nAll queries were correctly identified!'));
    process.exit(0);
  }
}

// Run the test
runEnhancedEntityExtractionTest();
