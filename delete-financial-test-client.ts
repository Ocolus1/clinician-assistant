/**
 * Delete Financial Test Client
 * 
 * This script deletes the test financial client and all associated data
 * to clean up after testing.
 */
import { db } from './server/db';
import { clients, budgetSettings, budgetItems, sessions, sessionNotes, goals, subgoals } from './shared/schema';
import { eq } from 'drizzle-orm';

async function deleteFinancialTestClient() {
  try {
    // Find the client by name
    const clientsToDelete = await db.select()
      .from(clients)
      .where(eq(clients.name, 'Test Financial Report'));
    
    if (clientsToDelete.length === 0) {
      console.log("No financial test client found to delete");
      return;
    }
    
    // Delete each client and all their associated data
    for (const client of clientsToDelete) {
      console.log(`Deleting financial test client with ID ${client.id}...`);
      
      // 1. Get and delete all sessions and associated notes
      const clientSessions = await db.select()
        .from(sessions)
        .where(eq(sessions.clientId, client.id));
      
      for (const session of clientSessions) {
        // Delete session notes first
        await db.delete(sessionNotes)
          .where(eq(sessionNotes.sessionId, session.id));
        
        console.log(`Deleted session notes for session ID ${session.id}`);
      }
      
      // Delete all sessions
      await db.delete(sessions)
        .where(eq(sessions.clientId, client.id));
      
      console.log(`Deleted ${clientSessions.length} sessions for client ID ${client.id}`);
      
      // 2. Get and delete all goals and subgoals
      const clientGoals = await db.select()
        .from(goals)
        .where(eq(goals.clientId, client.id));
      
      for (const goal of clientGoals) {
        // Delete subgoals first
        await db.delete(subgoals)
          .where(eq(subgoals.goalId, goal.id));
        
        console.log(`Deleted subgoals for goal ID ${goal.id}`);
      }
      
      // Delete all goals
      await db.delete(goals)
        .where(eq(goals.clientId, client.id));
      
      console.log(`Deleted ${clientGoals.length} goals for client ID ${client.id}`);
      
      // 3. Delete budget items
      const clientBudgetSettings = await db.select()
        .from(budgetSettings)
        .where(eq(budgetSettings.clientId, client.id));
      
      for (const settings of clientBudgetSettings) {
        // Delete budget items first
        await db.delete(budgetItems)
          .where(eq(budgetItems.budgetSettingsId, settings.id));
        
        console.log(`Deleted budget items for budget settings ID ${settings.id}`);
      }
      
      // 4. Delete budget settings
      await db.delete(budgetSettings)
        .where(eq(budgetSettings.clientId, client.id));
      
      console.log(`Deleted ${clientBudgetSettings.length} budget settings for client ID ${client.id}`);
      
      // 5. Finally delete the client
      await db.delete(clients)
        .where(eq(clients.id, client.id));
      
      console.log(`Successfully deleted client with ID ${client.id}`);
    }
    
    console.log(`Deleted ${clientsToDelete.length} financial test clients`);
  } catch (error) {
    console.error('Failed to delete financial test client:', error);
    throw error;
  }
}

// Check if this module is being run directly
if (require.main === module) {
  deleteFinancialTestClient()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

// Export the function for potential reuse
export default deleteFinancialTestClient;