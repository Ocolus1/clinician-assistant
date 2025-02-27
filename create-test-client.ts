import { storage } from './server/storage';

async function createTestClient() {
  try {
    // Create a test client
    const client = await storage.createClient({
      name: "Radwan Smith",
      dateOfBirth: "2025-01-27", // This should be formatted properly
      fundsManagement: "Self-Managed",
    });
    
    console.log(`Created client with ID: ${client.id}`);
    console.log(`You can now view the client at /summary/${client.id}`);
    
    // Create an ally
    const ally = await storage.createAlly(client.id, {
      name: "Sarah Johnson",
      relationship: "Parent",
      email: "sarah@example.com",
      preferredLanguage: "English",
      accessTherapeutics: true,
      accessFinancials: true
    });
    
    console.log(`Created ally ${ally.name} with ID: ${ally.id}`);
    
    // Create a goal
    const goal = await storage.createGoal(client.id, {
      title: "Improve communication skills",
      description: "Focus on speech clarity and pronunciation",
      priority: "High"
    });
    
    console.log(`Created goal with ID: ${goal.id}`);
    
    // Create a subgoal
    const subgoal = await storage.createSubgoal(goal.id, {
      title: "Daily speaking exercises",
      description: "Practice 15 minutes each day",
      status: "In Progress"
    });
    
    console.log(`Created subgoal with ID: ${subgoal.id}`);
    
    // Create budget settings
    const budgetSettings = await storage.createBudgetSettings(client.id, {
      availableFunds: 10000,
      endOfPlan: "2026-01-27"
    });
    
    console.log(`Created budget settings with ID: ${budgetSettings.id}`);
    
    // Create budget items
    const budgetItem = await storage.createBudgetItem(client.id, {
      itemCode: "SLP-001",
      description: "Speech Therapy Sessions",
      unitPrice: 150,
      quantity: 12
    });
    
    console.log(`Created budget item with ID: ${budgetItem.id}`);
    
    console.log("Test data creation complete!");
    
  } catch (error) {
    console.error("Error creating test data:", error);
  }
}

createTestClient();