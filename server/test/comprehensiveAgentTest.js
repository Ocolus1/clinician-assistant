// Comprehensive test script for the ReactAgentService
// Tests all categories of questions: budget tracking, session engagement, 
// strategy insights, goal tracking, and report generation

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_ENDPOINT = 'http://localhost:5000/api/chatbot/react/query';
const RESULTS_PATH = path.join(__dirname, '../temp/comprehensive_test_results.json');

// Test questions by category
const testQuestions = [
  // Budget Tracking Questions
  {
    category: "Budget Tracking - Remaining Funds",
    question: "How much of Radwan-563004's NDIS budget remains?",
    expectedKeywords: ["budget", "funds", "Radwan-563004", "remain"]
  },
  {
    category: "Budget Tracking - Expiration",
    question: "When does Radwan-563004's current budget plan expire?",
    expectedKeywords: ["budget", "expire", "Radwan-563004"]
  },
  {
    category: "Budget Tracking - Low Budget",
    question: "Which patients have less than 20% of their budget remaining?",
    expectedKeywords: ["budget", "remaining", "20%"]
  },
  {
    category: "Budget Tracking - Session Allocation",
    question: "How many therapy sessions does Radwan-563004 have left in their budget?",
    expectedKeywords: ["sessions", "left", "budget", "Radwan-563004"]
  },
  {
    category: "Budget Tracking - Budget Items",
    question: "What budget items have been allocated for Radwan-563004?",
    expectedKeywords: ["budget", "items", "allocated", "Radwan-563004"]
  },

  // Session Engagement Questions
  {
    category: "Session Engagement - Attendance",
    question: "How many sessions has Radwan-563004 attended in the last month?",
    expectedKeywords: ["sessions", "attended", "month", "Radwan-563004"]
  },
  {
    category: "Session Engagement - Missed Sessions",
    question: "Who missed their last scheduled session?",
    expectedKeywords: ["missed", "session"]
  },
  {
    category: "Session Engagement - Inactive Patients",
    question: "Which patients haven't attended therapy in 3 weeks?",
    expectedKeywords: ["attended", "therapy", "weeks"]
  },
  {
    category: "Session Engagement - Session Frequency",
    question: "What's the frequency of Radwan-563004's sessions compared to the plan?",
    expectedKeywords: ["frequency", "sessions", "plan", "Radwan-563004"]
  },
  {
    category: "Session Engagement - Last Session",
    question: "When was the last session for Radwan-563004?",
    expectedKeywords: ["last", "session", "Radwan-563004"]
  },

  // Strategy Insights Questions
  {
    category: "Strategy Insights - Effective Strategies",
    question: "What strategies are working best for Radwan-563004's communication goal?",
    expectedKeywords: ["strategies", "working", "Radwan-563004", "communication"]
  },
  {
    category: "Strategy Insights - Strategy Summary",
    question: "Show me a strategy summary to share with Radwan-563004's caregiver.",
    expectedKeywords: ["strategy", "summary", "Radwan-563004", "caregiver"]
  },
  {
    category: "Strategy Insights - New Strategies",
    question: "What new strategies should we try for Radwan-563004's mobility goal?",
    expectedKeywords: ["strategies", "try", "Radwan-563004", "mobility"]
  },
  {
    category: "Strategy Insights - Strategy Comparison",
    question: "Compare the effectiveness of different strategies used for Radwan-563004.",
    expectedKeywords: ["strategies", "effectiveness", "Radwan-563004"]
  },
  {
    category: "Strategy Insights - Strategy Recommendations",
    question: "What strategies would you recommend for Radwan-563004 based on recent progress?",
    expectedKeywords: ["strategies", "recommend", "Radwan-563004", "progress"]
  },

  // Goal Tracking Questions
  {
    category: "Goal Tracking - Progress",
    question: "What progress has Radwan-563004 made on their mobility goal?",
    expectedKeywords: ["progress", "Radwan-563004", "mobility"]
  },
  {
    category: "Goal Tracking - Milestones",
    question: "Which milestones has Radwan-563004 completed for their communication goal?",
    expectedKeywords: ["milestones", "completed", "Radwan-563004", "communication"]
  },
  {
    category: "Goal Tracking - Goal Status",
    question: "What's the current status of all Radwan-563004's goals?",
    expectedKeywords: ["status", "goals", "Radwan-563004"]
  },
  {
    category: "Goal Tracking - Goal Comparison",
    question: "Which of Radwan-563004's goals has shown the most progress?",
    expectedKeywords: ["goals", "progress", "Radwan-563004", "most"]
  },
  {
    category: "Goal Tracking - Goal Timeline",
    question: "What's the timeline for completing Radwan-563004's remaining goals?",
    expectedKeywords: ["timeline", "completing", "goals", "Radwan-563004"]
  },

  // Report Generation Questions
  {
    category: "Report Generation - Basic",
    question: "What's Radwan-563004's progress summary across all goals?",
    expectedKeywords: ["progress", "summary", "goals", "Radwan-563004"]
  },
  {
    category: "Report Generation - Detailed",
    question: "Can you generate a detailed progress report for Radwan-563004 showing progress on each goal?",
    expectedKeywords: ["progress", "report", "goal", "Radwan-563004"]
  },
  {
    category: "Report Generation - Specific Goal",
    question: "What progress has Radwan-563004 made on their communication goal?",
    expectedKeywords: ["progress", "communication", "Radwan-563004"]
  },
  {
    category: "Report Generation - Status Check",
    question: "Check if all the data needed for Radwan-563004's progress report is available",
    expectedKeywords: ["report", "status", "Radwan-563004"]
  },
  {
    category: "Report Generation - Recommendations",
    question: "What recommendations do you have based on Radwan-563004's progress?",
    expectedKeywords: ["recommendation", "progress", "Radwan-563004"]
  }
];

// Function to run a single test
async function runTest(test) {
  console.log(`\nTest ${testQuestions.indexOf(test) + 1}/${testQuestions.length}: ${test.category} - "${test.question}"`);
  console.log(`Testing: ${test.category} - "${test.question}"`);
  console.log('='.repeat(80));
  console.log(`CATEGORY: ${test.category}`);
  console.log(`QUESTION: ${test.question}`);
  console.log('-'.repeat(80));
  
  try {
    // Create a temporary session ID for testing if not provided
    const sessionId = 999; // Use a test session ID
    
    console.log(`Sending request to ${API_ENDPOINT} with sessionId: ${sessionId}`);
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: test.question,
        sessionId: sessionId 
      })
    });
    
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      return {
        ...test,
        answer: `Error: ${response.status} ${response.statusText}`,
        foundKeywords: [],
        missingKeywords: test.expectedKeywords,
        success: false,
        error: `HTTP Error: ${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    
    // Check if the response has the expected structure
    const answer = data.response || 'No answer provided';
    
    const foundKeywords = [];
    const missingKeywords = [];
    
    test.expectedKeywords.forEach(keyword => {
      if (answer.toLowerCase().includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    });
    
    const success = missingKeywords.length === 0;
    
    return {
      ...test,
      answer,
      foundKeywords,
      missingKeywords,
      success,
      error: null
    };
  } catch (error) {
    console.error(`Error testing "${test.question}":`, error);
    
    return {
      ...test,
      answer: `Error: ${error.message}`,
      foundKeywords: [],
      missingKeywords: test.expectedKeywords,
      success: false,
      error: error.message
    };
  }
}

// Function to run all tests
async function runAllTests() {
  console.log(`\n🧪 STARTING COMPREHENSIVE API TESTS 🧪\n`);
  console.log(`Running ${testQuestions.length} test questions...\n`);
  
  const results = [];
  
  for (let i = 0; i < testQuestions.length; i++) {
    const test = testQuestions[i];
    const result = await runTest(test);
    results.push(result);
    
    console.log(`================================================================================`);
    console.log(`CATEGORY: ${test.category}`);
    console.log(`QUESTION: ${test.question}`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`ANSWER: ${result.answer}`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`EXPECTED KEYWORDS: ${test.expectedKeywords.join(', ')}`);
    console.log(`FOUND KEYWORDS: ${result.foundKeywords.join(', ')}`);
    console.log(`MISSING KEYWORDS: ${result.missingKeywords.join(', ')}`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`RESULT: ${result.success ? '✅ SUCCESS' : '❌ FAILURE'}`);
    console.log(`================================================================================\n`);
  }
  
  // Save results to file
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  
  // Calculate success rate
  const successfulTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  const successRate = (successfulTests / totalTests) * 100;
  
  console.log(`\n🧪 TEST SUMMARY 🧪`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests}`);
  console.log(`Failed: ${totalTests - successfulTests}`);
  console.log(`Success Rate: ${successRate.toFixed(2)}%`);
  
  console.log(`\nTest results saved to ${RESULTS_PATH}`);
  
  // Category breakdown
  console.log(`\n📊 CATEGORY BREAKDOWN 📊`);
  
  const categories = [...new Set(results.map(r => r.category.split(' - ')[0]))];
  
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category.startsWith(category));
    const categorySuccessful = categoryResults.filter(r => r.success).length;
    const categoryTotal = categoryResults.length;
    const categorySuccessRate = (categorySuccessful / categoryTotal) * 100;
    
    console.log(`${category}: ${categorySuccessful}/${categoryTotal} (${categorySuccessRate.toFixed(2)}%)`);
  });
}

// Run the tests
runAllTests();
