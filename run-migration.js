// Database migration script
import { exec } from 'child_process';

console.log('Running database migration...');

// Execute the database migration using drizzle-kit
exec('npx drizzle-kit push', (err, stdout, stderr) => {
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
  
  console.log('Database migration completed successfully!');
});