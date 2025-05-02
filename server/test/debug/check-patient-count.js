/**
 * Debug script to check the patient count directly from the database
 */

import { db } from '../../db.js';
import { patients } from '../../../shared/schema.js';
import { sql } from 'drizzle-orm';

async function checkPatientCount() {
  try {
    console.log('Querying database for patient count...');
    
    // Query 1: Using count(*) with SQL
    const result1 = await db
      .select({ count: sql`count(*)` })
      .from(patients);
    
    console.log('Query 1 result (using sql count(*)):', result1[0].count);
    
    // Query 2: Get all patients and count them
    const allPatients = await db
      .select()
      .from(patients);
    
    console.log('Query 2 result (counting all patients):', allPatients.length);
    
    // Print all patient IDs and names for verification
    console.log('\nPatient list:');
    allPatients.forEach(patient => {
      console.log(`ID: ${patient.id}, Name: ${patient.name}`);
    });
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkPatientCount();
