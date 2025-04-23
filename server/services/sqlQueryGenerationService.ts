/**
 * SQL Query Generation Service
 * 
 * This service implements a two-phase approach to SQL query generation:
 * 1. First phase: Generate a candidate query based on the user's natural language question
 * 2. Second phase: Validate the query against schema knowledge and sample results
 * 3. If validation fails, refine the query with different matching strategies
 */

import { ChatOpenAI } from "@langchain/openai";
import { sql } from "../db";
import { QueryResult, QueryGenerationRequest, QueryGenerationResult } from "@shared/assistantTypes";
import { schemaAnalysisService } from "./schemaAnalysisService";

/**
 * SQL Query Generation Service class
 */
export class SQLQueryGenerationService {
  private initialized = false;
  private llm: ChatOpenAI | null = null;
  private apiKey: string | null = null;
  private model = "gpt-4o";
  private temperature = 0.1; // Lower temperature for more deterministic SQL generation
  
  /**
   * Initialize the service
   */
  async initialize(apiKey: string, model?: string): Promise<void> {
    try {
      this.apiKey = apiKey;
      
      if (model) {
        this.model = model;
      }
      
      // Initialize LLM for SQL generation
      this.llm = new ChatOpenAI({
        openAIApiKey: this.apiKey,
        modelName: this.model,
        temperature: this.temperature
      });
      
      // Initialize schema analysis service if not already initialized
      if (!schemaAnalysisService.isInitialized()) {
        await schemaAnalysisService.initialize();
      }
      
      this.initialized = true;
      console.log(`SQL Query Generation Service initialized with model: ${this.model}`);
    } catch (error) {
      console.error('Failed to initialize SQL Query Generation Service:', error);
      throw new Error('Failed to initialize SQL Query Generation Service');
    }
  }
  
  /**
   * Generate a SQL query from a natural language question using a two-phase approach
   */
  async generateQuery(request: QueryGenerationRequest): Promise<QueryGenerationResult> {
    if (!this.initialized || !this.llm) {
      throw new Error('SQL Query Generation Service not initialized');
    }
    
    try {
      // Phase 1: Generate a candidate query
      const initialResult = await this.generateInitialQuery(request);
      
      if (!initialResult.success) {
        return initialResult;
      }
      
      // Phase 2: Validate and refine the query
      return await this.validateAndRefineQuery(initialResult.query, request);
    } catch (error: any) {
      console.error('Error generating SQL query:', error);
      return {
        query: '',
        reasoning: '',
        success: false,
        errorMessage: `Error generating SQL query: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Phase 1: Generate an initial candidate query from the natural language question
   */
  private async generateInitialQuery(request: QueryGenerationRequest): Promise<QueryGenerationResult> {
    try {
      // Get schema description to provide context for query generation
      const schemaDescription = schemaAnalysisService.getSchemaDescription();
      
      // Construct prompt for SQL generation
      const systemMessage = `You are an expert SQL query generator that converts natural language questions into PostgreSQL queries.
Follow these guidelines strictly:
1. Only generate a single PostgreSQL SQL query that answers the question.
2. Make sure the SQL query is syntactically correct and will work in PostgreSQL.
3. Use only tables and fields that exist in the schema.
4. Use appropriate joins, filters, and sorting as needed.
5. Handle special cases like client identifiers carefully:
   - The clients table has three related identifier fields:
   - original_name: Contains just the name part (e.g., 'Radwan')
   - unique_identifier: Contains just the numeric ID (e.g., '585666')
   - name: Contains the combined format (e.g., 'Radwan-585666')
6. Structure your response in JSON format with these fields:
   - query: The complete SQL query
   - reasoning: Your step-by-step explanation of how you created the query

Here is the database schema:
${schemaDescription}`;

      // Add any additional context
      const userMessage = `Generate a PostgreSQL query to answer this question: "${request.question}"
${request.context ? `\nAdditional context: ${request.context}` : ''}`;

      // Generate the initial query
      const response = await this.llm.invoke([
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ]);
      
      // Extract query and reasoning from the response
      let queryResult: { query: string; reasoning: string };
      try {
        // Try to parse JSON response
        const content = response.content.toString();
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonContent = content.substring(jsonStart, jsonEnd + 1);
          queryResult = JSON.parse(jsonContent);
        } else {
          // If not JSON, try to extract query using pattern matching
          const queryMatch = content.match(/```sql\s*([\s\S]*?)\s*```/);
          const query = queryMatch ? queryMatch[1].trim() : '';
          
          queryResult = {
            query,
            reasoning: content.replace(/```sql\s*[\s\S]*?\s*```/, '')
          };
        }
      } catch (error) {
        console.error('Error parsing LLM response:', error);
        // Fallback to treating the entire response as the query
        queryResult = {
          query: response.content.toString(),
          reasoning: 'Unable to extract reasoning.'
        };
      }
      
      if (!queryResult.query) {
        return {
          query: '',
          reasoning: queryResult.reasoning || '',
          success: false,
          errorMessage: 'Failed to generate a valid SQL query'
        };
      }
      
      // Clean up the query
      const cleanQuery = queryResult.query.replace(/```sql|```/g, '').trim();
      
      return {
        query: cleanQuery,
        reasoning: queryResult.reasoning || '',
        success: true
      };
    } catch (error: any) {
      console.error('Error in initial query generation:', error);
      return {
        query: '',
        reasoning: '',
        success: false,
        errorMessage: `Error in initial query generation: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Phase 2: Validate and refine the query if needed
   */
  private async validateAndRefineQuery(initialQuery: string, request: QueryGenerationRequest): Promise<QueryGenerationResult> {
    try {
      // Try to execute the query to validate it
      let result: QueryResult;
      try {
        // Run the query with a low row limit for validation
        const validationQuery = this.addRowLimit(initialQuery, 5);
        result = await this.executeQuery(validationQuery);
      } catch (error: any) {
        // Query execution failed, try to refine it
        console.error('Initial query execution failed:', error);
        return await this.refineQuery(initialQuery, error.message, request);
      }
      
      // If query returned no results, try to refine it
      if (result.rows.length === 0) {
        console.log('Initial query returned no results, attempting refinement');
        return await this.refineQuery(initialQuery, 'Query returned no results', request);
      }
      
      // Query executed successfully and returned results
      return {
        query: initialQuery,
        reasoning: 'Query validated and executed successfully.',
        success: true
      };
    } catch (error: any) {
      console.error('Error in query validation phase:', error);
      return {
        query: initialQuery,
        reasoning: '',
        success: false,
        errorMessage: `Error validating query: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Refine a query that failed validation
   */
  private async refineQuery(originalQuery: string, errorMessage: string, request: QueryGenerationRequest): Promise<QueryGenerationResult> {
    // Prevent infinite refinement loops
    const attemptCount = request.attemptCount || 0;
    if (attemptCount >= 3) {
      return {
        query: originalQuery,
        reasoning: 'Maximum refinement attempts reached.',
        success: false,
        errorMessage: 'Failed to generate a working query after multiple attempts'
      };
    }
    
    try {
      // Get schema suggestions specifically for this query
      const schemaSuggestions = schemaAnalysisService.getSchemaSuggestionsForQuery(originalQuery);
      
      // Extract table names from the query for better context
      const tablePattern = /\bFROM\s+(\w+)|JOIN\s+(\w+)/gi;
      const tableMatches = Array.from(originalQuery.matchAll(tablePattern));
      const mentionedTables = new Set<string>();
      
      tableMatches.forEach(match => {
        const tableName = match[1] || match[2];
        if (tableName) mentionedTables.add(tableName);
      });
      
      // Get detailed schema info for mentioned tables
      let tableSchemaInfo = '';
      for (const tableName of Array.from(mentionedTables)) {
        const tableMetadata = schemaAnalysisService.getTableMetadata(tableName);
        if (tableMetadata) {
          tableSchemaInfo += `Table: ${tableName}\n`;
          tableSchemaInfo += `Columns: ${tableMetadata.columns.map(c => c.name).join(', ')}\n`;
          
          // Add special notes for client identifier fields
          if (tableName === 'clients') {
            tableSchemaInfo += `Note: The clients table has special identifier fields:\n`;
            tableSchemaInfo += `- name: Combined format (e.g., "Radwan-585666")\n`;
            tableSchemaInfo += `- unique_identifier: Just the numeric part (e.g., "585666")\n`;
            tableSchemaInfo += `- original_name: Just the name part (e.g., "Radwan")\n`;
          }
        }
      }
      
      // Construct prompt for query refinement
      const systemMessage = `You are an expert SQL query debugger and refiner.
Your task is to fix a SQL query that failed validation. Follow these guidelines:
1. Identify the problem in the original query
2. Apply the necessary fixes to make the query work
3. Pay special attention to table and column names
4. Consider identifier fields carefully, especially in the clients table
5. Structure your response in JSON format with these fields:
   - query: The refined SQL query
   - reasoning: Your detailed explanation of what was wrong and how you fixed it`;

      const userMessage = `The following SQL query failed with this error: "${errorMessage}"

Original query:
${originalQuery}

Here is schema information about the tables used in the query:
${tableSchemaInfo}

Schema suggestions:
${schemaSuggestions}

Please fix the query to work correctly with our database.`;

      // Generate the refined query
      const response = await this.llm.invoke([
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ]);
      
      // Extract refined query from the response
      let refinedResult: { query: string; reasoning: string };
      try {
        // Try to parse JSON response
        const content = response.content.toString();
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonContent = content.substring(jsonStart, jsonEnd + 1);
          refinedResult = JSON.parse(jsonContent);
        } else {
          // If not JSON, try to extract query using pattern matching
          const queryMatch = content.match(/```sql\s*([\s\S]*?)\s*```/);
          const query = queryMatch ? queryMatch[1].trim() : '';
          
          refinedResult = {
            query: query || content,
            reasoning: content.replace(/```sql\s*[\s\S]*?\s*```/, '')
          };
        }
      } catch (error) {
        console.error('Error parsing LLM refinement response:', error);
        // Fallback to treating the entire response as the query
        refinedResult = {
          query: response.content.toString(),
          reasoning: 'Unable to extract reasoning from refinement response.'
        };
      }
      
      // Clean up the query
      const cleanRefinedQuery = refinedResult.query.replace(/```sql|```/g, '').trim();
      
      if (!cleanRefinedQuery || cleanRefinedQuery === originalQuery) {
        return {
          query: originalQuery,
          reasoning: refinedResult.reasoning || '',
          success: false,
          errorMessage: 'Failed to refine the query'
        };
      }
      
      // Recursively validate the refined query
      return await this.validateAndRefineQuery(
        cleanRefinedQuery,
        {
          ...request,
          attemptCount: attemptCount + 1
        }
      );
    } catch (error: any) {
      console.error('Error in query refinement:', error);
      return {
        query: originalQuery,
        reasoning: '',
        success: false,
        errorMessage: `Error refining query: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Execute a SQL query for validation
   */
  private async executeQuery(query: string): Promise<QueryResult> {
    // First check if this is a client query that needs enhancement
    const enhancedQuery = this.enhanceClientQueryIfNeeded(query);
    const queryToExecute = enhancedQuery || query;
    
    const startTime = Date.now();
    const result = await sql.unsafe(queryToExecute);
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
        queryText: queryToExecute,
        originalQuery: enhancedQuery ? query : undefined
      }
    };
  }
  
  /**
   * Enhance client queries to handle multiple client identifier fields
   */
  private enhanceClientQueryIfNeeded(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    // Only process if this is a query on the clients table
    if (!lowerQuery.includes('clients') && !lowerQuery.includes(' c ')) {
      return null;
    }
    
    // Check if this is a query trying to find clients by name
    const clientNameRegex = /where\s+(?:clients\.|c\.)?(?:name|original_name|unique_identifier)\s*=\s*['"]([^'"]+)['"]/i;
    const match = query.match(clientNameRegex);
    
    if (!match) {
      return null;
    }
    
    // Get the client identifier value
    const clientValue = match[1];
    
    // Don't enhance if it's already a complex query using multiple conditions
    if (lowerQuery.includes(' or ') && lowerQuery.includes('original_name') && 
        lowerQuery.includes('unique_identifier')) {
      return null;
    }
    
    console.log(`Enhancing client query for identifier: ${clientValue}`);
    
    try {
      // Extract table alias if present
      const aliasMatch = query.match(/from\s+clients(?:\s+as)?\s+([a-z])/i);
      const tablePrefix = aliasMatch ? `${aliasMatch[1]}.` : 'clients.';
      
      // Determine where clause position
      const wherePos = lowerQuery.indexOf('where');
      if (wherePos === -1) {
        return null;
      }
      
      // Extract the entire WHERE clause
      const whereClause = query.substring(wherePos);
      
      // Create enhanced condition using OR with all client identifier fields
      let enhancedCondition = `WHERE (${tablePrefix}name = '${clientValue}' OR ` +
                              `${tablePrefix}name LIKE '%${clientValue}%' OR ` +
                              `${tablePrefix}original_name = '${clientValue}' OR ` +
                              `${tablePrefix}original_name LIKE '%${clientValue}%'`;
      
      // If client value has hyphen, split it for possible name-id format
      if (clientValue.includes('-')) {
        const [namePart, idPart] = clientValue.split('-');
        enhancedCondition += ` OR ${tablePrefix}original_name = '${namePart}' OR ` +
                             `${tablePrefix}unique_identifier = '${idPart}'`;
      } else if (/^\d+$/.test(clientValue)) {
        // If it's just a number, check unique_identifier
        enhancedCondition += ` OR ${tablePrefix}unique_identifier = '${clientValue}'`;
      }
      
      enhancedCondition += ')';
      
      // Replace the original WHERE clause
      const enhancedQuery = query.substring(0, wherePos) + enhancedCondition + 
                         whereClause.substring(whereClause.indexOf(' ', 6));
      
      console.log(`Original query: ${query}`);
      console.log(`Enhanced query: ${enhancedQuery}`);
      
      return enhancedQuery;
    } catch (error) {
      console.error('Error enhancing client query:', error);
      return null; // Return null to use original query if enhancement fails
    }
  }
  
  /**
   * Add a row limit to a query for validation purposes
   */
  private addRowLimit(query: string, limit: number): string {
    const upperQuery = query.toUpperCase();
    
    // Only add LIMIT to SELECT queries that don't already have a limit
    if (!upperQuery.includes('LIMIT ') && upperQuery.includes('SELECT ')) {
      // Simple case - add LIMIT to the end
      return query.trim().replace(/;$/, '') + ` LIMIT ${limit};`;
    }
    
    return query;
  }
  
  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
export const sqlQueryGenerationService = new SQLQueryGenerationService();