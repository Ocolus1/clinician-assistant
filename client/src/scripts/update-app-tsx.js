// Script to update App.tsx with new component names and route paths
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const appTsxPath = path.join(__dirname, '..', 'App.tsx');
const updatedAppTsxPath = path.join(__dirname, '..', 'App.updated.tsx');

// Read the App.tsx file
let content = fs.readFileSync(appTsxPath, 'utf8');

// Define replacement pairs (old term -> new term)
const replacements = [
  { from: 'import ClientList from "@/pages/ClientList"', to: 'import PatientList from "@/pages/PatientList"' },
  { from: 'import EnhancedClientList from "@/pages/EnhancedClientList"', to: 'import EnhancedPatientList from "@/pages/EnhancedPatientList"' },
  { from: 'import ClientProfile from "@/pages/ClientProfile"', to: 'import PatientProfile from "@/pages/PatientProfile"' },
  { from: '/clients/new', to: '/patients/new' },
  { from: '/clients"', to: '/patients"' },
  { from: '/clients/legacy', to: '/patients/legacy' },
  { from: '/clients/:id', to: '/patients/:id' },
  { from: 'summary/:clientId', to: 'summary/:patientId' },
  { from: '/client/:clientId/summary', to: '/patient/:patientId/summary' },
  { from: '/client/:id/profile', to: '/patient/:id/profile' },
  { from: '/clients/:id/profile', to: '/patients/:id/profile' },
  { from: '/clients/:id/reports', to: '/patients/:id/reports' },
  { from: '/client/:id/reports', to: '/patient/:id/reports' },
  { from: '/client/:id/print', to: '/patient/:id/print' },
  { from: '/debug/budget/:clientId?', to: '/debug/budget/:patientId?' },
  { from: 'component={ClientList}', to: 'component={PatientList}' },
  { from: 'component={EnhancedClientList}', to: 'component={EnhancedPatientList}' },
  { from: 'component={ClientProfile}', to: 'component={PatientProfile}' },
];

// Apply all replacements
replacements.forEach(({ from, to }) => {
  content = content.replace(from, to);
});

// Write the updated content to a new file
fs.writeFileSync(updatedAppTsxPath, content, 'utf8');

console.log(`App.tsx updated successfully. New file created at: ${updatedAppTsxPath}`);
console.log('Please review the changes and replace App.tsx with App.updated.tsx if everything looks correct.');
