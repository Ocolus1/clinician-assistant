/**
 * Debug Assistant Routes
 * 
 * This module defines API routes for debugging the assistant functionality,
 * including enhanced schema analysis and two-phase SQL query generation
 */

import express from 'express';
import { sql } from '../db';
import { schemaProvider } from '../services/schemaProvider';
import { sqlQueryGenerator } from '../services/sqlQueryGenerator';

// Import our enhanced services
import { schemaAnalysisService } from '../services/schemaAnalysisService';
import { sqlQueryGenerationService } from '../services/sqlQueryGenerationService';
import { agentService } from '../services/agentService';

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

/**
 * GET /api/debug/assistant/enhanced-schema
 * Get the enhanced schema description from our new schema analysis service
 */
router.get('/api/debug/assistant/enhanced-schema', async (req, res) => {
  try {
    if (!schemaAnalysisService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Enhanced schema analysis service not initialized'
      });
    }
    
    const tableName = req.query.tableName as string;
    let result: any;
    
    if (tableName) {
      // Get info for a specific table
      const tableMetadata = schemaAnalysisService.getTableMetadata(tableName);
      
      if (!tableMetadata) {
        return res.status(404).json({
          success: false,
          error: `Table '${tableName}' not found`
        });
      }
      
      result = { table: tableMetadata };
    } else {
      // Get the full schema description
      const description = schemaAnalysisService.getSchemaDescription();
      result = { description };
    }
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Error in enhanced schema endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

/**
 * POST /api/debug/assistant/two-phase-query
 * Test the two-phase query generation approach
 */
router.post('/api/debug/assistant/two-phase-query', async (req, res) => {
  try {
    if (!sqlQueryGenerationService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'SQL query generation service not initialized'
      });
    }
    
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    
    // Generate query using two-phase approach
    const result = await sqlQueryGenerationService.generateQuery({
      question,
      context
    });
    
    // If the query was successful, execute it to show results
    let queryResult;
    if (result.success && result.query) {
      try {
        queryResult = await sql.unsafe(result.query);
      } catch (e) {
        console.error('Error executing generated query:', e);
        queryResult = { error: e.message };
      }
    }
    
    res.json({
      success: true,
      result,
      queryResult
    });
  } catch (error: any) {
    console.error('Error in two-phase query endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

/**
 * POST /api/debug/assistant/query-suggestions
 * Get schema suggestions for a query
 */
router.post('/api/debug/assistant/query-suggestions', async (req, res) => {
  try {
    if (!schemaAnalysisService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Schema analysis service not initialized'
      });
    }
    
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    const suggestions = schemaAnalysisService.getSchemaSuggestionsForQuery(query);
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error: any) {
    console.error('Error in query suggestions endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

export default router;