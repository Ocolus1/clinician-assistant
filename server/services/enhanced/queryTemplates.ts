/**
 * Query Templates Service
 * 
 * This service provides templated SQL queries for common question patterns,
 * allowing faster and more reliable responses to frequently asked questions.
 */

import { QueryTemplate, TemplateParameter, ResultMapping } from '../../../shared/enhancedAssistantTypes';
import { openaiService } from '../openaiService';

/**
 * Template matching result interface
 */
interface TemplateMatchResult {
  matched: boolean;
  templateId?: string;
  parameters?: Record<string, any>;
  generatedQuery?: string;
  confidence?: number;
}

/**
 * Query Templates Service class
 */
export class QueryTemplateService {
  private templates: QueryTemplate[];
  
  constructor() {
    // Initialize with our predefined templates
    this.templates = [
      // Client count template
      {
        id: 'active_client_count',
        name: 'Active Client Count',
        description: 'Count of all active clients',
        patterns: [
          'How many active clients do we have?',
          'What is the total number of active clients?',
          'Count of all active clients',
          'How many clients with complete onboarding do we have?'
        ],
        sqlTemplate: `
          SELECT COUNT(*) as active_client_count
          FROM clients
          WHERE onboarding_status = 'complete'
        `,
        parameters: [],
        resultMapping: {
          renameColumns: { 'active_client_count': 'Active Clients' }
        }
      },
      
      // Client sessions template
      {
        id: 'client_sessions',
        name: 'Client Sessions',
        description: 'List of sessions for a specific client',
        patterns: [
          'Show me all sessions for client {client}',
          'List all appointments for {client}',
          'What sessions has {client} attended?',
          'Give me a list of {client}\'s therapy sessions'
        ],
        sqlTemplate: `
          SELECT 
            s.id, 
            s.session_date, 
            s.session_type, 
            s.status, 
            s.duration_minutes
          FROM sessions s
          JOIN clients c ON s.client_id = c.id
          WHERE 
            (c.id = '{client}' OR c.name LIKE '%{client}%')
          ORDER BY s.session_date DESC
          LIMIT 20
        `,
        parameters: [
          {
            name: 'client',
            description: 'Client ID or name',
            type: 'string',
            required: true,
            entityType: 'client',
            extractionHints: ['client name', 'client ID', 'patient name', 'patient ID']
          }
        ],
        resultMapping: {
          renameColumns: {
            'session_date': 'Date',
            'session_type': 'Type',
            'status': 'Status',
            'duration_minutes': 'Duration (min)'
          }
        },
        responseTemplate: 'Here are the recent sessions for {client}:'
      },
      
      // Client goal progress template
      {
        id: 'client_goal_progress',
        name: 'Client Goal Progress',
        description: 'Progress on goals for a specific client',
        patterns: [
          'What is {client}\'s progress on goals?',
          'Show me {client}\'s therapy goals',
          'How is {client} progressing toward their goals?',
          'List goals for {client}'
        ],
        sqlTemplate: `
          SELECT 
            g.title,
            g.status,
            g.priority,
            g.created_at,
            g.target_date,
            COUNT(sg.id) as subgoal_count
          FROM goals g
          LEFT JOIN subgoals sg ON g.id = sg.goal_id
          JOIN clients c ON g.client_id = c.id
          WHERE 
            (c.id = '{client}' OR c.name LIKE '%{client}%')
          GROUP BY g.id, g.title, g.status, g.priority, g.created_at, g.target_date
          ORDER BY 
            CASE 
              WHEN g.status = 'in_progress' THEN 1
              WHEN g.status = 'not_started' THEN 2
              WHEN g.status = 'achieved' THEN 3
              ELSE 4
            END,
            CASE 
              WHEN g.priority = 'high' THEN 1
              WHEN g.priority = 'medium' THEN 2
              WHEN g.priority = 'low' THEN 3
              ELSE 4
            END
        `,
        parameters: [
          {
            name: 'client',
            description: 'Client ID or name',
            type: 'string',
            required: true,
            entityType: 'client',
            extractionHints: ['client name', 'client ID', 'patient name', 'patient ID']
          }
        ],
        resultMapping: {
          renameColumns: {
            'title': 'Goal',
            'status': 'Status',
            'priority': 'Priority',
            'created_at': 'Created',
            'target_date': 'Target Date',
            'subgoal_count': 'Subgoals'
          }
        },
        responseTemplate: 'Here is {client}\'s progress on therapy goals:'
      },
      
      // Budget usage template
      {
        id: 'client_budget_usage',
        name: 'Client Budget Usage',
        description: 'Budget usage for a specific client',
        patterns: [
          'Show me budget usage for {client}',
          'What is {client}\'s current budget status?',
          'How much of {client}\'s budget is used?',
          'Display budget items for {client}'
        ],
        sqlTemplate: `
          SELECT 
            bi.name,
            bi.product_code,
            bi.quantity,
            bi.usage,
            (bi.quantity - bi.usage) as remaining,
            ROUND((bi.usage / bi.quantity) * 100, 1) as usage_percentage,
            bi.unit_price,
            bi.total_amount,
            bs.name as budget_name,
            bs.end_date as expiration_date
          FROM budget_items bi
          JOIN budget_settings bs ON bi.budget_settings_id = bs.id
          JOIN clients c ON bs.client_id = c.id
          WHERE 
            (c.id = '{client}' OR c.name LIKE '%{client}%')
            AND bs.active = true
          ORDER BY usage_percentage DESC
        `,
        parameters: [
          {
            name: 'client',
            description: 'Client ID or name',
            type: 'string',
            required: true,
            entityType: 'client',
            extractionHints: ['client name', 'client ID', 'patient name', 'patient ID']
          }
        ],
        resultMapping: {
          renameColumns: {
            'name': 'Service',
            'product_code': 'Code',
            'quantity': 'Total Units',
            'usage': 'Used',
            'remaining': 'Remaining',
            'usage_percentage': 'Usage %',
            'unit_price': 'Unit Price',
            'total_amount': 'Total Amount',
            'budget_name': 'Budget Plan',
            'expiration_date': 'Expires'
          },
          visualizationType: 'bar'
        },
        responseTemplate: 'Here is the current budget usage for {client}:'
      },
      
      // Recent sessions template
      {
        id: 'recent_sessions',
        name: 'Recent Sessions',
        description: 'List of recent therapy sessions across all clients',
        patterns: [
          'Show me recent sessions',
          'List sessions from the past {days} days',
          'Recent therapy appointments',
          'What sessions have happened recently?'
        ],
        sqlTemplate: `
          SELECT 
            s.session_date,
            c.name as client_name,
            s.session_type,
            s.status,
            s.duration_minutes
          FROM sessions s
          JOIN clients c ON s.client_id = c.id
          WHERE 
            s.session_date >= CURRENT_DATE - INTERVAL '{days} days'
          ORDER BY s.session_date DESC
          LIMIT 20
        `,
        parameters: [
          {
            name: 'days',
            description: 'Number of days to look back',
            type: 'number',
            required: false,
            default: 7,
            extractionHints: ['days', 'last few days', 'past week', 'recent']
          }
        ],
        resultMapping: {
          renameColumns: {
            'session_date': 'Date',
            'client_name': 'Client',
            'session_type': 'Type',
            'status': 'Status',
            'duration_minutes': 'Duration (min)'
          }
        },
        responseTemplate: 'Here are the sessions from the past {days} days:'
      },
      
      // Upcoming budget expirations template
      {
        id: 'upcoming_budget_expirations',
        name: 'Upcoming Budget Expirations',
        description: 'List of budgets expiring soon',
        patterns: [
          'Which budgets are expiring soon?',
          'Show me budgets expiring in the next {days} days',
          'List upcoming budget expirations',
          'Which clients have budgets that need renewal?'
        ],
        sqlTemplate: `
          SELECT 
            c.name as client_name,
            bs.name as budget_name,
            bs.end_date as expiration_date,
            bs.total_amount,
            SUM(bi.usage * bi.unit_price) as amount_used,
            SUM((bi.quantity - bi.usage) * bi.unit_price) as amount_remaining
          FROM budget_settings bs
          JOIN clients c ON bs.client_id = c.id
          JOIN budget_items bi ON bs.id = bi.budget_settings_id
          WHERE 
            bs.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '{days} days')
            AND bs.active = true
          GROUP BY c.name, bs.name, bs.end_date, bs.total_amount
          ORDER BY bs.end_date ASC
        `,
        parameters: [
          {
            name: 'days',
            description: 'Number of days to look ahead',
            type: 'number',
            required: false,
            default: 30,
            extractionHints: ['days', 'next few days', 'next month', 'upcoming']
          }
        ],
        resultMapping: {
          renameColumns: {
            'client_name': 'Client',
            'budget_name': 'Budget Plan',
            'expiration_date': 'Expires On',
            'total_amount': 'Total Budget',
            'amount_used': 'Amount Used',
            'amount_remaining': 'Amount Remaining'
          }
        },
        responseTemplate: 'Here are the budgets expiring in the next {days} days:'
      }
    ];
  }
  
  /**
   * Get all query templates
   */
  getTemplates(): QueryTemplate[] {
    return this.templates;
  }
  
  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): QueryTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }
  
  /**
   * Extract parameters from a question using AI
   */
  async extractParameters(question: string, parameters: TemplateParameter[]): Promise<Record<string, any>> {
    // For no parameters, return empty object
    if (parameters.length === 0) {
      return {};
    }
    
    // Prepare extraction prompt
    const parameterDescriptions = parameters.map(param => {
      const hintText = param.extractionHints ? ` (could be referred to as: ${param.extractionHints.join(', ')})` : '';
      return `- ${param.name}: ${param.description}${hintText}`;
    }).join('\n');
    
    const prompt = `
      Extract the following parameters from this question: "${question}"
      
      Parameters to extract:
      ${parameterDescriptions}
      
      For each parameter, provide the extracted value or null if not found.
      Respond in JSON format only, like this:
      {
        "param1": "value1",
        "param2": "value2"
      }
    `;
    
    try {
      const responseText = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are a parameter extraction assistant. Extract parameters from queries and return only valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      
      // Parse the JSON response
      const responseJson = JSON.parse(responseText.replace(/```json|```/g, '').trim());
      
      // Apply defaults for missing parameters
      const result: Record<string, any> = {};
      
      for (const param of parameters) {
        const extractedValue = responseJson[param.name];
        
        if (extractedValue === null || extractedValue === undefined) {
          if (param.required) {
            throw new Error(`Required parameter '${param.name}' not found in question`);
          } else if (param.default !== undefined) {
            result[param.name] = param.default;
          }
        } else {
          result[param.name] = extractedValue;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error extracting parameters:', error);
      
      // Fall back to defaults
      const result: Record<string, any> = {};
      
      for (const param of parameters) {
        if (param.default !== undefined) {
          result[param.name] = param.default;
        } else if (param.required) {
          throw new Error(`Required parameter '${param.name}' not found and no default available`);
        }
      }
      
      return result;
    }
  }
  
  /**
   * Fill a SQL template with extracted parameters
   */
  fillTemplate(template: string, parameters: Record<string, any>): string {
    let filledTemplate = template;
    
    // Replace all parameter placeholders with actual values
    for (const [key, value] of Object.entries(parameters)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      filledTemplate = filledTemplate.replace(regex, String(value));
    }
    
    return filledTemplate;
  }
  
  /**
   * Process a question and determine if it matches any templates
   */
  async processQuestion(question: string): Promise<TemplateMatchResult> {
    try {
      // First, quickly check pattern matches
      for (const template of this.templates) {
        // Direct pattern match
        for (const pattern of template.patterns) {
          // Replace parameter placeholders with wildcards for simpler matching
          const simplifiedPattern = pattern.replace(/\{[^}]+\}/g, '.*');
          
          // Create a regular expression for fuzzy matching
          const regex = new RegExp(simplifiedPattern, 'i');
          
          if (regex.test(question)) {
            // Direct match found, extract parameters
            const parameters = await this.extractParameters(question, template.parameters);
            
            // Fill the SQL template
            const generatedQuery = this.fillTemplate(template.sqlTemplate, parameters);
            
            return {
              matched: true,
              templateId: template.id,
              parameters,
              generatedQuery,
              confidence: 0.9 // High confidence for direct pattern match
            };
          }
        }
      }
      
      // If no direct match, use AI to determine the best template
      const templateDescriptions = this.templates.map(t => 
        `${t.id}: ${t.description}. Examples: ${t.patterns.join(', ')}`
      ).join('\n');
      
      const prompt = `
        Determine which query template best matches this question: "${question}"
        
        Available templates:
        ${templateDescriptions}
        
        Return the template ID only if there's a good match, otherwise return "no_match".
        Include a confidence score between 0 and 1.
        
        Format your response as JSON:
        {
          "templateId": "template_id_or_no_match",
          "confidence": 0.75
        }
      `;
      
      const responseText = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are a template matching assistant. Determine if questions match predefined templates and return only valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      
      // Parse the JSON response
      const responseJson = JSON.parse(responseText.replace(/```json|```/g, '').trim());
      
      const { templateId, confidence } = responseJson;
      
      // Skip if no match or low confidence
      if (templateId === 'no_match' || confidence < 0.7) {
        return { matched: false };
      }
      
      // Find the matched template
      const matchedTemplate = this.getTemplate(templateId);
      
      if (!matchedTemplate) {
        return { matched: false };
      }
      
      // Extract parameters
      const parameters = await this.extractParameters(question, matchedTemplate.parameters);
      
      // Fill the SQL template
      const generatedQuery = this.fillTemplate(matchedTemplate.sqlTemplate, parameters);
      
      return {
        matched: true,
        templateId,
        parameters,
        generatedQuery,
        confidence
      };
    } catch (error) {
      console.error('Error processing template match:', error);
      return { matched: false };
    }
  }
}

// Create singleton instance
export const queryTemplateService = new QueryTemplateService();