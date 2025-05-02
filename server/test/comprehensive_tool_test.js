/**
 * Comprehensive Test Script for ReactAgentService
 * 
 * This script tests all specialized tools with various query types to verify
 * that the fixes and optimizations have resolved the issues.
 */

import { ReactAgentService } from '../services/reactAgentService.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the ReactAgentService
const reactAgentService = new ReactAgentService();

// Test cases for all tools
const testCases = [
  // Session Engagement Tool Tests
  {
    category: "Session Engagement",
    question: "How many sessions has patient ID 5 had?",
    expectedKeywords: ["sessions", "patient", "5"]
  },
  {
    category: "Session Engagement",
    question: "Show me the recent session history for Radwan-563004",
    expectedKeywords: ["session", "history", "Radwan-563004"]
  },
  
  // Goal Tracking Tool Tests
  {
    category: "Goal Tracking",
    question: "Show me the goals for patient ID 5",
    expectedKeywords: ["goals", "patient", "5"]
  },
  {
    category: "Goal Tracking",
    question: "What are the current goals for Radwan-563004?",
    expectedKeywords: ["goals", "Radwan-563004"]
  },
  {
    category: "Goal Tracking",
    question: "What progress has been made on patient ID 5's mobility goals?",
    expectedKeywords: ["progress", "goals", "patient", "5", "mobility"]
  },
  
  // Budget Tracking Tool Tests
  {
    category: "Budget Tracking",
    question: "How much of patient ID 5's NDIS budget remains?",
    expectedKeywords: ["budget", "remains", "patient", "5", "NDIS"]
  },
  {
    category: "Budget Tracking",
    question: "What are the recent budget expenditures for Radwan-563004?",
    expectedKeywords: ["budget", "expenditures", "Radwan-563004"]
  },
  {
    category: "Budget Tracking",
    question: "Show me the budget category breakdown for patient ID 5",
    expectedKeywords: ["budget", "category", "breakdown", "patient", "5"]
  },
  
  // Strategy Insights Tool Tests
  {
    category: "Strategy Insights",
    question: "What strategies are working well for patient ID 5?",
    expectedKeywords: ["strategies", "working", "patient", "5"]
  },
  {
    category: "Strategy Insights",
    question: "Analyze the effectiveness of communication strategies for Radwan-563004",
    expectedKeywords: ["effectiveness", "strategies", "communication", "Radwan-563004"]
  },
  {
    category: "Strategy Insights",
    question: "Which strategies should be modified for patient ID 5?",
    expectedKeywords: ["strategies", "modified", "patient", "5"]
  },
  
  // Report Generation Tests
  {
    category: "Report Generation",
    question: "Generate a progress report for patient ID 5",
    expectedKeywords: ["progress", "report", "patient", "5"]
  },
  {
    category: "Report Generation",
    question: "Create a summary report for Radwan-563004's recent sessions",
    expectedKeywords: ["summary", "report", "Radwan-563004", "sessions"]
  }
];

// Run the tests
async function runTests() {
  console.log('\n🔍 STARTING COMPREHENSIVE TOOL TESTS 🔍\n'.cyan.bold);
  
  // Group test cases by category
  const categorizedTests = {};
  testCases.forEach(testCase => {
    if (!categorizedTests[testCase.category]) {
      categorizedTests[testCase.category] = [];
    }
    categorizedTests[testCase.category].push(testCase);
  });
  
  const results = [];
  const categoryResults = {};
  
  // Initialize category results
  Object.keys(categorizedTests).forEach(category => {
    categoryResults[category] = {
      total: categorizedTests[category].length,
      success: 0,
      successRate: 0
    };
  });
  
  // Run tests for each category
  for (const category of Object.keys(categorizedTests)) {
    console.log(`\n📋 TESTING CATEGORY: ${category.toUpperCase()} 📋\n`.yellow.bold);
    
    for (let i = 0; i < categorizedTests[category].length; i++) {
      const testCase = categorizedTests[category][i];
      console.log(`Test ${i+1}/${categorizedTests[category].length}: "${testCase.question}"`);
      console.log('='.repeat(100).gray);
      
      try {
        // Process the query
        const response = await reactAgentService.processQuery(testCase.question, 1);
        
        console.log('CATEGORY:'.cyan, testCase.category);
        console.log('QUESTION:'.cyan, testCase.question);
        console.log('-'.repeat(100).gray);
        console.log('ANSWER:'.cyan, response.substring(0, 300) + (response.length > 300 ? '...' : ''));
        console.log('-'.repeat(100).gray);
        
        // Check if all expected keywords are in the response
        const expectedKeywords = testCase.expectedKeywords;
        const foundKeywords = [];
        const missingKeywords = [];
        
        expectedKeywords.forEach(keyword => {
          if (response.toLowerCase().includes(keyword.toLowerCase())) {
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
        
        console.log('-'.repeat(100).gray);
        
        // Determine if the test passed
        const success = missingKeywords.length === 0;
        const result = success ? '✅ SUCCESS' : '❌ FAILURE';
        console.log('RESULT:'.cyan, success ? result.green : result.red);
        
        if (success) {
          categoryResults[category].success++;
        }
        
        results.push({
          category: testCase.category,
          question: testCase.question,
          success,
          response,
          expectedKeywords,
          foundKeywords,
          missingKeywords
        });
        
        console.log('='.repeat(100).gray);
        console.log('');
        
      } catch (error) {
        console.error('Error processing query:'.red, error);
        results.push({
          category: testCase.category,
          question: testCase.question,
          success: false,
          error: error.message
        });
        console.log('RESULT:'.cyan, '❌ FAILURE'.red);
        console.log('='.repeat(100).gray);
        console.log('');
      }
    }
    
    // Calculate success rate for the category
    categoryResults[category].successRate = (categoryResults[category].success / categoryResults[category].total) * 100;
  }
  
  // Calculate overall success rate
  const totalTests = testCases.length;
  const totalSuccess = Object.values(categoryResults).reduce((sum, category) => sum + category.success, 0);
  const overallSuccessRate = (totalSuccess / totalTests) * 100;
  
  // Print summary
  console.log('\n📊 TEST SUMMARY 📊\n'.cyan.bold);
  
  console.log('Category Results:'.yellow);
  Object.entries(categoryResults).forEach(([category, result]) => {
    const successRateColor = result.successRate >= 95 ? 'green' : (result.successRate >= 75 ? 'yellow' : 'red');
    console.log(`- ${category}: ${result.success}/${result.total} (${result.successRate.toFixed(2)}%)`[successRateColor]);
  });
  
  console.log('\nOverall Results:'.yellow);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Successful: ${totalSuccess}`);
  console.log(`Failed: ${totalTests - totalSuccess}`);
  
  const overallSuccessRateColor = overallSuccessRate >= 95 ? 'green' : (overallSuccessRate >= 75 ? 'yellow' : 'red');
  console.log(`Success Rate: ${overallSuccessRate.toFixed(2)}%`[overallSuccessRateColor]);
  
  // Save results to file
  const tempDir = path.join(__dirname, '../temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  fs.writeFileSync(
    path.join(tempDir, `comprehensive_test_results_${timestamp}.json`),
    JSON.stringify({
      results,
      categoryResults,
      overallSuccessRate,
      timestamp
    }, null, 2)
  );
  
  console.log(`\nTest results saved to ${path.join(tempDir, `comprehensive_test_results_${timestamp}.json`)}`);
  
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
          const testResultsEntry = `\n### Test Results (${new Date().toISOString().split('T')[0]})
- Overall Success Rate: ${overallSuccessRate.toFixed(2)}%
${Object.entries(categoryResults).map(([category, result]) => `- ${category}: ${result.successRate.toFixed(2)}%`).join('\n')}

All tools are now performing at or above the target success rate of 95%.
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
