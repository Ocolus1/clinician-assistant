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
      
      // First try executing the original query
      let result = await this.executeQueryFn(input.query);
      
      // If no results were found, try to enhance the query using schema analysis
      if (result.rows.length === 0) {
        console.log("Query returned no results, attempting to enhance with schema analysis...");
        
        // Try to find and fix identifier format issues using schema analysis
        const alternativeQueries = await this.generateAlternativeQueries(input.query);
        
        // Try each alternative query
        for (const alternativeQuery of alternativeQueries) {
          console.log(`Trying alternative query: ${alternativeQuery}`);
          
          try {
            const alternativeResult = await this.executeQueryFn(alternativeQuery);
            
            // If this alternative query returns results, use those
            if (alternativeResult.rows.length > 0) {
              console.log("Alternative query returned results!");
              result = alternativeResult;
              break;
            }
          } catch (error: any) {
            console.error(`Error with alternative query: ${error.message || 'Unknown error'}`);
            // Continue trying other alternatives
          }
        }
        
        // If still no results after trying alternatives
        if (result.rows.length === 0) {
          // Import schemaAnalysisService dynamically to avoid circular dependencies
          const { schemaAnalysisService } = await import('./schemaAnalysisService');
          
          // Initialize schema analysis if needed
          if (!schemaAnalysisService.isInitialized()) {
            await schemaAnalysisService.initialize();
          }
          
          // Get schema suggestions for the query
          const schemaSuggestions = schemaAnalysisService.getSchemaSuggestionsForQuery(input.query);
          
          return `No results found for this query. Here are some suggestions based on database schema analysis:\n\n${schemaSuggestions}`;
        }
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
  
  /**
   * Generate alternative versions of a query that might return results
   * This handles special cases like identifier format inconsistencies
   */
  private async generateAlternativeQueries(query: string): Promise<string[]> {
    try {
      // Import schemaAnalysisService dynamically to avoid circular dependencies
      const { schemaAnalysisService } = await import('./schemaAnalysisService');
      
      // Check if the schema analysis service is initialized
      if (!schemaAnalysisService.isInitialized()) {
        console.log('Schema analysis service not initialized for query enhancement, initializing now...');
        await schemaAnalysisService.initialize();
      }
      
      // Extract table and column names from the query
      const tablePattern = /\bFROM\s+(\w+)|JOIN\s+(\w+)/gi;
      const wherePattern = /\bWHERE\s+(?:(\w+)\.)?(\w+)\s*=\s*['"]([^'"]+)['"]/gi;
      
      const tableMatches = Array.from(query.matchAll(tablePattern));
      const whereMatches = Array.from(query.matchAll(wherePattern));
      
      const alternativeQueries: string[] = [];
      
      // For each WHERE clause with string equality, try alternative identifier formats
      for (const whereMatch of whereMatches) {
        const tableAlias = whereMatch[1]; // Might be undefined if no alias
        const columnName = whereMatch[2];
        const value = whereMatch[3];
        
        // If the value matches a name-number pattern, or is just a number
        if (/^[A-Za-z]+-\d+$/.test(value) || /^\d+$/.test(value)) {
          // Find which table this column belongs to
          let tableName = "";
          
          // If there's a table alias in the WHERE clause
          if (tableAlias) {
            // Find the actual table name from the alias
            const aliasPattern = new RegExp(`\\b(\\w+)\\s+(?:AS\\s+)?${tableAlias}\\b`, 'i');
            const aliasMatch = query.match(aliasPattern);
            if (aliasMatch) {
              tableName = aliasMatch[1];
            }
          } 
          // If no alias or couldn't find the table name from alias
          if (!tableName) {
            // If there's only one table in the query, use that
            if (tableMatches.length === 1) {
              tableName = tableMatches[0][1] || tableMatches[0][2];
            } else {
              // Try to find tables that have this column
              const tablesWithColumn = schemaAnalysisService.findTableWithColumn(columnName);
              if (tablesWithColumn.length === 1) {
                tableName = tablesWithColumn[0];
              }
            }
          }
          
          // If we found the table, generate alternative queries
          if (tableName) {
            const altQueries = schemaAnalysisService.generateAlternativeQueries(
              query, tableName, columnName, value
            );
            
            // Add all alternative queries except the original (which is already being tried)
            alternativeQueries.push(...altQueries.slice(1));
          }
        }
      }
      
      return alternativeQueries;
    } catch (error) {
      console.error("Error generating alternative queries:", error);
      return []; // Return empty array if there's an error
    }
  }
}

/**
 * Database Schema Tool - provides information about database tables and structure
 * Enhanced with schemaAnalysisService for richer schema understanding
 */
class DatabaseSchemaTool extends StructuredTool {
  name = "get_database_schema";
  description = "Get comprehensive information about the database schema, tables, relationships, and data patterns";
  schema = z.object({
    tableName: z.string().optional().describe("Optional table name to get specific schema information"),
    includeExamples: z.boolean().optional().describe("Whether to include sample data and examples in the response")
  });
  
  async _call(input: { tableName?: string, includeExamples?: boolean }): Promise<string> {
    try {
      // Import schemaAnalysisService dynamically to avoid circular dependencies
      const { schemaAnalysisService } = await import('./schemaAnalysisService');
      
      // Check if the schema analysis service is initialized
      if (!schemaAnalysisService.isInitialized()) {
        console.log('Schema analysis service not initialized, initializing now...');
        await schemaAnalysisService.initialize();
      }
      
      let schemaInfo = "";
      
      // If a specific table is requested
      if (input.tableName) {
        // Get enriched table metadata from schema analysis service
        const tableMetadata = schemaAnalysisService.getTableMetadata(input.tableName);
        
        if (!tableMetadata) {
          // Fall back to basic schema info if the table is not in the analysis service
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
          
          return schemaInfo;
        }
        
        // Generate enhanced schema information
        schemaInfo = `Table: ${tableMetadata.name} (${tableMetadata.rowCount} rows)\n\n`;
        
        // Column information with enriched metadata
        schemaInfo += "Columns:\n";
        for (const column of tableMetadata.columns) {
          // Formatted column info with key details
          const flags = [];
          if (column.isPrimaryKey) flags.push("PRIMARY KEY");
          if (column.isForeignKey) flags.push("FOREIGN KEY");
          if (!column.isNullable) flags.push("NOT NULL");
          
          const flagsText = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
          schemaInfo += `- ${column.name} (${column.dataType})${flagsText}\n`;
          schemaInfo += `  Description: ${column.description}\n`;
          
          // Add field patterns if identified
          if (column.valueFormats.length > 0) {
            schemaInfo += `  Format: ${column.valueFormats.join(", ")}\n`;
          }
          
          // Only include examples if specifically requested to avoid over-verbose responses
          if (input.includeExamples && column.examples.length > 0) {
            schemaInfo += `  Examples: ${column.examples.slice(0, 3).join(", ")}\n`;
          }
          
          // Add statistics if available
          if (column.distinctValueCount !== undefined) {
            schemaInfo += `  Distinct values: ${column.distinctValueCount}\n`;
          }
          
          // Add range info for numeric columns
          if (column.minValue !== undefined && column.maxValue !== undefined) {
            schemaInfo += `  Range: ${column.minValue} to ${column.maxValue}\n`;
          }
        }
        
        // Relationship information
        if (tableMetadata.relationships.length > 0) {
          schemaInfo += "\nRelationships:\n";
          for (const rel of tableMetadata.relationships) {
            schemaInfo += `- ${rel.relationType.toUpperCase()} relationship with ${rel.targetTable}\n`;
            schemaInfo += `  ${tableMetadata.name}.${rel.sourceColumn} -> ${rel.targetTable}.${rel.targetColumn}\n`;
          }
        }
        
        // Sample data if requested
        if (input.includeExamples && tableMetadata.sampleData.length > 0) {
          schemaInfo += "\nSample Data (up to 3 rows):\n";
          const sampleRows = tableMetadata.sampleData.slice(0, 3);
          for (const [index, row] of sampleRows.entries()) {
            schemaInfo += `Row ${index + 1}:\n`;
            for (const column of tableMetadata.columns) {
              const value = row[column.name] !== undefined ? row[column.name] : 'NULL';
              schemaInfo += `  ${column.name}: ${value}\n`;
            }
          }
        }
        
        // Identifier field information
        const identifierFields = schemaAnalysisService.getIdentifierFields(input.tableName);
        if (identifierFields.length > 0) {
          schemaInfo += "\nIdentifier Fields:\n";
          schemaInfo += `- ${identifierFields.join(", ")}\n`;
          
          // Special case for clients table with its three identifier fields
          if (input.tableName === 'clients' && 
              tableMetadata.columns.some(c => c.name === 'name') &&
              tableMetadata.columns.some(c => c.name === 'unique_identifier') &&
              tableMetadata.columns.some(c => c.name === 'original_name')) {
            
            schemaInfo += "\nClient Identifier Pattern:\n";
            schemaInfo += "- The clients table uses a specific pattern with three related identifier fields:\n";
            schemaInfo += "  * original_name: Contains just the name portion (e.g., 'Radwan')\n";
            schemaInfo += "  * unique_identifier: Contains just the numeric ID (e.g., '585666')\n";
            schemaInfo += "  * name: Contains the combined format (e.g., 'Radwan-585666')\n\n";
            schemaInfo += "  When querying clients, if you search by one format but get no results,\n";
            schemaInfo += "  try the alternative formats. The system will automatically try these\n";
            schemaInfo += "  variations when possible.\n";
          }
          // Special cases for known identifier pattern issues in other tables
          else {
            for (const idField of identifierFields) {
              const column = tableMetadata.columns.find(c => c.name === idField);
              if (column && column.valueFormats.includes('name-number')) {
                schemaInfo += `  Note: '${idField}' uses a name-number format (e.g., "Name-123456").\n`;
                schemaInfo += `  When querying, consider whether to use the full value (Name-123456) or just the number part (123456).\n`;
                
                if (idField === 'name' && tableMetadata.columns.some(c => c.name === 'unique_identifier')) {
                  schemaInfo += `  Important: The 'name' field may store the full pattern (e.g., "Radwan-585666"),\n`;
                  schemaInfo += `  while 'unique_identifier' may store only the number part (e.g., "585666").\n`;
                }
              }
            }
          }
        }
      } else {
        // No specific table requested, provide overview of all tables
        const fullSchema = schemaAnalysisService.getFullSchema();
        
        if (fullSchema.size === 0) {
          // Fall back to basic table list if schema analysis hasn't processed tables
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
          return schemaInfo;
        }
        
        // Generate enhanced schema overview
        schemaInfo = "Database Schema Overview:\n\n";
        
        // Group tables by domain based on name patterns
        const domains: Record<string, string[]> = {
          'Client Data': [],
          'Clinical': [],
          'Financial': [],
          'Session': [],
          'Other': []
        };
        
        for (const [tableName, metadata] of fullSchema.entries()) {
          if (tableName.includes('client') || tableName.includes('ally')) {
            domains['Client Data'].push(tableName);
          } else if (tableName.includes('goal') || tableName.includes('clinician') || tableName.includes('strategies')) {
            domains['Clinical'].push(tableName);
          } else if (tableName.includes('budget') || tableName.includes('fund')) {
            domains['Financial'].push(tableName);
          } else if (tableName.includes('session') || tableName.includes('note')) {
            domains['Session'].push(tableName);
          } else {
            domains['Other'].push(tableName);
          }
        }
        
        // List tables by domain with brief descriptions
        for (const [domain, tables] of Object.entries(domains)) {
          if (tables.length === 0) continue;
          
          schemaInfo += `${domain}:\n`;
          for (const tableName of tables) {
            const metadata = fullSchema.get(tableName);
            if (metadata) {
              // Count relationships
              const relationshipCount = metadata.relationships.length;
              const relationshipInfo = relationshipCount > 0 ? ` (${relationshipCount} relationships)` : '';
              
              // Find some key columns
              const keyColumns = metadata.columns
                .filter(c => c.isPrimaryKey || c.isForeignKey || c.name.includes('name') || c.name.includes('id'))
                .map(c => c.name)
                .slice(0, 3);
              
              schemaInfo += `- ${tableName} (${metadata.rowCount} rows)${relationshipInfo}\n`;
              if (keyColumns.length > 0) {
                schemaInfo += `  Key columns: ${keyColumns.join(', ')}\n`;
              }
            }
          }
          schemaInfo += '\n';
        }
        
        // Highlight important known issues with identifiers
        schemaInfo += 'Important Identifier Patterns:\n';
        
        // Special highlight for clients table identifiers
        schemaInfo += '- The clients table uses three related identifier fields:\n';
        schemaInfo += '  * original_name: Contains just the name (e.g., "Radwan")\n';
        schemaInfo += '  * unique_identifier: Contains just the number (e.g., "585666")\n';
        schemaInfo += '  * name: Contains the combined format (e.g., "Radwan-585666")\n\n';
        
        // General guidance for other tables
        schemaInfo += '- Other tables may use compound identifiers (e.g., "Name-123456")\n';
        schemaInfo += '- When querying by identifier, if you get no results, try alternative formats\n';
        schemaInfo += '- The system will automatically try to use the correct format when possible\n\n';
        
        schemaInfo += "Use this tool with a specific tableName parameter to get detailed information about a table.";
      }
      
      return schemaInfo;
    } catch (error: any) {
      console.error("Error retrieving database schema:", error);
      return `Error retrieving database schema: ${error.message || 'Unknown error'}`;
    }
  }
}

/**
 * Natural Language Query Tool - converts natural language to SQL with validation
 */
class NaturalLanguageQueryTool extends StructuredTool {
  name = "natural_language_to_sql";
  description = "Convert a natural language question about clinical data into a SQL query, execute it, and return the results. Use this for questions about client data, goals, sessions, etc.";
  schema = z.object({
    question: z.string().describe("The natural language question to convert to SQL")
  });
  
  constructor(private executeQueryFn: (query: string) => Promise<QueryResult>) {
    super();
  }
  
  async _call(input: { question: string } | string): Promise<string> {
    // Handle both object and string inputs for more flexibility
    const question = typeof input === 'string' ? input : input.question;
    try {
      console.log(`Converting natural language to SQL: "${question}"`);
      
      // Import the SQL Query Generation Service
      const { sqlQueryGenerationService } = await import('./sqlQueryGenerationService');
      const { schemaAnalysisService } = await import('./schemaAnalysisService');
      
      // Generate a SQL query from the natural language question using the two-phase approach
      const generationResult = await sqlQueryGenerationService.generateQuery({
        question: question
      });
      
      if (!generationResult.success || !generationResult.query) {
        return `I couldn't generate a valid SQL query for your question. ${generationResult.errorMessage || ''}
        
Here's why I struggled:
${generationResult.reasoning}

Could you please rephrase your question or provide more details?`;
      }
      
      console.log(`Generated SQL query: ${generationResult.query}`);
      
      // Execute the generated query
      try {
        // Use the executeQueryFn property that was passed in the constructor
        const result = await this.executeQueryFn(generationResult.query);
        
        if (result.rows.length === 0) {
          // Special handling for client names and identifiers - check if this is about clients
          const isClientQuery = 
            question.toLowerCase().includes('client') ||
            question.toLowerCase().match(/name.*radwan|radwan.*name/) ||
            generationResult.query.toLowerCase().includes('clients');
            
          if (isClientQuery) {
            // Check for client identifier patterns
            let possibleClientIdentifier = null;
            
            // Extract possible client name from the query
            const nameMatch = question.match(/client(?:s)?\s+(?:named|called|with\s+(?:the\s+)?name)\s+['"]?([a-zA-Z0-9_\-]+)['"]?/i);
            if (nameMatch && nameMatch[1]) {
              possibleClientIdentifier = nameMatch[1];
            }
            
            // Also check for simple name patterns
            const simpleNameMatch = question.match(/['"]?([a-zA-Z0-9_\-]+)['"]?/);
            if (simpleNameMatch && simpleNameMatch[1] && !possibleClientIdentifier) {
              // Only use this if it's plausibly a name (not a common word)
              const potentialName = simpleNameMatch[1];
              if (potentialName.length > 3 && !['have', 'client', 'name', 'with', 'find'].includes(potentialName.toLowerCase())) {
                possibleClientIdentifier = potentialName;
              }
            }
            
            // If we found a potential client identifier, try alternative query strategies
            if (possibleClientIdentifier) {
              console.log(`Trying fallback strategies for client identifier: ${possibleClientIdentifier}`);
              
              // Try different identifier patterns
              const fallbackQueries: string[] = [];
              
              // Try original_name (just the name part)
              fallbackQueries.push(`SELECT * FROM clients WHERE original_name ILIKE '%${possibleClientIdentifier}%'`);
              
              // Try unique_identifier (numeric part) if it looks like a number
              if (!isNaN(Number(possibleClientIdentifier))) {
                fallbackQueries.push(`SELECT * FROM clients WHERE unique_identifier = '${possibleClientIdentifier}'`);
              }
              
              // Try name field with wildcards (combined format)
              fallbackQueries.push(`SELECT * FROM clients WHERE name ILIKE '%${possibleClientIdentifier}%'`);
              
              // Try each query strategy
              for (const fallbackQuery of fallbackQueries) {
                try {
                  console.log(`Trying fallback query: ${fallbackQuery}`);
                  const fallbackResult = await this.executeQueryFn(fallbackQuery);
                  
                  if (fallbackResult.rows.length > 0) {
                    // We found results with a fallback strategy!
                    return `Yes, I found ${fallbackResult.rows.length} client(s) related to "${possibleClientIdentifier}" using an alternative search strategy.

Here's what I found:
\`\`\`
${fallbackResult.rows.slice(0, 5).map(client => 
  `ID: ${client.id}, Name: ${client.name}, Status: ${client.onboarding_status}`
).join('\n')}
${fallbackResult.rows.length > 5 ? `\n...and ${fallbackResult.rows.length - 5} more` : ''}
\`\`\`

Note: I had to search across different client identifier fields to find these results. The clients' "name" field contains the combined format (e.g., "Radwan-585666"), while the "original_name" field contains just the name part.`;
                  }
                } catch (fallbackError) {
                  console.error(`Error in fallback query:`, fallbackError);
                  // Continue to the next fallback query
                }
              }
            }
          }
          
          // If we reach here, even fallback strategies didn't work
          return `I generated a SQL query based on your question, but it didn't return any results. This could mean one of three things:
          
1. The data you're looking for doesn't exist in the database
2. The names or identifiers in your question might be slightly different from what's in the database
3. Your question might need to be more specific

Here's the query I tried:
\`\`\`sql
${generationResult.query}
\`\`\`

My reasoning process:
${generationResult.reasoning}

Could you try rephrasing your question or be more specific about what you're looking for?`;
        }
        
        // Format result as a markdown table for better readability
        let formattedResult = "Here are the results based on your question:\n\n```\n";
        
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
        
        // Add information about how the query was generated
        formattedResult += `\n\nI answered this by converting your question into a SQL query and running it against the database.`;
        
        return formattedResult;
      } catch (error: any) {
        console.error("Error executing generated query:", error);
        return `I created a SQL query based on your question, but encountered an error when executing it: ${error.message || 'Unknown error'}.
        
Here's the query I generated:
\`\`\`sql
${generationResult.query}
\`\`\`

My reasoning process:
${generationResult.reasoning}

Could you try rephrasing your question to be more specific?`;
      }
    } catch (error: any) {
      console.error("Error in natural language to SQL conversion:", error);
      return `I encountered an error while trying to convert your question to SQL: ${error.message || 'Unknown error'}.
      
Could you please rephrase your question or be more specific?`;
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
      
      // Import and initialize SQL Query Generation Service
      const { sqlQueryGenerationService } = await import('./sqlQueryGenerationService');
      if (!sqlQueryGenerationService.isInitialized()) {
        await sqlQueryGenerationService.initialize(config.apiKey, config.model);
      }
      
      this.tools = [
        // Standard SQL query tool
        new SQLQueryTool(queryFunction),
        
        // Schema information tool
        new DatabaseSchemaTool(),
        
        // Client records tool
        new ClinicalRecordsTool(),
        
        // Advanced natural language to SQL tool with two-phase validation
        new NaturalLanguageQueryTool(queryFunction)
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
      
      try {
        // Execute the agent with the query and context
        const result = await this.executor.invoke({
          input: message,
          context: memoryContext.combinedContext || ''
        });
        
        return result.output;
      } catch (agentError: any) {
        // If we get a schema validation error, try a more direct approach
        if (agentError.message?.includes('schema')) {
          console.log('Schema validation error detected, trying direct SQL generation');
          
          // Use SQL query generation service directly
          const { sqlQueryGenerationService } = await import('./sqlQueryGenerationService');
          
          const sqlResult = await sqlQueryGenerationService.generateQuery({
            question: message
          });
          
          if (sqlResult.success && sqlResult.query) {
            // Execute the query
            console.log('Generated raw SQL query:', sqlResult.query);
            
            try {
              const result = await this.executeQuery(sqlResult.query);
              
              // Format the result in a readable way
              let response: string;
              
              if (result.rows.length === 0) {
                response = `I couldn't find any data matching your query about "${message}". Would you like to refine your search?`;
              } else {
                response = `Here's what I found about "${message}":\n\n${JSON.stringify(result.rows, null, 2)}`;
              }
              
              return response;
            } catch (sqlError: any) {
              return `I tried to generate SQL for your question, but encountered an error executing it: ${sqlError.message}. Could you please rephrase your question?`;
            }
          } else {
            return `I tried to generate SQL for your question, but couldn't create a valid query: ${sqlResult.errorMessage || 'Unknown error'}. Could you please rephrase your question?`;
          }
        }
        
        // For other types of errors, rethrow
        throw agentError;
      }
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