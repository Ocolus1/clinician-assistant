/**
 * Complex Patient Identification Test
 * 
 * Tests the ability of the entity extraction service to identify patients
 * using complex formats like "patient-123456" and "Radwan Smith-404924".
 */

import chalk from 'chalk';
import { entityExtractionService } from './mocks/entityExtractionService.mock.js';

// Test cases for complex patient identification
const testCases = [
  {
    name: 'Extract patient identifier with hyphen',
    query: 'Find patient-123456',
    expected: {
      identifier: '123456'
    }
  },
  {
    name: 'Extract patient name with identifier',
    query: 'Look up Radwan Smith-404924',
    expected: {
      name: 'Radwan Smith',
      identifier: '404924'
    }
  },
  {
    name: 'Extract regular name',
    query: 'Find John Doe',
    expected: {
      name: 'John Doe'
    }
  },
  {
    name: 'Extract patient name with identifier in middle',
    query: 'Find Sarah Johnson-123456 progress',
    expected: {
      name: 'Sarah Johnson',
      identifier: '123456'
    }
  },
  {
    name: 'Extract patient identifier with "patient" prefix and hyphen',
    query: 'Show me patient-987654',
    expected: {
      identifier: '987654'
    }
  }
];

/**
 * Run all test cases for complex patient identification
 */
async function runTests() {
  console.log(chalk.blue.bold('\n=== Complex Patient Identification Tests ===\n'));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    process.stdout.write(chalk.cyan(`Test: ${testCase.name}... `));
    
    try {
      const result = await entityExtractionService.extractEntities(testCase.query);
      console.log(chalk.yellow(`\n  Query: "${testCase.query}"`));
      console.log(chalk.yellow(`  Result: ${JSON.stringify(result, null, 2)}`));
      
      let success = true;
      let failureReason = '';
      
      // Check identifier if expected
      if (testCase.expected.identifier) {
        if (result.patientIdentifier !== testCase.expected.identifier) {
          success = false;
          failureReason += `Expected identifier: ${testCase.expected.identifier}, Got: ${result.patientIdentifier || 'none'}. `;
        }
      }
      
      // Check name if expected
      if (testCase.expected.name) {
        if (result.patientName !== testCase.expected.name) {
          success = false;
          failureReason += `Expected name: ${testCase.expected.name}, Got: ${result.patientName || 'none'}. `;
        }
      }
      
      if (success) {
        console.log(chalk.green('  PASSED'));
        passed++;
      } else {
        console.log(chalk.red('  FAILED'));
        console.log(chalk.red(`  ${failureReason}`));
        failed++;
      }
      console.log(''); // Add empty line for better readability
    } catch (error) {
      console.log(chalk.red('ERROR'));
      console.error(chalk.red(`  ${error.message}`));
      failed++;
    }
  }
  
  // Print summary
  console.log(chalk.blue('\n=== Test Summary ==='));
  console.log(chalk.blue(`Total tests: ${testCases.length}`));
  console.log(chalk.green(`Passed: ${passed}`));
  console.log(chalk.red(`Failed: ${failed}`));
  console.log(chalk.blue('=====================\n'));
  
  return {
    total: testCases.length,
    passed,
    failed
  };
}

// Export the test function
export default {
  name: 'Complex Patient Identification',
  run: runTests
};

// Run the tests if this file is executed directly
if (import.meta.url === import.meta.main) {
  runTests();
}
