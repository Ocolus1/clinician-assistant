/**
 * Create Financial Test Client
 * 
 * This script creates a test client with specific financial data:
 * - Creation date: January 18, 2025
 * - Total budget: $15,000
 * - 6 sessions with products valued at $1,250 each
 * - Plan expiry: November 12, 2025
 */
import { db } from './server/db';
import { clients, budgetSettings, budgetItems, sessions, sessionNotes, goals, subgoals } from './shared/schema';

async function createFinancialTestClient() {
  try {
    console.log("Creating financial test client...");
    
    // 1. Create the client
    const [client] = await db.insert(clients).values({
      name: 'Test Financial Report',
      dateOfBirth: new Date('2000-01-01'), // Arbitrary birth date
      onboardingStatus: 'complete',
      fundsManagement: 'Self-Managed',
      createdAt: new Date('2025-01-18'),
    }).returning();
    
    console.log(`Created client with ID ${client.id}`);
    
    // 2. Create budget settings
    const [settings] = await db.insert(budgetSettings).values({
      clientId: client.id,
      planName: 'Financial Test Plan',
      ndisFunds: 15000,
      startOfPlan: new Date('2025-01-18'),
      endOfPlan: new Date('2025-11-12'),
      createdAt: new Date('2025-01-18'),
    }).returning();
    
    console.log(`Created budget settings with ID ${settings.id}`);
    
    // 3. Create some budget items
    const [budgetItem] = await db.insert(budgetItems).values({
      clientId: client.id,
      budgetSettingsId: settings.id,
      itemName: 'Speech Therapy',
      unitPrice: 250,
      quantity: 60, // 60 units at $250 each = $15,000 total
      category: 'Therapeutic Support',
      itemCode: 'ST001',
    }).returning();
    
    console.log(`Created budget item with ID ${budgetItem.id}`);
    
    // 4. Create at least one goal for the client
    const [goal] = await db.insert(goals).values({
      clientId: client.id,
      title: 'Improve Speech Clarity',
      description: 'Develop clearer speech patterns for everyday communication',
      priority: 'high',
    }).returning();
    
    console.log(`Created goal with ID ${goal.id}`);
    
    // 5. Create at least one subgoal
    const [subgoal] = await db.insert(subgoals).values({
      goalId: goal.id,
      title: 'Practice Consonant Sounds',
      description: 'Regular practice of difficult consonant sounds',
    }).returning();
    
    console.log(`Created subgoal with ID ${subgoal.id}`);
    
    // 6. Create 6 sessions with $1,250 used in each (products)
    const sessionDates = [
      new Date('2025-01-25'),
      new Date('2025-02-15'),
      new Date('2025-03-05'),
      new Date('2025-03-25'),
      new Date('2025-04-15'),
      new Date('2025-05-05')
    ];
    
    console.log("Creating 6 sessions with session notes...");
    
    for (let i = 0; i < sessionDates.length; i++) {
      const date = sessionDates[i];
      
      // Create session
      const [session] = await db.insert(sessions).values({
        clientId: client.id,
        therapistId: 1, // Arbitrary therapist ID
        sessionDate: date,
        status: 'completed',
        location: 'Clinic',
        duration: 60,
      }).returning();
      
      // Create session note with products
      const [note] = await db.insert(sessionNotes).values({
        sessionId: session.id,
        notes: `Financial test session ${i+1}`,
        products: JSON.stringify([{
          "name": "Speech Therapy Session",
          "unitPrice": 250,
          "quantity": 5, // 5 units at $250 each = $1,250 per session
          "code": "ST001"
        }])
      }).returning();
      
      console.log(`Created session ${i+1} with ID ${session.id} and note ID ${note.id}`);
    }
    
    console.log(`
    ===== TEST CLIENT CREATED SUCCESSFULLY =====
    Client ID: ${client.id}
    Name: Test Financial Report
    
    Budget Settings ID: ${settings.id}
    Total Budget: $15,000
    Plan Start: January 18, 2025
    Plan End: November 12, 2025
    
    Created 6 sessions with $1,250 product value each
    Total spent: $7,500
    Remaining: $7,500
    
    Goal ID: ${goal.id}
    Subgoal ID: ${subgoal.id}
    `);
    
    return client;
  } catch (error) {
    console.error('Failed to create test client:', error);
    throw error;
  }
}

// Check if this module is being run directly
if (require.main === module) {
  createFinancialTestClient()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

// Export the function for potential reuse
export default createFinancialTestClient;