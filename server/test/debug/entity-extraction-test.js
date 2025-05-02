/**
 * Debug script to test entity extraction for patient count queries
 */

import { entityExtractionService } from '../../services/entityExtractionService.js';

async function testEntityExtraction() {
  try {
    console.log('Testing entity extraction for patient count queries...\n');
    
    const queries = [
      'How many patients do we have?',
      'What is the total number of patients?',
      'Count the patients in our system',
      'Tell me the patient count',
      'Total number of patients in the system?'
    ];
    
    for (const query of queries) {
      console.log(`Query: "${query}"`);
      const entities = await entityExtractionService.extractEntities(query);
      console.log(`Extracted query type: ${entities.queryType}`);
      console.log('All extracted entities:', JSON.stringify(entities, null, 2));
      console.log('---\n');
    }
    
  } catch (error) {
    console.error('Error testing entity extraction:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testEntityExtraction();
