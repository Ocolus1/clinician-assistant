import { db } from './server/db';
import { sql } from 'drizzle-orm';

/**
 * This script fixes database schema mismatches by adding missing columns
 * to various tables to match the defined schema in shared/schema.ts
 */
async function main() {
  try {
    console.log('Starting schema fixes...');
    
    // Fix allies table
    console.log('Fixing allies table...');
    await db.execute(sql`
      ALTER TABLE allies 
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);
    
    // Fix budget_items table
    console.log('Fixing budget_items table...');
    await db.execute(sql`
      ALTER TABLE budget_items 
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS category TEXT
    `);

    // Check for other tables with potentially missing columns
    console.log('Checking budget_settings table...');
    await db.execute(sql`
      ALTER TABLE budget_settings
      ADD COLUMN IF NOT EXISTS plan_serial_number TEXT,
      ADD COLUMN IF NOT EXISTS plan_code TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS end_of_plan TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
    `);

    console.log('Checking budget_item_catalog table...');
    await db.execute(sql`
      ALTER TABLE budget_item_catalog
      ADD COLUMN IF NOT EXISTS category TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
    `);

    console.log('Checking subgoals table...');
    await db.execute(sql`
      ALTER TABLE subgoals
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
    `);

    // Verify changes
    console.log('Verifying changes...');
    
    const alliesColumns = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'allies' ORDER BY column_name
    `);
    console.log('Allies table columns:', alliesColumns.rows);
    
    const budgetItemsColumns = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'budget_items' ORDER BY column_name
    `);
    console.log('Budget items table columns:', budgetItemsColumns.rows);
    
    const budgetSettingsColumns = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'budget_settings' ORDER BY column_name
    `);
    console.log('Budget settings table columns:', budgetSettingsColumns.rows);
    
    console.log('Schema fixes completed successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();