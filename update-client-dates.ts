/**
 * Client Date Update Utility
 * 
 * This script allows updating the creation date of a client and their budget plan
 * to a specific date for testing purposes.
 */

import { db } from './server/db';
import { clients, budgetSettings } from './shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Update client and budget creation dates
 * @param clientId The ID of the client to update
 * @param creationDate The new creation date to set (ISO string or Date object)
 */
async function updateClientDates(clientId: number, creationDate: string | Date) {
  try {
    // Format date if it's a string
    const dateObj = typeof creationDate === 'string' 
      ? new Date(creationDate)
      : creationDate;
    
    console.log(`Updating client ID ${clientId} to creation date: ${dateObj.toISOString()}`);
    
    // Clients don't have createdAt in our schema, so we'll just retrieve the client
    const updatedClients = await db.select()
      .from(clients)
      .where(eq(clients.id, clientId));
    
    if (updatedClients.length === 0) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    
    console.log(`Client ID ${clientId} verified to exist`);
    
    // Update budget settings creation date
    const updatedBudgets = await db.update(budgetSettings)
      .set({ createdAt: dateObj })
      .where(eq(budgetSettings.clientId, clientId))
      .returning();
    
    if (updatedBudgets.length > 0) {
      console.log(`Budget settings createdAt updated to ${dateObj.toISOString()}`);
      
      // Get the budget end date (for logging purposes)
      const endDate = updatedBudgets[0].endOfPlan;
      console.log(`Budget end date: ${endDate}`);
      
      // Calculate and log the budget duration
      if (endDate) {
        // Since endOfPlan is a string in our schema
        const endDateObj = new Date(endDate);
        const durationDays = Math.round((endDateObj.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Budget duration: ${durationDays} days`);
      }
    } else {
      console.log(`No budget settings found for client ID ${clientId}`);
    }
    
    console.log(`Successfully updated dates for client ID ${clientId}`);
    
  } catch (error) {
    console.error('Error updating client dates:', error);
    throw error;
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