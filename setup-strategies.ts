import { db } from './server/db';
import { strategies } from './shared/schema';

/**
 * This script sets up initial therapy strategies for autism and early childhood intervention
 */
async function createInitialStrategies() {
  console.log('Setting up initial therapy strategies...');
  
  // Initial strategies for autism and early childhood intervention
  const initialStrategies = [
    {
      name: "Visual Schedules",
      description: "Using pictures or symbols to represent daily activities and transitions",
      category: "Communication"
    },
    {
      name: "Social Stories",
      description: "Personalized stories that explain social situations and appropriate responses",
      category: "Social Skills"
    },
    {
      name: "PECS (Picture Exchange Communication System)",
      description: "Communication system using picture cards to help children express needs and wants",
      category: "Communication"
    },
    {
      name: "Token Economy",
      description: "Reward system using tokens that can be exchanged for preferred items or activities",
      category: "Behavior Management"
    },
    {
      name: "Video Modeling",
      description: "Using videos to demonstrate target behaviors or skills for children to imitate",
      category: "Learning"
    },
    {
      name: "Task Analysis",
      description: "Breaking complex skills into smaller, manageable steps for easier learning",
      category: "Learning"
    },
    {
      name: "Sensory Integration Techniques",
      description: "Activities that help regulate sensory processing and responses to stimuli",
      category: "Sensory"
    },
    {
      name: "Prompting Hierarchy",
      description: "System of least-to-most or most-to-least prompting to support skill acquisition",
      category: "Learning"
    },
    {
      name: "AAC (Augmentative and Alternative Communication)",
      description: "Tools and systems to supplement or replace speech for communication",
      category: "Communication"
    },
    {
      name: "Natural Environment Teaching",
      description: "Teaching skills in the context they will be used in everyday situations",
      category: "Learning"
    },
    {
      name: "Peer-Mediated Instruction",
      description: "Using peers to model and reinforce appropriate behaviors and social skills",
      category: "Social Skills"
    },
    {
      name: "Joint Attention Training",
      description: "Teaching shared focus on objects or activities with another person",
      category: "Social Skills"
    },
    {
      name: "Floor Time/DIR",
      description: "Child-led play-based approach to build relationships and communication skills",
      category: "Relationship"
    },
    {
      name: "Behavioral Momentum",
      description: "Beginning with easy tasks before introducing more challenging ones to build success",
      category: "Behavior Management"
    },
    {
      name: "Self-Management Strategies",
      description: "Teaching children to monitor and regulate their own behavior and emotions",
      category: "Self-Regulation"
    },
    {
      name: "Discrete Trial Training",
      description: "Structured teaching method breaking skills into simple components with reinforcement",
      category: "Learning"
    },
    {
      name: "Pivotal Response Treatment",
      description: "Targeting pivotal areas of development like motivation and self-initiation",
      category: "Learning"
    },
    {
      name: "Functional Communication Training",
      description: "Teaching appropriate communication to replace challenging behaviors",
      category: "Communication"
    },
    {
      name: "Structured Play Groups",
      description: "Organized play activities targeting specific social skills and peer interaction",
      category: "Social Skills"
    },
    {
      name: "Errorless Learning",
      description: "Teaching method minimizing errors during skill acquisition through proper supports",
      category: "Learning"
    }
  ];

  // Clear existing strategies
  const existingStrategies = await db.select().from(strategies);
  if (existingStrategies.length > 0) {
    console.log(`Found ${existingStrategies.length} existing strategies, checking for duplicates...`);
  } else {
    console.log('No existing strategies found, adding all initial strategies.');
  }

  // Add each strategy if it doesn't exist
  for (const strategy of initialStrategies) {
    const existing = existingStrategies.find(s => 
      s.name.toLowerCase() === strategy.name.toLowerCase()
    );
    
    if (!existing) {
      await db.insert(strategies).values(strategy);
      console.log(`Added strategy: ${strategy.name}`);
    } else {
      console.log(`Strategy already exists: ${strategy.name}`);
    }
  }

  console.log('Strategy setup complete!');
}

// Run the function
createInitialStrategies()
  .then(() => {
    console.log('Successfully set up therapy strategies');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting up therapy strategies:', error);
    process.exit(1);
  });