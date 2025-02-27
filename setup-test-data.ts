import { storage } from './server/storage';
import { FUNDS_MANAGEMENT_OPTIONS } from './shared/schema';

// Create a test client
async function createTestData() {
  try {
    console.log("Creating test client...");
    const client = await storage.createClient({
      name: "Nathan Matthews",
      dateOfBirth: "1985-07-15",
      fundsManagement: FUNDS_MANAGEMENT_OPTIONS[1], // "Advisor-Managed"
    });
    
    console.log(`Created client with ID: ${client.id}`);
    
    // Create allies
    console.log("Creating allies...");
    const ally1 = await storage.createAlly(client.id, {
      name: "Margaret",
      relationship: "Partner",
      email: "margaret@example.com",
      preferredLanguage: "English",
      accessTherapeutics: true,
      accessFinancials: true,
    });
    
    const ally2 = await storage.createAlly(client.id, {
      name: "Michael",
      relationship: "Brother",
      email: "michael@example.com",
      preferredLanguage: "Spanish",
      accessTherapeutics: true,
      accessFinancials: false,
    });
    
    console.log(`Created ${2} allies for client ${client.id}`);
    
    // Create goals
    console.log("Creating goals and subgoals...");
    const goal1 = await storage.createGoal(client.id, {
      title: "Improve communication skills - High Priority",
      description: "Work on speech clarity and written communication skills for better interactions at work and in social settings.",
      priority: "High",
    });
    
    // Add subgoals to goal1
    await storage.createSubgoal(goal1.id, {
      title: "Practice Daily Speaking Exercises",
      description: "Complete speaking exercises for improving articulation and confidence.",
      status: "In Progress",
    });
    
    await storage.createSubgoal(goal1.id, {
      title: "Improve Verbal Clarity and Confidence",
      description: "Work with speech pathologist to prioritize key speaking aspects regularly.",
      status: "Not Started",
    });
    
    const goal2 = await storage.createGoal(client.id, {
      title: "Social Interaction - Medium Priority",
      description: "Improve social skills to facilitate confidence when interacting in conversations. Strengthen relationships, engage in diverse interactions, and practice skills for better connection.",
      priority: "Medium",
    });
    
    // Add subgoals to goal2
    await storage.createSubgoal(goal2.id, {
      title: "Weekly Group Conversations",
      description: "Start at least three new conversation topics each week to build confidence and social ease.",
      status: "Not Started",
    });
    
    await storage.createSubgoal(goal2.id, {
      title: "Improve Non-Verbal Communication",
      description: "Practice appropriate body language, maintain eye contact, and use gestures effectively.",
      status: "Not Started",
    });
    
    console.log(`Created goals and subgoals for client ${client.id}`);
    
    // Create budget settings
    console.log("Creating budget settings...");
    const budgetSettings = await storage.createBudgetSettings(client.id, {
      availableFunds: 15000.00,
      endOfPlan: "2026-02-15",
    });
    
    console.log(`Created budget settings for client ${client.id}`);
    
    // Create budget items
    console.log("Creating budget items...");
    await storage.createBudgetItem(client.id, {
      itemCode: "SLP-03-SPK-1",
      description: "Speech Therapy",
      unitPrice: 175.00,
      quantity: 12,
    });
    
    await storage.createBudgetItem(client.id, {
      itemCode: "TS-432-STR-2",
      description: "Occupational Therapy",
      unitPrice: 220.00,
      quantity: 8,
    });
    
    console.log(`Created budget items for client ${client.id}`);
    
    console.log("Test data setup complete!");
    console.log(`You can now view the client summary at /summary/${client.id}`);
    console.log(`or the print-friendly version at /print-summary/${client.id}`);
    
  } catch (error) {
    console.error("Error creating test data:", error);
  }
}

createTestData();