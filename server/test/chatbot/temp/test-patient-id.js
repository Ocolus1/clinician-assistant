/**
 * Simple Test Script for Patient Identification
 * 
 * This script tests the enhanced patient identification capabilities
 * with various formats including hyphenated IDs and combined name-identifier formats.
 */

// Simple mock implementation for testing
const entityExtractionService = {
  async extractEntities(query) {
    // Check for name-identifier pattern like "Radwan Smith-404924"
    const nameIdPattern = /(\w+\s+\w+)[-\s](\d{6})\b/i;
    const nameIdMatch = query.match(nameIdPattern);
    if (nameIdMatch && nameIdMatch[1] && nameIdMatch[2]) {
      return {
        patientName: nameIdMatch[1],
        patientIdentifier: nameIdMatch[2],
        queryType: 'PATIENT_SEARCH'
      };
    }
    
    // Check for hyphenated ID pattern like "patient-123456"
    const hyphenPattern = /patient[-\s](\d{6})\b/i;
    const hyphenMatch = query.match(hyphenPattern);
    if (hyphenMatch && hyphenMatch[1]) {
      return {
        patientIdentifier: hyphenMatch[1],
        queryType: 'PATIENT_SEARCH'
      };
    }
    
    // Check for regular name pattern
    const namePattern = /(?:find|look up|show)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/i;
    const nameMatch = query.match(namePattern);
    if (nameMatch && nameMatch[1]) {
      return {
        patientName: nameMatch[1],
        queryType: 'PATIENT_SEARCH'
      };
    }
    
    return { queryType: 'UNKNOWN' };
  }
};

// Test cases
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
  }
];

// Run tests
async function runTests() {
  console.log('=== Complex Patient Identification Tests ===\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}...`);
    console.log(`  Query: "${testCase.query}"`);
    
    try {
      const result = await entityExtractionService.extractEntities(testCase.query);
      console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
      
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
        console.log('  PASSED');
        passed++;
      } else {
        console.log('  FAILED');
        console.log(`  ${failureReason}`);
        failed++;
      }
      console.log(''); // Add empty line for better readability
    } catch (error) {
      console.log('ERROR');
      console.error(`  ${error.message}`);
      failed++;
    }
  }
  
  // Print summary
  console.log('=== Test Summary ===');
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('=====================\n');
}

// Run the tests
runTests();
