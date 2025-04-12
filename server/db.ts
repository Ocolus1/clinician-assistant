/**
 * Database Connection Module
 * 
 * This module provides a connection to the PostgreSQL database
 * using the Postgres library. It exports a configured client.
 */

import postgres from 'postgres';

// Get the database connection URL from environment variables
const databaseUrl = process.env.DATABASE_URL || 
  'postgres://postgres:postgres@localhost:5432/postgres';

// Create a PostgreSQL client
export const sql = postgres(databaseUrl, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 30, // Number of seconds a connection can be idle before being terminated
  connect_timeout: 30, // Maximum number of seconds to wait for a connection
});

console.log('PostgreSQL client initialized.');

// Export a function to check database connectivity
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Try a simple query to check connectivity
    const result = await sql`SELECT 1 as connected`;
    return result[0]?.connected === 1;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}