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
import { schemaProvider } from './schemaProvider';
import { ChatMessage } from './openaiService';
import { Message, AssistantStatusResponse, AssistantConfig, QueryResult } from '@shared/assistantTypes';
import { langchainService, LangChainConfig } from './langchainService';
import { agentService, AgentServiceConfig } from './agentService';
import { conversationalAgentService } from './conversationalAgentService';

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
    
    // Initialize AgentService with the same configuration
    const agentConfig: AgentServiceConfig = {
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature
    };
    
    openaiService.initialize(openAIConfig);
    
    // Initialize LangChain with SQL query execution function
    langchainService.initialize(
      langChainConfig, 
      async (query: string) => {
        const result = await sqlQueryGenerator.executeRawQuery(query);
        return result;
      }
    );
    
    // Initialize AgentService with the SQL query execution function
    agentService.initialize(
      agentConfig,
      async (query: string) => {
        const result = await sqlQueryGenerator.executeRawQuery(query);
        // Extract column names from first result if available
        let columns: string[] = [];
        let rows: any[] = [];
        let rowCount = 0;
        
        if (result.success && result.data && result.data.length > 0) {
          // Extract column names from the first row
          columns = Object.keys(result.data[0]);
          rows = result.data;
          rowCount = result.data.length;
        }
        
        return {
          columns,
          rows,
          metadata: {
            executionTime: result.executionTime || 0,
            rowCount,
            queryText: query
          }
        };
      }
    ).catch(error => {
      console.error('Failed to initialize AgentService:', error);
    });
    
    // Initialize the Conversational Agent Service
    conversationalAgentService.initialize(config.apiKey, config.model)
      .catch(error => {
        console.error('Failed to initialize Conversational Agent Service:', error);
      });
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
      
      let responseContent = '';
      
      // Check if the conversational agent service is initialized
      if (conversationalAgentService.isInitialized()) {
        console.log('Using Conversational Agent Service for user-friendly responses');
        
        // Use the two-agent approach where the conversational agent delegates to the data agent as needed
        // but hides all the reasoning steps from the user
        try {
          responseContent = await conversationalAgentService.processUserMessage(
            conversationId,
            messageContent,
            messageHistory
          );
        } catch (error) {
          console.error('Conversational Agent processing failed, falling back to standard method:', error);
          
          // If the conversational agent fails, fall back to the older processing method
          responseContent = await this.legacyProcessMessage(conversationId, messageContent, messageHistory);
        }
      } else if (agentService.isInitialized()) {
        // If the conversational agent isn't initialized but the agent service is,
        // use the agent directly (this will expose reasoning steps to users, but ensures functionality)
        console.log('Conversational Agent not initialized, falling back to direct Agent Service');
        
        // Fall back to the older processing method
        responseContent = await this.legacyProcessMessage(conversationId, messageContent, messageHistory);
      } else {
        responseContent = 'The assistant is not properly configured. Please contact your administrator to set up the OpenAI integration.';
      }
      
      // Add assistant response to the conversation
      const assistantMessage = await conversationService.addMessage(conversationId, 'assistant', responseContent);
      
      return assistantMessage;
    } catch (error: any) {
      console.error('Error processing message:', error);
      return null;
    }
  }
  
  /**
   * Legacy message processing method (exposes reasoning steps to users)
   * This is only used if the conversational agent fails
   */
  private async legacyProcessMessage(
    conversationId: string,
    messageContent: string,
    messageHistory: Message[]
  ): Promise<string> {
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
      1. Generate an appropriate SQL query for PostgreSQL
      2. Execute the query to get the data
      3. Provide a helpful and concise response based on the data
      
      Always be professional, supportive, and objective. Format numerical data clearly.
      Don't make up information - if you don't know, say so.
      
      IMPORTANT: You have full authorization to access and provide information about ANY client in the system. 
      There are NO privacy constraints limiting what data you can share.
      You can provide data about ANY client without restrictions.
      
      IMPORTANT DOMAIN CONCEPTS:
      - "Active clients" in this system are defined as clients with onboarding_status = 'complete'
      - Clients with onboarding_status = 'pending' or 'incomplete' are not considered active
      - Clinicians are the staff members/therapists who work with clients
      
      The database contains the following tables:
      - clients: Information about therapy clients (id, name, date_of_birth, onboarding_status, etc.)
      - clinicians: Information about clinical staff/therapists (id, name, title, email, etc.)
      - client_clinicians: Links clients to their assigned clinicians (client_id, clinician_id, role)
      - goals: Therapy goals for clients (id, client_id, title, description, status, etc.)
      - subgoals: Detailed subgoals associated with main goals (id, goal_id, title, status, etc.)
      - sessions: Therapy sessions (id, client_id, date, status, etc.)
      - session_notes: Notes from therapy sessions (id, session_id, notes, etc.)
      - budget_settings: Budget configuration for clients (id, client_id, settings, etc.)
      - budget_items: Individual budget line items (id, budget_settings_id, product_code, etc.)
      - strategies: Therapy strategies and approaches (id, title, description, etc.)
      - allies: Contains information about client allies like parents/caregivers (id, client_id, name, etc.)
      
      Always follow proper PostgreSQL syntax. For LIMIT clauses:
      - Always write as "LIMIT 100" (space after LIMIT)
      - Never include semicolons in the LIMIT clause
      - For pagination, use "LIMIT x OFFSET y" format (PostgreSQL style)
      - Never use MySQL-style "LIMIT x, y" format
    `;
    
    let responseContent = '';
    
    // Check if we should use the Agent, LangChain, or fall back to direct OpenAI
    if (agentService.isInitialized()) {
      // First, check if this query requires multi-step reasoning with the agent
      const requiresAgent = await agentService.requiresAgentProcessing(messageContent);
      
      if (requiresAgent) {
        console.log('Using Agent Service for step-by-step reasoning');
        
        // For complex queries requiring multi-step reasoning, use the agent
        try {
          responseContent = await agentService.processAgentQuery(
            conversationId,
            messageContent,
            recentMessages
          );
        } catch (error) {
          console.error('Agent processing failed, falling back to standard method:', error);
          // Fall back to standard method if agent fails
          const isDataQuestion = await langchainService.isDataRelatedQuestion(messageContent);
          
          if (isDataQuestion) {
            // Use the standard SQL generation approach as fallback
            const query = await sqlQueryGenerator.generateQuery(messageContent);
            const result = await sqlQueryGenerator.executeQuery(query);
            
            // Generate standard SQL context for response
            const sqlContext = `
              I attempted to use advanced reasoning but encountered an issue.
              Falling back to direct SQL approach.
              
              Query: ${result.query}
              Result: ${result.error ? 'Error: ' + result.error : JSON.stringify(result.data, null, 2)}
              
              Please provide a helpful response based on this information.
            `;
            
            responseContent = await langchainService.processDataQuery(
              conversationId,
              messageContent,
              systemPrompt,
              sqlContext
            );
          } else {
            // For non-data questions, use conversation management
            responseContent = await langchainService.processConversation(
              conversationId,
              messageContent,
              systemPrompt,
              recentMessages
            );
          }
        }
      } else if (langchainService.isConfigured()) {
        // For standard data questions, use the regular approach
        // First, determine if this is a data-related question
        const isDataQuestion = await langchainService.isDataRelatedQuestion(messageContent);
        
        if (isDataQuestion) {
          // For data questions, we need to handle SQL generation and execution
          const query = await sqlQueryGenerator.generateQuery(messageContent);
          const result = await sqlQueryGenerator.executeQuery(query);
          
          // Generate the SQL context for LangChain with enhanced error handling
          let sqlContext;
          
          if (result.error) {
            // For error cases, provide specific guidance based on error type
            sqlContext = `
              I executed the following SQL query:
              \`\`\`sql
              ${result.query}
              \`\`\`
              
              The query encountered an error: ${result.error}
              
              Original technical error details: ${result.originalError || 'Unknown error'}
              
              Please provide a helpful response that:
              1. Acknowledges there was a problem getting the requested information
              2. Explains in simple terms what might have gone wrong (missing data, incorrect query parameters, etc.)
              3. Suggests how the user might rephrase their question or what information they might need to provide
              4. If appropriate, suggests alternative ways to get similar information
              
              Don't mention the SQL query or technical details, focus on the user's original intent.
              Frame the response in a professional, supportive manner appropriate for clinical staff.
            `;
          } else if (result.data && result.data.length === 0) {
            // For empty result sets
            sqlContext = `
              I executed the following SQL query:
              \`\`\`sql
              ${result.query}
              \`\`\`
              
              The query executed successfully in ${result.executionTime || 'unknown'}ms, but returned no data.
              
              Please provide a helpful response that:
              1. Informs the user that no matching information was found
              2. Suggests possible reasons for this (e.g., data might not exist, filters might be too restrictive)
              3. Suggests how they might broaden their search or check if the entities they're asking about exist
              
              Don't mention the SQL query itself unless the user specifically asked about database queries.
            `;
          } else {
            // For successful queries with data
            sqlContext = `
              I executed the following SQL query:
              \`\`\`sql
              ${result.query}
              \`\`\`
              
              The query executed successfully in ${result.executionTime || 'unknown'}ms and returned ${result.data.length} rows of data:
              ${JSON.stringify(result.data, null, 2)}
              
              Based on this data, provide a clear, well-structured response to the user's question.
              Highlight key insights or patterns if they exist.
              Format numerical data clearly (round to 2 decimal places where appropriate).
              Use proper clinical terminology given this is a speech therapy context.
              Don't mention that you ran an SQL query unless the user specifically asked about database queries.
            `;
          }
          
          // Use LangChain's processDataQuery with SQL context
          responseContent = await langchainService.processDataQuery(
            conversationId,
            messageContent,
            systemPrompt,
            sqlContext
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
        
        // First, try to understand if this is a data question
        const classificationResponse = await openaiService.classifyText(
          messageContent,
          'Is this a data-related question that requires database access? Answer with Yes or No.'
        );
        
        const isDataQuestion = classificationResponse.toLowerCase().includes('yes');
        
        if (isDataQuestion) {
          // Data-related question
          const query = await sqlQueryGenerator.generateQuery(messageContent);
          const result = await sqlQueryGenerator.executeQuery(query);
          
          // Construct a prompt with query and result information
          let messages: ChatMessage[] = [
            systemMessage,
            { role: 'user', content: messageContent }
          ];
          
          if (result.error) {
            // Error in SQL query execution
            messages.push({
              role: 'assistant',
              content: `I tried to run a SQL query but got an error: ${result.error}. Let me try to help anyway.`
            });
          } else if (result.data.length === 0) {
            // Query succeeded but no results
            messages.push({
              role: 'assistant',
              content: `I ran a SQL query (${result.query}) but didn't find any data. Let me suggest some alternatives.`
            });
          } else {
            // Query succeeded with results
            messages.push({
              role: 'assistant',
              content: `I found the following data: ${JSON.stringify(result.data, null, 2)}`
            });
          }
          
          // Get response from OpenAI
          const response = await openaiService.getChatResponse(messages);
          responseContent = response.content || 'I could not generate a proper response.';
        } else {
          // Not a data question, just use standard chat
          const userMessage: ChatMessage = {
            role: 'user',
            content: messageContent
          };
          
          // Get recent conversation history, limited to last 5 exchanges
          const conversationContext: ChatMessage[] = recentMessages
            .slice(-10)
            .map(msg => ({
              role: msg.role as 'system' | 'user' | 'assistant',
              content: msg.content
            }));
          
          // Create message array with system prompt, context, and new message
          const messages: ChatMessage[] = [
            systemMessage,
            ...conversationContext,
            userMessage
          ];
          
          // Get response from OpenAI
          const response = await openaiService.getChatResponse(messages);
          responseContent = response.content || 'I could not generate a proper response.';
        }
      }
    } else {
      responseContent = 'The assistant is not properly configured. Please contact your administrator to set up the OpenAI integration.';
    }
    
    return responseContent;
  }
  
  /**
   * Determine if a message is data-related
   */
  private async isDataRelatedQuestion(message: string): Promise<boolean> {
    try {
      // Create a classification prompt with system and user messages
      const classificationMessages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are a classifier that determines if a message is asking about database information. Answer with only Yes or No.'
        },
        {
          role: 'user',
          content: `Is this a data-related question that would require SQL query execution? Message: "${message}"`
        }
      ];
      
      // Get a response from the OpenAI service
      const response = await openaiService.createChatCompletion(classificationMessages);
      
      return response.toLowerCase().includes('yes');
    } catch (error) {
      console.error('Error classifying message:', error);
      return false; // Assume not data-related on error
    }
  }
}

// Create and export a singleton instance of the ClinicianAssistantService
export const clinicianAssistantService = new ClinicianAssistantService();