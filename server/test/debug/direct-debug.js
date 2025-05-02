/**
 * Direct debug script for patient count query
 * 
 * This script directly tests the patientQueriesService and responseGenerationService
 * to identify where the patient count query is failing.
 */

// Import required modules
import fetch from 'node-fetch';

// Test direct API calls
async function testDirectAPI() {
  try {
    console.log('=== DIRECT API TEST ===\n');
    
    // Step 1: Get the actual patient count from the API
    console.log('STEP 1: Getting actual patient count from API...');
    const patientsResponse = await fetch('http://localhost:5000/api/patients');
    
    if (!patientsResponse.ok) {
      throw new Error(`Failed to get patients: ${patientsResponse.statusText}`);
    }
    
    const patients = await patientsResponse.json();
    console.log(`Actual patient count: ${patients.length}\n`);
    
    // Step 2: Create a test session
    console.log('STEP 2: Creating test session...');
    const sessionResponse = await fetch('http://localhost:5000/api/chatbot/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Direct Debug Test Session'
      })
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
    }
    
    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.sessionId;
    console.log(`Created test session with ID: ${sessionId}\n`);
    
    // Step 3: Send a direct message to the chatbot with verbose logging
    console.log('STEP 3: Sending direct message to chatbot with verbose logging...');
    
    // First, make a request to enable verbose logging
    await fetch('http://localhost:5000/api/debug/enable-verbose-logging', {
      method: 'POST'
    }).catch(err => console.log('Verbose logging endpoint not available, continuing anyway'));
    
    // Now send the patient count query
    const query = 'How many patients do we have?';
    console.log(`Query: "${query}"`);
    
    const messageResponse = await fetch(`http://localhost:5000/api/chatbot/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: query,
        debug: true
      })
    });
    
    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.statusText}`);
    }
    
    const messageData = await messageResponse.json();
    console.log(`Chatbot response: "${messageData.message}"\n`);
    
    // Step 4: Check if the response contains the correct count
    console.log('STEP 4: Analyzing response...');
    const expectedText = `${patients.length} patient`;
    if (messageData.message.includes(expectedText)) {
      console.log('✓ Response contains the correct patient count');
    } else {
      console.log('✗ Response does not contain the correct patient count');
      console.log(`Expected to find: "${expectedText}" in the response`);
      
      // Try alternative phrasings
      console.log('\nChecking for alternative phrasings:');
      const alternatives = [
        'total of ' + patients.length,
        patients.length + ' total',
        'have ' + patients.length,
        'there are ' + patients.length
      ];
      
      for (const alt of alternatives) {
        if (messageData.message.toLowerCase().includes(alt.toLowerCase())) {
          console.log(`✓ Found alternative phrasing: "${alt}"`);
        }
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testDirectAPI();
