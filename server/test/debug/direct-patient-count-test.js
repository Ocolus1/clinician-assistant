/**
 * Debug script to directly test the patient count query through the API
 */

import fetch from 'node-fetch';

async function testPatientCountQuery() {
  try {
    console.log('Testing patient count query through the API...\n');
    
    // First create a test session
    console.log('Creating test session...');
    const sessionResponse = await fetch('http://localhost:5000/api/chatbot/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Debug Test Session'
      })
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
    }
    
    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.sessionId;
    console.log(`Created test session with ID: ${sessionId}\n`);
    
    // Now send a patient count query
    const query = 'How many patients do we have?';
    console.log(`Sending query: "${query}"`);
    
    const messageResponse = await fetch(`http://localhost:5000/api/chatbot/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: query
      })
    });
    
    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.statusText}`);
    }
    
    const messageData = await messageResponse.json();
    console.log(`Chatbot response: "${messageData.message}"\n`);
    
    // Get all patients from the API to verify the count
    const patientsResponse = await fetch('http://localhost:5000/api/patients');
    
    if (!patientsResponse.ok) {
      throw new Error(`Failed to get patients: ${patientsResponse.statusText}`);
    }
    
    const patients = await patientsResponse.json();
    console.log(`Actual patient count: ${patients.length}\n`);
    
    // Check if the response contains the correct count
    const expectedText = `${patients.length} patient`;
    if (messageData.message.includes(expectedText)) {
      console.log('✓ Response contains the correct patient count');
    } else {
      console.log('✗ Response does not contain the correct patient count');
      console.log(`Expected to find: "${expectedText}" in the response`);
    }
    
  } catch (error) {
    console.error('Error testing patient count query:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testPatientCountQuery();
