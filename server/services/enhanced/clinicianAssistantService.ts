/**
 * Enhanced Clinician Assistant Service
 * 
 * This service extends the original clinician assistant with advanced features:
 * - Schema metadata with business context
 * - Query templates for common questions
 * - Multi-query chains for complex questions
 * - Enhanced natural language responses
 */

import { EnhancedAssistantQuestion, EnhancedAssistantResponse } from '@shared/enhancedAssistantTypes';
import { openaiService } from '../openaiService';
import { schemaMetadataService } from './schemaMetadata';
import { queryTemplateService } from './queryTemplates';
import { multiQueryEngine } from './multiQueryEngine';
import { enhancedSQLQueryGenerator } from './sqlQueryGenerator';

/**
 * Enhanced Clinician Assistant Service class
 */
export class EnhancedClinicianAssistantService {
  private isInitialized = false;
  
  /**
   * Initialize the assistant with required dependencies
   */
  async initialize(): Promise<void> {
    if (!openaiService.isConfigured()) {
      throw new Error('OpenAI service is not configured');
    }
    
    this.isInitialized = true;
    console.log('Enhanced Clinician Assistant Service initialized');
  }
  
  /**
   * Check if the service is properly initialized
   */
  isConfigured(): boolean {
    return this.isInitialized && openaiService.isConfigured();
  }
  
  /**
   * Format database results into a human-readable response
   */
  formatResults(data: any[], questionContext: string): string {
    if (!data || data.length === 0) {
      return 'I couldn\'t find any data matching your query.';
    }
    
    if (data.length === 1 && Object.keys(data[0]).length === 1) {
      // Single value result (count, sum, etc.)
      const value = Object.values(data[0])[0];
      const key = Object.keys(data[0])[0];
      
      if (typeof value === 'number') {
        if (questionContext.toLowerCase().includes('how many')) {
          return `There ${value === 1 ? 'is' : 'are'} ${value} ${key.replace(/_/g, ' ').toLowerCase()}${value === 1 ? '' : 's'}.`;
        } else {
          return `The ${key.replace(/_/g, ' ').toLowerCase()} is ${value}.`;
        }
      }
      
      return `${key.replace(/_/g, ' ')}: ${value}`;
    }
    
    // Multiple row results
    if (data.length === 1) {
      // Single row with multiple columns
      const row = data[0];
      const formattedRow = Object.entries(row)
        .map(([key, value]) => `**${key.replace(/_/g, ' ')}**: ${value}`)
        .join('\n');
      
      return `Here's the information I found:\n\n${formattedRow}`;
    } else {
      // Multiple rows
      const formatRow = (row: any) => {
        return Object.entries(row)
          .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
          .join(', ');
      };
      
      // Create a bullet-point list for readability
      return `Here are the ${data.length} results I found:\n\n` + 
        data.map((row, index) => `${index + 1}. ${formatRow(row)}`).join('\n');
    }
  }
  
  /**
   * Generate an enhanced natural language response
   */
  async generateResponse(question: string, sqlQuery: string, results: any[]): Promise<string> {
    const prompt = `
      Answer the following question based on the provided data.
      
      Question: "${question}"
      
      SQL Query Used:
      \`\`\`
      ${sqlQuery}
      \`\`\`
      
      Data Results:
      \`\`\`
      ${JSON.stringify(results, null, 2)}
      \`\`\`
      
      Guidelines:
      1. Provide a concise and direct answer to the question
      2. Include specific data points from the results to support your answer
      3. Use clear, simple language appropriate for a clinical setting
      4. Format numbers and dates in a human-readable way
      5. If the results show no data, acknowledge this and suggest possible reasons
      
      Your response should be informative and helpful to a clinician looking for insights.
    `;
    
    try {
      const response = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are a clinical assistant that provides helpful insights from database queries about therapy clients. You explain data in a clear, concise manner for medical professionals.' },
        { role: 'user', content: prompt }
      ]);
      
      return response.trim();
    } catch (error) {
      console.error('Error generating natural language response:', error);
      
      // Fall back to simple formatting if AI generation fails
      return this.formatResults(results, question);
    }
  }
  
  /**
   * Process a question and generate an answer
   */
  async processQuestion(question: EnhancedAssistantQuestion): Promise<EnhancedAssistantResponse> {
    if (!this.isConfigured()) {
      return {
        answer: 'The Enhanced Clinician Assistant is not properly configured. Please check the API keys and settings.',
        error: 'Service not configured',
        success: false
      };
    }
    
    const startTime = Date.now();
    
    try {
      console.log('[Enhanced] Processing question:', question.question);
      
      // Options for generation
      const queryOptions = {
        useTemplates: question.useTemplates !== false,
        useMultiQuery: question.useMultiQuery !== false, 
        useBusinessContext: question.useBusinessContext !== false
      };
      
      // First, check if this matches a template or multi-query pattern
      // If so, execute it directly
      // If not, generate an SQL query and execute it
      const result = await enhancedSQLQueryGenerator.executeQuery(
        question.question,
        queryOptions
      );
      
      // Check for errors in execution
      if (result.error) {
        console.error('[Enhanced] Error executing query:', result.error);
        
        return {
          answer: `I encountered an error while processing your question: ${result.error}`,
          error: result.error,
          success: false,
          executionTime: Date.now() - startTime,
          fromTemplate: result.fromTemplate,
          fromMultiQuery: result.fromMultiQuery,
          usedBusinessContext: result.usedBusinessContext
        };
      }
      
      // No errors, generate a natural language response
      let nlResponse: string;
      
      // Check if we have template-based response mapping
      if (result.fromTemplate) {
        // Template-based response 
        const templateResult = await queryTemplateService.processQuestion(question.question);
        
        if (templateResult.matched && templateResult.templateId) {
          const template = queryTemplateService.getTemplate(templateResult.templateId);
          
          if (template && template.responseTemplate && templateResult.parameters) {
            // Use the template's response template
            nlResponse = template.responseTemplate;
            
            // Replace parameters in the response template
            for (const [key, value] of Object.entries(templateResult.parameters)) {
              nlResponse = nlResponse.replace(`{${key}}`, String(value));
            }
            
            // Append the formatted results
            nlResponse += '\n\n' + this.formatResults(result.data, question.question);
          } else {
            // Generate response using AI
            nlResponse = await this.generateResponse(question.question, result.query, result.data);
          }
        } else {
          // Generate response using AI
          nlResponse = await this.generateResponse(question.question, result.query, result.data);
        }
      } else if (result.fromMultiQuery) {
        // Multi-query chain response
        // Include some context about the multi-step nature
        nlResponse = await this.generateResponse(
          question.question,
          result.query,
          result.data
        );
      } else {
        // Standard query response 
        nlResponse = await this.generateResponse(question.question, result.query, result.data);
      }
      
      // Return the complete response
      return {
        answer: nlResponse,
        query: result.query,
        data: result.data,
        success: true,
        executionTime: Date.now() - startTime,
        fromTemplate: result.fromTemplate,
        fromMultiQuery: result.fromMultiQuery,
        usedBusinessContext: result.usedBusinessContext
      };
    } catch (error: any) {
      console.error('[Enhanced] Error processing question:', error);
      
      return {
        answer: `I encountered an error while processing your question: ${error.message}`,
        error: error.message,
        success: false,
        executionTime: Date.now() - startTime
      };
    }
  }
}

// Create singleton instance
export const enhancedClinicianAssistantService = new EnhancedClinicianAssistantService();