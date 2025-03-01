import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Starting schema fixes for clients table...');
    
    // Add missing columns to clients table
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS preferred_language TEXT,
      ADD COLUMN IF NOT EXISTS contact_email TEXT,
      ADD COLUMN IF NOT EXISTS contact_phone TEXT,
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS medical_history TEXT,
      ADD COLUMN IF NOT EXISTS communication_needs TEXT,
      ADD COLUMN IF NOT EXISTS therapy_preferences TEXT
    `);
    
    console.log('Successfully added missing columns to clients table');
    
    // Verify the changes
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY column_name
    `);
    
    console.log('Clients table columns:', result.rows);
    
    console.log('Schema fixes completed successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();