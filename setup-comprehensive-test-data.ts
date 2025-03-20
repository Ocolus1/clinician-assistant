/**
 * Comprehensive Test Data Generator
 * 
 * This script creates 15 test clients with 20 sessions each, along with:
 * - 3-5 goals per client
 * - 3 subgoals per goal
 * - Complete budget settings with a variety of budget items
 * - Session notes with performance assessments for visualization
 * - Allies with varied relationships and languages
 * 
 * Perfect for testing the client reports and visualization components.
 */

import { db } from "./server/db";
import { pool } from "./server/db";
import * as schema from "./shared/schema";
import { eq } from "drizzle-orm";
import { faker } from '@faker-js/faker';
import { format, subDays, addDays, subMonths } from 'date-fns';

// Number of clients and sessions to create
const NUM_CLIENTS = 15;
const SESSIONS_PER_CLIENT = 20;

// Possible session statuses
const SESSION_STATUSES = ['scheduled', 'completed', 'waived', 'rescheduled'];

// Sample strategies for therapy
const THERAPY_STRATEGIES = [
  { name: 'Picture Exchange Communication', category: 'communication', description: 'Using pictures to help communicate needs and wants' },
  { name: 'Social Stories', category: 'social', description: 'Narratives that describe social situations and appropriate responses' },
  { name: 'Sensory Integration', category: 'sensory', description: 'Activities that help process sensory information' },
  { name: 'Applied Behavior Analysis', category: 'behavior', description: 'Reinforcement-based techniques to improve behavior' },
  { name: 'Floortime / DIR', category: 'play', description: 'Child-led play to build relationships and communication' },
  { name: 'Visual Schedules', category: 'routine', description: 'Visual cues to help understand and follow routines' },
  { name: 'Augmentative Communication', category: 'communication', description: 'Tools and techniques to supplement verbal communication' },
  { name: 'Pivotal Response Treatment', category: 'behavior', description: 'Targeting pivotal areas of development' },
  { name: 'Cognitive Behavioral Therapy', category: 'cognitive', description: 'Techniques to manage thoughts and behaviors' },
  { name: 'Play Therapy', category: 'play', description: 'Using play to express feelings and develop social skills' },
  { name: 'Speech Sound Therapy', category: 'speech', description: 'Working on specific speech sounds and articulation' },
];

// Sample goals for clients
const THERAPY_GOALS = [
  'Improve verbal communication skills',
  'Develop social interaction with peers',
  'Enhance fine motor skills',
  'Increase attention span and focus',
  'Improve self-regulation and emotional control',
  'Develop turn-taking and sharing skills',
  'Enhance reading comprehension abilities',
  'Develop independent living skills',
  'Improve articulation of specific speech sounds',
  'Enhance written expression skills',
  'Develop narrative language skills',
  'Improve receptive language understanding',
  'Enhance problem-solving abilities',
  'Develop sensory processing strategies',
  'Improve coordination and gross motor skills',
];

// Sample subgoals
const THERAPY_SUBGOALS = [
  // Communication subgoals
  'Initiate conversation with peers',
  'Respond appropriately to questions',
  'Use complete sentences in communication',
  'Follow multi-step verbal instructions',
  'Express needs and wants clearly',
  'Maintain eye contact during conversation',
  
  // Social subgoals
  'Identify and label emotions in self and others',
  'Take turns during group activities',
  'Share materials without prompting',
  'Engage in cooperative play with peers',
  'Respond appropriately to social cues',
  'Develop strategies for conflict resolution',
  
  // Motor skills subgoals
  'Improve handwriting legibility',
  'Use scissors effectively to cut along lines',
  'Button and zip clothing independently',
  'Tie shoelaces without assistance',
  'Use keyboard with increased speed and accuracy',
  'Complete puzzles of increasing complexity',
  
  // Sensory subgoals
  'Identify sensory triggers and develop coping strategies',
  'Participate in sensory activities with reduced distress',
  'Transition between environments with reduced anxiety',
  'Use sensory tools appropriately when needed',
  'Self-advocate for sensory needs',
  'Engage in sensory-rich activities with increased tolerance',
];

// Sample budget item categories
const BUDGET_CATEGORIES = [
  'Speech Therapy',
  'Occupational Therapy',
  'Physical Therapy',
  'Behavioral Support',
  'Assistive Technology',
  'Community Participation',
  'Transportation',
  'Therapy Materials',
];

// Sample catalog items
const CATALOG_ITEMS = [
  { code: 'ST-01', category: 'Speech Therapy', name: 'Individual Speech Therapy Session', description: 'One-to-one speech therapy session with certified therapist', unitPrice: 180 },
  { code: 'ST-02', category: 'Speech Therapy', name: 'Group Speech Therapy Session', description: 'Small group speech therapy session with 2-3 clients', unitPrice: 120 },
  { code: 'OT-01', category: 'Occupational Therapy', name: 'Individual Occupational Therapy Session', description: 'One-to-one OT session focusing on daily living skills', unitPrice: 190 },
  { code: 'PT-01', category: 'Physical Therapy', name: 'Individual Physical Therapy Session', description: 'One-to-one physical therapy with certified therapist', unitPrice: 185 },
  { code: 'BS-01', category: 'Behavioral Support', name: 'Behavioral Assessment', description: 'Comprehensive assessment of behavioral patterns and needs', unitPrice: 250 },
  { code: 'BS-02', category: 'Behavioral Support', name: 'Behavior Management Session', description: 'One-to-one session focused on behavior management strategies', unitPrice: 175 },
  { code: 'AT-01', category: 'Assistive Technology', name: 'Communication Device', description: 'AAC device to assist with communication needs', unitPrice: 500 },
  { code: 'AT-02', category: 'Assistive Technology', name: 'Assistive Technology Assessment', description: 'Assessment to determine appropriate assistive technology', unitPrice: 220 },
  { code: 'CP-01', category: 'Community Participation', name: 'Community Access Support', description: 'Support to access community activities and services', unitPrice: 160 },
  { code: 'TR-01', category: 'Transportation', name: 'Transportation to Therapy', description: 'Transportation services to and from therapy sessions', unitPrice: 70 },
  { code: 'TM-01', category: 'Therapy Materials', name: 'Therapeutic Materials', description: 'Specialized materials to support therapy goals', unitPrice: 150 },
];

// Helper to create a client with random data
async function createRandomClient(index: number) {
  // Generate an age between 3 and 15 years
  const childAge = Math.floor(Math.random() * 12) + 3;
  const dob = format(subDays(new Date(), 365 * childAge + Math.floor(Math.random() * 365)), 'yyyy-MM-dd');
  
  // Randomly select a funds management option
  const fundsManagement = FUNDS_MANAGEMENT_OPTIONS[Math.floor(Math.random() * FUNDS_MANAGEMENT_OPTIONS.length)];
  
  // Generate a random NDIS fund amount between $15,000 and $80,000
  const ndisFunds = (Math.floor(Math.random() * 65000) + 15000).toString();
  
  // Create client in database
  const [client] = await db.insert(clients).values({
    name: faker.person.firstName() + ' ' + faker.person.lastName(),
    dateOfBirth: dob,
    preferredLanguage: Math.random() > 0.7 ? 'Spanish' : 'English', // Some non-English speakers
    contactEmail: faker.internet.email(),
    contactPhone: faker.phone.number(),
    address: faker.location.streetAddress(),
    fundsManagement: fundsManagement,
    onboardingStatus: 'complete',
  }).returning();
  
  console.log(`Created client: ${client.name} (ID: ${client.id})`);
  
  return client;
}

// Helper to create allies for a client
async function createAlliesForClient(clientId: number) {
  // Determine number of allies (2-4)
  const numAllies = Math.floor(Math.random() * 3) + 2;
  
  // Possible relationships
  const relationships = ['Parent', 'Teacher', 'Guardian', 'Support Worker', 'Sibling', 'Therapist', 'Caregiver'];
  
  // Possible languages
  const languages = ['English', 'Spanish', 'Mandarin', 'Arabic', 'French', 'Hindi'];
  
  const alliesCreated = [];
  
  for (let i = 0; i < numAllies; i++) {
    const relationship = relationships[Math.floor(Math.random() * relationships.length)];
    
    // Parents usually share last name with client
    const isParent = relationship === 'Parent';
    
    // Randomly assign preferred language with some bias toward English
    const preferredLanguage = Math.random() > 0.6 ? 'English' : languages[Math.floor(Math.random() * languages.length)];
    
    const ally = await db.insert(allies).values({
      clientId,
      name: faker.person.fullName(),
      relationship,
      preferredLanguage,
      email: faker.internet.email(),
      phone: faker.phone.number(),
      contactPreference: Math.random() > 0.5 ? 'email' : 'phone',
      archived: false,
    }).returning();
    
    alliesCreated.push(ally[0]);
  }
  
  console.log(`Created ${alliesCreated.length} allies for client ${clientId}`);
  return alliesCreated;
}

// Helper to create budget settings and items for a client
async function createBudgetForClient(clientId: number) {
  // Create a budget for the client
  const startDate = subMonths(new Date(), Math.floor(Math.random() * 3));
  const endDate = addDays(startDate, 365); // 1 year plan
  
  const [budgetSetting] = await db.insert(budgetSettings).values({
    clientId,
    planName: `${new Date().getFullYear()} Support Plan`,
    planNumber: `NDIS-${100000 + Math.floor(Math.random() * 900000)}`,
    startOfPlan: format(startDate, 'yyyy-MM-dd'),
    endOfPlan: format(endDate, 'yyyy-MM-dd'),
    ndisFunds: Math.floor(Math.random() * 50000) + 30000, // Between $30K and $80K
    isActive: true,
  }).returning();
  
  console.log(`Created budget settings for client ${clientId}: ${budgetSetting.planName}`);
  
  // Create 6-10 budget items
  const numItems = Math.floor(Math.random() * 5) + 6;
  
  for (let i = 0; i < numItems; i++) {
    const catalogItem = CATALOG_ITEMS[Math.floor(Math.random() * CATALOG_ITEMS.length)];
    
    // Quantity will vary based on the item - higher quantities for less expensive items
    const baseQuantity = Math.floor(400 / catalogItem.unitPrice);
    const quantity = Math.max(1, Math.floor(Math.random() * baseQuantity) + 1);
    
    await db.insert(budgetItems).values({
      clientId,
      budgetSettingsId: budgetSetting.id,
      itemCode: catalogItem.code,
      category: catalogItem.category,
      name: catalogItem.name,
      description: catalogItem.description,
      unitPrice: catalogItem.unitPrice,
      quantity,
      totalPrice: catalogItem.unitPrice * quantity,
    });
  }
  
  console.log(`Created ${numItems} budget items for client ${clientId}`);
  
  return budgetSetting;
}

// Helper to create catalog items
async function createCatalogItems() {
  for (const item of CATALOG_ITEMS) {
    await db.insert(budgetItemCatalog).values({
      itemCode: item.code,
      category: item.category,
      name: item.name,
      description: item.description,
      unitPrice: item.unitPrice,
    });
  }
  
  console.log(`Created ${CATALOG_ITEMS.length} catalog items`);
}

// Helper to create goals for a client
async function createGoalsForClient(clientId: number) {
  // Determine number of goals (3-5)
  const numGoals = Math.floor(Math.random() * 3) + 3;
  
  const createdGoals = [];
  
  for (let i = 0; i < numGoals; i++) {
    // Randomly select a therapy goal
    const goalIndex = Math.floor(Math.random() * THERAPY_GOALS.length);
    const goalTitle = THERAPY_GOALS[goalIndex];
    
    const [goal] = await db.insert(goals).values({
      clientId,
      title: goalTitle,
      description: `Working towards ${goalTitle.toLowerCase()}`,
      status: Math.random() > 0.7 ? 'in-progress' : Math.random() > 0.5 ? 'not-started' : 'completed',
      priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
    }).returning();
    
    createdGoals.push(goal);
    
    // Create 3 subgoals for each goal
    await createSubgoalsForGoal(goal.id);
  }
  
  console.log(`Created ${createdGoals.length} goals for client ${clientId}`);
  return createdGoals;
}

// Helper to create subgoals for a goal
async function createSubgoalsForGoal(goalId: number) {
  // Create 3 related subgoals
  const subgoalIndices = [];
  
  // Ensure we get 3 unique indices
  while (subgoalIndices.length < 3) {
    const idx = Math.floor(Math.random() * THERAPY_SUBGOALS.length);
    if (!subgoalIndices.includes(idx)) {
      subgoalIndices.push(idx);
    }
  }
  
  for (const idx of subgoalIndices) {
    await db.insert(subgoals).values({
      goalId,
      title: THERAPY_SUBGOALS[idx],
      description: `Working on ${THERAPY_SUBGOALS[idx].toLowerCase()}`,
      status: Math.random() > 0.6 ? 'in-progress' : Math.random() > 0.5 ? 'not-started' : 'completed',
    });
  }
  
  console.log(`Created 3 subgoals for goal ${goalId}`);
}

// Helper to create strategies
async function createStrategies() {
  for (const strategy of THERAPY_STRATEGIES) {
    await db.insert(strategies).values({
      name: strategy.name,
      category: strategy.category,
      description: strategy.description,
    });
  }
  
  console.log(`Created ${THERAPY_STRATEGIES.length} therapy strategies`);
}

// Helper to create sessions for a client
async function createSessionsForClient(clientId: number, subgoalIds: number[]) {
  const sessions = [];
  
  // Get strategies
  const strategiesData = await db.select().from(strategies);
  
  // Create sessions spanning the last 6 months
  const startDate = subMonths(new Date(), 6);
  const endDate = new Date();
  
  for (let i = 0; i < SESSIONS_PER_CLIENT; i++) {
    // Randomly distribute sessions over the 6 month period
    const dayOffset = Math.floor(Math.random() * (180 - i));
    const sessionDate = addDays(startDate, dayOffset);
    
    // Randomly assign session status with bias towards completed
    const statusRandom = Math.random();
    const status = statusRandom > 0.7 ? 'completed' : 
                  statusRandom > 0.5 ? 'scheduled' : 
                  statusRandom > 0.3 ? 'waived' : 'rescheduled';
    
    const [session] = await db.insert(sessions).values({
      clientId,
      scheduledDate: format(sessionDate, 'yyyy-MM-dd'),
      scheduledTime: `${10 + Math.floor(Math.random() * 8)}:00`, // Between 10:00 and 17:00
      duration: 60, // 1 hour sessions
      status,
      notes: faker.lorem.paragraph(),
      location: Math.random() > 0.7 ? 'Client Home' : 'Clinic',
      created_at: format(sessionDate, 'yyyy-MM-dd'),
    }).returning();
    
    sessions.push(session);
    
    // Add session notes and performance assessments if session is completed
    if (status === 'completed') {
      await createSessionNoteWithPerformanceData(session.id, subgoalIds, strategiesData);
    }
  }
  
  console.log(`Created ${sessions.length} sessions for client ${clientId}`);
  return sessions;
}

// Helper to create session notes with performance assessments
async function createSessionNoteWithPerformanceData(sessionId: number, subgoalIds: number[], strategiesData: any[]) {
  // Create a session note
  const [note] = await db.insert(sessionNotes).values({
    sessionId,
    attendance: Math.random() > 0.8 ? 'absent' : 'present',
    content: faker.lorem.paragraphs(2),
    physical_activity_rating: Math.floor(Math.random() * 5) + 5, // 5-10 range for most metrics
    cooperation_rating: Math.floor(Math.random() * 5) + 5,
    focus_rating: Math.floor(Math.random() * 5) + 5,
    mood_rating: Math.floor(Math.random() * 5) + 5,
    products: JSON.stringify([
      { name: "Speech Therapy Session", quantity: 1, unitPrice: 180 },
      { name: "Assessment Materials", quantity: 1, unitPrice: 25 }
    ]),
  }).returning();
  
  // Create 2-3 performance assessments for the note
  const numAssessments = Math.floor(Math.random() * 2) + 2;
  const assessments = [];
  
  const usedSubgoalIds = [];
  const usedStrategyIds = [];
  
  for (let i = 0; i < numAssessments; i++) {
    // Get a random subgoal that hasn't been used yet in this session
    let subgoalId;
    do {
      subgoalId = subgoalIds[Math.floor(Math.random() * subgoalIds.length)];
    } while (usedSubgoalIds.includes(subgoalId) && usedSubgoalIds.length < subgoalIds.length);
    usedSubgoalIds.push(subgoalId);
    
    // Get a random strategy
    let strategyId;
    do {
      strategyId = strategiesData[Math.floor(Math.random() * strategiesData.length)].id;
    } while (usedStrategyIds.includes(strategyId) && usedStrategyIds.length < strategiesData.length);
    usedStrategyIds.push(strategyId);
    
    // Create performance assessment with a score between 1-10
    const [assessment] = await pool.query(`
      INSERT INTO performance_assessments 
      (session_note_id, subgoal_id, strategy_id, rating, comments) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `, [
      note.id,
      subgoalId,
      strategyId,
      Math.floor(Math.random() * 10) + 1, // 1-10 score
      faker.lorem.sentence()
    ]);
    
    assessments.push(assessment.rows[0]);
  }
  
  console.log(`Created session note with ${assessments.length} performance assessments for session ${sessionId}`);
}

// Main function to create all the test data
async function createComprehensiveTestData() {
  try {
    console.log("Starting comprehensive test data creation...");
    
    // Create catalog items first
    await createCatalogItems();
    
    // Create therapy strategies
    await createStrategies();
    
    // Add performance_assessments.rating column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE performance_assessments 
        ADD COLUMN IF NOT EXISTS rating INTEGER
      `);
      console.log("Added rating column to performance_assessments table");
    } catch (error) {
      console.error("Error adding rating column:", error);
    }
    
    // Create clients with all related data
    for (let i = 0; i < NUM_CLIENTS; i++) {
      // Create client
      const client = await createRandomClient(i + 1);
      
      // Create allies
      await createAlliesForClient(client.id);
      
      // Create budget
      await createBudgetForClient(client.id);
      
      // Create goals and subgoals
      const goals = await createGoalsForClient(client.id);
      
      // Get all subgoal IDs for this client
      const subgoalIdsResult = await pool.query(`
        SELECT s.id FROM subgoals s
        JOIN goals g ON s.goal_id = g.id
        WHERE g.client_id = $1
      `, [client.id]);
      
      const subgoalIds = subgoalIdsResult.rows.map(row => row.id);
      
      // Create sessions with performance data
      await createSessionsForClient(client.id, subgoalIds);
    }
    
    console.log(`Successfully created comprehensive test data with ${NUM_CLIENTS} clients`);
  } catch (error) {
    console.error("Error creating comprehensive test data:", error);
    throw error;
  }
}

// Run the script
createComprehensiveTestData()
  .then(() => {
    console.log("Comprehensive test data creation complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error in test data creation:", error);
    process.exit(1);
  });