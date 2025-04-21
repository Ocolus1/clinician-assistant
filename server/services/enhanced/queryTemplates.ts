/**
 * Query Templates Service
 * 
 * This service provides predefined query templates for common question patterns.
 * It can identify if a natural language question matches a template and extract
 * parameters to populate the corresponding SQL query.
 */

import { openaiService } from '../openaiService';
import { QueryTemplate, TemplateParameter } from '@shared/enhancedAssistantTypes';

/**
 * Result of template matching
 */
export interface TemplateMatchResult {
  matched: boolean;
  templateId?: string;
  parameters?: Record<string, any>;
  query?: string;
  error?: string;
}

/**
 * Query Templates Service class
 */
export class QueryTemplateService {
  private templates: QueryTemplate[] = [];
  
  constructor() {
    this.loadTemplates();
  }
  
  /**
   * Load predefined query templates
   */
  private loadTemplates(): void {
    // Clients templates
    this.templates.push({
      id: 'clients_by_status',
      name: 'Clients by Status',
      description: 'Find clients with a specific status',
      patterns: [
        'How many clients have status {status}?',
        'List all {status} clients',
        'Show me clients with {status} status',
        'Count of clients who are {status}'
      ],
      sqlTemplate: `
        SELECT id, first_name, last_name, email, phone, status
        FROM clients
        WHERE status = '{status}'
        ORDER BY last_name, first_name;
      `,
      parameters: [
        {
          name: 'status',
          description: 'Client status (active, inactive, on hold, etc.)',
          type: 'string',
          required: true,
          extractionHints: ['Look for status values like active, inactive, on hold, discharged']
        }
      ],
      resultMapping: {
        renameColumns: {
          'first_name': 'First Name',
          'last_name': 'Last Name'
        }
      },
      responseTemplate: 'Here are the clients with status: {status}'
    });
    
    // Upcoming appointments template
    this.templates.push({
      id: 'upcoming_appointments',
      name: 'Upcoming Appointments',
      description: 'Find upcoming appointments within a time range',
      patterns: [
        'Show appointments for the next {timeframe}',
        'List upcoming appointments in the next {timeframe}',
        'What appointments do we have in the next {timeframe}?',
        'Show me all appointments scheduled for the next {timeframe}'
      ],
      sqlTemplate: `
        SELECT a.id, a.appointment_date, a.start_time, 
               c.first_name || ' ' || c.last_name as client_name,
               t.first_name || ' ' || t.last_name as therapist_name,
               a.status
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        JOIN therapists t ON a.therapist_id = t.id
        WHERE a.appointment_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + interval '{timeframe}')
        ORDER BY a.appointment_date, a.start_time;
      `,
      parameters: [
        {
          name: 'timeframe',
          description: 'Time period such as "1 week", "2 weeks", "1 month"',
          type: 'string',
          required: true,
          default: '1 week',
          extractionHints: ['Convert natural language time expressions to PostgreSQL interval format']
        }
      ],
      resultMapping: {
        renameColumns: {
          'appointment_date': 'Date',
          'start_time': 'Time',
          'client_name': 'Client',
          'therapist_name': 'Therapist',
          'status': 'Status'
        },
        visualizationType: 'table'
      }
    });
    
    // Budget utilization template
    this.templates.push({
      id: 'budget_utilization',
      name: 'Budget Utilization',
      description: 'Show budget utilization rates for specific clients or services',
      patterns: [
        'What is the budget utilization for client {clientId}?',
        'Show me budget utilization for {clientName}',
        'How much of the budget has {clientName} used?',
        'Budget usage statistics for client {clientId}'
      ],
      sqlTemplate: `
        SELECT 
          c.first_name || ' ' || c.last_name as client_name,
          bi.product_name,
          bi.authorized_units,
          bi.used_units,
          ROUND((bi.used_units::float / NULLIF(bi.authorized_units, 0)) * 100, 2) as utilization_percentage
        FROM budget_items bi
        JOIN budget_settings bs ON bi.budget_settings_id = bs.id
        JOIN clients c ON bs.client_id = c.id
        WHERE c.id = {clientId} OR c.first_name || ' ' || c.last_name ILIKE '%{clientName}%'
        ORDER BY utilization_percentage DESC;
      `,
      parameters: [
        {
          name: 'clientId',
          description: 'ID of the client',
          type: 'number',
          required: false,
          extractionHints: ['Look for numeric ID values']
        },
        {
          name: 'clientName',
          description: 'Name of the client',
          type: 'string',
          required: false,
          extractionHints: ['Extract client name from the question']
        }
      ],
      resultMapping: {
        renameColumns: {
          'client_name': 'Client',
          'product_name': 'Service',
          'authorized_units': 'Authorized',
          'used_units': 'Used',
          'utilization_percentage': 'Utilization %'
        },
        visualizationType: 'bar'
      }
    });
    
    // Session count by therapist template
    this.templates.push({
      id: 'sessions_by_therapist',
      name: 'Sessions by Therapist',
      description: 'Count or list sessions conducted by each therapist',
      patterns: [
        'How many sessions has each therapist conducted?',
        'Which therapist has the most sessions?',
        'Show session counts by therapist',
        'List therapists by number of sessions'
      ],
      sqlTemplate: `
        SELECT 
          t.first_name || ' ' || t.last_name as therapist_name,
          COUNT(s.id) as session_count
        FROM sessions s
        JOIN therapists t ON s.therapist_id = t.id
        WHERE s.session_date >= CURRENT_DATE - interval '{timeframe}'
        GROUP BY t.id, therapist_name
        ORDER BY session_count DESC;
      `,
      parameters: [
        {
          name: 'timeframe',
          description: 'Time period such as "1 month", "3 months", "1 year"',
          type: 'string',
          required: true,
          default: '3 months',
          extractionHints: ['Convert natural language time expressions to PostgreSQL interval format']
        }
      ],
      resultMapping: {
        renameColumns: {
          'therapist_name': 'Therapist',
          'session_count': 'Sessions'
        },
        visualizationType: 'bar'
      }
    });
  }
  
  /**
   * Get all available templates
   */
  getTemplates(): QueryTemplate[] {
    return this.templates;
  }
  
  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): QueryTemplate | undefined {
    return this.templates.find(template => template.id === templateId);
  }
  
  /**
   * Check if a question matches any template and extract parameters
   */
  async processQuestion(question: string): Promise<TemplateMatchResult> {
    try {
      // Prepare template information for matching
      const templateInfo = this.templates.map(template => ({
        id: template.id,
        name: template.name,
        patterns: template.patterns,
        parameters: template.parameters.map(param => ({
          name: param.name,
          type: param.type,
          required: param.required,
          extractionHints: param.extractionHints
        }))
      }));
      
      // Create a prompt for the AI to check for template matches
      const prompt = `
        I have a question from a user: "${question}"
        
        Check if this question matches any of these templates:
        ${JSON.stringify(templateInfo, null, 2)}
        
        Only return a JSON object with:
        - "matched": true/false - whether the question matches any template
        - "templateId": ID of the matching template, if any
        - "parameters": extracted parameter values as an object, if matched
        
        Example responses:
        {"matched":false}
        {"matched":true,"templateId":"clients_by_status","parameters":{"status":"active"}}
      `;
      
      // Call the OpenAI API
      const responseText = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are a template matching assistant. Determine if questions match predefined templates and return only valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      
      try {
        // Parse the JSON response
        const matchResult = JSON.parse(responseText.trim());
        
        // If matched, find the template and fill in the SQL
        if (matchResult.matched && matchResult.templateId) {
          const template = this.getTemplate(matchResult.templateId);
          
          if (!template) {
            return {
              matched: false,
              error: `Template ID "${matchResult.templateId}" not found`
            };
          }
          
          // Check if all required parameters are present
          for (const param of template.parameters) {
            if (param.required && 
                (!matchResult.parameters || 
                 matchResult.parameters[param.name] === undefined || 
                 matchResult.parameters[param.name] === null)) {
              
              // If a required parameter is missing, try to extract it
              if (!matchResult.parameters) {
                matchResult.parameters = {};
              }
              
              if (param.default !== undefined) {
                matchResult.parameters[param.name] = param.default;
              } else {
                // Try to extract the parameter using a more specific prompt
                matchResult.parameters[param.name] = await this.extractParameterValue(
                  question,
                  param,
                  matchResult.templateId
                );
                
                // If still unable to extract, return an error
                if (matchResult.parameters[param.name] === undefined) {
                  return {
                    matched: true,
                    templateId: matchResult.templateId,
                    error: `Required parameter "${param.name}" is missing`
                  };
                }
              }
            }
          }
          
          // Fill in the SQL template with the parameters
          let filledSql = template.sqlTemplate;
          
          for (const [key, value] of Object.entries(matchResult.parameters)) {
            // Make sure to properly escape string values to prevent SQL injection
            const escapedValue = typeof value === 'string' 
              ? value.replace(/'/g, "''") 
              : value;
            
            filledSql = filledSql.replace(new RegExp(`{${key}}`, 'g'), String(escapedValue));
          }
          
          // Remove any optional parameters that weren't provided
          filledSql = filledSql.replace(/WHERE.*?(AND|\))/i, (match) => {
            // Remove conditions with unpopulated parameters
            let cleaned = match.replace(/\{[^}]+\}/g, '');
            // Clean up any leftover logical operators
            cleaned = cleaned.replace(/\s+(AND|OR)\s+(?=(AND|OR|\)))/gi, ' ');
            return cleaned;
          });
          
          // Remove any remaining parameter placeholders
          filledSql = filledSql.replace(/\{[^}]+\}/g, '');
          
          // Return the final result
          return {
            matched: true,
            templateId: matchResult.templateId,
            parameters: matchResult.parameters,
            query: filledSql
          };
        }
        
        // If no match, return result
        return {
          matched: matchResult.matched || false
        };
      } catch (parseError) {
        console.error('[QueryTemplates] Error parsing template match result:', parseError, responseText);
        return {
          matched: false,
          error: 'Failed to parse template match result'
        };
      }
    } catch (error: any) {
      console.error('[QueryTemplates] Error in template processing:', error);
      return {
        matched: false,
        error: `Template processing error: ${error.message}`
      };
    }
  }
  
  /**
   * Extract a specific parameter value from a question
   */
  private async extractParameterValue(
    question: string,
    parameter: TemplateParameter,
    templateId: string
  ): Promise<any> {
    try {
      // Get the template for context
      const template = this.getTemplate(templateId);
      
      if (!template) {
        throw new Error(`Template ID "${templateId}" not found`);
      }
      
      // Create a prompt for parameter extraction
      const prompt = `
        From this question: "${question}"
        
        Extract the "${parameter.name}" parameter value for the "${template.name}" template.
        This parameter is described as: "${parameter.description}"
        
        ${parameter.extractionHints ? 'Extraction hints: ' + parameter.extractionHints.join(', ') : ''}
        
        Only return a JSON object with a single key "${parameter.name}" and its extracted value.
        Example: {"${parameter.name}": "extracted value"}
        
        If you cannot find the parameter value, return: {"${parameter.name}": null}
      `;
      
      // Call the OpenAI API
      const responseText = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are a parameter extraction assistant. Extract parameters from queries and return only valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      
      try {
        // Parse the JSON response
        const extractionResult = JSON.parse(responseText.trim());
        return extractionResult[parameter.name];
      } catch (parseError) {
        console.error('[QueryTemplates] Error parsing parameter extraction result:', parseError);
        return undefined;
      }
    } catch (error) {
      console.error('[QueryTemplates] Error extracting parameter:', error);
      return undefined;
    }
  }
}

// Create singleton instance
export const queryTemplateService = new QueryTemplateService();