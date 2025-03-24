/**
 * Client Date Update Utility
 * 
 * This script allows updating the creation date of a client and their budget plan
 * to a specific date for testing purposes.
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Update client and budget creation dates
 * @param clientId The ID of the client to update
 * @param creationDate The new creation date to set (ISO string or Date object)
 */
async function updateClientDates(clientId: number, creationDate: string | Date) {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Format date if it's a Date object
    const dateStr = creationDate instanceof Date 
      ? creationDate.toISOString() 
      : creationDate;
    
    console.log(`Updating client ID ${clientId} to creation date: ${dateStr}`);
    
    // Update client creation date
    const clientResult = await client.query(
      'UPDATE clients SET "createdAt" = $1 WHERE id = $2 RETURNING *',
      [dateStr, clientId]
    );
    
    if (clientResult.rowCount === 0) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    
    console.log(`Client createdAt updated to ${dateStr}`);
    
    // Update budget settings creation date
    const budgetResult = await client.query(
      'UPDATE budget_settings SET "createdAt" = $1 WHERE "clientId" = $2 RETURNING *',
      [dateStr, clientId]
    );
    
    if (budgetResult.rowCount > 0) {
      console.log(`Budget settings createdAt updated to ${dateStr}`);
      
      // Get the budget end date (for logging purposes)
      const endDate = budgetResult.rows[0].endOfPlan;
      console.log(`Budget end date: ${endDate}`);
      
      // Calculate and log the budget duration
      if (endDate) {
        const start = new Date(dateStr);
        const end = new Date(endDate);
        const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Budget duration: ${durationDays} days`);
      }
    } else {
      console.log(`No budget settings found for client ID ${clientId}`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Successfully updated dates for client ID ${clientId}`);
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error updating client dates:', error);
    throw error;
  } finally {
    // Release client
    client.release();
  }
}

async function main() {
  try {
    // Get client ID from command line argument or use default
    const clientId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
    
    // Get date from command line argument or use default
    const dateArg = process.argv[3];
    
    if (!clientId) {
      console.error('Please provide a client ID as the first argument');
      console.log('Usage: npx tsx update-client-dates.ts <clientId> [date]');
      console.log('Example: npx tsx update-client-dates.ts 100 2025-01-04');
      process.exit(1);
    }
    
    // If no date provided, default to January 4, 2025
    const creationDate = dateArg || '2025-01-04T00:00:00.000Z';
    
    await updateClientDates(clientId, creationDate);
    
    process.exit(0);
  } catch (error) {
    console.error('Script execution failed:', error);
    process.exit(1);
  }
}

// Run the script
main();