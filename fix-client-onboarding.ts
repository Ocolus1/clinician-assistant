import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

const { Pool } = pg;
import * as schema from "./shared/schema";

/**
 * This script adds the onboarding_status column to the clients table
 * and sets previously created clients to "complete" status.
 */
async function main() {
  // Connect to database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Starting client onboarding status fix migration...");

  try {
    // Check if onboarding_status column exists
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'onboarding_status'
    `);

    if (result.rowCount === 0) {
      console.log("Adding onboarding_status column to clients table...");
      // Add onboarding_status column to clients table
      await pool.query(`
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'incomplete'
      `);
      console.log("onboarding_status column added successfully.");
    } else {
      console.log("onboarding_status column already exists.");
    }

    // Update all existing clients to have "complete" status
    await pool.query(`
      UPDATE clients 
      SET onboarding_status = 'complete'
    `);
    
    console.log("Updated all existing clients to 'complete' status.");

    // Now flag potentially incomplete clients (those without budget settings)
    // This query finds clients that don't have budget settings
    const incompleteClientsResult = await pool.query(`
      SELECT c.id, c.name
      FROM clients c
      LEFT JOIN budget_settings bs ON c.id = bs.client_id
      WHERE bs.id IS NULL
    `);

    if (incompleteClientsResult.rows.length > 0) {
      console.log(`Found ${incompleteClientsResult.rows.length} potentially incomplete clients:`);
      
      for (const client of incompleteClientsResult.rows) {
        console.log(`- Client ID ${client.id}: ${client.name}`);
        
        // Update incomplete clients to have "incomplete" status
        await pool.query(`
          UPDATE clients 
          SET onboarding_status = 'incomplete'
          WHERE id = $1
        `, [client.id]);
      }
      
      console.log("Updated incomplete clients' status successfully.");
    } else {
      console.log("No incomplete clients found.");
    }
    
    console.log("Client onboarding status migration completed successfully.");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await pool.end();
  }
}

// Run the migration
main().catch(console.error);