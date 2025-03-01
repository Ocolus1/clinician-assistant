import { pool } from './server/db';

/**
 * This script adds the archived column to the allies table
 * and sets previously created allies to non-archived status (false).
 */
async function main() {
  try {
    console.log('Adding archived column to allies table...');
    
    // Check if the column already exists
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'allies' AND column_name = 'archived';
    `;
    
    const columnCheckResult = await pool.query(checkColumnQuery);
    
    if (columnCheckResult.rows.length === 0) {
      // Column doesn't exist, add it
      const alterTableQuery = `
        ALTER TABLE allies
        ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
      `;
      
      await pool.query(alterTableQuery);
      console.log('Added archived column to allies table');
    } else {
      console.log('archived column already exists in allies table');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await pool.end();
  }
}

main();