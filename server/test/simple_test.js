// Simple test script for testing the improved ReactAgentService
// This script tests the agent's ability to answer a specific question

import fetch from 'node-fetch';

async function testAgent(question) {
  try {
    console.log(`Testing question: "${question}"`);
    
    const response = await fetch('http://localhost:5000/api/chatbot/react/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: question,
        sessionId: 999
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('\nResponse from agent:');
    console.log('-'.repeat(80));
    console.log(data.response);
    console.log('-'.repeat(80));
    
    return data.response;
  } catch (error) {
    console.error(`Error testing "${question}":`, error);
    return null;
  }
}

// Test a query that uses the flexible query builder
const flexibleQueryTest = "Can you use the flexible query builder to find all patients with pending onboarding status?";

// Run the test
testAgent(flexibleQueryTest)
  .then(() => {
    console.log('\nTest completed!');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
  });
