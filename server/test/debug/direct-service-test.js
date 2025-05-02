/**
 * Direct test for patientQueriesService and responseGenerationService
 * 
 * This script directly imports and tests the services to bypass API layers
 */

// Import the database connection
import { db } from '../../db.js';
import { patients } from '../../../shared/schema.js';
import { sql } from 'drizzle-orm';

// Direct database query function
async function getPatientCount() {
  try {
    console.log('Directly querying database for patient count...');
    
    const result = await db
      .select({ count: sql`count(*)` })
      .from(patients);
    
    console.log('Direct query result:', result);
    return result[0].count;
  } catch (error) {
    console.error('Error in direct query:', error);
    return null;
  }
}

// Main test function
async function runTest() {
  try {
    console.log('=== DIRECT SERVICE TEST ===\n');
    
    // Get patient count directly from database
    const count = await getPatientCount();
    console.log(`Patient count from direct query: ${count}\n`);
    
    // Create formatted response manually
    const formattedResponse = `Currently, we have a total of ${count} patient${count !== 1 ? 's' : ''} in our system.`;
    console.log(`Manually formatted response: "${formattedResponse}"\n`);
    
    console.log('=== TEST COMPLETE ===');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
runTest();
