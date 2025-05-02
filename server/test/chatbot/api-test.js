/**
 * Chatbot API Test
 * 
 * This script tests the chatbot API endpoints to verify functionality.
 * It sends requests to the API and validates the responses.
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const CHATBOT_ENDPOINT = `${API_BASE_URL}/chatbot`;
const PATIENTS_ENDPOINT = `${API_BASE_URL}/patients`;

// Test cases for different query types
const testCases = [
  {
    name: 'Patient Count Query',
    query: 'How many patients do we have?',
    validator: async (response) => {
      // Get the actual count from the API
      const patientsResponse = await fetch(PATIENTS_ENDPOINT);
      const patients = await patientsResponse.json();
      const actualCount = patients.length;
      
      // Check if the response contains the correct count
      if (response.includes(`${actualCount} patient`)) {
        return { 
          success: true,
          actualCount
        };
      } else {
        return { 
          success: false, 
          reason: `Response doesn't contain the correct patient count (${actualCount})`,
          actualCount
        };
      }
    }
  },
  {
    name: 'Patient Goals Query',
    query: 'What are the goals for patient with ID 1?',
    validator: async (response) => {
      // Get patient info
      const patientResponse = await fetch(`${PATIENTS_ENDPOINT}/1`);
      
      if (patientResponse.status === 404) {
        // Patient doesn't exist
        if (response.toLowerCase().includes('no patient') || 
            response.toLowerCase().includes('not found')) {
          return { success: true };
        } else {
          return { 
            success: false, 
            reason: 'Patient with ID 1 doesn\'t exist, but response doesn\'t indicate that'
          };
        }
      } else {
        const patient = await patientResponse.json();
        
        // Get goals for patient
        const goalsResponse = await fetch(`${PATIENTS_ENDPOINT}/1/goals`);
        const goals = await goalsResponse.json();
        
        if (goals.length === 0) {
          // Patient has no goals
          if (response.toLowerCase().includes('no goals') || 
              response.toLowerCase().includes('doesn\'t have any goals') ||
              response.toLowerCase().includes('does not have any goals')) {
            return { success: true };
          } else {
            return { 
              success: false, 
              reason: 'Patient has no goals, but response doesn\'t indicate that'
            };
          }
        } else {
          // Check if at least one goal title is mentioned in the response
          const goalMentioned = goals.some(goal => 
            response.toLowerCase().includes(goal.title.toLowerCase())
          );
          
          if (goalMentioned) {
            return { success: true };
          } else {
            return { 
              success: false, 
              reason: 'Response doesn\'t mention any of the patient\'s goals'
            };
          }
        }
      }
    }
  },
  {
    name: 'Expiring Budgets Query',
    query: 'Which patients have budgets expiring soon?',
    validator: async (response) => {
      // This is a complex query, so we'll just check for a reasonable response
      if (response.length > 50 && 
          (response.toLowerCase().includes('budget') || 
           response.toLowerCase().includes('expir'))) {
        return { success: true };
      } else {
        return { 
          success: false, 
          reason: 'Response doesn\'t seem to address expiring budgets'
        };
      }
    }
  },
  {
    name: 'General Question',
    query: 'What services do you provide?',
    validator: async (response) => {
      // For general questions, we just check if the response is non-empty and makes sense
      if (response.length > 50 && 
          (response.toLowerCase().includes('service') || 
           response.toLowerCase().includes('assist') ||
           response.toLowerCase().includes('help') ||
           response.toLowerCase().includes('provide'))) {
        return { success: true };
      } else {
        return { 
          success: false, 
          reason: 'Response doesn\'t adequately answer the general question'
        };
      }
    }
  },
  {
    name: 'Patient Count Query (Alternative Phrasing)',
    query: 'Total number of patients in the system?',
    validator: async (response) => {
      // Get the actual count from the API
      const patientsResponse = await fetch(PATIENTS_ENDPOINT);
      const patients = await patientsResponse.json();
      const actualCount = patients.length;
      
      // Check if the response contains the correct count
      if (response.includes(`${actualCount} patient`)) {
        return { 
          success: true,
          actualCount
        };
      } else {
        return { 
          success: false, 
          reason: `Response doesn't contain the correct patient count (${actualCount})`,
          actualCount
        };
      }
    }
  }
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Create a new chat session
 */
async function createSession() {
  try {
    const response = await fetch(`${CHATBOT_ENDPOINT}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'API Test Session'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(chalk.green(`Created test session with ID: ${data.sessionId}`));
    return data.sessionId;
  } catch (error) {
    console.error(chalk.red(`Failed to create session: ${error.message}`));
    throw error;
  }
}

/**
 * Send a message to the chatbot
 */
async function sendMessage(sessionId, message) {
  try {
    const response = await fetch(`${CHATBOT_ENDPOINT}/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.message; // The response is in the 'message' field
  } catch (error) {
    console.error(chalk.red(`Failed to send message: ${error.message}`));
    throw error;
  }
}

/**
 * Run a test case
 */
async function runTest(sessionId, testCase) {
  console.log(chalk.blue(`\nRunning test: ${testCase.name}`));
  console.log(`Query: "${testCase.query}"`);
  
  try {
    // Send the query to the chatbot
    const response = await sendMessage(sessionId, testCase.query);
    console.log(`Chatbot response: "${response}"`);
    
    // Validate the response
    const result = await testCase.validator(response);
    
    if (result.success) {
      console.log(chalk.green('✓ Test passed'));
      testResults.passed++;
    } else {
      console.log(chalk.red('✗ Test failed'));
      console.log(chalk.yellow(`Reason: ${result.reason}`));
      testResults.failed++;
    }
    
    testResults.tests.push({
      name: testCase.name,
      query: testCase.query,
      response,
      result
    });
  } catch (error) {
    console.error(chalk.red(`Error in test "${testCase.name}": ${error.message}`));
    testResults.failed++;
    testResults.tests.push({
      name: testCase.name,
      query: testCase.query,
      error: error.message,
      result: { success: false, reason: 'Test threw an exception' }
    });
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(chalk.blue('===== Chatbot API Test =====\n'));
  
  try {
    // Create a test session
    const sessionId = await createSession();
    
    // Run each test case
    for (const testCase of testCases) {
      await runTest(sessionId, testCase);
    }
    
    // Print summary
    console.log(chalk.blue('\n----- Test Summary -----'));
    console.log(chalk.green(`Passed: ${testResults.passed}`));
    console.log(chalk.red(`Failed: ${testResults.failed}`));
    console.log(chalk.blue(`Total: ${testCases.length}`));
    
    if (testResults.failed === 0) {
      console.log(chalk.green('\nAll tests passed! The chatbot is functioning correctly.'));
      console.log(chalk.green('Ready to proceed to Phase 3 development.'));
    } else {
      console.log(chalk.yellow('\nSome tests failed. The chatbot may need further improvements.'));
      
      // Detailed results for failed tests
      console.log(chalk.yellow('\nFailed Tests:'));
      testResults.tests
        .filter(test => !test.result?.success)
        .forEach(test => {
          console.log(chalk.red(`- ${test.name}`));
          console.log(`  Query: "${test.query}"`);
          console.log(`  Response: "${test.response || 'Error'}"`);
          console.log(`  Reason: ${test.result?.reason || test.error}`);
        });
    }
  } catch (error) {
    console.error(chalk.red(`Test execution failed: ${error.message}`));
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error(chalk.red(`Test execution failed: ${error.message}`));
});
