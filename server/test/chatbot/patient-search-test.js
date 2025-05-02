/**
 * Patient Search Query Test
 * 
 * This script tests the chatbot's ability to correctly identify and respond to
 * queries about searching for patients by name.
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
import { like } from 'drizzle-orm';
import chalk from 'chalk';

// Create a new chatbot instance for testing
const chatbot = new ChatbotService();
let sessionId;

// Test queries for patient search in different phrasings
const patientSearchQueries = [
  'Find patient named {name}',
  'Search for patient {name}',
  'Look up {name} in our system',
  'Do we have a patient named {name}?',
  'Is {name} one of our patients?',
  'Show me patient {name}\'s information',
  'Get details for {name}',
  'Find {name} in our database'
];

/**
 * Initialize the test environment
 */
async function initializeTests() {
  try {
    // Create a test session
    sessionId = await chatbot.createSession(1, "Patient Search Test Session");
    console.log(chalk.green(`Created test session with ID: ${sessionId}`));
    
    // Get a sample of patients from the database for testing
    const patientSample = await db
      .select({
        id: patients.id,
        name: patients.name
      })
      .from(patients)
      .limit(3);
    
    if (patientSample.length === 0) {
      console.error(chalk.red('No patients found in the database for testing'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`Found ${patientSample.length} patients for testing:`));
    patientSample.forEach(p => console.log(chalk.blue(`- ${p.name} (ID: ${p.id})`)));
    
    // Also create a non-existent patient name for negative testing
    const nonExistentName = "NonExistentPatient" + Math.floor(Math.random() * 10000);
    
    // Verify this patient doesn't exist
    const checkNonExistent = await db
      .select({ count: db.count() })
      .from(patients)
      .where(like(patients.name, `%${nonExistentName}%`));
    
    if (checkNonExistent[0].count > 0) {
      console.log(chalk.yellow(`Warning: Randomly generated name ${nonExistentName} actually exists in the database. Trying another name.`));
      return initializeTests(); // Try again with a different random name
    }
    
    console.log(chalk.blue(`Non-existent patient name for testing: ${nonExistentName}`));
    
    return {
      existingPatients: patientSample,
      nonExistentName
    };
  } catch (error) {
    console.error(chalk.red(`Failed to initialize tests: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Test entity extraction for patient search queries
 */
async function testEntityExtraction(patientData) {
  console.log(chalk.blue('\n----- Testing Entity Extraction -----'));
  
  const allTestCases = [];
  
  // Test with existing patients
  for (const patient of patientData.existingPatients) {
    const personalizedQueries = patientSearchQueries.map(q => 
      q.replace('{name}', patient.name)
    );
    
    for (const query of personalizedQueries) {
      try {
        const entities = await entityExtractionService.extractEntities(query);
        console.log(`Query: "${query}"`);
        console.log(`Extracted query type: ${entities.queryType}`);
        console.log(`Extracted patient name: ${entities.patientName || 'None'}`);
        
        const correctQueryType = entities.queryType === 'PATIENT_SEARCH';
        const correctPatientName = entities.patientName && 
                                  entities.patientName.toLowerCase().includes(patient.name.toLowerCase());
        
        if (correctQueryType && correctPatientName) {
          console.log(chalk.green('✓ Correctly identified query type and patient name'));
        } else if (correctQueryType) {
          console.log(chalk.yellow('⚠ Correctly identified query type but missed patient name'));
        } else if (correctPatientName) {
          console.log(chalk.yellow('⚠ Correctly identified patient name but wrong query type'));
        } else {
          console.log(chalk.red('✗ Failed to identify both query type and patient name'));
        }
        console.log('---');
        
        allTestCases.push({
          query,
          patientName: patient.name,
          patientExists: true,
          patientId: patient.id
        });
      } catch (error) {
        console.error(chalk.red(`Error extracting entities for "${query}": ${error.message}`));
      }
    }
  }
  
  // Test with non-existent patient
  const nonExistentQueries = patientSearchQueries.map(q => 
    q.replace('{name}', patientData.nonExistentName)
  );
  
  for (const query of nonExistentQueries) {
    try {
      const entities = await entityExtractionService.extractEntities(query);
      console.log(`Query: "${query}" (non-existent patient)`);
      console.log(`Extracted query type: ${entities.queryType}`);
      console.log(`Extracted patient name: ${entities.patientName || 'None'}`);
      
      const correctQueryType = entities.queryType === 'PATIENT_SEARCH';
      const extractedName = entities.patientName && 
                           entities.patientName.toLowerCase().includes(patientData.nonExistentName.toLowerCase());
      
      if (correctQueryType && extractedName) {
        console.log(chalk.green('✓ Correctly identified query type and extracted non-existent name'));
      } else if (correctQueryType) {
        console.log(chalk.yellow('⚠ Correctly identified query type but missed non-existent name'));
      } else if (extractedName) {
        console.log(chalk.yellow('⚠ Correctly extracted non-existent name but wrong query type'));
      } else {
        console.log(chalk.red('✗ Failed to identify both query type and non-existent name'));
      }
      console.log('---');
      
      allTestCases.push({
        query,
        patientName: patientData.nonExistentName,
        patientExists: false,
        patientId: null
      });
    } catch (error) {
      console.error(chalk.red(`Error extracting entities for "${query}": ${error.message}`));
    }
  }
  
  return allTestCases;
}

/**
 * Test patient search query responses
 */
async function testPatientSearchResponses(testCases) {
  console.log(chalk.blue('\n----- Testing Patient Search Responses -----'));
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`Query: "${testCase.query}"`);
      console.log(`Patient: ${testCase.patientName} (Exists: ${testCase.patientExists})`);
      
      const response = await chatbot.processMessage(testCase.query);
      console.log(`Response: "${response}"`);
      
      // Check if the response is appropriate
      const mentionsPatient = response.toLowerCase().includes(testCase.patientName.toLowerCase());
      
      if (testCase.patientExists) {
        // For existing patients, should mention the patient and provide information
        const providesInfo = response.toLowerCase().includes('id') || 
                            response.toLowerCase().includes('information') ||
                            response.toLowerCase().includes('details') ||
                            response.toLowerCase().includes('found');
        
        if (mentionsPatient && providesInfo) {
          console.log(chalk.green('✓ Response correctly provides information about the existing patient'));
          passedTests++;
        } else {
          let issues = [];
          if (!mentionsPatient) issues.push("doesn't mention patient name");
          if (!providesInfo) issues.push("doesn't provide patient information");
          
          console.log(chalk.red(`✗ Response has issues: ${issues.join(', ')}`));
          failedTests++;
        }
      } else {
        // For non-existent patients, should indicate patient not found
        const indicatesNotFound = response.toLowerCase().includes('not found') || 
                                 response.toLowerCase().includes('no patient') ||
                                 response.toLowerCase().includes('doesn\'t exist') ||
                                 response.toLowerCase().includes('does not exist') ||
                                 response.toLowerCase().includes('couldn\'t find');
        
        if (mentionsPatient && indicatesNotFound) {
          console.log(chalk.green('✓ Response correctly indicates the patient does not exist'));
          passedTests++;
        } else {
          let issues = [];
          if (!mentionsPatient) issues.push("doesn't mention the queried name");
          if (!indicatesNotFound) issues.push("doesn't clearly indicate patient not found");
          
          console.log(chalk.red(`✗ Response has issues: ${issues.join(', ')}`));
          failedTests++;
        }
      }
      console.log('---');
    } catch (error) {
      console.error(chalk.red(`Error processing query "${testCase.query}": ${error.message}`));
      failedTests++;
    }
  }
  
  return { passedTests, failedTests, total: testCases.length };
}

/**
 * Run all tests
 */
async function runAllTests() {
  const patientData = await initializeTests();
  
  // Test entity extraction
  const testCases = await testEntityExtraction(patientData);
  
  // Test patient search responses
  const { passedTests, failedTests, total } = await testPatientSearchResponses(testCases);
  
  // Print summary
  console.log(chalk.blue('\n----- Test Summary -----'));
  console.log(chalk.green(`Passed: ${passedTests}`));
  console.log(chalk.red(`Failed: ${failedTests}`));
  console.log(chalk.blue(`Total: ${total}`));
  
  if (failedTests === 0) {
    console.log(chalk.green('\nAll patient search tests passed! The implementation is working correctly.'));
  } else {
    console.log(chalk.yellow('\nSome tests failed. The patient search query may need improvements.'));
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
