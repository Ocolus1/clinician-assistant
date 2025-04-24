/**
 * Agent Debug Routes
 * 
 * Specialized routes for debugging the Tool-Augmented Reasoning (ReAct + SQL Agent)
 */

import express from 'express';
import { schemaAnalysisService } from '../services/schemaAnalysisService';
import { sqlQueryGenerationService } from '../services/sqlQueryGenerationService';
import { agentService } from '../services/agentService';
import { clinicalQuestionsService } from '../services/clinicalQuestionsService';
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
      let result = await agentService.processAgentQuery(
        conversationId || 'debug-session',
        question,
        [{ role: 'user', content: question }]
      );
      
      console.log("Agent query processed successfully");
      
      // Check if the result is a JSON string containing action/action_input
      if (typeof result === 'string' && result.includes('```json') && result.includes('action')) {
        console.log("Detected raw action format in result, attempting to process");
        try {
          // Extract the JSON part
          const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            const actionData = JSON.parse(jsonMatch[1]);
            
            if (actionData.action === 'answer_clinical_question' && actionData.action_input) {
              // If it's a clinical question action, handle it directly
              console.log("Processing clinical question directly:", actionData.action_input);
              
              const { ClinicalQuestionsTool } = await import('../services/ClinicalQuestionsTool');
              const clinicalTool = new ClinicalQuestionsTool();
              
              // Call the tool directly
              result = await clinicalTool._call(actionData.action_input);
              console.log("Processed clinical question result:", result);
            }
          }
        } catch (parseError) {
          console.error("Error parsing or processing action format:", parseError);
          // Continue with original result if parsing fails
        }
      }
      
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

// Get detailed schema information for better understanding of SQL generation
router.get('/schema-analysis', async (req, res) => {
  try {
    // Import the schema analysis service
    const { schemaAnalysisService } = await import('../services/schemaAnalysisService');
    
    if (!schemaAnalysisService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Schema analysis service not initialized'
      });
    }
    
    // Get the full schema description
    const schemaDescription = schemaAnalysisService.getSchemaDescription();
    
    // Get the specific tables the user is interested in (optional query parameter)
    const tableName = req.query.table as string;
    
    if (tableName) {
      // Get metadata for a specific table
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
      // Return the full schema information
      const tableNames = schemaAnalysisService.getTableNames();
      
      // Instead of complex schema parsing which is causing TypeScript errors,
      // let's use a simpler approach with the database directly
      
      // Query the database for tables and columns
      const tableData = await sql`
        SELECT 
          t.table_name, 
          c.column_name
        FROM 
          information_schema.tables t
        JOIN 
          information_schema.columns c 
        ON 
          t.table_name = c.table_name
        WHERE 
          t.table_schema = 'public' 
        ORDER BY 
          t.table_name, 
          c.ordinal_position;
      `;
      
      // Extract potential foreign key relationships based on column naming conventions
      const foreignKeyPattern = /_id$/;
      const potentialRelationships = [];
      
      for (const row of tableData) {
        const { table_name: tableName, column_name: columnName } = row;
        
        if (foreignKeyPattern.test(columnName)) {
          // Extract the referenced table name (remove the _id suffix)
          const referencedTable = columnName.replace(foreignKeyPattern, '');
          
          // Check if the referenced table exists in our table list
          if (tableNames.includes(referencedTable)) {
            potentialRelationships.push({
              sourceTable: tableName,
              targetTable: referencedTable,
              sourceColumn: columnName,
              relationship: 'many-to-one'
            });
          }
        }
      }
      
      res.json({
        success: true,
        schemaDescription,
        tables: tableNames,
        potentialRelationships
      });
    }
  } catch (error: any) {
    console.error('Error in schema analysis endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

// Get query suggestions for a partial SQL query
router.post('/query-suggestions', async (req, res) => {
  try {
    // Import the schema analysis service
    const { schemaAnalysisService } = await import('../services/schemaAnalysisService');
    
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
    
    // Check if getSchemaSuggestionsForQuery method exists
    if (typeof schemaAnalysisService.getSchemaSuggestionsForQuery !== 'function') {
      // Fallback to our own basic suggestion logic
      const tableNames = schemaAnalysisService.getTableNames();
      
      // Very basic suggestion logic based on what's in the query
      const lowerQuery = query.toLowerCase();
      let suggestions = [];
      
      if (lowerQuery.includes('select')) {
        // Suggest table names for SELECT queries
        suggestions = tableNames.map(table => ({
          type: 'table',
          name: table,
          suggestion: `SELECT * FROM ${table}`
        }));
      } else {
        // Simple suggestions for different SQL operations
        suggestions = [
          { type: 'operation', name: 'SELECT', suggestion: 'SELECT * FROM ' },
          { type: 'operation', name: 'COUNT', suggestion: 'SELECT COUNT(*) FROM ' },
          { type: 'operation', name: 'JOIN', suggestion: ' JOIN  ON ' }
        ];
      }
      
      return res.json({
        success: true,
        suggestions,
        message: 'Basic suggestions provided (advanced suggestion method not available)'
      });
    }
    
    // Get suggestions for the partial query using the service's method
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

// Test the clinical questions service directly
router.post('/test-clinical-question', async (req, res) => {
  try {
    const { question, clientIdentifier } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    
    if (!clientIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'Client identifier is required'
      });
    }
    
    console.log(`Testing clinical question: "${question}" for client: ${clientIdentifier}`);
    
    try {
      // Process the clinical question directly using the service
      const response = await clinicalQuestionsService.answerQuestion(question, clientIdentifier);
      
      console.log("Clinical question processed successfully");
      console.log(JSON.stringify(response, null, 2));
      
      res.json({
        success: true,
        response
      });
    } catch (error: any) {
      console.error('Error processing clinical question:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Unknown error'
      });
    }
  } catch (error: any) {
    console.error('Error in test clinical question endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

export default router;