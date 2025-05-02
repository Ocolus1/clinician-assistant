/**
 * Enhanced Patient Identification Test
 * 
 * Tests the ability of the entity extraction service to identify patients
 * using name, original name, and unique identifier fields.
 */

import chalk from 'chalk';
import { entityExtractionService } from './mocks/entityExtractionService.mock.js';

// Test cases for patient identification
const testCases = [
  {
    name: 'Extract patient name (first and last)',
    query: 'Find patient John Smith',
    expected: {
      type: 'name',
      value: 'John Smith'
    }
  },
  {
    name: 'Extract patient name (first only)',
    query: 'Show me details for Sarah',
    expected: {
      type: 'name',
      value: 'Sarah'
    }
  },
  {
    name: 'Extract patient name (with possessive)',
    query: "What is John Smith's goal progress?",
    expected: {
      type: 'name',
      value: 'John Smith'
    }
  },
  {
    name: 'Extract patient identifier (with # symbol)',
    query: 'Find patient #123456',
    expected: {
      type: 'identifier',
      value: '123456'
    }
  },
  {
    name: 'Extract patient identifier (with ID keyword)',
    query: 'Show me the patient with ID 987654',
    expected: {
      type: 'identifier',
      value: '987654'
    }
  },
  {
    name: 'Extract patient identifier (standalone)',
    query: 'Look up 456789',
    expected: {
      type: 'identifier',
      value: '456789'
    }
  },
  {
    name: 'Extract patient name with middle name',
    query: 'Find patient John Robert Smith',
    expected: {
      type: 'name',
      value: 'John Robert Smith'
    }
  }
];

/**
 * Run all test cases for patient identification
 */
async function runTests() {
  console.log(chalk.blue.bold('\n=== Enhanced Patient Identification Tests ===\n'));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    process.stdout.write(chalk.cyan(`Test: ${testCase.name}... `));
    
    try {
      const result = await entityExtractionService.extractEntities(testCase.query);
      
      let extractedValue = null;
      let extractedType = null;
      
      if (result.patientName) {
        extractedValue = result.patientName;
        extractedType = 'name';
      } else if (result.patientIdentifier) {
        extractedValue = result.patientIdentifier;
        extractedType = 'identifier';
      }
      
      const expectedType = testCase.expected.type;
      const expectedValue = testCase.expected.value;
      
      if (extractedType === expectedType && extractedValue === expectedValue) {
        console.log(chalk.green('PASSED'));
        passed++;
      } else {
        console.log(chalk.red('FAILED'));
        console.log(chalk.red(`  Expected: ${expectedType} - ${expectedValue}`));
        console.log(chalk.red(`  Got: ${extractedType || 'none'} - ${extractedValue || 'none'}`));
        failed++;
      }
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
  name: 'Enhanced Patient Identification',
  run: runTests
};

// Run the tests if this file is executed directly
if (import.meta.url === import.meta.main) {
  runTests();
}
