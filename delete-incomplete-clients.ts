
import { db } from './server/db';
import { Pool } from '@neondatabase/serverless';
import { clients } from './shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log("Starting deletion of clients with incomplete onboarding...");
  
  try {
    // Connect to database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // First, identify the incomplete clients
    const incompleteClientsResult = await pool.query(`
      SELECT id, name
      FROM clients
      WHERE onboarding_status = 'incomplete'
    `);
    
    if (incompleteClientsResult.rows.length > 0) {
      console.log(`Found ${incompleteClientsResult.rows.length} clients with incomplete onboarding:`);
      
      for (const client of incompleteClientsResult.rows) {
        console.log(`- Client ID ${client.id}: ${client.name}`);
        
        // Delete the client
        await pool.query(`
          DELETE FROM clients
          WHERE id = $1
        `, [client.id]);
        
        console.log(`Successfully deleted client with ID ${client.id}`);
      }
      
      console.log("All incomplete clients have been deleted.");
    } else {
      console.log("No incomplete clients found.");
    }
    
    console.log("Client cleanup completed successfully.");
  } catch (error) {
    console.error("Error during client cleanup:", error);
  } finally {
    process.exit(0);
  }
}

// Run the cleanup script
main().catch(console.error);
