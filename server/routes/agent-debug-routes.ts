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

export default router;