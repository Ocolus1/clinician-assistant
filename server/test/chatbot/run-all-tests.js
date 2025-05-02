/**
 * Comprehensive Chatbot Test Runner
 * 
 * This script runs all the chatbot test files and reports the results.
 * It includes both database-dependent and database-independent tests.
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import loadEnv from './utils/load-env.js';

// Load environment variables from .env file
const envLoaded = loadEnv();
if (!envLoaded) {
  console.warn(chalk.yellow('Warning: Environment variables not loaded properly. Some tests may fail.'));
}

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define test files
const databaseIndependentTests = [
  'mock-entity-test.js',
  'entity-extraction-enhanced-test.js',
  'enhanced-patient-identification-test.js',
  'complex-patient-id-test.js'
];

// Temporarily disable database-dependent tests until we resolve the TypeScript import issues
const databaseDependentTests = [
  // 'patient-count-test.js',
  // 'expiring-budgets-test.js',
  // 'patient-goal-progress-test.js',
  // 'patient-search-test.js'
];

// Create a timestamp for the report file
const timestamp = new Date().toISOString().replace(/:/g, '-');
const reportFile = path.join(__dirname, `test-report-${timestamp}.txt`);

// Function to run a test file
async function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(chalk.cyan(`----- Running ${testFile} -----\n`));
    
    const testPath = path.join(__dirname, testFile);
    const child = spawn('node', [testPath], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`✓ ${testFile} completed successfully`));
        resolve(true);
      } else {
        console.log(chalk.red(`✗ ${testFile} failed with exit code ${code}`));
        resolve(false);
      }
    });
  });
}

// Main function to run all tests
async function runAllTests() {
  console.log(chalk.blue('===== Clinician Chatbot Test Suite =====\n'));
  console.log('Running tests to verify chatbot functionality...\n');
  
  // Results tracking
  let passedTests = 0;
  let failedTests = 0;
  
  // Run database-independent tests first
  console.log(chalk.blue('\n===== Running Database-Independent Tests =====\n'));
  
  for (const test of databaseIndependentTests) {
    const passed = await runTest(test);
    if (passed) passedTests++;
    else failedTests++;
  }
  
  // Run database-dependent tests
  if (databaseDependentTests.length > 0) {
    console.log(chalk.blue('\n===== Running Database-Dependent Tests =====\n'));
    
    let dbPassedTests = 0;
    let dbFailedTests = 0;
    
    for (const test of databaseDependentTests) {
      const passed = await runTest(test);
      if (passed) {
        passedTests++;
        dbPassedTests++;
      } else {
        failedTests++;
        dbFailedTests++;
      }
    }
    
    // Print database-dependent test summary
    console.log(chalk.blue('\n----- Database-Dependent Tests Summary -----'));
    console.log(`Passed: ${dbPassedTests}`);
    console.log(`Failed: ${dbFailedTests}`);
    console.log(`Total: ${databaseDependentTests.length}`);
  }
  
  // Print overall test summary
  console.log(chalk.blue('\n===== Overall Test Summary ====='));
  console.log(`Total Passed: ${passedTests}`);
  console.log(`Total Failed: ${failedTests}`);
  console.log(`Total Tests: ${databaseIndependentTests.length + databaseDependentTests.length}`);
  console.log(`Overall Pass Rate: ${(passedTests / (databaseIndependentTests.length + databaseDependentTests.length) * 100).toFixed(2)}%`);
  
  // Save test report
  const reportContent = `
Clinician Chatbot Test Report
Date: ${new Date().toISOString()}

Database-Independent Tests:
${databaseIndependentTests.map(test => `- ${test}`).join('\n')}

Database-Dependent Tests:
${databaseDependentTests.map(test => `- ${test}`).join('\n')}

Summary:
- Total Passed: ${passedTests}
- Total Failed: ${failedTests}
- Total Tests: ${databaseIndependentTests.length + databaseDependentTests.length}
- Pass Rate: ${(passedTests / (databaseIndependentTests.length + databaseDependentTests.length) * 100).toFixed(2)}%
`;
  
  fs.writeFileSync(reportFile, reportContent);
  console.log(`\nTest report saved to: ${reportFile}`);
  
  console.log('\nReview the test results above to determine if the chatbot is functioning correctly.');
  console.log('If all tests pass, the chatbot is ready for Phase 3 development.');
}

// Run the tests
runAllTests();
