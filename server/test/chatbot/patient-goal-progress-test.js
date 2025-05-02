/**
 * Patient Goal Progress Query Test
 * 
 * This script tests the chatbot's ability to correctly identify and respond to
 * queries about a specific patient's goal progress.
 */

import loadEnv from './utils/load-env.js';

// Load environment variables from .env file
const envLoaded = loadEnv();
if (!envLoaded) {
  console.error('Failed to load environment variables. Exiting test.');
  process.exit(1);
}

import { db } from '../../db.js';
import { patients, goals, goalAssessments } from '../../../shared/schema.js';
import { entityExtractionService } from '../../services/entityExtractionService.js';
import { patientQueriesService } from '../../services/patientQueriesService.js';
import { ChatbotService } from '../../services/chatbotService.js';
import { eq, and, desc } from 'drizzle-orm';
import chalk from 'chalk';

// Create a new chatbot instance for testing
const chatbot = new ChatbotService();
let sessionId;
let testPatientId;
let testPatientName;

// Test queries for patient goal progress in different phrasings
const goalProgressQueries = [
  'How is {patientName} progressing on their goals?',
  'Show me {patientName}\'s goal progress',
  'What\'s the status of {patientName}\'s goals?',
  'Update on {patientName}\'s goal progress',
  'Has {patientName} made progress on their goals?',
  'Goal progress for {patientName}',
  'How is {patientName} doing with their goals?',
  '{patientName} goal status'
];

/**
 * Initialize the test environment
 */
async function initializeTests() {
  try {
    // Create a test session
    sessionId = await chatbot.createSession(1, "Patient Goal Progress Test Session");
    console.log(chalk.green(`Created test session with ID: ${sessionId}`));
    
    // Find a patient with goals and assessments for testing
    const patientsWithGoals = await db
      .select({
        patientId: patients.id,
        patientName: patients.name,
        goalCount: db.count(goals.id)
      })
      .from(patients)
      .leftJoin(goals, eq(goals.patientId, patients.id))
      .groupBy(patients.id)
      .having(db.count(goals.id), '>', 0)
      .limit(1);
    
    if (patientsWithGoals.length === 0) {
      console.error(chalk.red('No patients with goals found for testing'));
      process.exit(1);
    }
    
    testPatientId = patientsWithGoals[0].patientId;
    testPatientName = patientsWithGoals[0].patientName;
    
    // Get goal count and assessment count for the test patient
    const goalCount = patientsWithGoals[0].goalCount;
    
    const assessmentResult = await db
      .select({
        count: db.count()
      })
      .from(goalAssessments)
      .where(eq(goalAssessments.patientId, testPatientId));
    
    const assessmentCount = assessmentResult[0].count;
    
    console.log(chalk.blue(`Test patient: ${testPatientName} (ID: ${testPatientId})`));
    console.log(chalk.blue(`Goals: ${goalCount}, Assessments: ${assessmentCount}`));
    
    return {
      patientId: testPatientId,
      patientName: testPatientName,
      goalCount,
      assessmentCount
    };
  } catch (error) {
    console.error(chalk.red(`Failed to initialize tests: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Test entity extraction for goal progress queries
 */
async function testEntityExtraction(patientName) {
  console.log(chalk.blue('\n----- Testing Entity Extraction -----'));
  
  const personalizedQueries = goalProgressQueries.map(q => 
    q.replace('{patientName}', patientName)
  );
  
  for (const query of personalizedQueries) {
    try {
      const entities = await entityExtractionService.extractEntities(query);
      console.log(`Query: "${query}"`);
      console.log(`Extracted query type: ${entities.queryType}`);
      console.log(`Extracted patient name: ${entities.patientName || 'None'}`);
      
      const correctQueryType = entities.queryType === 'PATIENT_GOAL_PROGRESS';
      const correctPatientName = entities.patientName && 
                                entities.patientName.toLowerCase() === patientName.toLowerCase();
      
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
    } catch (error) {
      console.error(chalk.red(`Error extracting entities for "${query}": ${error.message}`));
    }
  }
  
  return personalizedQueries;
}

/**
 * Test goal progress query responses
 */
async function testGoalProgressResponses(personalizedQueries, patientData) {
  console.log(chalk.blue('\n----- Testing Goal Progress Responses -----'));
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const query of personalizedQueries) {
    try {
      console.log(`Query: "${query}"`);
      const response = await chatbot.processMessage(query);
      console.log(`Response: "${response}"`);
      
      // Check if the response is appropriate
      const mentionsPatient = response.toLowerCase().includes(patientData.patientName.toLowerCase());
      const mentionsGoals = response.toLowerCase().includes('goal');
      const mentionsProgress = response.toLowerCase().includes('progress') || 
                               response.toLowerCase().includes('status') ||
                               response.toLowerCase().includes('assessment');
      
      if (mentionsPatient && mentionsGoals && mentionsProgress) {
        console.log(chalk.green('✓ Response correctly addresses patient goal progress'));
        passedTests++;
      } else {
        let issues = [];
        if (!mentionsPatient) issues.push("doesn't mention patient name");
        if (!mentionsGoals) issues.push("doesn't mention goals");
        if (!mentionsProgress) issues.push("doesn't mention progress/status");
        
        console.log(chalk.red(`✗ Response has issues: ${issues.join(', ')}`));
        failedTests++;
      }
      console.log('---');
    } catch (error) {
      console.error(chalk.red(`Error processing query "${query}": ${error.message}`));
      failedTests++;
    }
  }
  
  return { passedTests, failedTests, total: personalizedQueries.length };
}

/**
 * Run all tests
 */
async function runAllTests() {
  const patientData = await initializeTests();
  
  // Test entity extraction
  const personalizedQueries = await testEntityExtraction(patientData.patientName);
  
  // Test goal progress responses
  const { passedTests, failedTests, total } = await testGoalProgressResponses(personalizedQueries, patientData);
  
  // Print summary
  console.log(chalk.blue('\n----- Test Summary -----'));
  console.log(chalk.green(`Passed: ${passedTests}`));
  console.log(chalk.red(`Failed: ${failedTests}`));
  console.log(chalk.blue(`Total: ${total}`));
  
  if (failedTests === 0) {
    console.log(chalk.green('\nAll goal progress tests passed! The implementation is working correctly.'));
  } else {
    console.log(chalk.yellow('\nSome tests failed. The goal progress query may need improvements.'));
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
