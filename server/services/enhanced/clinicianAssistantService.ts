/**
 * Enhanced Clinician Assistant Service
 * 
 * This service provides improved functionality for the Clinician Assistant
 * using schema metadata, query templates, and multi-query capabilities.
 */

import { conversationService } from '../conversationService';
import { openaiService, ChatMessage } from '../openaiService';
import { Message, AssistantStatusResponse, QueryResult } from '../../../shared/assistantTypes';
import { EnhancedAssistantStatusResponse } from '../../../shared/enhancedAssistantTypes';
import { enhancedSQLQueryGenerator } from './sqlQueryGenerator';
import { schemaMetadataService } from './schemaMetadata';
import { queryTemplateService } from './queryTemplates';
import { multiQueryEngine } from './multiQueryEngine';

/**
 * Configuration for the enhanced assistant service
 */
export interface EnhancedAssistantConfig {
  apiKey: string;
  model: string;
  temperature: number;
  useTemplates?: boolean;
  useMultiQuery?: boolean;
  useBusinessContext?: boolean;
}

/**
 * Enhanced Clinician Assistant Service class
 */
export class EnhancedClinicianAssistantService {
  private config: EnhancedAssistantConfig | null = null;
  
  /**
   * Initialize the assistant
   */
  initialize(config: EnhancedAssistantConfig): void {
    this.config = {
      ...config,
      useTemplates: config.useTemplates !== false,
      useMultiQuery: config.useMultiQuery !== false,
      useBusinessContext: config.useBusinessContext !== false
    };
    
    console.log('[Enhanced] Clinician Assistant Service initialized');
  }
  
  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): EnhancedAssistantConfig | null {
    return this.config;
  }
  
  /**
   * Get status information about the assistant
   */
  getStatus(): EnhancedAssistantStatusResponse {
    const isConfigured = this.isConfigured();
    
    return {
      isConfigured,
      connectionValid: isConfigured,
      model: this.config?.model || 'Not configured',
      enhanced: true,
      useTemplates: this.config?.useTemplates || false,
      useMultiQuery: this.config?.useMultiQuery || false,
      useBusinessContext: this.config?.useBusinessContext || false
    };
  }
  
  /**
   * Determine if a message is asking about data that would require SQL
   */
  async isDataRelatedQuestion(message: string): Promise<boolean> {
    try {
      if (!this.config) {
        return false;
      }
      
      const prompt = `
        Determine if the following message is asking about data that would 
        require querying a database. Data-related questions typically ask about specific 
        client information, metrics, statistics, or records that would be stored in a database.
        
        Examples of data-related questions:
        - "How many sessions did client X have last month?"
        - "What is the progress of client Y on goal Z?"
        - "Show me all budget items for client A"
        - "Which clients haven't attended therapy in 3 weeks?"
        - "What strategies were used most frequently with B?"
        
        Message: "${message}"
        
        Respond with ONLY "yes" or "no".
      `;
      
      const response = await openaiService.createChatCompletion([
        { role: 'user', content: prompt }
      ], {
        temperature: 0.1 // Low temperature for more deterministic response
      });
      
      // Check if the response indicates this is a data question
      return response.toLowerCase().includes('yes');
    } catch (error) {
      console.error('[Enhanced] Error determining if message is data-related:', error);
      // Default to false on error
      return false;
    }
  }
  
  /**
   * Generate a context-aware system prompt
   */
  private generateSystemPrompt(): string {
    const basePrompt = `
      You are a helpful assistant for speech therapists at a clinic. 
      You can help answer questions about clients, sessions, budgets, goals, and other clinical data.
      
      When a user asks you questions about data, you should:
      1. Generate an appropriate SQL query for PostgreSQL
      2. Execute the query to get the data
      3. Provide a helpful and concise response based on the data
      
      Always be professional, supportive, and objective. Format numerical data clearly.
      Don't make up information - if you don't know, say so.
      
      IMPORTANT DOMAIN CONCEPTS:
      - "Active clients" in this system are defined as clients with onboarding_status = 'complete'
      - Clients with onboarding_status = 'pending' or 'incomplete' are not considered active
      - Clinicians are the staff members/therapists who work with clients
      - Client identifiers often follow the pattern "Name-123456" where 123456 is the unique_identifier
      - Progress on goals is tracked through performance assessments with ratings and scores
      - Therapy strategies are techniques used in sessions and linked to performance assessments
      - Budget tracking involves budget_settings (plan details) and budget_items (line items)
    `;
    
    // If business context is enabled, add enriched schema information
    if (this.config?.useBusinessContext) {
      const businessContext = schemaMetadataService.getDescription();
      return `${basePrompt}\n\n${businessContext}`;
    }
    
    return basePrompt;
  }
  
  /**
   * Process a message and generate a response
   */
  async processMessage(conversationId: string, messageContent: string): Promise<Message | null> {
    try {
      if (!this.config) {
        throw new Error('Enhanced Clinician Assistant Service not configured');
      }
      
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
      
      // Generate the system prompt
      const systemPrompt = this.generateSystemPrompt();
      
      // Determine if this is a data-related question
      const isDataQuestion = await this.isDataRelatedQuestion(messageContent);
      
      let responseContent = '';
      let queryResult: QueryResult | undefined = undefined;
      
      if (isDataQuestion) {
        // For data questions, use our enhanced query generation and execution
        console.log('[Enhanced] Processing data-related question');
        
        // Generate the query
        const query = await enhancedSQLQueryGenerator.generateQuery(messageContent, {
          useTemplates: this.config.useTemplates,
          useMultiQuery: this.config.useMultiQuery,
          useBusinessContext: this.config.useBusinessContext,
          temperature: this.config.temperature
        });
        
        // Execute the query
        const result = await enhancedSQLQueryGenerator.executeQuery(query, {
          useTemplates: this.config.useTemplates,
          useMultiQuery: this.config.useMultiQuery,
          useBusinessContext: this.config.useBusinessContext
        });
        
        // Generate the SQL context for response generation
        let sqlContext: string;
        
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
            
            Source information:
            - Query was ${result.fromTemplate ? 'generated from a template' : 'custom generated'}
            - ${result.fromMultiQuery ? 'Multiple queries were used' : 'A single query was used'}
            - ${result.usedBusinessContext ? 'Business context was applied' : 'Only technical schema was used'}
          `;
        }
        
        // Generate response with SQL context
        responseContent = await openaiService.createChatCompletion([
          { role: 'system', content: systemPrompt },
          ...recentMessages,
          { role: 'user', content: messageContent },
          { role: 'system', content: sqlContext }
        ], {
          temperature: this.config.temperature,
          model: this.config.model
        });
        
        // Prepare query result data for visualization if we have results
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
              queryText: result.query,
              fromTemplate: result.fromTemplate,
              fromMultiQuery: result.fromMultiQuery,
              usedBusinessContext: result.usedBusinessContext
            }
          };
        }
      } else {
        // For non-data questions, just use the conversation history
        console.log('[Enhanced] Processing conversational question');
        
        responseContent = await openaiService.createChatCompletion([
          { role: 'system', content: systemPrompt },
          ...recentMessages
        ], {
          temperature: this.config.temperature,
          model: this.config.model
        });
      }
      
      // Add assistant response to conversation with query result data
      return await conversationService.addMessage(
        conversationId, 
        'assistant', 
        responseContent,
        queryResult
      );
    } catch (error: any) {
      console.error('[Enhanced] Error processing message:', error);
      
      // Add error message to conversation
      return await conversationService.addMessage(
        conversationId,
        'assistant',
        `I'm sorry, I encountered an error while processing your request: ${error.message}`
      );
    }
  }
}

// Create singleton instance
export const enhancedClinicianAssistantService = new EnhancedClinicianAssistantService();