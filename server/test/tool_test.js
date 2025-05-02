/**
 * Simple Test Script for ReactAgentService Tools
 * 
 * This script directly tests each tool function to verify they're working correctly.
 */

// Import the tool functions directly
import { getPatientGoals } from '../services/tools/patientGoalsTool.ts';
import { getPatientBudget } from '../services/tools/budgetTrackingTool.ts';
import { getPatientStrategies } from '../services/tools/strategyInsightsTool.ts';
import { getPatientSessions } from '../services/tools/patientSessionsTool.ts';
import colors from 'colors';

// Test cases for all tools
const testCases = [
  // Goal Tracking Tool Tests
  {
    tool: 'Goal Tracking',
    function: getPatientGoals,
    inputs: [
      "5",
      "Radwan-563004",
      "Patient 5"
    ]
  },
  
  // Budget Tracking Tool Tests
  {
    tool: 'Budget Tracking',
    function: getPatientBudget,
    inputs: [
      "5,remaining",
      "5,spent",
      "5,expenditures",
      "5,categories",
      "Radwan-563004,all"
    ]
  },
  
  // Strategy Insights Tool Tests
  {
    tool: 'Strategy Insights',
    function: getPatientStrategies,
    inputs: [
      "5,all",
      "5,communication",
      "Radwan-563004,all"
    ]
  },
  
  // Session Engagement Tool Tests
  {
    tool: 'Session Engagement',
    function: getPatientSessions,
    inputs: [
      "5,all",
      "5,recent",
      "Radwan-563004,all"
    ]
  }
];

// Run the tests
async function runTests() {
  console.log('\n🔍 STARTING TOOL FUNCTION TESTS 🔍\n'.cyan.bold);
  
  const results = {
    total: 0,
    success: 0,
    failures: []
  };
  
  for (const testCase of testCases) {
    console.log(`\n📋 TESTING TOOL: ${testCase.tool.toUpperCase()} 📋\n`.yellow.bold);
    
    for (const input of testCase.inputs) {
      results.total++;
      console.log(`Testing input: "${input}"`);
      console.log('='.repeat(80).gray);
      
      try {
        // Call the tool function
        const response = await testCase.function(input);
        
        // Check if response is a string and not empty
        const success = typeof response === 'string' && response.trim().length > 0 && !response.includes('Error');
        
        if (success) {
          console.log('RESULT:'.cyan, '✅ SUCCESS'.green);
          results.success++;
        } else {
          console.log('RESULT:'.cyan, '❌ FAILURE'.red);
          results.failures.push({
            tool: testCase.tool,
            input,
            response
          });
        }
        
        // Print truncated response
        console.log('-'.repeat(80).gray);
        console.log('RESPONSE:'.cyan, response.substring(0, 200) + (response.length > 200 ? '...' : ''));
        console.log('='.repeat(80).gray);
        console.log('');
        
      } catch (error) {
        console.error('Error calling tool function:'.red, error);
        results.failures.push({
          tool: testCase.tool,
          input,
          error: error.message
        });
        console.log('RESULT:'.cyan, '❌ FAILURE (Error)'.red);
        console.log('='.repeat(80).gray);
        console.log('');
      }
    }
  }
  
  // Print summary
  console.log('\n📊 TEST SUMMARY 📊\n'.cyan.bold);
  console.log(`Total Tests: ${results.total}`);
  console.log(`Successful: ${results.success}`);
  console.log(`Failed: ${results.total - results.success}`);
  
  const successRate = (results.success / results.total) * 100;
  const successRateColor = successRate >= 95 ? 'green' : (successRate >= 75 ? 'yellow' : 'red');
  console.log(`Success Rate: ${successRate.toFixed(2)}%`[successRateColor]);
  
  if (results.failures.length > 0) {
    console.log('\nFailures:'.red);
    results.failures.forEach((failure, index) => {
      console.log(`${index + 1}. Tool: ${failure.tool}, Input: "${failure.input}"`);
      if (failure.error) {
        console.log(`   Error: ${failure.error}`);
      } else {
        console.log(`   Response: ${failure.response.substring(0, 100)}...`);
      }
    });
  }
  
  // Update changelog if success rate is high
  if (successRate >= 95) {
    console.log('\nAll tools are performing at or above the target success rate of 95%!'.green.bold);
    console.log('Consider updating the changelog with these test results.'.yellow);
  }
}

// Run the tests
runTests().catch(console.error);
