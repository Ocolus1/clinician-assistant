/**
 * Migration script to add unique identifier columns to clients table
 * 
 * This script adds originalName and uniqueIdentifier columns to the clients table,
 * and populates them based on the existing name field.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import { clients } from "./shared/schema";

async function main() {
  console.log("Adding client identifier columns and populating data");

  // Connect to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Check if columns already exist
    try {
      console.log("Checking if columns already exist...");
      await pool.query(`
        SELECT original_name, unique_identifier 
        FROM clients 
        LIMIT 1
      `);
      console.log("Columns already exist, skipping creation.");
    } catch (error) {
      // Columns don't exist, create them
      console.log("Adding original_name and unique_identifier columns to clients table...");
      await pool.query(`
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS original_name TEXT,
        ADD COLUMN IF NOT EXISTS unique_identifier TEXT
      `);
      console.log("Columns added successfully.");
    }

    // Get all clients
    const allClients = await db.select().from(clients);
    console.log(`Found ${allClients.length} clients to process`);

    // Update each client
    for (const client of allClients) {
      // Skip clients that already have the fields populated
      if (client.originalName && client.uniqueIdentifier) {
        console.log(`Client ${client.id} already has identifier data, skipping`);
        continue;
      }

      // Generate a 6-digit unique identifier
      const uniqueIdentifier = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Update the client record
      await db.update(clients)
        .set({ 
          originalName: client.name,
          uniqueIdentifier: uniqueIdentifier,
          name: `${client.name}-${uniqueIdentifier}`
        })
        .where(eq(clients.id, client.id));
      
      console.log(`Updated client ${client.id}: ${client.name} → ${client.name}-${uniqueIdentifier}`);
    }

    console.log("Client identifier migration completed successfully");
  } catch (error) {
    console.error("Error in migration:", error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);