/**
 * Clinician Assistant Service
 * 
 * This service provides the main functionality for the Clinician Assistant,
 * coordinating between LangChain, conversation management, and SQL query execution.
 */

import { OpenAIConfig } from './openaiService';
import { openaiService } from './openaiService';
import { conversationService } from './conversationService';
import { sqlQueryGenerator, SQLQueryResult } from './sqlQueryGenerator';
import { drizzleQueryGenerator, DrizzleQueryResult } from './drizzleQueryGenerator';
import { schemaProvider } from './schemaProvider';
import { ChatMessage } from './openaiService';
import { Message, AssistantStatusResponse, AssistantConfig, QueryResult } from '@shared/assistantTypes';
import { langchainService, LangChainConfig } from './langchainService';

/**
 * Clinician Assistant Service class
 */
export class ClinicianAssistantService {
  private initialized: boolean = false;
  
  /**
   * Initialize the assistant
   */
  async initialize(): Promise<void> {
    try {
      // Only initialize schema provider if not already initialized
      if (!this.initialized) {
        await schemaProvider.initialize();
        
        // Check if OpenAI API key exists in environment variables
        const envApiKey = process.env.OPENAI_API_KEY;
        
        if (envApiKey) {
          // If we have an API key in environment variables, use it to configure the assistant
          this.configureAssistant({
            apiKey: envApiKey,
            model: 'gpt-4o', // Default to the latest model
            temperature: 0.7  // Default temperature
          });
          console.log('Clinician Assistant configured using API key from environment');
        } else {
          // Otherwise, check if we have a previously saved configuration
          const config = openaiService.getConfig();
          if (config) {
            this.configureAssistant({
              apiKey: config.apiKey,
              model: config.model,
              temperature: config.temperature
            });
          }
        }
        
        this.initialized = true;
        console.log('Clinician Assistant Service initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Clinician Assistant Service:', error);
      throw new Error('Failed to initialize Clinician Assistant Service');
    }
  }
  
  /**
   * Configure the assistant with OpenAI API settings
   */
  configureAssistant(config: AssistantConfig): void {
    // Initialize both services (keeping OpenAI for backward compatibility)
    const openAIConfig: OpenAIConfig = {
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature
    };
    
    const langChainConfig: LangChainConfig = {
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature
    };
    
    openaiService.initialize(openAIConfig);
    
    // Initialize LangChain with Drizzle query execution function
    langchainService.initialize(
      langChainConfig, 
      async (query: string) => {
        // Check if the query is a Drizzle query or a fallback SQL query
        if (query.includes('db.select') || query.includes('db.query')) {
          // This is a Drizzle ORM query
          const result = await drizzleQueryGenerator.executeRawQuery(query);
          return result;
        } else {
          // Fallback to SQL query for backward compatibility
          const result = await sqlQueryGenerator.executeRawQuery(query);
          return result;
        }
      }
    );
  }
  
  /**
   * Get the current status of the assistant
   */
  getStatus(): AssistantStatusResponse {
    // Check if API key is present in environment
    const envApiKey = process.env.OPENAI_API_KEY;
    
    // Prefer LangChain status if available, fall back to OpenAI
    const isServiceConfigured = langchainService.isConfigured() || openaiService.isConfigured();
    
    // Consider configured if either service is configured OR we have an API key in environment
    const isConfigured = isServiceConfigured || !!envApiKey;
    
    const config = langchainService.isConfigured() 
      ? langchainService.getConfig() 
      : openaiService.getConfig();
    
    return {
      isConfigured,
      connectionValid: isConfigured, // Will be tested separately
      model: config?.model || (envApiKey ? 'gpt-4o' : 'Not configured')
    };
  }
  
  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<boolean> {
    // Prefer LangChain, fall back to direct OpenAI
    if (langchainService.isConfigured()) {
      return await langchainService.testConnection();
    }
    return await openaiService.testConnection();
  }
  
  /**
   * Send a message to the assistant and get a response
   */
  async processMessage(conversationId: string, messageContent: string): Promise<Message | null> {
    try {
      // Validate conversation exists
      const conversation = await conversationService.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
      
      // Add the user message to the conversation
      const userMessage = await conversationService.addMessage(conversationId, 'user', messageContent);
      if (!userMessage) {
        throw new Error('Failed to add user message to conversation');
      }
      
      // Get message history for context
      const messageHistory = await conversationService.getMessageHistory(conversationId);
      
      // Extract recent messages for context (limit to last 10 for performance)
      const recentMessages = messageHistory
        .slice(-10)
        .map((msg: Message) => ({
          role: msg.role,
          content: msg.content
        }));
      
      // Create the system message/prompt
      const systemPrompt = `
        You are a helpful assistant for speech therapists at a clinic. 
        You can help answer questions about clients, sessions, budgets, goals, and other clinical data.
        
        When a user asks you questions about data, you should:
        1. Generate a Drizzle ORM query in TypeScript to retrieve the data
        2. Execute the query to get the data
        3. Provide a helpful and concise response based on the data
        
        Always be professional, supportive, and objective. Format numerical data clearly.
        Don't make up information - if you don't know, say so.
        
        IMPORTANT DOMAIN CONCEPTS:
        - "Active clients" in this system are defined as clients with onboarding_status = 'complete'
        - Clients with onboarding_status = 'pending' or 'incomplete' are not considered active
        - Clinicians are the staff members/therapists who work with clients
        
        The database contains the following tables (accessible through the schema namespace):
        - schema.clients: Information about therapy clients (id, name, date_of_birth, onboarding_status, etc.)
        - schema.clinicians: Information about clinical staff/therapists (id, name, title, email, etc.)
        - schema.clientClinicians: Links clients to their assigned clinicians (clientId, clinicianId, role)
        - schema.goals: Therapy goals for clients (id, clientId, title, description, status, etc.)
        - schema.subgoals: Detailed subgoals associated with main goals (id, goalId, title, status, etc.)
        - schema.sessions: Therapy sessions (id, clientId, date, status, etc.)
        - schema.sessionNotes: Notes from therapy sessions (id, sessionId, notes, etc.)
        - schema.budgetSettings: Budget configuration for clients (id, clientId, settings, etc.)
        - schema.budgetItems: Individual budget line items (id, budgetSettingsId, productCode, etc.)
        - schema.strategies: Therapy strategies and approaches (id, title, description, etc.)
        - schema.allies: Contains information about client allies like parents/caregivers (id, clientId, name, etc.)
        
        DRIZZLE ORM QUERY EXAMPLES:
        - To find all active clients:
          db.select().from(schema.clients).where(eq(schema.clients.active, true)).limit(100)
          
        - To count sessions per client:
          db.select({
            clientId: schema.sessions.clientId,
            clientName: schema.clients.name,
            sessionCount: count()
          })
          .from(schema.sessions)
          .innerJoin(schema.clients, eq(schema.sessions.clientId, schema.clients.id))
          .groupBy(schema.sessions.clientId, schema.clients.name)
          .limit(100)
          
        - To find recent sessions with limit:
          db.select().from(schema.sessions).orderBy(desc(schema.sessions.sessionDate)).limit(10)
          
        Always include a limit in your queries and use proper Drizzle ORM syntax.
      `;
      
      let responseContent = '';
      
      // Check if we should use LangChain or fall back to direct OpenAI
      if (langchainService.isConfigured()) {
        // First, determine if this is a data-related question
        const isDataQuestion = await langchainService.isDataRelatedQuestion(messageContent);
        
        if (isDataQuestion) {
          // For data questions, we need to handle Drizzle query generation and execution
          const query = await drizzleQueryGenerator.generateQuery(messageContent);
          const result = await drizzleQueryGenerator.executeQuery(query);
          
          // Generate the query context for LangChain with enhanced error handling
          let queryContext;
          
          if (result.error) {
            // For error cases, provide specific guidance based on error type
            queryContext = `
              I executed the following Drizzle ORM query:
              \`\`\`typescript
              ${result.query}
              \`\`\`
              
              The query encountered an error: ${result.error}
              
              Original technical error details: ${result.originalError || 'Unknown error'}
              
              Please provide a helpful response that:
              1. Acknowledges there was a problem getting the requested information
              2. Explains in simple terms what might have gone wrong (missing data, incorrect query parameters, etc.)
              3. Suggests how the user might rephrase their question or what information they might need to provide
              4. If appropriate, suggests alternative ways to get similar information
              
              Don't mention the query or technical details, focus on the user's original intent.
              Frame the response in a professional, supportive manner appropriate for clinical staff.
            `;
          } else if (result.data && result.data.length === 0) {
            // For empty result sets
            queryContext = `
              I executed the following Drizzle ORM query:
              \`\`\`typescript
              ${result.query}
              \`\`\`
              
              The query executed successfully in ${result.executionTime || 'unknown'}ms, but returned no data.
              
              Please provide a helpful response that:
              1. Informs the user that no matching information was found
              2. Suggests possible reasons for this (e.g., data might not exist, filters might be too restrictive)
              3. Suggests how they might broaden their search or check if the entities they're asking about exist
              
              Don't mention the query itself unless the user specifically asked about database implementation details.
            `;
          } else {
            // For successful queries with data
            queryContext = `
              I executed the following Drizzle ORM query:
              \`\`\`typescript
              ${result.query}
              \`\`\`
              
              The query executed successfully in ${result.executionTime || 'unknown'}ms and returned ${result.data.length} rows of data:
              ${JSON.stringify(result.data, null, 2)}
              
              Based on this data, provide a clear, well-structured response to the user's question.
              Highlight key insights or patterns if they exist.
              Format numerical data clearly (round to 2 decimal places where appropriate).
              Use proper clinical terminology given this is a speech therapy context.
              Don't mention the database query unless the user specifically asked about database implementation details.
            `;
          }
          
          // Use LangChain's processDataQuery with query context
          responseContent = await langchainService.processDataQuery(
            conversationId,
            messageContent,
            systemPrompt,
            queryContext
          );
        } else {
          // For regular conversational questions, use LangChain's conversation management
          responseContent = await langchainService.processConversation(
            conversationId,
            messageContent,
            systemPrompt,
            recentMessages
          );
        }
      } else {
        // Fallback to direct OpenAI if LangChain isn't configured
        // Create the OpenAI system message
        const systemMessage: ChatMessage = {
          role: 'system',
          content: systemPrompt
        };
        
        // First, try to understand if this is a data-related question
        const isDataQuestion = await this.isDataRelatedQuestion(messageContent);
        
        if (isDataQuestion) {
          // Generate Drizzle query
          const query = await drizzleQueryGenerator.generateQuery(messageContent);
          
          // Execute the query
          const result = await drizzleQueryGenerator.executeQuery(query);
          
          // Generate a response based on the query results
          const queryContext = `
            I executed the following Drizzle ORM query:
            \`\`\`typescript
            ${result.query}
            \`\`\`
            
            ${result.error 
              ? `The query failed with error: ${result.error}`
              : `The query returned ${result.data.length} rows of data: ${JSON.stringify(result.data, null, 2)}`
            }
            
            Based on this data, provide a clear, concise response to the user's question.
            If there was an error or no data, explain what might be the issue.
            Don't mention that you ran a database query unless the user specifically asked about database implementation details.
          `;
          
          // Generate response with query context
          responseContent = await openaiService.createChatCompletion([
            systemMessage,
            ...recentMessages,
            { role: 'user', content: queryContext }
          ]);
        } else {
          // For non-data questions, just use the conversation history
          responseContent = await openaiService.createChatCompletion([
            systemMessage,
            ...recentMessages
          ]);
        }
      }
      
      // Prepare query result data for visualization if this was a data question with results
      let queryResult: QueryResult | undefined = undefined;
      
      // Check if this is a data-related question
      const isDataQuestionResult = await this.isDataRelatedQuestion(messageContent);
      
      if (isDataQuestionResult) {
        try {
          // Generate the Drizzle query
          const query = await drizzleQueryGenerator.generateQuery(messageContent);
          // Execute the query
          const result = await drizzleQueryGenerator.executeQuery(query);
          
          if (!result.error && result.data && result.data.length > 0) {
            // Extract column names from the first result row
            const firstRow = result.data[0];
            const columns = Object.keys(firstRow);
            
            // Create the query result data structure
            queryResult = {
              columns,
              rows: result.data,
              metadata: {
                executionTime: result.executionTime,
                rowCount: result.data.length,
                queryText: result.query
              }
            };
          }
        } catch (error) {
          console.error('Error preparing query result data:', error);
          // Don't halt the process if visualization data preparation fails
        }
      }
      
      // Add assistant response to conversation with query result data
      return await conversationService.addMessage(
        conversationId, 
        'assistant', 
        responseContent,
        queryResult
      );
    } catch (error: any) {
      console.error('Error processing message:', error);
      
      // Add error message to conversation
      return await conversationService.addMessage(
        conversationId,
        'assistant',
        `I'm sorry, I encountered an error while processing your request: ${error.message}`
      );
    }
  }
  
  /**
   * Determine if a message is asking about data that would require SQL
   * (Fallback method for direct OpenAI mode)
   */
  private async isDataRelatedQuestion(message: string): Promise<boolean> {
    try {
      // If LangChain is configured, use it
      if (langchainService.isConfigured()) {
        return await langchainService.isDataRelatedQuestion(message);
      }
      
      // Otherwise fall back to OpenAI direct
      if (!openaiService.isConfigured()) {
        return false;
      }
      
      const prompt = `
        Determine if the following message is asking about data that would require querying a database.
        Data-related questions typically ask about specific client information, metrics, statistics,
        or records that would be stored in a database. Examples include:
        - "How many sessions did client X have last month?"
        - "What is the progress of client Y on goal Z?"
        - "Show me all budget items for client A"
        
        Message: "${message}"
        
        Respond with ONLY "yes" or "no".
      `;
      
      const response = await openaiService.createChatCompletion([
        { role: 'user', content: prompt }
      ]);
      
      // Check if the response indicates this is a data question
      return response.toLowerCase().includes('yes');
    } catch (error) {
      console.error('Error determining if message is data-related:', error);
      // Default to false on error
      return false;
    }
  }
}

// Create a singleton instance
export const clinicianAssistantService = new ClinicianAssistantService();