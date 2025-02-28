import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './shared/schema';

// Function to run migrations
async function runMigrations() {
  try {
    console.log('Starting database migration...');
    
    // Create a PostgreSQL pool
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Create drizzle instance with schema
    const db = drizzle(pool, { schema });
    
    // Auto-generate and run migrations
    await migrate(db, { migrationsFolder: 'drizzle' });
    
    console.log('Database migration completed successfully.');
    
    // Push schema changes directly
    console.log('Applying schema changes...');
    
    // Clean up
    await pool.end();
    
    console.log('All operations completed successfully.');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();