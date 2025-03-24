/**
 * Migration script to add unique identifier columns to clients table
 * 
 * This script adds originalName and uniqueIdentifier columns to the clients table
 * using direct SQL rather than Drizzle ORM.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure neon for serverless environments
neonConfig.webSocketConstructor = ws;

async function main() {
  console.log("Adding client identifier columns and populating data");

  // Connect to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
    const clientsResult = await pool.query(`
      SELECT id, name, original_name, unique_identifier 
      FROM clients
    `);
    
    const clients = clientsResult.rows;
    console.log(`Found ${clients.length} clients to process`);

    // Update each client
    for (const client of clients) {
      // Skip clients that already have the fields populated
      if (client.original_name && client.unique_identifier) {
        console.log(`Client ${client.id} already has identifier data, skipping`);
        continue;
      }

      // Generate a 6-digit unique identifier
      const uniqueIdentifier = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Update the client record
      await pool.query(`
        UPDATE clients
        SET 
          original_name = $1, 
          unique_identifier = $2,
          name = $3
        WHERE id = $4
      `, [client.name, uniqueIdentifier, `${client.name}-${uniqueIdentifier}`, client.id]);
      
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