// Script to convert EnhancedClientList.tsx to EnhancedPatientList.tsx
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const sourceFile = path.join(__dirname, '..', 'pages', 'EnhancedClientList.tsx');
const targetFile = path.join(__dirname, '..', 'pages', 'EnhancedPatientList.tsx');

// Read the source file
let content = fs.readFileSync(sourceFile, 'utf8');

// Define replacement pairs (old term -> new term)
const replacements = [
  { from: 'EnhancedClientList', to: 'EnhancedPatientList' },
  { from: 'ClientList', to: 'PatientList' },
  { from: 'Client', to: 'Patient' },
  { from: 'client', to: 'patient' },
  { from: 'Ally', to: 'Caregiver' },
  { from: 'ally', to: 'caregiver' },
  { from: 'allies', to: 'caregivers' },
  { from: 'Allies', to: 'Caregivers' },
  { from: '/api/clients/', to: '/api/patients/' },
  { from: 'clientId', to: 'patientId' },
  { from: 'fetchAllies', to: 'fetchCaregivers' },
  { from: 'EnrichedClient', to: 'EnrichedPatient' },
  { from: 'therapists', to: 'caregivers' },
  { from: 'deleteClient', to: 'deletePatient' },
  { from: 'clientToDelete', to: 'patientToDelete' },
  { from: 'handleNewClient', to: 'handleNewPatient' },
  { from: 'filteredAndSortedClients', to: 'filteredAndSortedPatients' },
  { from: 'enrichedClients', to: 'enrichedPatients' },
];

// Apply all replacements
replacements.forEach(({ from, to }) => {
  // Use regex with word boundaries to avoid partial word matches
  const regex = new RegExp(`\\b${from}\\b`, 'g');
  content = content.replace(regex, to);
});

// Write the converted content to the target file
fs.writeFileSync(targetFile, content, 'utf8');

console.log(`Conversion complete: ${targetFile} created successfully.`);
