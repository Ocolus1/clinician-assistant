// Script to update a patient's onboarding status to "completed"
import { db } from '../db/index.js';
import { patients, eq } from '../db/schema.js';

async function updatePatientStatus() {
  try {
    // Update Radwan-765193's onboarding status to "completed"
    const patientId = 765193; // Extracted from the hyphenated identifier
    
    // First, check if the patient exists
    const existingPatient = await db.select().from(patients).where(eq(patients.id, patientId));
    
    if (existingPatient.length > 0) {
      // Update the patient's onboarding status
      await db.update(patients)
        .set({ onboardingStatus: 'completed' })
        .where(eq(patients.id, patientId));
      
      console.log(`Successfully updated patient ${patientId}'s onboarding status to "completed"`);
      
      // Verify the update
      const updatedPatient = await db.select().from(patients).where(eq(patients.id, patientId));
      console.log('Updated patient data:');
      console.log(JSON.stringify(updatedPatient, null, 2));
    } else {
      console.log(`Patient with ID ${patientId} not found.`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

updatePatientStatus();
