/**
 * Tool API Test Script
 * 
 * This script tests the specialized tools through the debug API endpoints.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for the API
const BASE_URL = 'http://localhost:5000/api/debug';

// Test cases for each tool
const testCases = {
  "Goal Tracking": [
    { input: "5", expectedKeywords: ["goals", "patient", "5"] },
    { input: "Radwan-563004", expectedKeywords: ["goals", "Radwan-563004"] },
    { input: "5,mobility", expectedKeywords: ["goals", "patient", "5", "mobility"] }
  ],
  "Budget Tracking": [
    { input: "5,remaining", expectedKeywords: ["budget", "remains", "patient", "5"] },
    { input: "5,spent", expectedKeywords: ["spent", "budget", "patient", "5"] },
    { input: "5,expenditures", expectedKeywords: ["expenditures", "patient", "5"] },
    { input: "5,categories", expectedKeywords: ["category", "breakdown", "patient", "5"] }
  ],
  "Strategy Insights": [
    { input: "5,all", expectedKeywords: ["strategies", "patient", "5"] },
    { input: "5,communication", expectedKeywords: ["strategies", "communication", "patient", "5"] },
    { input: "Radwan-563004,all", expectedKeywords: ["strategies", "Radwan-563004"] }
  ],
  "Session Engagement": [
    { input: "5,all", expectedKeywords: ["sessions", "patient", "5"] },
    { input: "5,recent", expectedKeywords: ["sessions", "recent", "patient", "5"] },
    { input: "Radwan-563004,all", expectedKeywords: ["sessions", "Radwan-563004"] }
  ]
};

// API endpoints for each tool
const toolEndpoints = {
  "Goal Tracking": "/test-goal-tracking",
  "Budget Tracking": "/test-budget-tracking",
  "Strategy Insights": "/test-strategy-insights",
  "Session Engagement": "/test-session-engagement"
};

// Check if the server is running
async function checkServerStatus() {
  try {
    // Try to access the debug patient-count endpoint instead of health endpoint
    const response = await fetch('http://localhost:5000/api/debug/patient-count');
    if (response.ok) {
      console.log('✅ Server is running'.green);
      return true;
    } else {
      console.log('❌ Server is not responding correctly'.red);
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running'.red);
    console.error(error);
    return false;
  }
}

// Run the tests
async function runTests() {
  console.log('\n🔍 STARTING TOOL API TESTS 🔍\n'.cyan.bold);
  
  // Check if the server is running
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('Please start the server before running the tests'.yellow);
    return;
  }
  
  const results = {};
  const overallResults = {
    total: 0,
    success: 0
  };
  
  // Test each tool
  for (const [toolName, tests] of Object.entries(testCases)) {
    console.log(`\n📋 TESTING TOOL: ${toolName.toUpperCase()} 📋\n`.yellow.bold);
    
    results[toolName] = {
      total: tests.length,
      success: 0,
      tests: []
    };
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      console.log(`Test ${i+1}/${tests.length}: Input "${test.input}"`);
      console.log('='.repeat(100).gray);
      
      try {
        // Call the API endpoint
        const endpoint = toolEndpoints[toolName];
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ input: test.input })
        });
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        const data = await response.json();
        const result = data.result;
        
        console.log('INPUT:'.cyan, test.input);
        console.log('-'.repeat(100).gray);
        console.log('RESPONSE:'.cyan, result.substring(0, 300) + (result.length > 300 ? '...' : ''));
        console.log('-'.repeat(100).gray);
        
        // Check if all expected keywords are in the response
        const expectedKeywords = test.expectedKeywords;
        const foundKeywords = [];
        const missingKeywords = [];
        
        expectedKeywords.forEach(keyword => {
          if (result.toLowerCase().includes(keyword.toLowerCase())) {
            foundKeywords.push(keyword);
          } else {
            missingKeywords.push(keyword);
          }
        });
        
        console.log('EXPECTED KEYWORDS:'.cyan, expectedKeywords.join(', '));
        console.log('FOUND KEYWORDS:'.green, foundKeywords.join(', '));
        
        if (missingKeywords.length > 0) {
          console.log('MISSING KEYWORDS:'.red, missingKeywords.join(', '));
        }
        
        // Determine if the test passed
        const success = missingKeywords.length === 0;
        
        results[toolName].tests.push({
          input: test.input,
          success,
          response: result,
          expectedKeywords,
          foundKeywords,
          missingKeywords
        });
        
        if (success) {
          results[toolName].success++;
          overallResults.success++;
        }
        
        const resultText = success ? '✅ SUCCESS' : '❌ FAILURE';
        console.log('RESULT:'.cyan, success ? resultText.green : resultText.red);
        
        console.log('='.repeat(100).gray);
        console.log('');
        
      } catch (error) {
        console.error('Error calling API:'.red, error);
        
        results[toolName].tests.push({
          input: test.input,
          success: false,
          error: error.message
        });
        
        console.log('RESULT:'.cyan, '❌ FAILURE (Error)'.red);
        console.log('='.repeat(100).gray);
        console.log('');
      }
      
      overallResults.total++;
    }
    
    // Calculate success rate for the tool
    results[toolName].successRate = (results[toolName].success / results[toolName].total) * 100;
  }
  
  // Calculate overall success rate
  const overallSuccessRate = (overallResults.success / overallResults.total) * 100;
  
  // Print summary
  console.log('\n📊 TEST SUMMARY 📊\n'.cyan.bold);
  
  console.log('Tool Results:'.yellow);
  Object.entries(results).forEach(([toolName, result]) => {
    const successRateColor = result.successRate >= 95 ? 'green' : (result.successRate >= 75 ? 'yellow' : 'red');
    console.log(`- ${toolName}: ${result.success}/${result.total} (${result.successRate.toFixed(2)}%)`[successRateColor]);
  });
  
  console.log('\nOverall Results:'.yellow);
  console.log(`Total Tests: ${overallResults.total}`);
  console.log(`Successful: ${overallResults.success}`);
  console.log(`Failed: ${overallResults.total - overallResults.success}`);
  
  const overallSuccessRateColor = overallSuccessRate >= 95 ? 'green' : (overallSuccessRate >= 75 ? 'yellow' : 'red');
  console.log(`Success Rate: ${overallSuccessRate.toFixed(2)}%`[overallSuccessRateColor]);
  
  // Save results to file
  const tempDir = path.join(__dirname, '../temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  fs.writeFileSync(
    path.join(tempDir, `tool_api_test_results_${timestamp}.json`),
    JSON.stringify({
      results,
      overallSuccessRate,
      timestamp
    }, null, 2)
  );
  
  console.log(`\nTest results saved to ${path.join(tempDir, `tool_api_test_results_${timestamp}.json`)}`);
  
  // Update the changelog with results if success rate is high
  if (overallSuccessRate >= 95) {
    const changelogPath = path.join(__dirname, '../../docs/changelog.md');
    
    if (fs.existsSync(changelogPath)) {
      try {
        let changelog = fs.readFileSync(changelogPath, 'utf8');
        
        // Find the latest ReactAgentService Optimization entry
        const optimizationEntryMatch = changelog.match(/## \d{4}-\d{2}-\d{2}: ReactAgentService Optimization/);
        
        if (optimizationEntryMatch) {
          const optimizationEntryIndex = changelog.indexOf(optimizationEntryMatch[0]);
          const nextEntryMatch = changelog.slice(optimizationEntryIndex + 1).match(/## \d{4}-\d{2}-\d{2}:/);
          
          let insertionPoint;
          if (nextEntryMatch) {
            insertionPoint = optimizationEntryIndex + 1 + nextEntryMatch.index;
          } else {
            insertionPoint = changelog.length;
          }
          
          // Create the test results entry
          const testResultsEntry = `\n### Tool API Test Results (${new Date().toISOString().split('T')[0]})
- Overall Success Rate: ${overallSuccessRate.toFixed(2)}%
${Object.entries(results).map(([toolName, result]) => `- ${toolName}: ${result.successRate.toFixed(2)}%`).join('\n')}

All specialized tools are now performing at or above the target success rate of 95% when tested through the API endpoints.
`;
          
          // Insert the test results
          changelog = changelog.slice(0, insertionPoint) + testResultsEntry + changelog.slice(insertionPoint);
          
          // Write the updated changelog
          fs.writeFileSync(changelogPath, changelog);
          console.log('\nUpdated changelog with test results.'.green);
        }
      } catch (error) {
        console.error('Error updating changelog:'.red, error);
      }
    }
  }
}

// Run the tests
runTests().catch(console.error);
