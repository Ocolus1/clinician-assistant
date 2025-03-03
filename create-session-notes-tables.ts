import { db } from "./server/db";
import { sessionNotes, performanceAssessments, milestoneAssessments, strategies } from "./shared/schema";
import { sql } from "drizzle-orm";

/**
 * This script creates session notes related tables in the database
 */
async function main() {
  console.log("Creating session notes related tables...");

  try {
    // Create session_notes table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS session_notes (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        present_allies TEXT[],
        mood_rating INTEGER,
        physical_activity_rating INTEGER,
        focus_rating INTEGER,
        cooperation_rating INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed'))
      )
    `);
    console.log("session_notes table created");

    // Create performance_assessments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS performance_assessments (
        id SERIAL PRIMARY KEY,
        session_note_id INTEGER NOT NULL REFERENCES session_notes(id) ON DELETE CASCADE,
        goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        notes TEXT
      )
    `);
    console.log("performance_assessments table created");

    // Create milestone_assessments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS milestone_assessments (
        id SERIAL PRIMARY KEY,
        performance_assessment_id INTEGER NOT NULL REFERENCES performance_assessments(id) ON DELETE CASCADE,
        milestone_id INTEGER NOT NULL,
        rating INTEGER,
        strategies TEXT[],
        notes TEXT
      )
    `);
    console.log("milestone_assessments table created");

    // Create strategies table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS strategies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT
      )
    `);
    console.log("strategies table created");

    // Insert default strategies one by one to avoid syntax errors
    const strategies = [
      ['Visual Schedule', 'Visual Support', 'Using a visual schedule to support understanding of sequence of activities'],
      ['Visual Cues', 'Visual Support', 'Using visual cues and prompts to support communication and comprehension'],
      ['Verbal Prompting', 'Verbal Support', 'Using verbal prompts to guide behavior or responses'],
      ['Modeling', 'Demonstration', 'Demonstrating the desired behavior or skill'],
      ['Physical Prompting', 'Physical Support', 'Using physical guidance to support movement or actions'],
      ['Positive Reinforcement', 'Reinforcement', 'Providing positive feedback or rewards for desired behaviors'],
      ['Token Economy', 'Reinforcement', 'Using token systems to reinforce desired behaviors'],
      ['Social Stories', 'Social Support', 'Using stories to explain social situations and expected behaviors'],
      ['AAC Device', 'Assistive Technology', 'Using augmentative and alternative communication devices'],
      ['Self-Monitoring', 'Self-Regulation', 'Teaching strategies for monitoring one\'s own behavior']
    ];
    
    for (const [name, category, description] of strategies) {
      await db.execute(sql`
        INSERT INTO strategies (name, category, description)
        VALUES (${name}, ${category}, ${description})
        ON CONFLICT DO NOTHING
      `);
    }
    console.log("Default strategies inserted");

    console.log("Session notes tables creation completed successfully!");
  } catch (error) {
    console.error("Error creating session notes tables:", error);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});