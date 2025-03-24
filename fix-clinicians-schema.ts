/**
 * Fix Clinicians Schema
 * 
 * This script updates the clinicians and client_clinicians tables
 * to match the schema defined in shared/schema.ts
 */

import { pool } from "./server/db";

async function main() {
  console.log("Updating clinicians and client_clinicians tables to match schema.ts");

  try {
    // First drop the existing tables (since we've just created them and they're empty)
    const dropTablesSQL = `
      DROP TABLE IF EXISTS client_clinicians;
      DROP TABLE IF EXISTS clinicians;
    `;
    
    await pool.query(dropTablesSQL);
    console.log("Dropped existing tables");

    // Now recreate the tables with the exact schema from schema.ts
    const createCliniciansTableSQL = `
      CREATE TABLE IF NOT EXISTS clinicians (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        email TEXT NOT NULL,
        specialization TEXT,
        active BOOLEAN DEFAULT TRUE,
        notes TEXT
      );
    `;
    
    await pool.query(createCliniciansTableSQL);
    console.log("Recreated clinicians table with correct schema");

    // Create client_clinicians table exactly matching schema.ts
    const createClientCliniciansTableSQL = `
      CREATE TABLE IF NOT EXISTS client_clinicians (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        clinician_id INTEGER NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );
    `;
    
    await pool.query(createClientCliniciansTableSQL);
    console.log("Recreated client_clinicians table with correct schema");

    // Add initial clinicians
    const addCliniciansSQL = `
      INSERT INTO clinicians (name, email, title, specialization, notes, active)
      VALUES 
        ('Rayan Ahmed', 'rayan@ignitetherapy.com', 'MS, CCC-SLP', 'Certified Speech Therapist', 'Primary therapist for early intervention', TRUE),
        ('Amani Saleh', 'amani@ignitetherapy.com', 'SLP-A', 'Assistant Speech Therapist', 'Specializes in working with toddlers', TRUE),
        ('Hatice Yilmaz', 'hatice@ignitetherapy.com', 'MS, CCC-SLP', 'Certified Speech Therapist', 'Fluent in Turkish, specializes in multilingual therapy', TRUE)
      RETURNING id, name;
    `;

    const cliniciansResult = await pool.query(addCliniciansSQL);
    console.log("Added clinicians:", cliniciansResult.rows);

    console.log("Schema update completed successfully");
  } catch (error) {
    console.error("Error updating clinicians schema:", error);
    throw error;
  } finally {
    // Close the connection
    await pool.end();
  }
}

main()
  .then(() => {
    console.log("Clinicians schema update completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error updating clinicians schema:", error);
    process.exit(1);
  });