/**
 * Debug file for clinician assistant queries
 * 
 * This file helps diagnose SQL issues with the assistant
 */

import { sqlQueryGenerator } from './sqlQueryGenerator.js';
import { schemaProvider } from './schemaProvider.js';

// Initialize the schema provider
async function init() {
  try {
    await schemaProvider.initialize();
    console.log('Schema initialized successfully for debug');
    
    // Test the schema description
    const schemaDesc = schemaProvider.getSchemaDescription();
    console.log('\nSCHEMA DESCRIPTION USED BY OPENAI:\n');
    console.log(schemaDesc);

    // Test active clients query specifically
    await testActiveClientsQuery();
    
  } catch (error) {
    console.error('Error in debug assistant:', error);
  }
}

async function testQueryGeneration(question) {
  try {
    console.log(`\nTESTING QUERY GENERATION FOR: "${question}"\n`);
    const query = await sqlQueryGenerator.generateQuery(question);
    console.log('Generated query:', query);
    
    // Execute the query
    console.log('\nEXECUTING QUERY:');
    const result = await sqlQueryGenerator.executeQuery(query);
    console.log('Query result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing query generation:', error);
  }
}

// Function to test active clients query
async function testActiveClientsQuery() {
  try {
    console.log('\n\nTESTING ACTIVE CLIENTS QUERY\n');
    
    // Define the correct SQL to count active clients as those with onboarding_status = 'complete'
    const sqlQuery = "SELECT COUNT(*) as active_clients_count FROM clients WHERE onboarding_status = 'complete'";
    console.log('Executing correct active clients query:', sqlQuery);
    
    // Execute the query
    const result = await sqlQueryGenerator.executeQuery(sqlQuery);
    console.log('Direct query result:', JSON.stringify(result, null, 2));
    
    // Now test using the LLM-generated query
    await testQueryGeneration('How many active clients do we have?');
  } catch (error) {
    console.error('Error testing active clients query:', error);
  }
}

// Run the diagnostics
init();