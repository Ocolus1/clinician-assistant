/**
 * Chatbot Test Runner
 * 
 * This script runs all the chatbot test files and reports the results.
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test files to run
const testFiles = [
  'patient-count-test.js',
  'entity-extraction-test.js',
  'chatbot-test.js'
];

console.log(chalk.blue('===== Chatbot Test Suite =====\n'));
console.log(chalk.yellow('Running tests to verify chatbot functionality...'));

/**
 * Run a test file and return a promise that resolves when the process exits
 */
function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`\n----- Running ${testFile} -----\n`));
    
    const testProcess = spawn('node', [path.join(__dirname, testFile)], {
      stdio: 'inherit'
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`\n✓ ${testFile} completed successfully`));
        resolve();
      } else {
        console.log(chalk.red(`\n✗ ${testFile} failed with exit code ${code}`));
        resolve(); // Still resolve to continue with other tests
      }
    });
    
    testProcess.on('error', (err) => {
      console.error(chalk.red(`Error running ${testFile}: ${err.message}`));
      resolve(); // Still resolve to continue with other tests
    });
  });
}

/**
 * Run all tests sequentially
 */
async function runAllTests() {
  for (const testFile of testFiles) {
    await runTest(testFile);
  }
  
  console.log(chalk.blue('\n===== Test Suite Complete ====='));
  console.log(chalk.yellow('Review the test results above to determine if the chatbot is functioning correctly.'));
  console.log(chalk.yellow('If all tests pass, the chatbot is ready for Phase 3 development.'));
}

// Run all tests
runAllTests().catch(error => {
  console.error(chalk.red(`Test suite execution failed: ${error.message}`));
});
