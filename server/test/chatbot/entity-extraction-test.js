/**
 * Entity Extraction Test
 * 
 * This script tests the entity extraction service to ensure it correctly
 * identifies different query types and extracts relevant entities.
 */

import { entityExtractionService } from '../../services/entityExtractionService.js';
import chalk from 'chalk';

// Test cases for different query types
const testCases = [
  {
    type: 'PATIENT_INFO',
    queries: [
      'Tell me about patient John Smith',
      'What is the information for patient ID 1?',
      'Show me details for Sarah Johnson',
      'Patient information for Michael Brown'
    ]
  },
  {
    type: 'PATIENT_GOALS',
    queries: [
      'What are the goals for patient John Smith?',
      'Show me the goals for patient ID 2',
      'List all goals for Sarah Johnson',
      'What is patient Michael working on?'
    ]
  },
  {
    type: 'GOAL_PROGRESS',
    queries: [
      'How is John Smith progressing on his goals?',
      'Show me the progress for patient ID 3\'s goals',
      'What\'s the status of Sarah\'s therapy goals?',
      'Progress update on Michael\'s treatment goals'
    ]
  },
  {
    type: 'SESSION_INFO',
    queries: [
      'When is the next session for John Smith?',
      'Show me the last session notes for patient ID 4',
      'List all sessions for Sarah Johnson',
      'What happened in Michael\'s last therapy session?'
    ]
  },
  {
    type: 'BUDGET_INFO',
    queries: [
      'What\'s the budget status for John Smith?',
      'How much funding does patient ID 5 have left?',
      'Show me Sarah Johnson\'s NDIS budget',
      'Which patients have budgets expiring soon?'
    ]
  },
  {
    type: 'CAREGIVER_INFO',
    queries: [
      'Who are the caregivers for John Smith?',
      'List all caregivers for patient ID 6',
      'Tell me about Sarah\'s family support',
      'Contact information for Michael\'s caregivers'
    ]
  },
  {
    type: 'CLINICIAN_INFO',
    queries: [
      'Who is the primary therapist for John Smith?',
      'Which clinicians work with patient ID 7?',
      'Show me Sarah\'s therapy team',
      'List all clinicians assigned to Michael'
    ]
  },
  {
    type: 'PATIENT_COUNT',
    queries: [
      'How many patients do we have?',
      'What is the total number of patients?',
      'Count the patients in our system',
      'Tell me the patient count'
    ]
  },
  {
    type: 'GENERAL_QUESTION',
    queries: [
      'What services do you provide?',
      'How does the NDIS funding work?',
      'Tell me about your therapy approach',
      'What is the process for onboarding new patients?'
    ]
  }
];

/**
 * Run the entity extraction tests
 */
async function runTests() {
  console.log(chalk.blue('===== Entity Extraction Service Test =====\n'));
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    console.log(chalk.yellow(`\n----- Testing ${testCase.type} Queries -----`));
    
    for (const query of testCase.queries) {
      totalTests++;
      try {
        console.log(`Query: "${query}"`);
        const entities = await entityExtractionService.extractEntities(query);
        console.log(`Extracted query type: ${entities.queryType}`);
        
        // Check if the extracted query type matches the expected type
        if (entities.queryType === testCase.type) {
          console.log(chalk.green('✓ Correctly identified'));
          passedTests++;
        } else {
          console.log(chalk.red(`✗ Incorrectly identified as ${entities.queryType} (expected ${testCase.type})`));
          failedTests++;
        }
        
        // Print extracted entities
        console.log('Extracted entities:');
        for (const [key, value] of Object.entries(entities)) {
          if (key !== 'queryType' && value !== undefined && value !== null) {
            console.log(`  - ${key}: ${JSON.stringify(value)}`);
          }
        }
        console.log('---');
      } catch (error) {
        console.error(chalk.red(`Error extracting entities for "${query}": ${error.message}`));
        failedTests++;
      }
    }
  }
  
  // Print summary
  console.log(chalk.blue('\n===== Test Summary ====='));
  console.log(chalk.green(`Passed: ${passedTests}`));
  console.log(chalk.red(`Failed: ${failedTests}`));
  console.log(chalk.blue(`Total: ${totalTests}`));
  
  const passRate = (passedTests / totalTests) * 100;
  console.log(chalk.blue(`Pass Rate: ${passRate.toFixed(2)}%`));
  
  if (failedTests === 0) {
    console.log(chalk.green('\nAll entity extraction tests passed!'));
  } else {
    console.log(chalk.yellow('\nSome tests failed. The entity extraction service may need improvements.'));
    
    // Suggestions for improvement
    console.log(chalk.blue('\nSuggestions for improvement:'));
    console.log('1. Update the extraction prompt to better handle the failed query types');
    console.log('2. Add more examples to the training data for the problematic query types');
    console.log('3. Consider adding more specific entity types for specialized queries');
  }
}

// Run the tests
runTests().catch(error => {
  console.error(chalk.red(`Test execution failed: ${error.message}`));
});
