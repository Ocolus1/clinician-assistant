import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function main() {
  console.log("Starting database migration process...");
  
  try {
    // Create a PostgreSQL pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    console.log("Database connection established");
    
    // Initialize drizzle
    const db = drizzle(pool);
    
    // Run migrations
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log("Migrations completed successfully");
    
    // Close the pool
    await pool.end();
    
    console.log("Migration process completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();