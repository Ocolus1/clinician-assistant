/**
 * This script creates the sessions table in the database
 */
import { db } from "./server/db";
import { sessions } from "./shared/schema";

async function main() {
  console.log("Creating sessions table...");
  
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        therapist_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        session_date TIMESTAMP NOT NULL,
        duration INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        location TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("Successfully created sessions table!");
  } catch (error) {
    console.error("Error creating sessions table:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error("Error running migration:", error);
  process.exit(1);
});