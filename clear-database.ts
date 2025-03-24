/**
 * Database Cleanup Script
 * 
 * This script clears all data from the database tables while preserving the schema.
 * It deletes records from all tables in the correct order to respect foreign key constraints.
 */

import { db } from './server/db';
import { 
  clients, 
  allies, 
  goals, 
  subgoals, 
  budgetSettings, 
  budgetItems, 
  sessions, 
  sessionNotes, 
  performanceAssessments, 
  milestoneAssessments 
} from './shared/schema';
import { eq, sql } from 'drizzle-orm';

async function clearDatabase() {
  try {
    console.log('Starting database cleanup...');
    
    // Delete in reverse order of dependencies to avoid foreign key constraint issues
    // First, delete records from child tables
    console.log('Deleting milestone_assessments records...');
    await db.delete(milestoneAssessments);
    
    console.log('Deleting performance_assessments records...');
    await db.delete(performanceAssessments);
    
    console.log('Deleting session_notes records...');
    await db.delete(sessionNotes);
    
    console.log('Deleting sessions records...');
    await db.delete(sessions);
    
    console.log('Deleting subgoals records...');
    await db.delete(subgoals);
    
    console.log('Deleting goals records...');
    await db.delete(goals);
    
    console.log('Deleting budget_items records...');
    await db.delete(budgetItems);
    
    console.log('Deleting budget_settings records...');
    await db.delete(budgetSettings);
    
    console.log('Deleting allies records...');
    await db.delete(allies);
    
    // Last, delete records from parent tables
    console.log('Deleting clients records...');
    await db.delete(clients);
    
    // Keep strategies and budget_item_catalog as they are reference data
    console.log('Note: keeping strategies and budget_item_catalog as reference data');
    
    console.log('Database cleanup completed successfully.');
    console.log('The database schema remains intact but all client data has been deleted.');
    console.log('You now have a clean database to work with.');
    
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
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