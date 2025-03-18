import { db } from "./server/db";
import { strategies, Strategy, insertStrategySchema } from "./shared/schema";
import { eq } from "drizzle-orm";

/**
 * This script sets up initial therapy strategies for autism and early childhood intervention
 */
async function createInitialStrategies() {
  console.log("Setting up initial therapy strategies");

  // Check if we already have strategies in the database
  const existingStrategies = await db.select().from(strategies);
  
  if (existingStrategies.length > 0) {
    console.log(`Found ${existingStrategies.length} existing strategies, checking for new ones to add...`);
  }
  
  // Define categories and strategies
  const initialStrategies = [
    // Communication Strategies
    {
      name: "Visual Supports",
      category: "Communication",
      description: "Using pictures, symbols, or written words to support communication"
    },
    {
      name: "AAC Devices",
      category: "Communication",
      description: "Augmentative and alternative communication devices to assist with expression"
    },
    {
      name: "Sign Language",
      category: "Communication",
      description: "Basic sign language to support verbal communication"
    },
    {
      name: "PECS",
      category: "Communication",
      description: "Picture Exchange Communication System to facilitate communication"
    },
    
    // Behavioral Strategies
    {
      name: "Positive Reinforcement",
      category: "Behavioral",
      description: "Rewarding desired behaviors to increase their frequency"
    },
    {
      name: "Token Economy",
      category: "Behavioral",
      description: "Using tokens that can be exchanged for rewards to encourage positive behavior"
    },
    {
      name: "Visual Schedules",
      category: "Behavioral",
      description: "Using pictures or symbols to represent activities or routines"
    },
    {
      name: "Social Stories",
      category: "Behavioral",
      description: "Personalized stories that describe social situations and appropriate responses"
    },
    
    // Sensory Strategies
    {
      name: "Sensory Diet",
      category: "Sensory",
      description: "Planned activities that provide sensory input throughout the day"
    },
    {
      name: "Deep Pressure",
      category: "Sensory",
      description: "Applying firm but gentle pressure to the body to provide calming input"
    },
    {
      name: "Noise-Cancelling Headphones",
      category: "Sensory",
      description: "Headphones that reduce environmental sounds for sensory regulation"
    },
    {
      name: "Fidget Tools",
      category: "Sensory",
      description: "Small objects that provide sensory input and help with focus"
    },
    
    // Social Skills Strategies
    {
      name: "Turn-Taking Activities",
      category: "Social Skills",
      description: "Games and activities that practice taking turns"
    },
    {
      name: "Role-Playing",
      category: "Social Skills",
      description: "Acting out social scenarios to practice appropriate responses"
    },
    {
      name: "Video Modeling",
      category: "Social Skills",
      description: "Watching videos of appropriate social interactions to learn from"
    },
    {
      name: "Peer Mentoring",
      category: "Social Skills",
      description: "Pairing with a peer who can model appropriate social behaviors"
    },
    
    // Cognitive Strategies
    {
      name: "Task Analysis",
      category: "Cognitive",
      description: "Breaking down complex tasks into smaller, manageable steps"
    },
    {
      name: "Visual Timers",
      category: "Cognitive",
      description: "Timers that provide visual representation of time passing"
    },
    {
      name: "Mind Mapping",
      category: "Cognitive",
      description: "Creating visual diagrams to organize and connect ideas"
    },
    {
      name: "Metacognitive Strategies",
      category: "Cognitive",
      description: "Teaching awareness and understanding of one's own thought processes"
    }
  ];
  
  // Add each strategy if it doesn't already exist
  for (const strategy of initialStrategies) {
    // Check if this strategy already exists by name
    const exists = existingStrategies.some(s => s.name === strategy.name);
    
    if (!exists) {
      console.log(`Adding new strategy: ${strategy.name} (${strategy.category})`);
      try {
        // Validate with schema
        const validatedStrategy = insertStrategySchema.parse(strategy);
        
        // Insert into database
        await db.insert(strategies).values(validatedStrategy);
        console.log(`Successfully added strategy: ${strategy.name}`);
      } catch (error) {
        console.error(`Error adding strategy ${strategy.name}:`, error);
      }
    } else {
      console.log(`Strategy already exists: ${strategy.name}, skipping`);
    }
  }
  
  // Get final count
  const finalStrategies = await db.select().from(strategies);
  console.log(`Setup complete. Database now has ${finalStrategies.length} therapy strategies.`);
}

// Run the function
createInitialStrategies()
  .then(() => {
    console.log("Strategy setup completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error setting up strategies:", error);
    process.exit(1);
  });