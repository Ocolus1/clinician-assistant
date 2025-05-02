/**
 * Debug script to trace through the entire patient count query process
 */

import fetch from 'node-fetch';

async function tracePatientCountQuery() {
  try {
    console.log('=== PATIENT COUNT QUERY TRACE ===\n');
    
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
        title: 'Trace Test Session'
      })
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
    }
    
    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.sessionId;
    console.log(`Created test session with ID: ${sessionId}\n`);
    
    // Step 3: Extract entities for the patient count query
    console.log('STEP 3: Testing entity extraction...');
    const extractionResponse = await fetch('http://localhost:5000/api/chatbot/extract-entities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'How many patients do we have?'
      })
    });
    
    if (!extractionResponse.ok) {
      throw new Error(`Failed to extract entities: ${extractionResponse.statusText}`);
    }
    
    const entities = await extractionResponse.json();
    console.log('Extracted entities:', JSON.stringify(entities, null, 2));
    console.log(`Query type identified: ${entities.queryType}\n`);
    
    // Step 4: Test direct patient count API
    console.log('STEP 4: Testing direct patient count API...');
    try {
      const countResponse = await fetch('http://localhost:5000/api/chatbot/patients/count');
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        console.log('Direct API response:', JSON.stringify(countData, null, 2));
      } else {
        console.log(`Direct API failed with status: ${countResponse.status}`);
      }
    } catch (error) {
      console.log('Direct API endpoint not available:', error.message);
    }
    console.log();
    
    // Step 5: Send the patient count query
    console.log('STEP 5: Sending patient count query...');
    const query = 'How many patients do we have?';
    console.log(`Query: "${query}"`);
    
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
    
    // Step 6: Check if the response contains the correct count
    console.log('STEP 6: Analyzing response...');
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
    
    console.log('\n=== TRACE COMPLETE ===');
    
  } catch (error) {
    console.error('Error during trace:', error);
  } finally {
    process.exit(0);
  }
}

// Run the trace
tracePatientCountQuery();
