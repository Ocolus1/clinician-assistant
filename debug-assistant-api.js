/**
 * Debug script for testing the Clinician Assistant API
 * 
 * This script makes direct API calls to verify the assistant API is working
 * and that conversations and messages are being returned correctly.
 */

// Use native fetch API in Node.js

async function debugAssistantAPI() {
  console.log('Debugging Clinician Assistant API...');
  
  try {
    // Try multiple ports to find the correct server
    const ports = [3000, 5000];
    let serverPort = null;
    
    // First find which port the server is available on
    for (const port of ports) {
      try {
        console.log(`Checking if server is available on port ${port}...`);
        const response = await fetch(`http://localhost:${port}/api/assistant/status`);
        
        if (response.ok) {
          console.log(`Server found on port ${port}`);
          serverPort = port;
          
          // Log the status response
          const statusData = await response.json();
          console.log('Assistant Status:', JSON.stringify(statusData, null, 2));
          
          break;
        }
      } catch (error) {
        console.log(`Server not available on port ${port}: ${error.message}`);
      }
    }
    
    if (!serverPort) {
      console.error('ERROR: Could not connect to server on any port');
      return;
    }
    
    // Now fetch conversations
    console.log(`\nFetching conversations from port ${serverPort}...`);
    const conversationsResponse = await fetch(`http://localhost:${serverPort}/api/assistant/conversations`);
    
    if (!conversationsResponse.ok) {
      console.error(`ERROR: Failed to fetch conversations: ${conversationsResponse.status} ${conversationsResponse.statusText}`);
      const errorText = await conversationsResponse.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const conversationsData = await conversationsResponse.json();
    console.log(`Found ${conversationsData.conversations?.length || 0} conversations`);
    
    // Log the first conversation if available
    if (conversationsData.conversations && conversationsData.conversations.length > 0) {
      const firstConv = conversationsData.conversations[0];
      console.log('\nFirst conversation:');
      console.log(`- ID: ${firstConv.id}`);
      console.log(`- Name: ${firstConv.name}`);
      console.log(`- Created: ${firstConv.createdAt}`);
      console.log(`- Messages: ${firstConv.messages?.length || 0}`);
      
      // Log the first message if available
      if (firstConv.messages && firstConv.messages.length > 0) {
        const firstMsg = firstConv.messages[0];
        console.log('\nFirst message:');
        console.log(`- ID: ${firstMsg.id}`);
        console.log(`- Role: ${firstMsg.role}`);
        console.log(`- Content: ${firstMsg.content.substring(0, 100)}${firstMsg.content.length > 100 ? '...' : ''}`);
      }
    }
    
  } catch (error) {
    console.error('Error debugging assistant API:', error);
  }
}

// Run the debug function
debugAssistantAPI();