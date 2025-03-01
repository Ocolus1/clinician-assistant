import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Starting schema fixes for allies table...');
    
    // Add missing columns to allies table
    await db.execute(sql`
      ALTER TABLE allies 
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);
    
    console.log('Successfully added missing columns to allies table');
    
    // Verify the changes
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'allies' 
      ORDER BY column_name
    `);
    
    console.log('Allies table columns:', result.rows);
    
    console.log('Schema fixes completed successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();