/**
 * Agent Service
 * 
 * This service provides a Tool-Augmented Reasoning approach (ReAct + SQL Agent)
 * to handle complex queries requiring multi-step reasoning and database interactions.
 */

import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { DynamicTool, StructuredTool } from "@langchain/core/tools";
import { AgentExecutor } from "langchain/agents";
import { Message, MessageRole, QueryResult } from "@shared/assistantTypes";
import { ConversationChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";
import { z } from "zod";
import { memoryManagementService } from "./memoryManagementService";
import { sql } from "../db";

/**
 * Configuration for the agent service
 */
export interface AgentServiceConfig {
  apiKey: string;
  model: string;
  temperature: number;
}

/**
 * SQL Query Tool for LangChain Agent
 */
class SQLQueryTool extends StructuredTool {
  name = "query_database";
  description = "Useful for querying the database to answer questions about clinical data";
  schema = z.object({
    query: z.string().describe("The SQL query to execute. Should be a valid PostgreSQL query.")
  });
  
  constructor(private executeQueryFn: (query: string) => Promise<QueryResult>) {
    super();
  }
  
  async _call(input: { query: string }): Promise<string> {
    try {
      console.log(`Executing SQL query: ${input.query}`);
      
      const result = await this.executeQueryFn(input.query);
      
      if (result.rows.length === 0) {
        return "No results found for this query.";
      }
      
      // Format result as a markdown table for better readability
      let formattedResult = "Here are the results:\n\n```\n";
      
      // Add column headers
      formattedResult += result.columns.join(" | ") + "\n";
      formattedResult += result.columns.map(() => "---").join(" | ") + "\n";
      
      // Add rows (limit to 20 rows for readability)
      const limitedRows = result.rows.slice(0, 20);
      for (const row of limitedRows) {
        formattedResult += result.columns.map(col => {
          const value = row[col];
          return value === null || value === undefined ? "NULL" : String(value);
        }).join(" | ") + "\n";
      }
      
      formattedResult += "```\n";
      
      // Add row count information
      if (result.rows.length > 20) {
        formattedResult += `\nShowing 20 of ${result.rows.length} rows.`;
      } else {
        formattedResult += `\nTotal rows: ${result.rows.length}`;
      }
      
      // Add execution time if available
      if (result.metadata?.executionTime) {
        formattedResult += `\nQuery execution time: ${result.metadata.executionTime}ms`;
      }
      
      return formattedResult;
    } catch (error: any) {
      console.error("Error executing SQL query:", error);
      return `Error executing query: ${error.message || 'Unknown error'}. Please check your SQL syntax and try again.`;
    }
  }
}

/**
 * Database Schema Tool - provides information about database tables and structure
 */
class DatabaseSchemaTool extends StructuredTool {
  name = "get_database_schema";
  description = "Get information about the database schema, tables, and columns";
  schema = z.object({
    tableName: z.string().optional().describe("Optional table name to get specific schema information")
  });
  
  async _call(input: { tableName?: string }): Promise<string> {
    try {
      let schemaInfo = "";
      
      if (input.tableName) {
        // Get schema for specific table
        const tableInfo = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = ${input.tableName}
          ORDER BY ordinal_position;
        `;
        
        if (tableInfo.length === 0) {
          return `Table '${input.tableName}' not found in the database.`;
        }
        
        schemaInfo = `Table: ${input.tableName}\n\nColumns:\n`;
        tableInfo.forEach(col => {
          schemaInfo += `- ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})\n`;
        });
        
        // Get foreign keys
        const foreignKeys = await sql`
          SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ${input.tableName};
        `;
        
        if (foreignKeys.length > 0) {
          schemaInfo += "\nForeign Keys:\n";
          foreignKeys.forEach(fk => {
            schemaInfo += `- ${fk.column_name} references ${fk.foreign_table_name}(${fk.foreign_column_name})\n`;
          });
        }
      } else {
        // Get list of all tables
        const tables = await sql`
          SELECT tablename
          FROM pg_catalog.pg_tables
          WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
        `;
        
        schemaInfo = "Database Tables:\n\n";
        tables.forEach(table => {
          schemaInfo += `- ${table.tablename}\n`;
        });
        
        schemaInfo += "\nUse the tool again with a specific tableName to get detailed information about a table.";
      }
      
      return schemaInfo;
    } catch (error: any) {
      console.error("Error retrieving database schema:", error);
      return `Error retrieving database schema: ${error.message || 'Unknown error'}`;
    }
  }
}

/**
 * Clinical Records Tool - provides information about specific client records
 */
class ClinicalRecordsTool extends StructuredTool {
  name = "get_client_records";
  description = "Get clinical records for a specific client";
  schema = z.object({
    clientId: z.number().describe("The client ID to retrieve records for")
  });
  
  async _call(input: { clientId: number }): Promise<string> {
    try {
      // Check if client exists
      const client = await sql`
        SELECT * FROM clients WHERE id = ${input.clientId};
      `;
      
      if (client.length === 0) {
        return `Client with ID ${input.clientId} not found.`;
      }
      
      // Get basic client information
      const clientInfo = client[0];
      let result = `Client Information:\n`;
      result += `- Name: ${clientInfo.first_name} ${clientInfo.last_name}\n`;
      result += `- Date of Birth: ${clientInfo.date_of_birth}\n`;
      result += `- Status: ${clientInfo.status}\n\n`;
      
      // Get goals
      const goals = await sql`
        SELECT * FROM goals WHERE client_id = ${input.clientId};
      `;
      
      if (goals.length > 0) {
        result += `Goals (${goals.length}):\n`;
        goals.forEach(goal => {
          result += `- ${goal.title}: ${goal.description}\n`;
        });
        result += "\n";
      }
      
      // Get budget information
      const budgetItems = await sql`
        SELECT * FROM budget_items WHERE client_id = ${input.clientId};
      `;
      
      if (budgetItems.length > 0) {
        result += `Budget Items (${budgetItems.length}):\n`;
        result += `- Total Items: ${budgetItems.length}\n`;
        result += `- Used Units: ${budgetItems.reduce((acc, item) => acc + (item.used_units || 0), 0)}\n`;
        result += `- Total Units: ${budgetItems.reduce((acc, item) => acc + (item.total_units || 0), 0)}\n\n`;
      }
      
      // Get sessions count
      const sessions = await sql`
        SELECT COUNT(*) AS count FROM sessions WHERE client_id = ${input.clientId};
      `;
      
      result += `Sessions: ${sessions[0].count}\n\n`;
      
      result += `To get more specific information, please use the query_database tool with a SQL query.`;
      
      return result;
    } catch (error: any) {
      console.error("Error retrieving client records:", error);
      return `Error retrieving client records: ${error.message || 'Unknown error'}`;
    }
  }
}

/**
 * Agent Service class
 */
export class AgentService {
  private config: AgentServiceConfig | null = null;
  private initialized = false;
  private tools: StructuredTool[] = [];
  private executor: AgentExecutor | null = null;
  private llm: ChatOpenAI | null = null;
  
  /**
   * Execute a SQL query directly
   */
  private async executeQuery(query: string): Promise<QueryResult> {
    try {
      // Basic SQL injection prevention
      const safeQuery = this.sanitizeQuery(query);
      
      console.log(`Executing sanitized query: ${safeQuery}`);
      const startTime = Date.now();
      
      // Execute the query
      const result = await sql.unsafe(safeQuery);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Extract column names from the first result
      const columns = result.length > 0 
        ? Object.keys(result[0] || {})
        : [];
      
      return {
        columns,
        rows: result,
        metadata: {
          executionTime,
          rowCount: result.length,
          queryText: safeQuery
        }
      };
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }
  
  /**
   * Sanitize a SQL query to prevent SQL injection
   */
  private sanitizeQuery(query: string): string {
    // Convert to uppercase for easier analysis
    const upperQuery = query.toUpperCase();
    
    // Check for dangerous operations
    if (upperQuery.includes('DROP TABLE') || 
        upperQuery.includes('TRUNCATE TABLE') || 
        upperQuery.includes('DELETE FROM') ||
        upperQuery.includes('UPDATE ')) {
      throw new Error('Unsafe SQL operation detected');
    }
    
    // Add LIMIT if not present to prevent huge result sets
    if (!upperQuery.includes('LIMIT ') && upperQuery.includes('SELECT ')) {
      // Simple case - add LIMIT to the end
      return `${query} LIMIT 100`;
    }
    
    return query;
  }
  
  /**
   * Initialize the agent service
   */
  async initialize(config: AgentServiceConfig, executeQueryFn?: (query: string) => Promise<QueryResult>): Promise<void> {
    try {
      this.config = config;
      
      // Initialize LLM
      this.llm = new ChatOpenAI({
        openAIApiKey: config.apiKey,
        modelName: config.model,
        temperature: config.temperature,
        verbose: true
      });
      
      // Create tools
      const queryFunction = executeQueryFn || this.executeQuery.bind(this);
      
      this.tools = [
        new SQLQueryTool(queryFunction),
        new DatabaseSchemaTool(),
        new ClinicalRecordsTool()
      ];
      
      // Initialize the agent executor
      this.executor = await initializeAgentExecutorWithOptions(
        this.tools,
        this.llm,
        {
          agentType: "chat-conversational-react-description",
          verbose: true,
          maxIterations: 5, // Prevent endless loops
          earlyStoppingMethod: "generate",
          memory: new BufferMemory({
            returnMessages: true,
            memoryKey: "chat_history",
            inputKey: "input",
            outputKey: "output"
          })
        }
      );
      
      this.initialized = true;
      console.log('Agent service initialized with ReAct pattern');
    } catch (error) {
      console.error('Failed to initialize agent service:', error);
      throw new Error('Failed to initialize agent service');
    }
  }
  
  /**
   * Process a message with the agent executor
   */
  async processAgentQuery(
    conversationId: string,
    message: string,
    recentMessages: { role: MessageRole; content: string }[]
  ): Promise<string> {
    if (!this.initialized || !this.executor || !this.llm) {
      throw new Error('Agent service not initialized');
    }
    
    try {
      console.log(`Processing agent query: "${message.substring(0, 50)}..."`);
      
      // Convert the message format to what memoryManagementService expects
      const formattedMessages: Message[] = recentMessages.map((msg, index) => ({
        id: `temp-id-${index}`,
        role: msg.role,
        content: msg.content,
        createdAt: new Date().toISOString()
      }));
      
      // Get memory context to use as additional input
      const memoryContext = await memoryManagementService.getTieredMemoryContext(
        conversationId,
        message,
        formattedMessages
      );
      
      // Execute the agent with the query and context
      const result = await this.executor.invoke({
        input: message,
        context: memoryContext.combinedContext || ''
      });
      
      return result.output;
    } catch (error: any) {
      console.error('Error processing agent query:', error);
      return `I encountered an error while processing your question: ${error.message || 'Unknown error'}. Could you please rephrase or simplify your question?`;
    }
  }
  
  /**
   * Check if an input requires agent processing
   */
  async requiresAgentProcessing(input: string): Promise<boolean> {
    if (!this.initialized || !this.llm) {
      return false;
    }
    
    try {
      // Simple heuristic to detect complex data-related questions
      const keywords = [
        'how many', 'count', 'show me', 'list', 'find', 'search', 
        'compare', 'which clients', 'which patients', 'budget', 
        'analyze', 'query', 'database', 'data', 'statistics'
      ];
      
      // Check for keyword matches
      for (const keyword of keywords) {
        if (input.toLowerCase().includes(keyword)) {
          return true;
        }
      }
      
      // If no simple matches, use LLM to determine
      const response = await this.llm.invoke([
        {
          role: 'system',
          content: 'You are an assistant that determines if a user query requires database access or multi-step reasoning. Respond with "YES" or "NO" only.'
        },
        {
          role: 'user',
          content: `Does this query require database access or complex reasoning with multiple steps?\n\nQuery: ${input}\n\nAnswer (YES or NO):`
        }
      ]);
      
      const answer = response.content.toString().trim().toUpperCase();
      return answer.includes('YES');
    } catch (error: any) {
      console.error('Error determining if query requires agent:', error);
      return false; // Default to standard processing on error
    }
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): AgentServiceConfig | null {
    return this.config;
  }
  
  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create a singleton instance
export const agentService = new AgentService();