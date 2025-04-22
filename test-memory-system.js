/**
 * Memory System Test Script
 * 
 * This script tests the memory management capabilities of the clinician assistant,
 * verifying that the conversation summarization and recall features work correctly.
 * 
 * Usage: node test-memory-system.js
 */

import fetch from 'node-fetch';
import readline from 'readline';

// Configuration
const BASE_URL = 'http://localhost:3000'; // Use the fallback port
const CONVERSATION_API = `${BASE_URL}/api/assistant/conversations`;
const MESSAGE_API = `${BASE_URL}/api/assistant/messages`;
const DEBUG_API = `${BASE_URL}/api/assistant/debug`;

// Test conversation details
let conversationId = null;
const CONVERSATION_NAME = `Memory Test ${new Date().toLocaleTimeString()}`;

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Create a new conversation
 */
async function createConversation() {
  console.log('Creating a new conversation...');
  
  try {
    const response = await fetch(CONVERSATION_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: CONVERSATION_NAME
      })
    });
    
    const data = await response.json();
    
    if (data.conversationId) {
      conversationId = data.conversationId;
      console.log(`Conversation created with ID: ${conversationId}`);
      return data;
    } else {
      throw new Error('Failed to create conversation');
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    process.exit(1);
  }
}

/**
 * Send a message in the conversation
 */
async function sendMessage(message) {
  console.log(`Sending message: "${message}"`);
  
  try {
    const response = await fetch(MESSAGE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId,
        message
      })
    });
    
    const data = await response.json();
    
    if (data.response) {
      console.log(`\nAI Response: "${data.response}"\n`);
      return data.response;
    } else {
      throw new Error('Failed to get response');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

/**
 * Get memory debug information
 */
async function getMemoryDebugInfo() {
  console.log('Fetching memory debug information...');
  
  try {
    const response = await fetch(`${DEBUG_API}/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId
      })
    });
    
    const data = await response.json();
    
    if (data) {
      console.log('\nMemory System Debug Information:');
      console.log('--------------------------------');
      console.log(`Recent Messages: ${data.recentMessages ? data.recentMessages.length : 0}`);
      console.log(`Relevant Messages: ${data.relevantMessages ? data.relevantMessages.length : 0}`);
      console.log(`Summaries: ${data.summaries ? data.summaries.length : 0}`);
      
      if (data.summaries && data.summaries.length > 0) {
        console.log('\nSummaries:');
        data.summaries.forEach((summary, index) => {
          console.log(`Summary ${index + 1}: ${summary.content}`);
          console.log(`Topics: ${summary.topics.join(', ')}`);
          console.log(`Message Count: ${summary.messageCount}`);
          console.log('---');
        });
      }
      
      return data;
    } else {
      throw new Error('Failed to get memory debug info');
    }
  } catch (error) {
    console.error('Error getting memory debug info:', error);
    return null;
  }
}

/**
 * Run the conversation with predefined test messages
 */
async function runTestConversation() {
  // First round of messages - general conversation
  await sendMessage("Hi, I'd like to discuss therapy techniques for children with autism.");
  await sendMessage("What are some effective communication strategies?");
  await sendMessage("How about visual aids? Are they effective?");
  await sendMessage("Can you tell me about social stories?");
  await sendMessage("What is your opinion on ABA therapy?");
  
  // Check memory after the first set
  await getMemoryDebugInfo();
  
  // Wait for user to continue
  await new Promise(resolve => {
    rl.question('\nPress Enter to continue with more messages...', resolve);
  });
  
  // Second round - change topics slightly
  await sendMessage("Let's talk about sensory integration therapy.");
  await sendMessage("What activities can help with sensory sensitivity?");
  await sendMessage("How can parents continue therapy exercises at home?");
  await sendMessage("What's the best age to start therapy for autism?");
  await sendMessage("Are there any new research developments in therapy approaches?");
  
  // Check memory again to see the summaries
  await getMemoryDebugInfo();
  
  // Wait for user to continue
  await new Promise(resolve => {
    rl.question('\nPress Enter to continue with recall testing...', resolve);
  });
  
  // Test recall by asking about previous topics
  console.log('\nTesting recall of previous conversation topics...');
  await sendMessage("Earlier we talked about visual aids. Can you remind me what you said about them?");
  
  // Check recall ability with detailed memory info
  await getMemoryDebugInfo();
}

/**
 * Main execution function
 */
async function main() {
  console.log('==== Memory System Test ====');
  console.log('This script will create a conversation and test the memory capabilities');
  
  // Create a new conversation
  await createConversation();
  
  // Run the test conversation
  await runTestConversation();
  
  console.log('\nTest completed!');
  rl.close();
}

// Start the test
main().catch(error => {
  console.error('Test failed:', error);
  rl.close();
});