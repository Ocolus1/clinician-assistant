/**
 * Patient Count Query Test
 * 
 * This script specifically tests the chatbot's ability to correctly respond to
 * patient count queries in different phrasings.
 */

import loadEnv from './load-env';

// Load environment variables from .env file
const envLoaded = loadEnv();
if (!envLoaded) {
  console.error('Failed to load environment variables. Exiting test.');
  process.exit(1);
}

import { db } from '../../../db';
import { patients } from '../../../../shared/schema';
import { entityExtractionService } from '../../../services/entityExtractionService';
import { eq } from 'drizzle-orm';
import chalk from 'chalk';

// Test queries for patient count
const patientCountQueries = [
  "How many patients do we have?",
  "What is our total patient count?",
  "Count of all patients",
  "Number of patients in the system",
  "Patient count",
  "Total patients",
  "How many patients are registered?",
  "Patient total"
];

async function runPatientCountTest() {
  console.log(chalk.blue('===== Patient Count Query Test =====\n'));
  
  try {
    // Get the actual patient count from the database
    const patientCount = await db.select({ count: patients.id }).from(patients);
    const actualCount = patientCount.length;
    
    console.log(chalk.yellow(`Actual patient count in database: ${actualCount}\n`));
    
    let passCount = 0;
    let failCount = 0;
    
    // Test each query
    for (const query of patientCountQueries) {
      console.log(chalk.cyan(`Query: "${query}"`));
      
      // Extract entities from the query
      const entities = await entityExtractionService.extractEntities(query);
      
      // Check if the query type is correctly identified as PATIENT_COUNT
      if (entities.queryType === 'PATIENT_COUNT') {
        console.log(chalk.green('✓ Correctly identified as PATIENT_COUNT'));
        passCount++;
      } else {
        console.log(chalk.red(`✗ Incorrectly identified as ${entities.queryType} (expected PATIENT_COUNT)`));
        failCount++;
      }
      
      console.log(chalk.gray('Extracted entities:'));
      console.log(chalk.gray(JSON.stringify(entities, null, 2)));
      console.log('---');
    }
    
    // Print test summary
    console.log(chalk.blue('\n===== Test Summary ====='));
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Total: ${patientCountQueries.length}`);
    console.log(`Pass Rate: ${(passCount / patientCountQueries.length * 100).toFixed(2)}%`);
    
    if (failCount > 0) {
      console.log(chalk.yellow('\nSome queries were not correctly identified as PATIENT_COUNT.'));
      console.log(chalk.yellow('Consider updating the entity extraction service to better handle these queries.'));
      process.exit(1);
    } else {
      console.log(chalk.green('\nAll patient count queries were correctly identified!'));
      process.exit(0);
    }
    
  } catch (error) {
    console.error(chalk.red('Error running patient count test:'), error);
    process.exit(1);
  }
}

// Run the test
runPatientCountTest();
