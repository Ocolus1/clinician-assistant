// Script to update a patient's onboarding status to "completed"
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: `${__dirname}/.env` });

// Create a new PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updatePatientOnboardingStatus() {
  const client = await pool.connect();
  
  try {
    console.log('Updating patient onboarding status...');
    
    // Get the patient ID from command line arguments or use a default
    const patientId = process.argv[2] || '563004';
    
    // First, check if the patient exists
    const checkResult = await client.query(
      'SELECT id, name, onboarding_status FROM patients WHERE unique_identifier = $1',
      [patientId]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`Patient with ID ${patientId} not found.`);
      return;
    }
    
    const patient = checkResult.rows[0];
    console.log(`Found patient: ${patient.name} (ID: ${patient.id})`);
    console.log(`Current onboarding status: ${patient.onboarding_status}`);
    
    // Update the patient's onboarding status to "completed"
    await client.query(
      'UPDATE patients SET onboarding_status = $1 WHERE unique_identifier = $2',
      ['completed', patientId]
    );
    
    console.log(`Updated onboarding status to "completed" for patient ${patient.name}`);
    
    // Verify the update
    const verifyResult = await client.query(
      'SELECT id, name, onboarding_status FROM patients WHERE unique_identifier = $1',
      [patientId]
    );
    
    if (verifyResult.rows.length > 0) {
      const updatedPatient = verifyResult.rows[0];
      console.log(`Verified patient: ${updatedPatient.name} (ID: ${updatedPatient.id})`);
      console.log(`New onboarding status: ${updatedPatient.onboarding_status}`);
    }
    
    console.log('Patient onboarding status update complete!');
  } catch (error) {
    console.error('Error updating patient onboarding status:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

updatePatientOnboardingStatus();
