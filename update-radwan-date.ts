/**
 * Temporary script to update Radwan's profile creation date
 * Based on the existing update-client-dates.ts utility
 */

import { db } from './server/db';
import { budgetSettings } from './shared/schema';
import { eq } from 'drizzle-orm';

async function updateRadwanDates() {
  try {
    const clientId = 88; // Radwan's client ID
    const newDate = new Date('2025-01-03T00:00:00.000Z');
    
    console.log(`Updating Radwan's profile (ID ${clientId}) to creation date: ${newDate.toISOString()}`);
    
    // Update budget settings creation date
    const updatedBudgets = await db.update(budgetSettings)
      .set({ createdAt: newDate })
      .where(eq(budgetSettings.clientId, clientId))
      .returning();
    
    if (updatedBudgets.length > 0) {
      console.log(`Budget settings createdAt updated to ${newDate.toISOString()}`);
      
      // Get the budget end date (for logging purposes)
      const endDate = updatedBudgets[0].endOfPlan;
      console.log(`Budget end date: ${endDate}`);
      
      // Calculate and log the budget duration
      if (endDate) {
        const endDateObj = new Date(endDate);
        const durationDays = Math.round((endDateObj.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Budget duration: ${durationDays} days`);
      }
    } else {
      console.log(`No budget settings found for client ID ${clientId}`);
    }
    
    console.log(`Successfully updated dates for Radwan's profile (ID ${clientId})`);
    
  } catch (error) {
    console.error('Error updating client dates:', error);
    throw error;
  }
}

// Run the function
updateRadwanDates()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });