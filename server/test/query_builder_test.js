// Test script for the flexible query builder tool
// This script tests the query builder's ability to handle different types of queries

import { flexibleQueryBuilder } from '../services/tools/queryBuilderTool.js';

// Test cases for the flexible query builder
const testCases = [
  {
    name: "Basic Patient Query",
    input: "patients,id|name|onboardingStatus,onboardingStatus=pending,5",
    expectedKeywords: ["patient", "onboarding", "pending"]
  },
  {
    name: "Goal Query with Join",
    input: "goals,id|title|status,patientId=5,10,subgoals,goalId=id",
    expectedKeywords: ["goal", "subgoal", "join"]
  },
  {
    name: "Session Query with Date Filter",
    input: "sessions,id|sessionDate|duration,sessionDate>2023-01-01,10",
    expectedKeywords: ["session", "date", "duration"]
  },
  {
    name: "Budget Query",
    input: "budgetItems,id|amount|description,patientId=5,10",
    expectedKeywords: ["budget", "amount", "description"]
  }
];

// Helper function to validate if the response contains expected keywords
function validateResponse(response, expectedKeywords) {
  const lowerResponse = response.toLowerCase();
  const foundKeywords = [];
  const missingKeywords = [];
  
  for (const keyword of expectedKeywords) {
    if (lowerResponse.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }
  
  return {
    success: missingKeywords.length === 0,
    foundKeywords,
    missingKeywords
  };
}

// Run the tests
async function runTests() {
  console.log("Running flexible query builder tests...\n");
  
  let successCount = 0;
  
  for (const test of testCases) {
    console.log(`Test: ${test.name}`);
    console.log(`Input: ${test.input}`);
    
    try {
      const response = await flexibleQueryBuilder(test.input);
      console.log(`Response: ${response.substring(0, 100)}...`);
      
      const validation = validateResponse(response, test.expectedKeywords);
      
      if (validation.success) {
        console.log("✅ SUCCESS: All expected keywords found");
        successCount++;
      } else {
        console.log("❌ FAILURE: Missing keywords:", validation.missingKeywords.join(", "));
      }
    } catch (error) {
      console.error("❌ ERROR:", error.message);
    }
    
    console.log("-".repeat(80) + "\n");
  }
  
  console.log(`Test Results: ${successCount}/${testCases.length} tests passed`);
}

// Run the tests
runTests().catch(error => {
  console.error("Unhandled error:", error);
});
