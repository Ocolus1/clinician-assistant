/**
 * Setup Clinicians Tables
 * 
 * This script creates the clinicians and client_clinicians tables in the database
 * and populates them with initial data.
 */

import { pool } from "./server/db";
import { clinicians, clientClinicians } from "./shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating clinicians and client_clinicians tables");

  try {
    // Create clinicians table
    const createCliniciansTableSQL = `
      CREATE TABLE IF NOT EXISTS clinicians (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        specialization VARCHAR(255),
        notes TEXT,
        active BOOLEAN DEFAULT TRUE
      );
    `;
    
    await pool.query(createCliniciansTableSQL);
    console.log("Clinicians table created successfully");

    // Create client_clinicians table
    const createClientCliniciansTableSQL = `
      CREATE TABLE IF NOT EXISTS client_clinicians (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        clinician_id INTEGER NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        notes TEXT,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createClientCliniciansTableSQL);
    console.log("Client_clinicians table created successfully");

    // Add initial clinicians
    const addCliniciansSQL = `
      INSERT INTO clinicians (name, email, title, specialization)
      VALUES 
        ('Rayan Ahmed', 'rayan@ignitetherapy.com', 'MS, CCC-SLP', 'Certified Speech Therapist'),
        ('Amani Saleh', 'amani@ignitetherapy.com', 'SLP-A', 'Assistant Speech Therapist'),
        ('Hatice Yilmaz', 'hatice@ignitetherapy.com', 'MS, CCC-SLP', 'Certified Speech Therapist')
      RETURNING id, name;
    `;

    const cliniciansResult = await pool.query(addCliniciansSQL);
    console.log("Added clinicians:", cliniciansResult.rows);

    console.log("Tables setup completed successfully");
  } catch (error) {
    console.error("Error setting up clinicians tables:", error);
    throw error;
  } finally {
    // Close the connection
    await pool.end();
  }
}

main()
  .then(() => {
    console.log("Clinicians setup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error setting up clinicians:", error);
    process.exit(1);
  });