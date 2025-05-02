// Script to update a patient's onboarding status via the API
import fetch from 'node-fetch';

async function updatePatientOnboardingStatus() {
  try {
    console.log('Updating patient onboarding status via API...');
    
    // Get the patient ID from command line arguments or use a default
    const patientId = process.argv[2] || '1'; // Default to first patient if none specified
    
    // First, get the current patient data
    const getResponse = await fetch(`http://localhost:5000/api/patients/${patientId}`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get patient data: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const patientData = await getResponse.json();
    console.log(`Found patient: ${patientData.name} (ID: ${patientData.id})`);
    console.log(`Current onboarding status: ${patientData.onboardingStatus}`);
    
    // Update the patient's onboarding status to "completed"
    const updatedPatientData = {
      ...patientData,
      onboardingStatus: 'completed'
    };
    
    // Send the update request
    const updateResponse = await fetch(`http://localhost:5000/api/patients/${patientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedPatientData)
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update patient: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    console.log(`Successfully updated patient ${patientData.name}'s onboarding status to "completed"`);
    
    // Verify the update
    const verifyResponse = await fetch(`http://localhost:5000/api/patients/${patientId}`);
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify update: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const updatedData = await verifyResponse.json();
    console.log(`Verified patient: ${updatedData.name} (ID: ${updatedData.id})`);
    console.log(`New onboarding status: ${updatedData.onboardingStatus}`);
    
    console.log('Patient onboarding status update complete!');
  } catch (error) {
    console.error('Error updating patient onboarding status:', error);
  }
}

updatePatientOnboardingStatus();
