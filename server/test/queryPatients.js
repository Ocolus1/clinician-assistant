// Script to query patients from the database
import { db } from '../db/index.js';
import { patients } from '../db/schema.js';

async function findPatients() {
  try {
    const allPatients = await db.select().from(patients);
    console.log('All patients:');
    console.log(JSON.stringify(allPatients, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

findPatients();
