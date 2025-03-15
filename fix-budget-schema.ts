/**
 * This script updates the budget_settings table to use ndis_funds column instead of available_funds
 * to align with the schema changes.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pkg from "pg";
const { Pool } = pkg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Updating budget_settings table to rename available_funds to ndis_funds...");

  try {
    // Execute direct SQL to rename the column
    await pool.query(`
      ALTER TABLE budget_settings 
      RENAME COLUMN available_funds TO ndis_funds;
    `);
    
    console.log("✅ Successfully renamed available_funds to ndis_funds in budget_settings table");
  } catch (error) {
    console.error("❌ Error updating budget_settings table:", error);
  } finally {
    await pool.end();
  }
}

main()
  .then(() => {
    console.log("✅ Budget settings schema update completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed to update schema:", error);
    process.exit(1);
  });