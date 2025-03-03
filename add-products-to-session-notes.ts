import { db } from "./server/db";
import { sql } from "drizzle-orm";

/**
 * This script adds the products column to the session_notes table
 */
async function main() {
  console.log("Adding products column to session_notes table...");
  
  try {
    // Add the products column to the session_notes table
    await db.execute(sql`
      ALTER TABLE session_notes 
      ADD COLUMN IF NOT EXISTS products TEXT;
    `);
    
    console.log("✅ Successfully added products column to session_notes table");
  } catch (error) {
    console.error("❌ Error adding products column:", error);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));