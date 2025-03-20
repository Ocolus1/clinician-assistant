/**
 * Test Data Generator for Client Reports
 * 
 * This script creates test clients with all necessary related data:
 * - Complete client profiles
 * - Allied health professionals
 * - Goals and subgoals
 * - Budget items and settings
 * - Sessions with performance data
 */

import { pool } from "./server/db";
import { faker } from '@faker-js/faker';
import { format, subDays, addDays, subMonths } from 'date-fns';

// Constants for quantity of test data
const NUM_CLIENTS = 5;
const SESSIONS_PER_CLIENT = 10;
const GOALS_PER_CLIENT = 3;
const SUBGOALS_PER_GOAL = 3;
const BUDGET_ITEMS_PER_CLIENT = 6;

// Sample data arrays
const FUNDS_MANAGEMENT_OPTIONS = ["Self-Managed", "Advisor-Managed", "Custodian-Managed"];
const RELATIONSHIPS = ['Parent', 'Teacher', 'Guardian', 'Support Worker', 'Sibling', 'Therapist', 'Caregiver'];
const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Arabic', 'French', 'Hindi'];
const SESSION_STATUSES = ['scheduled', 'completed', 'waived', 'rescheduled'];
const GOAL_STATUSES = ['not-started', 'in-progress', 'completed'];
const GOAL_PRIORITIES = ['low', 'medium', 'high'];

// Sample therapy goals
const THERAPY_GOALS = [
  'Improve verbal communication skills',
  'Develop social interaction with peers',
  'Enhance fine motor skills',
  'Increase attention span and focus',
  'Improve self-regulation and emotional control',
  'Develop turn-taking and sharing skills',
];

// Sample subgoals
const THERAPY_SUBGOALS = [
  'Initiate conversation with peers',
  'Respond appropriately to questions',
  'Use complete sentences in communication',
  'Follow multi-step verbal instructions',
  'Express needs and wants clearly',
  'Maintain eye contact during conversation',
  'Identify and label emotions in self and others',
  'Take turns during group activities',
  'Share materials without prompting',
  'Engage in cooperative play with peers',
  'Respond appropriately to social cues',
  'Develop strategies for conflict resolution',
  'Improve handwriting legibility',
  'Use scissors effectively to cut along lines',
  'Button and zip clothing independently',
];

// Sample therapy strategies
const THERAPY_STRATEGIES = [
  { name: 'Picture Exchange Communication', category: 'communication', description: 'Using pictures to help communicate needs and wants' },
  { name: 'Social Stories', category: 'social', description: 'Narratives that describe social situations and appropriate responses' },
  { name: 'Sensory Integration', category: 'sensory', description: 'Activities that help process sensory information' },
  { name: 'Applied Behavior Analysis', category: 'behavior', description: 'Reinforcement-based techniques to improve behavior' },
  { name: 'Visual Schedules', category: 'routine', description: 'Visual cues to help understand and follow routines' },
];

// Sample budget items
const BUDGET_ITEMS = [
  { category: 'Speech Therapy', name: 'Individual Speech Therapy Session', description: 'One-to-one speech therapy session', unitPrice: 180 },
  { category: 'Speech Therapy', name: 'Group Speech Therapy Session', description: 'Small group speech therapy session', unitPrice: 120 },
  { category: 'Occupational Therapy', name: 'Individual Occupational Therapy Session', description: 'One-to-one OT session', unitPrice: 190 },
  { category: 'Physical Therapy', name: 'Individual Physical Therapy Session', description: 'One-to-one physical therapy', unitPrice: 185 },
  { category: 'Behavioral Support', name: 'Behavioral Assessment', description: 'Comprehensive assessment', unitPrice: 250 },
  { category: 'Therapy Materials', name: 'Therapeutic Materials', description: 'Specialized materials', unitPrice: 150 },
];

// Helper function to create a random client
async function createClient() {
  try {
    // Generate an age between 3 and 15 years
    const childAge = Math.floor(Math.random() * 12) + 3;
    const dob = format(subDays(new Date(), 365 * childAge + Math.floor(Math.random() * 365)), 'yyyy-MM-dd');
    
    // Generate a random funds management type
    const fundsManagement = FUNDS_MANAGEMENT_OPTIONS[Math.floor(Math.random() * FUNDS_MANAGEMENT_OPTIONS.length)];
    
    // Create client in database
    const clientResult = await pool.query(`
      INSERT INTO clients (
        name, 
        date_of_birth, 
        gender,
        preferred_language, 
        contact_email, 
        contact_phone, 
        address, 
        funds_management, 
        ndis_funds,
        onboarding_status
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *
    `, [
      faker.person.firstName() + ' ' + faker.person.lastName(),
      dob,
      Math.random() > 0.5 ? 'Male' : 'Female',
      Math.random() > 0.7 ? 'Spanish' : 'English',
      faker.internet.email(),
      faker.phone.number(),
      faker.location.streetAddress(),
      fundsManagement,
      (Math.floor(Math.random() * 65000) + 15000).toString(), // Random NDIS funds
      'complete'
    ]);
    
    const client = clientResult.rows[0];
    console.log(`✓ Created client: ${client.name} (ID: ${client.id})`);
    
    // Create related data for this client
    await createAlliesForClient(client.id);
    await createBudgetForClient(client.id);
    const goalIds = await createGoalsForClient(client.id);
    await createSessionsForClient(client.id, goalIds);
    
    return client;
  } catch (error) {
    console.error("Error creating client:", error);
    throw error;
  }
}

// Helper function to create allies for a client
async function createAlliesForClient(clientId: number) {
  try {
    // Determine number of allies (2-3)
    const numAllies = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < numAllies; i++) {
      const relationship = RELATIONSHIPS[Math.floor(Math.random() * RELATIONSHIPS.length)];
      const preferredLanguage = Math.random() > 0.6 ? 'English' : LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
      
      await pool.query(`
        INSERT INTO allies (
          client_id, 
          name, 
          relationship, 
          preferred_language, 
          email, 
          phone, 
          access_therapeutics, 
          access_financials, 
          archived,
          notes
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        clientId,
        faker.person.fullName(),
        relationship,
        preferredLanguage,
        faker.internet.email(),
        faker.phone.number(),
        Math.random() > 0.5, // access_therapeutics (boolean)
        Math.random() > 0.7, // access_financials (boolean)
        false, // archived
        faker.lorem.sentence() // notes
      ]);
    }
    
    console.log(`✓ Created ${numAllies} allies for client ${clientId}`);
  } catch (error) {
    console.error("Error creating allies:", error);
    throw error;
  }
}

// Helper function to create budget settings and items for a client
async function createBudgetForClient(clientId: number) {
  try {
    // Create budget settings
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
    
    // Create budget items
    for (let i = 0; i < BUDGET_ITEMS_PER_CLIENT; i++) {
      const item = BUDGET_ITEMS[Math.floor(Math.random() * BUDGET_ITEMS.length)];
      const quantity = Math.floor(Math.random() * 20) + 5; // 5-25 units
      
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
        `ITEM-${i+1}`, // Simple item code
        item.category,
        item.name,
        item.description,
        item.unitPrice,
        quantity,
        item.unitPrice * quantity
      ]);
    }
    
    console.log(`✓ Created budget with ${BUDGET_ITEMS_PER_CLIENT} items for client ${clientId}`);
  } catch (error) {
    console.error("Error creating budget:", error);
    throw error;
  }
}

// Helper function to create goals and subgoals for a client
async function createGoalsForClient(clientId: number) {
  try {
    const goalIds = [];
    const subgoalIds = [];
    
    // Create goals
    for (let i = 0; i < GOALS_PER_CLIENT; i++) {
      const goalTitle = THERAPY_GOALS[Math.floor(Math.random() * THERAPY_GOALS.length)];
      const status = GOAL_STATUSES[Math.floor(Math.random() * GOAL_STATUSES.length)];
      const priority = GOAL_PRIORITIES[Math.floor(Math.random() * GOAL_PRIORITIES.length)];
      
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
        status,
        priority
      ]);
      
      const goalId = goalResult.rows[0].id;
      goalIds.push(goalId);
      
      // Create subgoals for this goal
      for (let j = 0; j < SUBGOALS_PER_GOAL; j++) {
        const subgoalTitle = THERAPY_SUBGOALS[Math.floor(Math.random() * THERAPY_SUBGOALS.length)];
        const subgoalStatus = GOAL_STATUSES[Math.floor(Math.random() * GOAL_STATUSES.length)];
        
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
          goalId,
          subgoalTitle,
          `Working on ${subgoalTitle.toLowerCase()}`,
          subgoalStatus
        ]);
        
        subgoalIds.push(subgoalResult.rows[0].id);
      }
    }
    
    console.log(`✓ Created ${goalIds.length} goals and ${subgoalIds.length} subgoals for client ${clientId}`);
    return { goalIds, subgoalIds };
  } catch (error) {
    console.error("Error creating goals:", error);
    throw error;
  }
}

// Helper function to create strategies if they don't exist
async function createStrategiesIfNeeded() {
  try {
    // Check if strategies already exist
    const strategiesResult = await pool.query('SELECT COUNT(*) FROM strategies');
    
    // If strategies already exist, do nothing
    if (parseInt(strategiesResult.rows[0].count) > 0) {
      console.log(`✓ Using ${strategiesResult.rows[0].count} existing therapy strategies`);
      return;
    }
    
    // Create strategies
    for (const strategy of THERAPY_STRATEGIES) {
      await pool.query(`
        INSERT INTO strategies (name, category, description) 
        VALUES ($1, $2, $3)
      `, [strategy.name, strategy.category, strategy.description]);
    }
    
    console.log(`✓ Created ${THERAPY_STRATEGIES.length} therapy strategies`);
  } catch (error) {
    console.error("Error creating strategies:", error);
    throw error;
  }
}

// Helper function to create sessions for a client
async function createSessionsForClient(clientId: number, { subgoalIds }: { goalIds: number[], subgoalIds: number[] }) {
  try {
    // Get strategies
    const strategiesResult = await pool.query('SELECT * FROM strategies');
    const strategies = strategiesResult.rows;
    
    // Create sessions spanning the last 6 months
    const startDate = subMonths(new Date(), 6);
    
    for (let i = 0; i < SESSIONS_PER_CLIENT; i++) {
      // Randomly distribute sessions over the 6 month period
      const dayOffset = Math.floor(Math.random() * (180 - i));
      const sessionDate = addDays(startDate, dayOffset);
      
      // Randomly assign session status with bias towards completed
      const status = SESSION_STATUSES[Math.floor(Math.random() * SESSION_STATUSES.length)];
      
      // Create session
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
      
      // Add session notes and performance assessments if session is completed
      if (status === 'completed') {
        await createSessionNoteWithPerformance(session.id, subgoalIds, strategies);
      }
    }
    
    console.log(`✓ Created ${SESSIONS_PER_CLIENT} sessions for client ${clientId}`);
  } catch (error) {
    console.error("Error creating sessions:", error);
    throw error;
  }
}

// Helper function to create session notes with performance assessments
async function createSessionNoteWithPerformance(sessionId: number, subgoalIds: number[], strategies: any[]) {
  try {
    // Make sure we have strategies and subgoals
    if (!strategies.length || !subgoalIds.length) {
      console.log(`⚠️ No strategies or subgoals available for session ${sessionId}`);
      return;
    }

    // Create session note with observation ratings
    const physical_activity_rating = Math.floor(Math.random() * 5) + 5; // 5-10 range
    const cooperation_rating = Math.floor(Math.random() * 5) + 5;
    const focus_rating = Math.floor(Math.random() * 5) + 5;
    const mood_rating = Math.floor(Math.random() * 5) + 5;
    
    const products = JSON.stringify([
      { name: "Speech Therapy Session", quantity: 1, unitPrice: 180 },
      { name: "Assessment Materials", quantity: 1, unitPrice: 25 }
    ]);
    
    // Create session note
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
    
    for (let i = 0; i < numAssessments && i < subgoalIds.length; i++) {
      // Get a random subgoal and strategy
      const subgoalId = subgoalIds[Math.floor(Math.random() * subgoalIds.length)];
      const strategy = strategies[Math.floor(Math.random() * strategies.length)];
      
      // Create performance assessment with a score between 1-10
      const rating = Math.floor(Math.random() * 10) + 1; // 1-10 score
      
      // Make sure the rating column exists
      try {
        await pool.query(`
          ALTER TABLE performance_assessments 
          ADD COLUMN IF NOT EXISTS rating INTEGER
        `);
      } catch (error) {
        console.error("Error adding rating column:", error);
      }
      
      // Create performance assessment
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
        strategy.id,
        rating,
        faker.lorem.sentence()
      ]);
    }
    
    console.log(`✓ Created session note with ${numAssessments} performance assessments for session ${sessionId}`);
  } catch (error) {
    console.error("Error creating session note:", error);
    throw error;
  }
}

// Main function to create all test data
async function createTestData() {
  try {
    console.log("Starting test data creation...");
    
    // Make sure we have strategies
    await createStrategiesIfNeeded();
    
    // Create test clients
    for (let i = 0; i < NUM_CLIENTS; i++) {
      await createClient();
      console.log(`✓ Completed client ${i+1}/${NUM_CLIENTS}`);
    }
    
    console.log("✓ Test data creation complete!");
  } catch (error) {
    console.error("Error creating test data:", error);
    throw error;
  }
}

// Run the script
createTestData()
  .then(() => {
    console.log("✓ Successfully created test data");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Error:", error);
    process.exit(1);
  });