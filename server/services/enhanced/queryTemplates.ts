/**
 * Query Templates Service
 * 
 * This service provides predefined query templates for common question patterns.
 * It can identify if a natural language question matches a template and extract
 * parameters to populate the corresponding SQL query.
 */

import { openaiService } from '../openaiService';

/**
 * Definition of a query template
 */
export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  patterns: string[];
  parameters: TemplateParameter[];
  sqlTemplate: string;
}

/**
 * Definition of a template parameter
 */
export interface TemplateParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  defaultValue?: any;
}

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
    this.templates = [
      // Client list template
      {
        id: 'client-list',
        name: 'Client List',
        description: 'Retrieves a list of clients matching certain criteria',
        patterns: [
          'show me all clients',
          'list all clients',
          'who are our clients',
          'show clients with status {status}',
          'show clients assigned to {therapist}'
        ],
        parameters: [
          {
            name: 'status',
            description: 'Filter clients by their status',
            type: 'string',
            required: false
          },
          {
            name: 'therapist',
            description: 'Filter clients by assigned therapist',
            type: 'string',
            required: false
          }
        ],
        sqlTemplate: `
          SELECT 
            c.id, 
            c.first_name, 
            c.last_name, 
            c.status, 
            t.first_name as therapist_first_name, 
            t.last_name as therapist_last_name
          FROM 
            clients c
          LEFT JOIN 
            therapists t ON c.primary_therapist_id = t.id
          WHERE 
            1=1
            {{#if status}} AND c.status = '{{status}}'{{/if}}
            {{#if therapist}} AND (t.first_name ILIKE '%{{therapist}}%' OR t.last_name ILIKE '%{{therapist}}%'){{/if}}
          ORDER BY 
            c.last_name, c.first_name
        `
      },
      
      // Session count template
      {
        id: 'session-count',
        name: 'Session Count',
        description: 'Counts sessions based on various filters',
        patterns: [
          'how many sessions {timeframe}',
          'total sessions {timeframe}',
          'count of sessions {timeframe}',
          'how many sessions did {therapist} complete {timeframe}',
          'session count for {client} {timeframe}'
        ],
        parameters: [
          {
            name: 'timeframe',
            description: 'Time period for sessions',
            type: 'string',
            required: false,
            defaultValue: 'this month'
          },
          {
            name: 'therapist',
            description: 'Filter sessions by therapist',
            type: 'string',
            required: false
          },
          {
            name: 'client',
            description: 'Filter sessions by client',
            type: 'string',
            required: false
          },
          {
            name: 'status',
            description: 'Filter sessions by status',
            type: 'string',
            required: false,
            defaultValue: 'completed'
          }
        ],
        sqlTemplate: `
          SELECT 
            COUNT(*) as session_count
            {{#if groupBy}}, {{groupBy}}{{/if}}
          FROM 
            sessions s
          JOIN 
            clients c ON s.client_id = c.id
          JOIN 
            therapists t ON s.therapist_id = t.id
          WHERE 
            1=1
            {{#if timeframe_days}} AND s.session_date >= CURRENT_DATE - INTERVAL '{{timeframe_days}} days'{{/if}}
            {{#if status}} AND s.status = '{{status}}'{{/if}}
            {{#if therapist}} AND (t.first_name ILIKE '%{{therapist}}%' OR t.last_name ILIKE '%{{therapist}}%'){{/if}}
            {{#if client}} AND (c.first_name ILIKE '%{{client}}%' OR c.last_name ILIKE '%{{client}}%'){{/if}}
          {{#if groupBy}}GROUP BY {{groupBy}}{{/if}}
        `
      },
      
      // Budget utilization template
      {
        id: 'budget-utilization',
        name: 'Budget Utilization',
        description: 'Shows budget utilization for clients',
        patterns: [
          'show budget utilization',
          'which clients have budget below {threshold}',
          'clients with low budget remaining',
          'budget status for {client}',
          'which clients have less than {threshold}% budget remaining'
        ],
        parameters: [
          {
            name: 'threshold',
            description: 'Threshold percentage for low budget',
            type: 'number',
            required: false,
            defaultValue: 20
          },
          {
            name: 'client',
            description: 'Specific client to check budget for',
            type: 'string',
            required: false
          }
        ],
        sqlTemplate: `
          SELECT 
            c.id,
            c.first_name,
            c.last_name,
            b.total_amount,
            b.used_amount,
            b.remaining_amount,
            ROUND((b.used_amount / NULLIF(b.total_amount, 0)) * 100, 1) as utilization_percentage,
            b.expiration_date
          FROM 
            clients c
          JOIN 
            budgets b ON c.id = b.client_id
          WHERE 
            b.active = true
            {{#if threshold}} AND (b.remaining_amount / NULLIF(b.total_amount, 0)) * 100 <= {{threshold}}{{/if}}
            {{#if client}} AND (c.first_name ILIKE '%{{client}}%' OR c.last_name ILIKE '%{{client}}%'){{/if}}
          ORDER BY 
            utilization_percentage DESC
        `
      },
      
      // Goal progress template
      {
        id: 'goal-progress',
        name: 'Goal Progress',
        description: 'Shows progress on therapy goals',
        patterns: [
          'show goal progress for {client}',
          'what goals is {client} working on',
          'has {client} met their goals',
          'goals with status {status}'
        ],
        parameters: [
          {
            name: 'client',
            description: 'Client whose goals to check',
            type: 'string',
            required: false
          },
          {
            name: 'status',
            description: 'Filter goals by status',
            type: 'string',
            required: false
          }
        ],
        sqlTemplate: `
          SELECT 
            c.first_name,
            c.last_name,
            g.title as goal_title,
            g.status as goal_status,
            g.progress_percentage,
            g.target_date,
            g.created_at
          FROM 
            goals g
          JOIN 
            clients c ON g.client_id = c.id
          WHERE 
            1=1
            {{#if client}} AND (c.first_name ILIKE '%{{client}}%' OR c.last_name ILIKE '%{{client}}%'){{/if}}
            {{#if status}} AND g.status = '{{status}}'{{/if}}
          ORDER BY 
            c.last_name, c.first_name, g.created_at DESC
        `
      }
    ];
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
    return this.templates.find(t => t.id === templateId);
  }

  /**
   * Check if a question matches any template and extract parameters
   */
  async processQuestion(question: string): Promise<TemplateMatchResult> {
    try {
      // First try direct pattern matching (faster)
      for (const template of this.templates) {
        const directMatchResult = this.checkSimplePatternMatch(question, template);
        if (directMatchResult.matched) {
          return directMatchResult;
        }
      }
      
      // If no direct match, try AI matching
      return await this.attemptLLMMatching(question);
    } catch (error: any) {
      console.error('[TemplateService] Error processing question:', error);
      return {
        matched: false,
        error: `Error processing template: ${error.message}`
      };
    }
  }

  /**
   * Check if a question directly matches a template pattern
   */
  private checkSimplePatternMatch(question: string, template: QueryTemplate): TemplateMatchResult {
    const normalizedQuestion = question.toLowerCase().trim().replace(/\?/g, '');
    
    for (const pattern of template.patterns) {
      // Convert template pattern to regex
      const paramRegex = /{([^}]+)}/g;
      let regexPattern = pattern.toLowerCase().replace(paramRegex, '(.+)');
      regexPattern = `^${regexPattern.replace(/\s+/g, '\\s+')}$`;
      
      const regex = new RegExp(regexPattern);
      const match = normalizedQuestion.match(regex);
      
      if (match) {
        // Extract parameter values from the match
        const paramMatches = pattern.match(paramRegex) || [];
        const parameters: Record<string, any> = {};
        
        paramMatches.forEach((param, index) => {
          const paramName = param.slice(1, -1); // Remove { and }
          if (match[index + 1]) {
            parameters[paramName] = match[index + 1].trim();
          }
        });
        
        return {
          matched: true,
          templateId: template.id,
          parameters
        };
      }
    }
    
    return { matched: false };
  }

  /**
   * Extract parameters from a question based on template
   */
  private async extractParameters(
    question: string,
    template: QueryTemplate
  ): Promise<Record<string, any>> {
    const parameters: Record<string, any> = {};
    
    // Set default values first
    for (const param of template.parameters) {
      if (param.defaultValue !== undefined) {
        parameters[param.name] = param.defaultValue;
      }
    }
    
    // Extract explicit parameter values
    for (const param of template.parameters) {
      const extractedValue = await this.extractParameterValue(question, param, template);
      if (extractedValue !== null) {
        parameters[param.name] = extractedValue;
      }
    }
    
    // Special handling for timeframe parameter
    if (parameters.timeframe) {
      const timeframe = parameters.timeframe.toLowerCase();
      let timeframe_days = 30; // Default to 30 days
      
      if (timeframe.includes('week') || timeframe.includes('7 day')) {
        timeframe_days = 7;
      } else if (timeframe.includes('month') || timeframe.includes('30 day')) {
        timeframe_days = 30;
      } else if (timeframe.includes('quarter') || timeframe.includes('90 day')) {
        timeframe_days = 90;
      } else if (timeframe.includes('year') || timeframe.includes('365 day')) {
        timeframe_days = 365;
      } else {
        // Try to extract a specific number of days
        const daysMatch = timeframe.match(/(\d+)\s*days?/);
        if (daysMatch && daysMatch[1]) {
          timeframe_days = parseInt(daysMatch[1], 10);
        }
      }
      
      parameters.timeframe_days = timeframe_days;
    }
    
    return parameters;
  }

  /**
   * Extract a specific parameter value from a question
   */
  private async extractParameterValue(
    question: string,
    parameter: TemplateParameter,
    template: QueryTemplate
  ): Promise<any> {
    const paramName = parameter.name;
    const paramType = parameter.type;
    
    // Simple regex-based extraction for common parameters
    switch (paramName) {
      case 'status':
        // Extract status values like 'active', 'completed', etc.
        const statusMatch = question.match(/\b(active|inactive|completed|pending|cancelled|no-show)\b/i);
        if (statusMatch) return statusMatch[1].toLowerCase();
        break;
        
      case 'threshold':
        // Extract percentage or number values
        const percentMatch = question.match(/(\d+)(?:\s*%|\s*percent)/i);
        if (percentMatch) return parseInt(percentMatch[1], 10);
        break;
        
      case 'timeframe':
        return this.extractTimeFrame(question);
        
      case 'client':
        return this.extractClientName(question);
    }
    
    // For more complex extractions, we could use the LLM here
    return null;
  }

  /**
   * Extract a timeframe expression from a question
   */
  private extractTimeFrame(question: string): string {
    const timeFramePatterns = [
      { regex: /\btoday\b/i, value: 'today' },
      { regex: /\byesterday\b/i, value: 'yesterday' },
      { regex: /\bthis\s+week\b/i, value: 'this week' },
      { regex: /\blast\s+week\b/i, value: 'last week' },
      { regex: /\bthis\s+month\b/i, value: 'this month' },
      { regex: /\blast\s+month\b/i, value: 'last month' },
      { regex: /\bthis\s+quarter\b/i, value: 'this quarter' },
      { regex: /\blast\s+quarter\b/i, value: 'last quarter' },
      { regex: /\bthis\s+year\b/i, value: 'this year' },
      { regex: /\blast\s+year\b/i, value: 'last year' },
      { regex: /\bpast\s+(\d+)\s+days\b/i, values: (match: RegExpMatchArray) => `past ${match[1]} days` },
      { regex: /\bpast\s+(\d+)\s+weeks\b/i, values: (match: RegExpMatchArray) => `past ${match[1]} weeks` },
      { regex: /\bpast\s+(\d+)\s+months\b/i, values: (match: RegExpMatchArray) => `past ${match[1]} months` }
    ];
    
    for (const pattern of timeFramePatterns) {
      const match = question.match(pattern.regex);
      if (match) {
        if (typeof pattern.value === 'string') {
          return pattern.value;
        } else if (typeof pattern.values === 'function') {
          return pattern.values(match);
        }
      }
    }
    
    // Default to "this month" if no timeframe is specified
    return 'this month';
  }

  /**
   * Extract number of days from a question
   */
  private extractNumberOfDays(question: string): number {
    // Default values for common time periods
    if (question.includes('today')) return 1;
    if (question.includes('this week') || question.includes('past week')) return 7;
    if (question.includes('this month') || question.includes('past month')) return 30;
    if (question.includes('this quarter') || question.includes('past quarter')) return 90;
    if (question.includes('this year') || question.includes('past year')) return 365;
    
    // Try to extract a specific number of days
    const daysMatch = question.match(/past\s+(\d+)\s+days/i);
    if (daysMatch && daysMatch[1]) {
      return parseInt(daysMatch[1], 10);
    }
    
    // Try to extract a specific number of weeks
    const weeksMatch = question.match(/past\s+(\d+)\s+weeks/i);
    if (weeksMatch && weeksMatch[1]) {
      return parseInt(weeksMatch[1], 10) * 7;
    }
    
    // Try to extract a specific number of months
    const monthsMatch = question.match(/past\s+(\d+)\s+months/i);
    if (monthsMatch && monthsMatch[1]) {
      return parseInt(monthsMatch[1], 10) * 30;
    }
    
    // Default to 30 days if no timeframe is specified
    return 30;
  }

  /**
   * Extract client name from a question
   */
  private extractClientName(question: string): string | null {
    // Look for client name patterns
    // This is simplified - a real implementation would check against the database of client names
    const clientMatch = question.match(/\b(?:client|patient)\s+(?:named\s+)?["']?([a-zA-Z]+(?:\s+[a-zA-Z]+)?)["']?/i);
    if (clientMatch && clientMatch[1]) {
      return clientMatch[1];
    }
    
    // Try to find a name after "for" pattern
    const forMatch = question.match(/\bfor\s+["']?([a-zA-Z]+(?:\s+[a-zA-Z]+)?)["']?/i);
    if (forMatch && forMatch[1]) {
      // Check if the match is not a common word like "for all" or "for active"
      const commonWords = ['all', 'active', 'inactive', 'each', 'every', 'any', 'some', 'most', 'this', 'that'];
      if (!commonWords.includes(forMatch[1].toLowerCase())) {
        return forMatch[1];
      }
    }
    
    return null;
  }

  /**
   * Validate that all required parameters are present
   */
  private validateParameters(
    parameters: Record<string, any>,
    template: QueryTemplate
  ): { valid: boolean; missingParams: string[] } {
    const missingParams: string[] = [];
    
    for (const param of template.parameters) {
      if (param.required && 
          (parameters[param.name] === undefined || parameters[param.name] === null)) {
        missingParams.push(param.name);
      }
    }
    
    return {
      valid: missingParams.length === 0,
      missingParams
    };
  }

  /**
   * Generate SQL query by replacing parameter placeholders
   */
  private generateQuery(
    template: QueryTemplate,
    parameters: Record<string, any>
  ): string {
    let query = template.sqlTemplate;
    
    // Simple Handlebars-like template replacement
    // Replace {{#if parameter}} content {{/if}}
    const ifRegex = /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
    query = query.replace(ifRegex, (match, parameter, content) => {
      const paramValue = parameters[parameter];
      return paramValue ? content : '';
    });
    
    // Replace {{parameter}} with actual values
    const paramRegex = /{{([^}]+)}}/g;
    query = query.replace(paramRegex, (match, parameter) => {
      const value = parameters[parameter];
      
      if (value === undefined || value === null) {
        return '';
      }
      
      // Escape single quotes in string values
      if (typeof value === 'string') {
        return value.replace(/'/g, "''");
      }
      
      return value.toString();
    });
    
    // Clean up the query - remove extra whitespace and empty lines
    return query
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Attempt to match question using LLM
   */
  private async attemptLLMMatching(question: string): Promise<TemplateMatchResult> {
    try {
      // Create a prompt for the LLM to identify the template and extract parameters
      const templateInfo = this.templates.map(template => {
        return `
Template ID: ${template.id}
Name: ${template.name}
Description: ${template.description}
Example patterns:
${template.patterns.map(p => `- ${p}`).join('\n')}
Parameters: ${template.parameters.map(p => p.name).join(', ')}
`;
      }).join('\n');
      
      const prompt = `
Determine if the following question matches one of our query templates, and extract any relevant parameters:

Question: "${question}"

Available templates:
${templateInfo}

Instructions:
1. If the question matches a template, identify the template ID
2. Extract values for any parameters mentioned in the question
3. If the question doesn't match any template, indicate NO_MATCH

Your response must be in this exact JSON format:
{
  "matched": true/false,
  "templateId": "template-id", // if matched
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
`;
      
      const response = await openaiService.createChatCompletion([
        { role: 'system', content: 'You are a template matching assistant.' },
        { role: 'user', content: prompt }
      ]);
      
      // Extract and parse the JSON response
      const jsonMatch = response.match(/({[\s\S]*})/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const result = JSON.parse(jsonMatch[1]);
          
          if (result.matched && result.templateId) {
            // Get the template
            const template = this.getTemplate(result.templateId);
            if (!template) {
              return {
                matched: false,
                error: `Template ${result.templateId} not found`
              };
            }
            
            // Validate parameters
            const validation = this.validateParameters(result.parameters, template);
            if (!validation.valid) {
              return {
                matched: false,
                error: `Missing required parameters: ${validation.missingParams.join(', ')}`
              };
            }
            
            // Generate the query
            const query = this.generateQuery(template, result.parameters);
            
            return {
              matched: true,
              templateId: result.templateId,
              parameters: result.parameters,
              query
            };
          }
        } catch (e) {
          console.error('[TemplateService] Error parsing LLM response:', e);
        }
      }
      
      // If we reach here, no valid template was matched
      return { matched: false };
    } catch (error) {
      console.error('[TemplateService] Error in LLM template matching:', error);
      return { matched: false };
    }
  }
}

// Create singleton instance
export const queryTemplateService = new QueryTemplateService();