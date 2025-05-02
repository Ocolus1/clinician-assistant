/**
 * Environment Variable Loader
 * 
 * This utility loads environment variables from the .env file
 * to ensure they're available for tests.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../..');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  
  if (fs.existsSync(envPath)) {
    const result = config({ path: envPath });
    
    if (result.error) {
      console.error('Error loading .env file:', result.error);
      return false;
    }
    
    // Verify critical environment variables
    const requiredVars = ['DATABASE_URL', 'OPENAI_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars.join(', '));
      return false;
    }
    
    return true;
  } else {
    console.error('.env file not found at:', envPath);
    return false;
  }
}

export default loadEnv;
