// Script to find patients with completed onboarding status
import fetch from 'node-fetch';

async function findCompletedPatients() {
  try {
    console.log('Checking for patients with completed onboarding status...');
    
    // Make a request to the local API to get all patients
    const response = await fetch('http://localhost:5000/api/patients');
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const patients = await response.json();
    
    // Filter patients with completed onboarding status
    const completedPatients = patients.filter(patient => 
      patient.onboardingStatus === 'completed'
    );
    
    if (completedPatients.length === 0) {
      console.log('No patients found with completed onboarding status.');
    } else {
      console.log(`Found ${completedPatients.length} patients with completed onboarding status:`);
      completedPatients.forEach(patient => {
        console.log(`- ${patient.name} (ID: ${patient.id}, Unique ID: ${patient.uniqueIdentifier})`);
      });
    }
    
    // Also check for patients with other onboarding statuses
    const pendingPatients = patients.filter(patient => 
      patient.onboardingStatus === 'pending' || patient.onboardingStatus === 'incomplete'
    );
    
    if (pendingPatients.length > 0) {
      console.log(`\nFound ${pendingPatients.length} patients with pending/incomplete onboarding status:`);
      pendingPatients.forEach(patient => {
        console.log(`- ${patient.name} (ID: ${patient.id}, Unique ID: ${patient.uniqueIdentifier}, Status: ${patient.onboardingStatus})`);
      });
    }
    
  } catch (error) {
    console.error('Error finding completed patients:', error);
  }
}

findCompletedPatients();
