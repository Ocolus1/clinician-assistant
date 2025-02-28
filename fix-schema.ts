import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './shared/schema';

async function main() {
  console.log("Starting database schema fix...");
  
  try {
    // Create a PostgreSQL pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    console.log("Database connection established");
    
    // Initialize drizzle with our schema
    const db = drizzle(pool, { schema });
    
    console.log("Applying schema changes...");
    
    // Check if budget_settings table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'budget_settings'
      ) as exists;
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    
    if (tableExists) {
      // Check if plan_serial_number column exists
      const columnCheckResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'budget_settings' AND column_name = 'plan_serial_number'
        ) as exists;
      `);
      
      const columnExists = columnCheckResult.rows[0].exists;
      
      if (!columnExists) {
        console.log("Adding plan_serial_number column to budget_settings table...");
        await pool.query(`
          ALTER TABLE budget_settings 
          ADD COLUMN plan_serial_number TEXT;
        `);
        console.log("Column added successfully");
      } else {
        console.log("plan_serial_number column already exists");
      }
    } else {
      console.log("budget_settings table does not exist, will be created through schema push");
    }
    
    console.log("Database schema fixes applied");
    
    // Close the pool
    await pool.end();
    
    console.log("Schema fix process completed successfully");
  } catch (error) {
    console.error("Schema fix failed:", error);
    process.exit(1);
  }
}

main();