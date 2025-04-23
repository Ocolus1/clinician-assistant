/**
 * Agent Debug Routes
 * 
 * Specialized routes for debugging the Tool-Augmented Reasoning (ReAct + SQL Agent)
 */

import express from 'express';
import { schemaAnalysisService } from '../services/schemaAnalysisService';
import { sqlQueryGenerationService } from '../services/sqlQueryGenerationService';
import { agentService } from '../services/agentService';
import { sql } from '../db';

const router = express.Router();

// Test the agent's natural language to SQL capability
router.post('/test-agent-query', async (req, res) => {
  try {
    console.log("Agent debug route: test-agent-query called");
    
    if (!agentService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Agent service not initialized'
      });
    }
    
    const { question, conversationId } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    
    console.log(`Testing agent query: "${question}"`);
    
    // Test if this query requires agent processing
    const requiresAgent = await agentService.requiresAgentProcessing(question);
    console.log(`Query requires agent: ${requiresAgent}`);
    
    try {
      // Process with agent
      const result = await agentService.processAgentQuery(
        conversationId || 'debug-session',
        question,
        [{ role: 'user', content: question }]
      );
      
      console.log("Agent query processed successfully");
      
      res.json({
        success: true,
        requiresAgent,
        result
      });
    } catch (error: any) {
      console.error('Error processing agent query:', error);
      // If we get a schema validation error, try direct SQL generation
      if (error.message?.includes('schema')) {
        try {
          // Import the SQL query generation service
          const { sqlQueryGenerationService } = await import('../services/sqlQueryGenerationService');
          
          // Generate SQL directly
          const sqlResult = await sqlQueryGenerationService.generateQuery({
            question
          });
          
          if (sqlResult.success && sqlResult.query) {
            // Execute the query if it was generated successfully
            const queryResult = await sql.unsafe(sqlResult.query);
            
            res.json({
              success: true,
              requiresAgent,
              fallbackMode: true,
              sqlResult,
              queryResult
            });
          } else {
            // Return the SQL generation error
            res.json({
              success: false,
              requiresAgent,
              fallbackMode: true,
              sqlResult
            });
          }
        } catch (sqlError: any) {
          console.error('Error in fallback SQL generation:', sqlError);
          res.status(500).json({
            success: false,
            error: sqlError.message || 'Unknown SQL generation error'
          });
        }
      } else {
        // Return the original error
        res.status(500).json({
          success: false,
          error: error.message || 'Unknown error'
        });
      }
    }
  } catch (error: any) {
    console.error('Error in test agent query endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

// Get information about all available database tables
router.get('/tables', async (req, res) => {
  try {
    // Query actual database tables
    const tables = await sql`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    
    res.json({
      success: true,
      tables: tables.map(t => t.tablename)
    });
  } catch (error: any) {
    console.error('Error getting tables:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

// Test SQL query generation directly
router.post('/generate-sql', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    
    console.log(`Generating SQL for: "${question}"`);
    
    // Import the SQL query generation service
    const { sqlQueryGenerationService } = await import('../services/sqlQueryGenerationService');
    
    // Generate SQL
    const sqlResult = await sqlQueryGenerationService.generateQuery({
      question
    });
    
    console.log(`SQL generation result: ${sqlResult.success ? 'success' : 'failed'}`);
    
    if (sqlResult.success && sqlResult.query) {
      try {
        // Execute the query if it was generated successfully
        const queryResult = await sql.unsafe(sqlResult.query);
        
        res.json({
          success: true,
          sqlResult,
          queryResult
        });
      } catch (sqlError: any) {
        console.error('Error executing generated SQL:', sqlError);
        res.json({
          success: false,
          sqlResult,
          executionError: sqlError.message || 'Unknown SQL execution error'
        });
      }
    } else {
      // Return the SQL generation error
      res.json({
        success: false,
        sqlResult
      });
    }
  } catch (error: any) {
    console.error('Error in SQL generation endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

export default router;