/**
 * Debug Assistant Routes
 * 
 * Endpoints for testing and debugging the assistant features, including:
 * - Schema analysis
 * - SQL query generation
 * - Memory management
 */

import { Router } from 'express';
import { schemaAnalysisService } from '../services/schemaAnalysisService';
import { sqlQueryGenerationService } from '../services/sqlQueryGenerationService';
import { agentService } from '../services/agentService';

const router = Router();

// Get schema information for a specific table or all tables
router.get('/schema-info', async (req, res) => {
  try {
    if (!schemaAnalysisService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Schema analysis service not initialized'
      });
    }
    
    const tableName = req.query.tableName as string;
    
    if (tableName) {
      // Get info for a specific table
      const tableMetadata = schemaAnalysisService.getTableMetadata(tableName);
      
      if (!tableMetadata) {
        return res.status(404).json({
          success: false,
          error: `Table '${tableName}' not found`
        });
      }
      
      res.json({
        success: true,
        table: tableMetadata
      });
    } else {
      // Get a list of all tables
      const tableNames = schemaAnalysisService.getTableNames();
      
      res.json({
        success: true,
        tables: tableNames
      });
    }
  } catch (error: any) {
    console.error('Error in schema info endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

// Generate SQL from natural language
router.post('/generate-sql', async (req, res) => {
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
    
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('Error in generate SQL endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

// Get schema suggestions for a query
router.post('/query-suggestions', async (req, res) => {
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

// Test the agent's natural language to SQL capability
router.post('/test-agent-query', async (req, res) => {
  try {
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
    
    // Test if this query requires agent processing
    const requiresAgent = await agentService.requiresAgentProcessing(question);
    
    // Process with agent
    const result = await agentService.processAgentQuery(
      conversationId || 'debug-session',
      question,
      [{ role: 'user', content: question }]
    );
    
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

// Get the complete schema description
router.get('/schema-description', async (req, res) => {
  try {
    if (!schemaAnalysisService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Schema analysis service not initialized'
      });
    }
    
    const description = schemaAnalysisService.getSchemaDescription();
    
    res.json({
      success: true,
      description
    });
  } catch (error: any) {
    console.error('Error in schema description endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

console.log('Debug assistant routes registered successfully');
export default router;