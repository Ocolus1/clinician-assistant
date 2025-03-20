/**
 * Simple Test Data Generator
 * 
 * This script creates test data using direct SQL queries that match
 * the actual database schema structure.
 */

import { pool } from "./server/db";
import { faker } from '@faker-js/faker';
import { format, subDays, addDays, subMonths } from 'date-fns';

// Configure how much test data to create
const NUM_CLIENTS = 5;
const GOALS_PER_CLIENT = 3;
const SESSIONS_PER_CLIENT = 10;

// Sample data arrays
const FUNDS_MANAGEMENT_OPTIONS = ["Self-Managed", "Advisor-Managed", "Custodian-Managed"];
const RELATIONSHIPS = ['Parent', 'Teacher', 'Guardian', 'Support Worker', 'Sibling', 'Therapist', 'Caregiver'];
const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Arabic', 'French', 'Hindi'];
const GOAL_STATUSES = ['not-started', 'in-progress', 'completed'];
const GOAL_PRIORITIES = ['low', 'medium', 'high'];
const SESSION_STATUSES = ['scheduled', 'completed', 'waived', 'rescheduled'];
const SESSION_LOCATIONS = ['Clinic', 'Home', 'School', 'Remote'];

// Sample goals and subgoals
const THERAPY_GOALS = [
  'Improve verbal communication skills',
  'Develop social interaction with peers',
  'Enhance fine motor skills',
  'Increase attention span and focus',
  'Improve self-regulation and emotional control',
  'Develop turn-taking and sharing skills',
];

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
];

// Budget item template data
const BUDGET_ITEMS = [
  { category: 'Speech Therapy', name: 'Individual Speech Therapy Session', description: 'One-to-one speech therapy session', unitPrice: 180 },
  { category: 'Speech Therapy', name: 'Group Speech Therapy Session', description: 'Small group speech therapy session', unitPrice: 120 },
  { category: 'Occupational Therapy', name: 'Individual Occupational Therapy Session', description: 'One-to-one OT session', unitPrice: 190 },
  { category: 'Physical Therapy', name: 'Individual Physical Therapy Session', description: 'One-to-one physical therapy', unitPrice: 185 },
  { category: 'Behavioral Support', name: 'Behavioral Assessment', description: 'Comprehensive assessment', unitPrice: 250 },
  { category: 'Therapy Materials', name: 'Therapeutic Materials', description: 'Specialized materials', unitPrice: 150 },
];

// Therapy strategies
const THERAPY_STRATEGIES = [
  { name: 'Picture Exchange Communication', category: 'communication', description: 'Using pictures to help communicate needs and wants' },
  { name: 'Social Stories', category: 'social', description: 'Narratives that describe social situations and appropriate responses' },
  { name: 'Sensory Integration', category: 'sensory', description: 'Activities that help process sensory information' },
  { name: 'Applied Behavior Analysis', category: 'behavior', description: 'Reinforcement-based techniques to improve behavior' },
  { name: 'Visual Schedules', category: 'routine', description: 'Visual cues to help understand and follow routines' },
];

// Create a client with random data
async function createClient(index: number) {
  try {
    // Generate an age between 3 and 15 years
    const childAge = Math.floor(Math.random() * 12) + 3;
    const dob = format(subDays(new Date(), 365 * childAge + Math.floor(Math.random() * 365)), 'yyyy-MM-dd');
    
    // Generate a random funds management type
    const fundsManagement = FUNDS_MANAGEMENT_OPTIONS[Math.floor(Math.random() * FUNDS_MANAGEMENT_OPTIONS.length)];
    const ndisFunds = Math.floor(Math.random() * 50000) + 30000; // Between $30K and $80K
    
    // Create the client
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
      ndisFunds.toString(),
      'complete'
    ]);
    
    const client = clientResult.rows[0];
    console.log(`✓ Created client ${index+1}/${NUM_CLIENTS}: ${client.name} (ID: ${client.id})`);
    
    // Create related data
    await createAllies(client.id);
    await createBudgetSettings(client.id);
    const goalIds = await createGoals(client.id);
    await createSessions(client.id, goalIds);
    
    return client;
  } catch (error) {
    console.error("Error creating client:", error);
    throw error;
  }
}

// Create allies (speech therapists, parents, etc.)
async function createAllies(clientId: number) {
  try {
    // Create 2-3 allies
    const numAllies = Math.floor(Math.random() * 2) + 2;
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
          access_therapeutics, 
          access_financials,
          archived
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *
      `, [
        clientId,
        faker.person.fullName(),
        relationship,
        preferredLanguage,
        faker.internet.email(),
        faker.phone.number(),
        true, // access_therapeutics
        Math.random() > 0.5, // access_financials
        false // archived
      ]);
      
      alliesCreated.push(allyResult.rows[0]);
    }
    
    console.log(`  ✓ Created ${alliesCreated.length} allies for client ${clientId}`);
    return alliesCreated;
  } catch (error) {
    console.error(`Error creating allies for client ${clientId}:`, error);
    throw error;
  }
}

// Create budget settings
async function createBudgetSettings(clientId: number) {
  try {
    // Create budget settings
    const startDate = subMonths(new Date(), Math.floor(Math.random() * 3));
    const endDate = addDays(startDate, 365); // 1 year plan
    const ndisFunds = Math.floor(Math.random() * 50000) + 30000; // Between $30K and $80K
    
    // Create budget settings (based on the actual columns in your database)
    const budgetResult = await pool.query(`
      INSERT INTO budget_settings (
        client_id,
        ndis_funds,
        end_of_plan,
        plan_serial_number,
        is_active,
        plan_code
      ) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `, [
      clientId,
      ndisFunds,
      format(endDate, 'yyyy-MM-dd'),
      `NDIS-${100000 + Math.floor(Math.random() * 900000)}`,
      true,
      `PLAN-${Math.floor(Math.random() * 10000)}`
    ]);
    
    const budgetSetting = budgetResult.rows[0];
    
    // Create budget items
    await createBudgetItems(clientId, budgetSetting.id);
    
    console.log(`  ✓ Created budget settings for client ${clientId}`);
    return budgetSetting;
  } catch (error) {
    console.error(`Error creating budget settings for client ${clientId}:`, error);
    throw error;
  }
}

// Create budget items
async function createBudgetItems(clientId: number, budgetSettingsId: number) {
  try {
    const numItems = Math.floor(Math.random() * 5) + 3; // 3-7 items
    const itemsCreated = [];
    
    for (let i = 0; i < numItems; i++) {
      const item = BUDGET_ITEMS[Math.floor(Math.random() * BUDGET_ITEMS.length)];
      const quantity = Math.floor(Math.random() * 20) + 5; // 5-25 units
      const totalPrice = item.unitPrice * quantity;
      
      const itemResult = await pool.query(`
        INSERT INTO budget_items (
          client_id,
          budget_settings_id,
          item_code,
          description,
          unit_price,
          quantity,
          category,
          name
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        clientId,
        budgetSettingsId,
        `ITEM-${Math.floor(Math.random() * 1000)}`,
        item.description,
        item.unitPrice,
        quantity,
        item.category,
        item.name
      ]);
      
      itemsCreated.push(itemResult.rows[0]);
    }
    
    console.log(`  ✓ Created ${itemsCreated.length} budget items for client ${clientId}`);
    return itemsCreated;
  } catch (error) {
    console.error(`Error creating budget items for client ${clientId}:`, error);
    throw error;
  }
}

// Create goals and subgoals
async function createGoals(clientId: number) {
  try {
    const goalIds = [];
    const subgoalIds = [];
    
    // Create goals
    for (let i = 0; i < GOALS_PER_CLIENT; i++) {
      const goalTitle = THERAPY_GOALS[Math.floor(Math.random() * THERAPY_GOALS.length)];
      const priority = GOAL_PRIORITIES[Math.floor(Math.random() * GOAL_PRIORITIES.length)];
      
      const goalResult = await pool.query(`
        INSERT INTO goals (
          client_id,
          title,
          description,
          priority
        ) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [
        clientId,
        goalTitle,
        `Working towards ${goalTitle.toLowerCase()}`,
        priority
      ]);
      
      const goal = goalResult.rows[0];
      goalIds.push(goal.id);
      
      // Create 3 subgoals for each goal
      for (let j = 0; j < 3; j++) {
        const subgoalTitle = THERAPY_SUBGOALS[Math.floor(Math.random() * THERAPY_SUBGOALS.length)];
        const status = GOAL_STATUSES[Math.floor(Math.random() * GOAL_STATUSES.length)];
        
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
          subgoalTitle,
          `Working on ${subgoalTitle.toLowerCase()}`,
          status
        ]);
        
        subgoalIds.push(subgoalResult.rows[0].id);
      }
    }
    
    console.log(`  ✓ Created ${goalIds.length} goals with ${subgoalIds.length} subgoals for client ${clientId}`);
    return { goalIds, subgoalIds };
  } catch (error) {
    console.error(`Error creating goals for client ${clientId}:`, error);
    throw error;
  }
}

// Ensure therapy strategies exist
async function ensureStrategiesExist() {
  try {
    // Check if strategies exist
    const strategiesResult = await pool.query('SELECT COUNT(*) FROM strategies');
    const strategyCount = parseInt(strategiesResult.rows[0].count);
    
    if (strategyCount > 0) {
      console.log(`✓ Using ${strategyCount} existing therapy strategies`);
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
    console.error("Error ensuring strategies exist:", error);
    throw error;
  }
}

// Ensure rating column exists
async function ensureRatingColumnExists() {
  try {
    await pool.query(`
      ALTER TABLE performance_assessments 
      ADD COLUMN IF NOT EXISTS rating INTEGER
    `);
    console.log('✓ Ensured rating column exists in performance_assessments table');
  } catch (error) {
    console.error("Error ensuring rating column exists:", error);
    throw error;
  }
}

// Create sessions with associated data
async function createSessions(clientId: number, { subgoalIds }: { goalIds: number[], subgoalIds: number[] }) {
  try {
    // Get all strategies
    const strategiesResult = await pool.query('SELECT * FROM strategies');
    const strategies = strategiesResult.rows;
    
    if (!strategies.length) {
      console.warn('No strategies found in database. Performance assessments will not be created.');
    }
    
    // Create sessions
    const startDate = subMonths(new Date(), 6); // Start from 6 months ago
    const endDate = new Date(); // Up to today
    const daySpan = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const sessions = [];
    
    for (let i = 0; i < SESSIONS_PER_CLIENT; i++) {
      // Distribute sessions over the time period
      const daysOffset = Math.floor(Math.random() * daySpan);
      const sessionDate = addDays(startDate, daysOffset);
      
      // Create random session data  
      const status = SESSION_STATUSES[Math.floor(Math.random() * SESSION_STATUSES.length)];
      const location = SESSION_LOCATIONS[Math.floor(Math.random() * SESSION_LOCATIONS.length)];
      const title = `Therapy Session ${i + 1}`;
      
      const sessionResult = await pool.query(`
        INSERT INTO sessions (
          client_id,
          title,
          description,
          session_date,
          duration,
          status,
          location,
          notes,
          created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *
      `, [
        clientId,
        title,
        `Regular therapy session for client ${clientId}`,
        sessionDate.toISOString(),
        60, // 60 minutes
        status,
        location,
        faker.lorem.paragraph(),
        sessionDate.toISOString()
      ]);
      
      const session = sessionResult.rows[0];
      sessions.push(session);
      
      // If session is completed, add notes and assessments
      if (status === 'completed') {
        await createSessionNoteWithAssessments(session.id, clientId, subgoalIds, strategies);
      }
    }
    
    console.log(`  ✓ Created ${sessions.length} sessions for client ${clientId}`);
    return sessions;
  } catch (error) {
    console.error(`Error creating sessions for client ${clientId}:`, error);
    throw error;
  }
}

// Create session notes with performance assessments
async function createSessionNoteWithAssessments(sessionId: number, clientId: number, subgoalIds: number[], strategies: any[]) {
  try {
    // Generate random observation ratings (1-10)
    const physicalActivityRating = Math.floor(Math.random() * 10) + 1;
    const cooperationRating = Math.floor(Math.random() * 10) + 1;
    const focusRating = Math.floor(Math.random() * 10) + 1;
    const moodRating = Math.floor(Math.random() * 10) + 1;
    
    // Sample products JSON
    const products = JSON.stringify([
      { name: "Speech Therapy Session", quantity: 1, unitPrice: 180 },
      { name: "Assessment Materials", quantity: 1, unitPrice: 25 }
    ]);
    
    // Create session note
    const noteResult = await pool.query(`
      INSERT INTO session_notes (
        session_id,
        client_id,
        physical_activity_rating,
        cooperation_rating,
        focus_rating,
        mood_rating,
        notes,
        products,
        status
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *
    `, [
      sessionId,
      clientId,
      physicalActivityRating,
      cooperationRating,
      focusRating,
      moodRating,
      faker.lorem.paragraphs(2),
      products,
      'completed'
    ]);
    
    const sessionNote = noteResult.rows[0];
    
    // Skip performance assessments if no strategies are available
    if (!strategies.length) {
      return sessionNote;
    }
    
    // First, we need to get the goals for this client to reference them correctly
    const goalsResult = await pool.query(`SELECT id FROM goals WHERE client_id = $1`, [clientId]);
    const goalIds = goalsResult.rows.map(row => row.id);
    
    // Skip if no goals found
    if (!goalIds.length) {
      return sessionNote;
    }
    
    // Create 2-3 performance assessments
    const numAssessments = Math.min(Math.floor(Math.random() * 2) + 2, goalIds.length); // 2-3 assessments, not exceeding the number of goals
    
    for (let i = 0; i < numAssessments; i++) {
      // Randomly select a goal and strategy
      const goalId = goalIds[Math.floor(Math.random() * goalIds.length)];
      const strategy = strategies[Math.floor(Math.random() * strategies.length)];
      
      // Create performance assessment
      await pool.query(`
        INSERT INTO performance_assessments (
          session_note_id,
          goal_id,
          notes,
          rating
        ) 
        VALUES ($1, $2, $3, $4)
      `, [
        sessionNote.id,
        goalId, // Use the actual goal ID from the goals table
        faker.lorem.sentence(),
        Math.floor(Math.random() * 10) + 1 // Rating 1-10
      ]);
    }
    
    return sessionNote;
  } catch (error) {
    console.error(`Error creating session note for session ${sessionId}:`, error);
    throw error;
  }
}

// Main function to create all test data
async function createTestData() {
  try {
    console.log("Starting test data creation...");
    
    // Ensure strategies exist and rating column exists
    await ensureStrategiesExist();
    await ensureRatingColumnExists();
    
    // Create clients with related data
    for (let i = 0; i < NUM_CLIENTS; i++) {
      await createClient(i);
    }
    
    console.log("✓ Test data creation complete");
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