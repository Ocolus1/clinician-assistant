/**
 * Debug Assistant Routes
 * 
 * This module defines API routes for debugging the assistant functionality
 */

import express from 'express';
import { sql } from '../db';
import { schemaProvider } from '../services/schemaProvider';
import { sqlQueryGenerator } from '../services/sqlQueryGenerator';

const router = express.Router();

/**
 * GET /api/debug/assistant/active-clients
 * Test the active clients query
 */
router.get('/api/debug/assistant/active-clients', async (req, res) => {
  try {
    // Define the correct SQL to count active clients as those with onboarding_status = 'complete'
    const sqlQuery = "SELECT COUNT(*) as active_clients_count FROM clients WHERE onboarding_status = 'complete'";
    console.log('Executing correct active clients query:', sqlQuery);
    
    // Execute the query directly
    const directResult = await sqlQueryGenerator.executeQuery(sqlQuery);
    
    // Get the schema description
    const schemaDesc = schemaProvider.getSchemaDescription();
    
    // Execute the auto-generated query using the assistant's pipeline
    const llmQueryPrompt = 'How many active clients do we have?';
    const generatedQuery = await sqlQueryGenerator.generateQuery(llmQueryPrompt);
    const llmResult = await sqlQueryGenerator.executeQuery(generatedQuery);
    
    // Return all results
    res.json({
      schemaDescription: schemaDesc,
      directResult,
      generatedQuery,
      llmResult
    });
  } catch (error: any) {
    console.error('Error in debug assistant endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to execute debug assistant test',
      message: error.message || 'Unknown error' 
    });
  }
});

/**
 * GET /api/debug/assistant/schema
 * Get the current schema description used by the assistant
 */
router.get('/api/debug/assistant/schema', async (req, res) => {
  try {
    const schemaDesc = schemaProvider.getSchemaDescription();
    res.json({ schema: schemaDesc });
  } catch (error: any) {
    console.error('Error getting schema description:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

export default router;