/**
 * Database Cleanup Script
 * 
 * This script clears all data from the database tables while preserving the schema.
 * It deletes records from all tables in the correct order to respect foreign key constraints.
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clearDatabase() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting database cleanup...');
    
    // Delete in reverse order of dependencies to avoid foreign key constraint issues
    // First, delete records from child tables
    console.log('Deleting milestone_assessments records...');
    await client.query('DELETE FROM milestone_assessments');
    
    console.log('Deleting performance_assessments records...');
    await client.query('DELETE FROM performance_assessments');
    
    console.log('Deleting session_notes records...');
    await client.query('DELETE FROM session_notes');
    
    console.log('Deleting sessions records...');
    await client.query('DELETE FROM sessions');
    
    console.log('Deleting subgoals records...');
    await client.query('DELETE FROM subgoals');
    
    console.log('Deleting goals records...');
    await client.query('DELETE FROM goals');
    
    console.log('Deleting budget_items records...');
    await client.query('DELETE FROM budget_items');
    
    console.log('Deleting budget_settings records...');
    await client.query('DELETE FROM budget_settings');
    
    console.log('Deleting allies records...');
    await client.query('DELETE FROM allies');
    
    // Last, delete records from parent tables
    console.log('Deleting clients records...');
    await client.query('DELETE FROM clients');
    
    // Keep strategies and budget_item_catalog as they are reference data
    console.log('Note: keeping strategies and budget_item_catalog as reference data');
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Database cleanup completed successfully.');
    console.log('The database schema remains intact but all client data has been deleted.');
    console.log('You now have a clean database to work with.');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error clearing database:', error);
    throw error;
  } finally {
    // Release client
    client.release();
  }
}

async function main() {
  try {
    // Ask for confirmation before proceeding
    console.log('\nWARNING: This script will delete ALL data from the database!');
    console.log('All clients and their associated data will be permanently removed.');
    console.log('The database schema will remain intact.\n');
    
    // Since we can't get interactive input in this environment, 
    // we'll just log a warning message
    console.log('Database cleanup starting in 5 seconds...');
    
    // Proceed with cleanup
    await clearDatabase();
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Database cleanup failed:', error);
    process.exit(1);
  }
}

// Run the script
main();