// Script to fix remaining references in App.updated.tsx
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file path
const appUpdatedTsxPath = path.join(__dirname, '..', 'App.updated.tsx');

// Read the App.updated.tsx file
let content = fs.readFileSync(appUpdatedTsxPath, 'utf8');

// Fix remaining references to ClientProfile
content = content.replace(/component={ClientProfile}/g, 'component={PatientProfile}');

// Write the fixed content back to the file
fs.writeFileSync(appUpdatedTsxPath, content, 'utf8');

console.log(`App.updated.tsx fixed successfully.`);
