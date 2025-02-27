// Database migration script
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Setting up database...');

// Execute the database migration
exec('npx drizzle-kit push', { cwd: __dirname }, (err, stdout, stderr) => {
  if (err) {
    console.error('Error executing migration:', err);
    process.exit(1);
  }
  
  console.log('Database migration output:');
  console.log(stdout);
  
  if (stderr) {
    console.error('Migration stderr:');
    console.error(stderr);
  }
  
  console.log('Database migration completed!');
  
  // Start the application after migration
  exec('tsx server/index.ts', { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error('Error starting application:', err);
      process.exit(1);
    }
    
    console.log(stdout);
    
    if (stderr) {
      console.error(stderr);
    }
  });
});