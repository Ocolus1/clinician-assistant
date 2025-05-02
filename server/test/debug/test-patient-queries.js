/**
 * Test script to directly test the patientQueriesService
 */

import { db } from '../../db/index.js';
import { patients } from '../../../shared/schema.js';
import { sql } from 'drizzle-orm';

async function testPatientCount() {
  try {
    console.log('=== PATIENT QUERIES SERVICE TEST ===\n');
    
    // Direct database query for patient count
    console.log('Directly querying database for patient count...');
    const result = await db
      .select({ count: sql`count(*)` })
      .from(patients);
    
    console.log('Query result:', result);
    console.log(`Patient count from direct query: ${result[0].count}\n`);
    
    // List all patients
    console.log('Listing all patients:');
    const allPatients = await db.select().from(patients);
    console.log(`Total patients found: ${allPatients.length}`);
    
    allPatients.forEach(patient => {
      console.log(`ID: ${patient.id}, Name: ${patient.firstName} ${patient.lastName}`);
    });
    
    console.log('\n=== TEST COMPLETE ===');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testPatientCount();
