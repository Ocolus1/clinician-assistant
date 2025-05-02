/**
 * Debug script to check the patient count using the API
 */

import fetch from 'node-fetch';

async function checkPatientCountViaAPI() {
  try {
    console.log('Querying API for patient count...');
    
    // Get all patients from the API
    const response = await fetch('http://localhost:5000/api/patients');
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const patients = await response.json();
    
    console.log('Patient count from API:', patients.length);
    
    // Print all patient IDs and names for verification
    console.log('\nPatient list:');
    patients.forEach(patient => {
      console.log(`ID: ${patient.id}, Name: ${patient.name}`);
    });
    
  } catch (error) {
    console.error('Error querying API:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkPatientCountViaAPI();
