/**
 * Comprehensive Test Data Generator
 * 
 * This script creates 15 test clients with 20 sessions each, along with:
 * - 3-5 goals per client
 * - 3 subgoals per goal
 * - Complete budget settings with a variety of budget items
 * - Session notes with performance assessments for visualization
 * - Allies with varied relationships and languages
 */

import { db, pool } from "./server/db";
import { faker } from '@faker-js/faker';
import { format, subDays, addDays, subMonths } from 'date-fns';

// Number of clients and sessions to create
const NUM_CLIENTS = 15;
const SESSIONS_PER_CLIENT = 20;

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
];

// Sample therapy strategies
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

// Possible relationships
const RELATIONSHIPS = ['Parent', 'Teacher', 'Guardian', 'Support Worker', 'Sibling', 'Therapist', 'Caregiver'];

// Possible languages
const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Arabic', 'French', 'Hindi'];

// Add performance_assessments.rating column if it doesn't exist
async function addRatingColumnIfNeeded() {
  try {
    await pool.query(`
      ALTER TABLE performance_assessments 
      ADD COLUMN IF NOT EXISTS rating INTEGER
    `);
    console.log("✓ Checked/added rating column to performance_assessments table");
  } catch (error) {
    console.error("✗ Error adding rating column:", error);
    throw error;
  }
}

// Create the necessary database tables
async function createTablesIfNeeded() {
  try {
    // Create strategies table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS strategies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT
      )
    `);
    
    // Create session_notes table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_notes (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        attendance TEXT,
        content TEXT,
        physical_activity_rating INTEGER,
        cooperation_rating INTEGER,
        focus_rating INTEGER,
        mood_rating INTEGER,
        products JSONB
      )
    `);
    
    // Create performance_assessments table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_assessments (
        id SERIAL PRIMARY KEY,
        session_note_id INTEGER NOT NULL,
        subgoal_id INTEGER NOT NULL,
        strategy_id INTEGER,
        rating INTEGER,
        comments TEXT
      )
    `);
    
    // Create milestone_assessments table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestone_assessments (
        id SERIAL PRIMARY KEY,
        performance_assessment_id INTEGER NOT NULL,
        milestone TEXT NOT NULL,
        achieved BOOLEAN NOT NULL DEFAULT false,
        comments TEXT
      )
    `);
    
    // Create budget_item_catalog table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budget_item_catalog (
        id SERIAL PRIMARY KEY,
        item_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        unit_price INTEGER NOT NULL
      )
    `);
    
    console.log("✓ Checked/created necessary tables");
  } catch (error) {
    console.error("✗ Error creating tables:", error);
    throw error;
  }
}

// Create random client
async function createClient(index: number) {
  try {
    // Generate an age between 3 and 15 years
    const childAge = Math.floor(Math.random() * 12) + 3;
    const dob = format(subDays(new Date(), 365 * childAge + Math.floor(Math.random() * 365)), 'yyyy-MM-dd');
    
    // Generate funds management type
    const fundsManagementTypes = ["Self-Managed", "Advisor-Managed", "Custodian-Managed"];
    const fundsManagement = fundsManagementTypes[Math.floor(Math.random() * fundsManagementTypes.length)];
    
    // Insert client
    const clientResult = await pool.query(`
      INSERT INTO clients (
        name, 
        date_of_birth, 
        preferred_language, 
        contact_email, 
        contact_phone, 
        address, 
        funds_management, 
        onboarding_status
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `, [
      faker.person.firstName() + ' ' + faker.person.lastName(),
      dob,
      Math.random() > 0.7 ? 'Spanish' : 'English',
      faker.internet.email(),
      faker.phone.number(),
      faker.location.streetAddress(),
      fundsManagement,
      'complete'
    ]);
    
    const client = clientResult.rows[0];
    console.log(`✓ Created client: ${client.name} (ID: ${client.id})`);
    return client;
  } catch (error) {
    console.error(`✗ Error creating client:`, error);
    throw error;
  }
}

// Create allies for a client
async function createAlliesForClient(clientId: number) {
  try {
    // Determine number of allies (2-4)
    const numAllies = Math.floor(Math.random() * 3) + 2;
    
    const alliesCreated = [];
    
    for (let i = 0; i < numAllies; i++) {
      const relationship = RELATIONSHIPS[Math.floor(Math.random() * RELATIONSHIPS.length)];
      const preferredLanguage = Math.random() > 0.6 ? 'English' : LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
      
      const allyResult = await pool.query(`
        INSERT INTO allies (
          client_id, 
          name, 
          relationship, 
          preferred_language, 
          email, 
          phone, 
          contact_preference, 
          archived
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
      `, [
        clientId,
        faker.person.fullName(),
        relationship,
        preferredLanguage,
        faker.internet.email(),
        faker.phone.number(),
        Math.random() > 0.5 ? 'email' : 'phone',
        false
      ]);
      
      alliesCreated.push(allyResult.rows[0]);
    }
    
    console.log(`✓ Created ${alliesCreated.length} allies for client ${clientId}`);
    return alliesCreated;
  } catch (error) {
    console.error(`✗ Error creating allies for client ${clientId}:`, error);
    throw error;
  }
}

// Create budget for a client
async function createBudgetForClient(clientId: number) {
  try {
    // Create a budget for the client
    const startDate = subMonths(new Date(), Math.floor(Math.random() * 3));
    const endDate = addDays(startDate, 365); // 1 year plan
    const ndisFunds = Math.floor(Math.random() * 50000) + 30000; // Between $30K and $80K
    
    const budgetResult = await pool.query(`
      INSERT INTO budget_settings (
        client_id, 
        plan_name, 
        plan_number, 
        start_of_plan, 
        end_of_plan, 
        ndis_funds, 
        is_active
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `, [
      clientId,
      `${new Date().getFullYear()} Support Plan`,
      `NDIS-${100000 + Math.floor(Math.random() * 900000)}`,
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      ndisFunds,
      true
    ]);
    
    const budgetSetting = budgetResult.rows[0];
    
    console.log(`✓ Created budget settings for client ${clientId}: ${budgetSetting.plan_name}`);
    
    // Create 6-10 budget items
    const numItems = Math.floor(Math.random() * 5) + 6;
    
    for (let i = 0; i < numItems; i++) {
      const catalogItem = CATALOG_ITEMS[Math.floor(Math.random() * CATALOG_ITEMS.length)];
      
      // Quantity will vary based on the item - higher quantities for less expensive items
      const baseQuantity = Math.floor(400 / catalogItem.unitPrice);
      const quantity = Math.max(1, Math.floor(Math.random() * baseQuantity) + 1);
      
      await pool.query(`
        INSERT INTO budget_items (
          client_id, 
          budget_settings_id, 
          item_code, 
          category, 
          name, 
          description, 
          unit_price, 
          quantity, 
          total_price
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        clientId,
        budgetSetting.id,
        catalogItem.code,
        catalogItem.category,
        catalogItem.name,
        catalogItem.description,
        catalogItem.unitPrice,
        quantity,
        catalogItem.unitPrice * quantity
      ]);
    }
    
    console.log(`✓ Created ${numItems} budget items for client ${clientId}`);
    
    return budgetSetting;
  } catch (error) {
    console.error(`✗ Error creating budget for client ${clientId}:`, error);
    throw error;
  }
}

// Create goals and subgoals for a client
async function createGoalsAndSubgoals(clientId: number) {
  try {
    // Determine number of goals (3-5)
    const numGoals = Math.floor(Math.random() * 3) + 3;
    
    const createdGoals = [];
    const allSubgoalIds = [];
    
    for (let i = 0; i < numGoals; i++) {
      // Randomly select a therapy goal
      const goalIndex = Math.floor(Math.random() * THERAPY_GOALS.length);
      const goalTitle = THERAPY_GOALS[goalIndex];
      
      const goalResult = await pool.query(`
        INSERT INTO goals (
          client_id, 
          title, 
          description, 
          status, 
          priority
        ) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [
        clientId,
        goalTitle,
        `Working towards ${goalTitle.toLowerCase()}`,
        Math.random() > 0.7 ? 'in-progress' : Math.random() > 0.5 ? 'not-started' : 'completed',
        Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low'
      ]);
      
      const goal = goalResult.rows[0];
      createdGoals.push(goal);
      
      // Create 3 subgoals for each goal
      const subgoalIndices = [];
      
      // Ensure we get 3 unique indices
      while (subgoalIndices.length < 3) {
        const idx = Math.floor(Math.random() * THERAPY_SUBGOALS.length);
        if (!subgoalIndices.includes(idx)) {
          subgoalIndices.push(idx);
        }
      }
      
      for (const idx of subgoalIndices) {
        const subgoalResult = await pool.query(`
          INSERT INTO subgoals (
            goal_id, 
            title, 
            description, 
            status
          ) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `, [
          goal.id,
          THERAPY_SUBGOALS[idx],
          `Working on ${THERAPY_SUBGOALS[idx].toLowerCase()}`,
          Math.random() > 0.6 ? 'in-progress' : Math.random() > 0.5 ? 'not-started' : 'completed'
        ]);
        
        allSubgoalIds.push(subgoalResult.rows[0].id);
      }
    }
    
    console.log(`✓ Created ${createdGoals.length} goals with ${allSubgoalIds.length} subgoals for client ${clientId}`);
    return { goals: createdGoals, subgoalIds: allSubgoalIds };
  } catch (error) {
    console.error(`✗ Error creating goals for client ${clientId}:`, error);
    throw error;
  }
}

// Create therapy strategies
async function createStrategies() {
  try {
    // First check if strategies already exist
    const existingResult = await pool.query('SELECT COUNT(*) FROM strategies');
    if (parseInt(existingResult.rows[0].count) > 0) {
      console.log(`✓ Using ${existingResult.rows[0].count} existing therapy strategies`);
      return;
    }
    
    for (const strategy of THERAPY_STRATEGIES) {
      await pool.query(`
        INSERT INTO strategies (name, category, description) 
        VALUES ($1, $2, $3)
      `, [strategy.name, strategy.category, strategy.description]);
    }
    
    console.log(`✓ Created ${THERAPY_STRATEGIES.length} therapy strategies`);
  } catch (error) {
    console.error(`✗ Error creating strategies:`, error);
    throw error;
  }
}

// Create catalog items
async function createCatalogItems() {
  try {
    // First check if catalog items already exist
    const existingResult = await pool.query('SELECT COUNT(*) FROM budget_item_catalog');
    if (parseInt(existingResult.rows[0].count) > 0) {
      console.log(`✓ Using ${existingResult.rows[0].count} existing catalog items`);
      return;
    }
    
    for (const item of CATALOG_ITEMS) {
      await pool.query(`
        INSERT INTO budget_item_catalog (
          item_code, 
          name, 
          category, 
          description, 
          unit_price
        ) 
        VALUES ($1, $2, $3, $4, $5)
      `, [item.code, item.name, item.category, item.description, item.unitPrice]);
    }
    
    console.log(`✓ Created ${CATALOG_ITEMS.length} catalog items`);
  } catch (error) {
    console.error(`✗ Error creating catalog items:`, error);
    throw error;
  }
}

// Create sessions for a client
async function createSessionsForClient(clientId: number, subgoalIds: number[]) {
  try {
    const sessions = [];
    
    // Get strategies
    const strategiesResult = await pool.query('SELECT * FROM strategies');
    const strategiesData = strategiesResult.rows;
    
    // Create sessions spanning the last 6 months
    const startDate = subMonths(new Date(), 6);
    
    for (let i = 0; i < SESSIONS_PER_CLIENT; i++) {
      // Randomly distribute sessions over the 6 month period
      const dayOffset = Math.floor(Math.random() * (180 - i));
      const sessionDate = addDays(startDate, dayOffset);
      
      // Randomly assign session status with bias towards completed
      const statusRandom = Math.random();
      const status = statusRandom > 0.7 ? 'completed' : 
                    statusRandom > 0.5 ? 'scheduled' : 
                    statusRandom > 0.3 ? 'waived' : 'rescheduled';
      
      const sessionResult = await pool.query(`
        INSERT INTO sessions (
          client_id, 
          scheduled_date, 
          scheduled_time, 
          duration, 
          status, 
          notes, 
          location, 
          created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
      `, [
        clientId,
        format(sessionDate, 'yyyy-MM-dd'),
        `${10 + Math.floor(Math.random() * 8)}:00`, // Between 10:00 and 17:00
        60, // 1 hour sessions
        status,
        faker.lorem.paragraph(),
        Math.random() > 0.7 ? 'Client Home' : 'Clinic',
        format(sessionDate, 'yyyy-MM-dd')
      ]);
      
      const session = sessionResult.rows[0];
      sessions.push(session);
      
      // Add session notes and performance assessments if session is completed
      if (status === 'completed') {
        await createSessionNoteWithPerformanceData(session.id, subgoalIds, strategiesData);
      }
    }
    
    console.log(`✓ Created ${sessions.length} sessions for client ${clientId}`);
    return sessions;
  } catch (error) {
    console.error(`✗ Error creating sessions for client ${clientId}:`, error);
    throw error;
  }
}

// Create session note with performance assessments
async function createSessionNoteWithPerformanceData(sessionId: number, subgoalIds: number[], strategiesData: any[]) {
  try {
    // Create a session note with observation ratings
    const physical_activity_rating = Math.floor(Math.random() * 5) + 5; // 5-10 range
    const cooperation_rating = Math.floor(Math.random() * 5) + 5;
    const focus_rating = Math.floor(Math.random() * 5) + 5;
    const mood_rating = Math.floor(Math.random() * 5) + 5;
    
    const products = JSON.stringify([
      { name: "Speech Therapy Session", quantity: 1, unitPrice: 180 },
      { name: "Assessment Materials", quantity: 1, unitPrice: 25 }
    ]);
    
    const noteResult = await pool.query(`
      INSERT INTO session_notes (
        session_id, 
        attendance, 
        content, 
        physical_activity_rating, 
        cooperation_rating, 
        focus_rating, 
        mood_rating, 
        products
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `, [
      sessionId,
      Math.random() > 0.8 ? 'absent' : 'present',
      faker.lorem.paragraphs(2),
      physical_activity_rating,
      cooperation_rating,
      focus_rating,
      mood_rating,
      products
    ]);
    
    const note = noteResult.rows[0];
    
    // Create 2-3 performance assessments for the note
    const numAssessments = Math.floor(Math.random() * 2) + 2;
    
    const usedSubgoalIds = [];
    const usedStrategyIds = [];
    
    for (let i = 0; i < numAssessments; i++) {
      // Get a random subgoal that hasn't been used yet in this session
      let subgoalId;
      if (subgoalIds.length) {
        do {
          subgoalId = subgoalIds[Math.floor(Math.random() * subgoalIds.length)];
        } while (usedSubgoalIds.includes(subgoalId) && usedSubgoalIds.length < subgoalIds.length);
        usedSubgoalIds.push(subgoalId);
      } else {
        // Fallback if no subgoals provided
        subgoalId = 1;
      }
      
      // Get a random strategy
      let strategyId;
      if (strategiesData.length) {
        do {
          strategyId = strategiesData[Math.floor(Math.random() * strategiesData.length)].id;
        } while (usedStrategyIds.includes(strategyId) && usedStrategyIds.length < strategiesData.length);
        usedStrategyIds.push(strategyId);
      } else {
        // Fallback if no strategies provided
        strategyId = 1;
      }
      
      // Create performance assessment with a score between 1-10
      const rating = Math.floor(Math.random() * 10) + 1; // 1-10 score
      
      await pool.query(`
        INSERT INTO performance_assessments (
          session_note_id, 
          subgoal_id, 
          strategy_id, 
          rating, 
          comments
        ) 
        VALUES ($1, $2, $3, $4, $5)
      `, [
        note.id,
        subgoalId,
        strategyId,
        rating,
        faker.lorem.sentence()
      ]);
    }
    
    console.log(`✓ Created session note with ${numAssessments} performance assessments for session ${sessionId}`);
  } catch (error) {
    console.error(`✗ Error creating session note for session ${sessionId}:`, error);
    throw error;
  }
}

// Main function to create all the test data
async function createTestData() {
  try {
    console.log("Starting comprehensive test data creation...");
    
    // First, ensure we have the necessary tables and columns
    await createTablesIfNeeded();
    await addRatingColumnIfNeeded();
    
    // Create catalog items first
    await createCatalogItems();
    
    // Create therapy strategies
    await createStrategies();
    
    // Create clients with all related data
    for (let i = 0; i < NUM_CLIENTS; i++) {
      // Create client
      const client = await createClient(i + 1);
      
      // Create allies
      await createAlliesForClient(client.id);
      
      // Create budget
      await createBudgetForClient(client.id);
      
      // Create goals and subgoals
      const { goals, subgoalIds } = await createGoalsAndSubgoals(client.id);
      
      // Create sessions with performance data
      await createSessionsForClient(client.id, subgoalIds);
      
      console.log(`✓ Completed setup for client ${i+1}/${NUM_CLIENTS}: ${client.name}`);
    }
    
    console.log(`✓ Successfully created test data with ${NUM_CLIENTS} clients`);
  } catch (error) {
    console.error("✗ Error creating comprehensive test data:", error);
    throw error;
  }
}

// Run the script
createTestData()
  .then(() => {
    console.log("✓ Comprehensive test data creation complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Error in test data creation:", error);
    process.exit(1);
  });