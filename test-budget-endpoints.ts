/**
 * Budget API Endpoint Test Script
 * 
 * This script tests the direct API endpoints for budget functionality
 * to diagnose 502 Bad Gateway errors
 */
import { db } from './server/db';

async function testBudgetEndpoints() {
  const clientId = 88; // Using the Radwan test client
  const baseURL = 'http://localhost:5000'; // Server base URL
  
  console.log('===== Testing Budget API Endpoints =====');
  
  try {
    // Test 1: Get budget settings for client
    console.log(`\nTest 1: GET ${baseURL}/api/clients/${clientId}/budget-settings`);
    const settingsResponse = await fetch(`${baseURL}/api/clients/${clientId}/budget-settings`);
    
    if (!settingsResponse.ok) {
      console.error(`Error: ${settingsResponse.status} ${settingsResponse.statusText}`);
    } else {
      const settings = await settingsResponse.json();
      console.log(`Success! Received:`, settings);
    }
    
    // Test 2: Get ALL budget settings for client
    console.log(`\nTest 2: GET ${baseURL}/api/clients/${clientId}/budget-settings?all=true`);
    const allSettingsResponse = await fetch(`${baseURL}/api/clients/${clientId}/budget-settings?all=true`);
    
    if (!allSettingsResponse.ok) {
      console.error(`Error: ${allSettingsResponse.status} ${allSettingsResponse.statusText}`);
    } else {
      const allSettings = await allSettingsResponse.json();
      console.log(`Success! Received ${Array.isArray(allSettings) ? allSettings.length : 1} settings`);
    }
    
    // Test 3: Get budget items for client
    console.log(`\nTest 3: GET ${baseURL}/api/clients/${clientId}/budget-items`);
    const itemsResponse = await fetch(`${baseURL}/api/clients/${clientId}/budget-items`);
    
    if (!itemsResponse.ok) {
      console.error(`Error: ${itemsResponse.status} ${itemsResponse.statusText}`);
    } else {
      const items = await itemsResponse.json();
      console.log(`Success! Received ${items.length} budget items`);
    }
    
    // Test 4: Get sessions for client
    console.log(`\nTest 4: GET ${baseURL}/api/clients/${clientId}/sessions`);
    const sessionsResponse = await fetch(`${baseURL}/api/clients/${clientId}/sessions`);
    
    if (!sessionsResponse.ok) {
      console.error(`Error: ${sessionsResponse.status} ${sessionsResponse.statusText}`);
    } else {
      const sessions = await sessionsResponse.json();
      console.log(`Success! Received ${sessions.length} sessions`);
    }
    
    console.log('\n===== Budget API Endpoint Tests Complete =====');
  } catch (error) {
    console.error('Error during API tests:', error);
  }
}

// Run the tests when this file is executed
testBudgetEndpoints();