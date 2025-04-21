/**
 * Enhanced Clinician Assistant Service
 * 
 * This service enhances the base clinician assistant with:
 * - Improved schema understanding with business context
 * - Support for query templates for common questions
 * - Multi-query capability for complex questions
 * - More robust error handling and query generation
 */

import { openaiService } from '../openaiService';
import { schemaMetadataService } from './schemaMetadata';
import { queryTemplateService } from './queryTemplates';
import { multiQueryEngine } from './multiQueryEngine';
import { enhancedSQLQueryGenerator } from './sqlQueryGenerator';
import { 
  EnhancedAssistantQuestion, 
  EnhancedAssistantResponse, 
  EnhancedFeature,
  QueryChain
} from '@shared/enhancedAssistantTypes';

/**
 * Enhanced Clinician Assistant Service
 */
export class EnhancedClinicianAssistantService {
  private isInitialized: boolean = false;
  private availableFeatures: EnhancedFeature[] = [];
  
  constructor() {
    this.initialize();
  }
  
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize schema metadata
      await schemaMetadataService.getSchemaWithBusinessContext();
      
      // Define available features
      this.availableFeatures = [
        {
          id: 'business_context',
          name: 'Business Context',
          description: 'Uses healthcare domain knowledge to better understand tables and their relationships',
          exampleQuestions: [
            'What clients are currently active in our system?',
            'Which therapists have the most sessions this month?',
            'Show me budget utilization for clients with recent assessments'
          ],
          enabled: true
        },
        {
          id: 'query_templates',
          name: 'Query Templates',
          description: 'Pre-built query patterns for common questions with parameter extraction',
          exampleQuestions: [
            'List all active clients',
            'Show appointments for the next 2 weeks',
            'What is the budget utilization for client Smith?'
          ],
          enabled: true
        },
        {
          id: 'multi_query',
          name: 'Multi-Query Engine',
          description: 'Breaks down complex questions into multiple query steps',
          exampleQuestions: [
            'Which therapists have the highest patient satisfaction scores among those with full caseloads?',
            'Compare budget utilization between clients with and without insurance',
            'Find clients who improved after their budget was increased'
          ],
          enabled: true
        }
      ];
      
      this.isInitialized = true;
      console.log('Enhanced Clinician Assistant Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Enhanced Clinician Assistant Service:', error);
    }
  }
  
  /**
   * Check if the service is initialized
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Get available features
   */
  getAvailableFeatures(): EnhancedFeature[] {
    return this.availableFeatures;
  }
  
  /**
   * Get available query templates
   */
  getAvailableTemplates() {
    return queryTemplateService.getTemplates();
  }
  
  /**
   * Process a natural language question
   */
  async processQuestion(enhancedQuestion: EnhancedAssistantQuestion): Promise<EnhancedAssistantResponse> {
    const startTime = Date.now();
    
    try {
      // Ensure defaults are set
      const question = enhancedQuestion.question;
      const useBusinessContext = enhancedQuestion.useBusinessContext !== false; // Default to true
      const useTemplates = enhancedQuestion.useTemplates !== false; // Default to true
      const useMultiQuery = enhancedQuestion.useMultiQuery !== false; // Default to true
      const format = enhancedQuestion.format || 'natural';
      
      console.log(`[EnhancedAssistant] Processing question: "${question}"`);
      console.log(`[EnhancedAssistant] Options: useBusinessContext=${useBusinessContext}, useTemplates=${useTemplates}, useMultiQuery=${useMultiQuery}, format=${format}`);
      
      // Step 1: Check for query template match first
      let queryResult: any = undefined;
      let templateId: string | undefined = undefined;
      let usedTemplate = false;
      let usedMultiQuery = false;
      let queryChain: QueryChain | undefined = undefined;
      
      if (useTemplates) {
        const templateResult = await queryTemplateService.processQuestion(question);
        
        if (templateResult.matched && templateResult.query) {
          console.log(`[EnhancedAssistant] Found matching template: ${templateResult.templateId}`);
          
          // Execute the template query
          queryResult = await enhancedSQLQueryGenerator.executeQuery(question, {
            useTemplates: true,
            useBusinessContext
          });
          
          if (!queryResult.error) {
            usedTemplate = true;
            templateId = templateResult.templateId;
          }
        }
      }
      
      // Step 2: If no template match or template execution failed, check for multi-query
      if (!queryResult && useMultiQuery) {
        const multiQueryCheck = await multiQueryEngine.checkIfMultiQueryNeeded(question);
        
        if (multiQueryCheck.needsMultiQuery) {
          console.log(`[EnhancedAssistant] Using multi-query approach: ${multiQueryCheck.reason}`);
          
          // Generate and execute a multi-query plan
          const plan = await multiQueryEngine.generateMultiQueryPlan(question);
          const executedPlan = await multiQueryEngine.executeQueryChain(plan);
          
          if (executedPlan.complete && !executedPlan.error && executedPlan.finalResults) {
            usedMultiQuery = true;
            queryChain = executedPlan;
            
            // Use the results from the multi-query
            queryResult = {
              query: executedPlan.steps.map(step => step.query).join('\n\n'),
              data: executedPlan.finalResults,
              executionTime: executedPlan.totalExecutionTime,
              fromMultiQuery: true,
              usedBusinessContext: useBusinessContext
            };
          }
        }
      }
      
      // Step 3: If no template match or multi-query, fall back to direct query generation
      if (!queryResult) {
        console.log('[EnhancedAssistant] Using direct query generation');
        
        queryResult = await enhancedSQLQueryGenerator.executeQuery(question, {
          useBusinessContext,
          useTemplates: false,
          useMultiQuery: false
        });
      }
      
      // Step 4: Generate a natural language response
      const answer = await this.generateNaturalLanguageResponse(
        question,
        queryResult.data,
        queryResult.query,
        format
      );
      
      // Return the complete response
      return {
        question,
        answer,
        data: queryResult.data,
        query: queryResult.query,
        executionTime: Date.now() - startTime,
        usedTemplate,
        templateId,
        usedMultiQuery,
        queryChain,
        usedBusinessContext: useBusinessContext,
        error: queryResult.error
      };
    } catch (error: any) {
      console.error('[EnhancedAssistant] Error processing question:', error);
      
      return {
        question: enhancedQuestion.question,
        answer: `I'm sorry, I encountered an error while processing your question: ${error.message}`,
        data: [],
        query: '',
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }
  
  /**
   * Generate a natural language response based on query results
   */
  private async generateNaturalLanguageResponse(
    question: string,
    data: any[],
    query: string,
    format: string = 'natural'
  ): Promise<string> {
    try {
      // If there's no data, return a simple no data message
      if (!data || data.length === 0) {
        return "I couldn't find any data matching your query. Please try rephrasing your question or asking about different information.";
      }
      
      // For JSON format, just return the stringified data
      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      }
      
      // For table format, we'll generate a response that includes the data
      if (format === 'table') {
        return "Here are the results of your query:";
      }
      
      // For natural language format, use OpenAI to generate a response
      const responsePrompt = `
        Question: "${question}"
        
        SQL Query: ${query}
        
        Query Results: ${JSON.stringify(data, null, 2)}
        
        Please provide a concise natural language summary of these results that directly answers the question.
        Your response should:
        1. Be conversational and friendly
        2. Mention specific numbers and facts from the data
        3. Contextualize the information for a healthcare provider
        4. Be no more than 3-4 sentences
        5. Not include any SQL or technical details
      `;
      
      const response = await openaiService.createChatCompletion([
        { role: "system", content: "You are a helpful clinical assistant that specializes in summarizing database query results in natural language." },
        { role: "user", content: responsePrompt }
      ]);
      
      return response.trim();
    } catch (error) {
      console.error('[EnhancedAssistant] Error generating natural language response:', error);
      return `I found ${data.length} results for your query, but I'm having trouble summarizing them.`;
    }
  }
}

// Create singleton instance
export const enhancedClinicianAssistantService = new EnhancedClinicianAssistantService();