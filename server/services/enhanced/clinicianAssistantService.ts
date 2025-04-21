/**
 * Enhanced Clinician Assistant Service
 * 
 * This service orchestrates the enhanced assistant functionality by utilizing
 * the schema metadata, query templates, multi-query engine, and SQL query generator
 * to provide comprehensive and accurate answers to natural language questions.
 */

import { openaiService } from '../openaiService';
import { schemaMetadataService } from './schemaMetadata';
import { queryTemplateService } from './queryTemplates';
import { multiQueryEngine } from './multiQueryEngine';
import { enhancedSQLQueryGenerator } from './sqlQueryGenerator';
import { 
  EnhancedAssistantQuestion, 
  EnhancedAssistantResponse, 
  EnhancedAssistantFeature,
  ExtractedEntity,
  ConversationMemory
} from '@shared/enhancedAssistantTypes';

/**
 * Enhanced Clinician Assistant Service class
 */
export class ClinicianAssistantService {
  private isInitialized = false;
  private features: EnhancedAssistantFeature[] = [];
  
  constructor() {
    this.loadFeatures();
  }
  
  /**
   * Initialize the service and its dependencies
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize schema metadata service
      console.log('[ClinicianAssistant] Initializing schema metadata service...');
      await schemaMetadataService.getSchemaMetadata();
      
      this.isInitialized = true;
      console.log('[ClinicianAssistant] Service initialized successfully');
    } catch (error) {
      console.error('[ClinicianAssistant] Error initializing service:', error);
      throw error;
    }
  }
  
  /**
   * Build memory context string from conversation memory
   */
  private buildMemoryContext(memory?: ConversationMemory): string {
    if (!memory) {
      return '';
    }
    
    const contextParts: string[] = [];
    
    // Add active client info if available
    if (memory.activeClientName) {
      contextParts.push(`The conversation is about client: ${memory.activeClientName}`);
      
      if (memory.activeClientId) {
        contextParts.push(`Client ID: ${memory.activeClientId}`);
      }
    }
    
    // Add specific goal info if available
    if (memory.activeGoalName) {
      contextParts.push(`The conversation involves the goal: ${memory.activeGoalName}`);
    }
    
    // Add time context if available
    if (memory.activeTimeframe) {
      contextParts.push(`The relevant timeframe is: ${memory.activeTimeframe}`);
    }
    
    // Context about other active filters
    if (memory.activeFilters && memory.activeFilters.length > 0) {
      contextParts.push(`Active filters: ${memory.activeFilters.join(', ')}`);
    }
    
    return contextParts.join('\n');
  }

  /**
   * Extract entities from a question for context tracking
   */
  private async extractEntities(question: string): Promise<ExtractedEntity[]> {
    try {
      const prompt = `
        Analyze this question and extract any entities related to speech therapy clinical data.
        Extract only the following entity types if present: ClientName, ClientID, GoalName, GoalID, Date, Category, Amount, Concept.
        
        Question: "${question}"
        
        Format your response as a JSON array of objects with "text", "type", and optional "value" properties.
        Example: [{"text": "Radwan", "type": "ClientName"}, {"text": "speech clarity", "type": "GoalName"}]
        
        Return an empty array if no entities are found.
      `;
      
      const response = await openaiService.createChatCompletion(
        [
          { role: 'system', content: 'You are an entity extraction specialist. Extract entities precisely and respond with only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        true // JSON response
      );
      
      try {
        const entities = JSON.parse(response);
        return Array.isArray(entities) ? entities : [];
      } catch (error) {
        console.error('[ClinicianAssistant] Error parsing extracted entities:', error);
        return [];
      }
    } catch (error) {
      console.error('[ClinicianAssistant] Error extracting entities:', error);
      return [];
    }
  }
  
  /**
   * Update conversation memory with new information
   */
  private updateConversationMemory(
    oldMemory: ConversationMemory | undefined, 
    question: string,
    entities: ExtractedEntity[]
  ): ConversationMemory {
    // Start with previous memory or create new
    const memory: ConversationMemory = oldMemory || {};
    
    // Update last question
    memory.lastQuestion = question;
    
    // Process entities to update memory
    for (const entity of entities) {
      if (entity.type === 'ClientName') {
        memory.activeClientName = entity.text;
      } else if (entity.type === 'ClientID') {
        memory.activeClientId = entity.text;
      }
    }
    
    // Store recent entities
    memory.recentEntities = entities;
    
    return memory;
  }

  async processQuestion(enhancedQuestion: EnhancedAssistantQuestion): Promise<EnhancedAssistantResponse> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const { question } = enhancedQuestion;
      const startTime = Date.now();
      
      // Extract entities from the question
      const extractedEntities = await this.extractEntities(question);
      console.log('[ClinicianAssistant] Extracted entities:', extractedEntities);
      
      // Update conversation memory
      const updatedMemory = this.updateConversationMemory(
        enhancedQuestion.conversationMemory,
        question,
        extractedEntities
      );
      
      // First, check if this is a simple greeting or non-data question
      const isDataQuestion = await this.isDataRelatedQuestion(question);
      
      // If it's not a data question, handle it without database access
      if (!isDataQuestion) {
        console.log('[ClinicianAssistant] Non-data question detected. Generating conversational response.');
        
        // Build context from conversation memory
        const memoryContext = this.buildMemoryContext(updatedMemory);
        
        const prompt = `
          You are a helpful clinical assistant for a speech therapy practice. 
          The user has asked a question that doesn't require database access.
          
          Please respond in a friendly, professional tone appropriate for a clinical setting.
          Keep your response concise but informative.
          
          ${memoryContext ? `Context from previous conversation:\n${memoryContext}\n\n` : ''}
          User question: "${question}"
        `;
        
        const explanation = await openaiService.createChatCompletion([
          { role: 'system', content: 'You are a clinical assistant for a speech therapy practice.' },
          { role: 'user', content: prompt }
        ]);
        
        // Return conversational response without database query
        return {
          originalQuestion: question,
          explanation,
          data: question.toLowerCase().includes('hello') || question.toLowerCase().includes('hi') 
            ? [{ greeting: true }] 
            : [],
          executionTime: Date.now() - startTime,
          updatedMemory,
          detectedEntities: extractedEntities
        };
      }
      
      // For data questions, proceed with regular processing
      console.log('[ClinicianAssistant] Data question detected. Processing with database access.');
      
      // Step 1: Try to match a template if enabled
      if (enhancedQuestion.useTemplates !== false) {
        try {
          // If specific template is provided, use only that one
          if (enhancedQuestion.specificTemplate) {
            const template = queryTemplateService.getTemplate(enhancedQuestion.specificTemplate);
            if (!template) {
              return {
                originalQuestion: question,
                errorMessage: `Template '${enhancedQuestion.specificTemplate}' not found`
              };
            }
            
            // Process with specific template
            // This would be implemented in the template service
          } else {
            // Try to match any template
            const templateMatch = await queryTemplateService.processQuestion(question);
            
            if (templateMatch.matched && templateMatch.query) {
              console.log('[ClinicianAssistant] Template matched:', templateMatch.templateId);
              
              // Execute the template query
              const queryResult = await enhancedSQLQueryGenerator.executeQuery(
                question,
                {
                  useTemplates: false, // Skip templates since we already have a query
                  useBusinessContext: enhancedQuestion.useBusinessContext ?? true
                }
              );
              
              // Generate explanation with the results
              const explanation = await this.generateExplanation(question, queryResult.data);
              
              return {
                originalQuestion: question,
                sqlQuery: queryResult.query,
                data: queryResult.data,
                explanation,
                usedTemplate: templateMatch.templateId,
                templateParameters: templateMatch.parameters,
                executionTime: Date.now() - startTime,
                updatedMemory,
                detectedEntities: extractedEntities
              };
            }
          }
        } catch (templateError) {
          console.error('[ClinicianAssistant] Error during template matching:', templateError);
          // Continue to the next strategy
        }
      }
      
      // Step 2: Try multi-query if enabled
      if (enhancedQuestion.useMultiQuery !== false) {
        try {
          // Check if the question requires multi-query
          const multiQueryCheck = await multiQueryEngine.checkIfMultiQueryNeeded(question);
          
          if (multiQueryCheck.needsMultiQuery) {
            console.log('[ClinicianAssistant] Using multi-query approach:', multiQueryCheck.reason);
            
            // Generate and execute multi-query plan
            const queryPlan = await multiQueryEngine.generateMultiQueryPlan(question);
            const executedPlan = await multiQueryEngine.executeQueryChain(queryPlan);
            
            if (executedPlan.complete && executedPlan.finalResults) {
              // Generate explanation with the final results
              const explanation = await this.generateExplanation(question, executedPlan.finalResults);
              
              return {
                originalQuestion: question,
                data: executedPlan.finalResults,
                explanation,
                usedMultiQuery: true,
                querySteps: executedPlan.steps,
                executionTime: executedPlan.totalExecutionTime || (Date.now() - startTime),
                updatedMemory,
                detectedEntities: extractedEntities
              };
            } else {
              console.error('[ClinicianAssistant] Multi-query execution failed:', executedPlan.error);
              // Fall back to direct query
            }
          }
        } catch (multiQueryError) {
          console.error('[ClinicianAssistant] Error during multi-query processing:', multiQueryError);
          // Continue to the next strategy
        }
      }
      
      // Step 3: Fall back to direct SQL generation
      console.log('[ClinicianAssistant] Using direct SQL generation');
      const queryResult = await enhancedSQLQueryGenerator.executeQuery(
        question,
        {
          useTemplates: false, // Skip templates since we've already tried them
          useMultiQuery: false, // Skip multi-query since we've already tried it
          useBusinessContext: enhancedQuestion.useBusinessContext ?? true
        }
      );
      
      // Check if query was successful
      if (queryResult.error) {
        return {
          originalQuestion: question,
          sqlQuery: queryResult.query,
          errorMessage: queryResult.error,
          executionTime: Date.now() - startTime,
          updatedMemory,
          detectedEntities: extractedEntities
        };
      }
      
      // Generate explanation with the results
      const explanation = await this.generateExplanation(question, queryResult.data);
      
      // Return the response
      return {
        originalQuestion: question,
        sqlQuery: queryResult.query,
        data: queryResult.data,
        explanation,
        executionTime: Date.now() - startTime,
        updatedMemory,
        detectedEntities: extractedEntities
      };
    } catch (error: any) {
      console.error('[ClinicianAssistant] Error processing question:', error);
      
      // Even in error cases, try to update and return conversation memory
      let errorMemory = undefined;
      let errorEntities = undefined;
      
      try {
        const extractedEntities = await this.extractEntities(enhancedQuestion.question);
        errorMemory = this.updateConversationMemory(
          enhancedQuestion.conversationMemory,
          enhancedQuestion.question,
          extractedEntities
        );
        errorEntities = extractedEntities;
      } catch (memoryError) {
        console.error('[ClinicianAssistant] Failed to save conversation memory during error:', memoryError);
      }
      
      return {
        originalQuestion: enhancedQuestion.question,
        errorMessage: `Error processing question: ${error.message}`,
        updatedMemory: errorMemory,
        detectedEntities: errorEntities
      };
    }
  }
  
  /**
   * Generate a natural language explanation of the query results
   */
  private async generateExplanation(question: string, data: any[]): Promise<string> {
    try {
      // If no data, return a simple message
      if (!data || data.length === 0) {
        return "I couldn't find any data matching your query. Please try a different question or criteria.";
      }
      
      // If data is too large, summarize it
      const dataToExplain = data.length > 10 ? data.slice(0, 10) : data;
      
      // Create prompt for explanation generation
      const prompt = `
Based on this question: "${question}"

The database returned these results:
${JSON.stringify(dataToExplain, null, 2)}${data.length > 10 ? `\n\n(showing 10 of ${data.length} results)` : ''}

Please provide a clear, concise explanation of these results in natural language. 
The explanation should:
1. Directly answer the question asked, summarizing the key findings
2. Mention any relevant patterns, outliers, or interesting observations
3. Be written in a professional but conversational tone suitable for clinicians
4. Not exceed 3-4 sentences unless necessary for clarity
5. If appropriate, mention the total count of results (${data.length})

Your response should be purely explanatory without mentioning the SQL or technical aspects.
`;
      
      // Generate explanation with OpenAI
      const explanation = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are an expert clinical data analyst assistant.' },
        { role: 'user', content: prompt }
      ]);
      
      return explanation;
    } catch (error) {
      console.error('[ClinicianAssistant] Error generating explanation:', error);
      return "Here are the results for your query. Please let me know if you need any clarification.";
    }
  }
  
  /**
   * Determine if a message is asking about data that would require database access
   */
  private async isDataRelatedQuestion(message: string): Promise<boolean> {
    try {
      const prompt = `
        Determine if the following message is asking about data that would require querying a database.
        Data-related questions typically ask about specific client information, metrics, statistics,
        or records that would be stored in a database. Examples include:
        - "How many sessions did client X have last month?"
        - "What is the progress of client Y on goal Z?"
        - "Show me all budget items for client A"
        
        Simple greetings, clarification questions, requests for explanations, or general questions
        that don't require looking up specific records should NOT be classified as data questions.
        Examples of non-data questions:
        - "Hello"
        - "How are you?"
        - "What can you do?"
        - "Can you explain how goals work?"
        
        Message: "${message}"
        
        Respond with ONLY "yes" or "no".
      `;
      
      const response = await openaiService.createChatCompletion([
        { role: 'user', content: prompt }
      ]);
      
      // Check if the response indicates this is a data question
      return response.toLowerCase().includes('yes');
    } catch (error) {
      console.error('[EnhancedClinicianAssistant] Error determining if data question:', error);
      // Default to true if we can't determine (safer to assume it might need data)
      return true;
    }
  }
  
  /**
   * Load available features
   */
  private loadFeatures(): void {
    this.features = [
      {
        id: 'templates',
        name: 'Query Templates',
        description: 'Pre-built templates for common clinical questions',
        defaultEnabled: true,
        enabled: true,
        icon: 'template'
      },
      {
        id: 'multi-query',
        name: 'Complex Analysis',
        description: 'Multi-step analysis for complex questions',
        defaultEnabled: true,
        enabled: true,
        icon: 'analytics'
      },
      {
        id: 'business-context',
        name: 'Clinical Context',
        description: 'Enhanced understanding of clinical domain terminology',
        defaultEnabled: true,
        enabled: true,
        icon: 'brain'
      }
    ];
  }
  
  /**
   * Get available features
   */
  getFeatures(): EnhancedAssistantFeature[] {
    return this.features;
  }
  
  /**
   * Get query templates
   */
  getTemplates() {
    return queryTemplateService.getTemplates();
  }
}

// Create singleton instance
export const clinicianAssistantService = new ClinicianAssistantService();