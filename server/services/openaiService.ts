/**
 * OpenAI Service
 * 
 * This service handles the integration with the OpenAI API.
 */

import OpenAI from 'openai';

/**
 * OpenAI Service initialization options
 */
interface OpenAIServiceOptions {
  apiKey: string;
  model: string;
  temperature: number;
}

/**
 * OpenAI Service class
 */
export class OpenAIService {
  private client: OpenAI | null = null;
  private model: string = 'gpt-4-turbo-preview';
  private temperature: number = 0.2;

  constructor() {}

  /**
   * Initialize the OpenAI service
   */
  async initialize(options: OpenAIServiceOptions): Promise<void> {
    try {
      this.client = new OpenAI({
        apiKey: options.apiKey,
      });
      
      this.model = options.model || this.model;
      this.temperature = options.temperature ?? this.temperature;
    } catch (error) {
      console.error('Error initializing OpenAI service:', error);
      throw error;
    }
  }

  /**
   * Test the OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Test connection. Please respond with just the word "Connected".' }
        ],
        max_tokens: 10,
      });
      
      return response.choices[0]?.message?.content?.includes('Connected') || false;
    } catch (error) {
      console.error('Error testing OpenAI connection:', error);
      return false;
    }
  }

  /**
   * Generate an SQL query from natural language
   */
  async generateSQL(naturalLanguageQuery: string, databaseSchema: string): Promise<string> {
    try {
      if (!this.client) {
        throw new Error('OpenAI service not initialized');
      }
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a speech therapy database expert who converts natural language queries into SQL.
            
Here is the database schema:
${databaseSchema}

Important rules:
1. ALWAYS return ONLY the SQL query and nothing else.
2. Do not include explanations, markdown formatting, or any other text.
3. Use only READ operations (SELECT) - never use INSERT, UPDATE, DELETE, or any other destructive operations.
4. Make sure the SQL is valid PostgreSQL syntax.
5. When asked about specific clients, sessions, or reports, you should filter by their identifiers or names.
6. Use joins when necessary to link related tables.
7. When uncertain about specifics, make reasonable assumptions based on the database schema.
8. For date filtering, use ISO format (YYYY-MM-DD) and appropriate PostgreSQL date functions.
9. Only reference columns and tables that actually exist in the schema.
10. Always limit results to a reasonable number (typically 100) unless specified otherwise.`
          },
          { role: 'user', content: naturalLanguageQuery }
        ],
        temperature: this.temperature,
      });
      
      const sqlQuery = response.choices[0]?.message?.content?.trim() || '';
      
      if (!sqlQuery) {
        throw new Error('Failed to generate SQL query');
      }
      
      return sqlQuery;
    } catch (error) {
      console.error('Error generating SQL:', error);
      throw error;
    }
  }

  /**
   * Explain SQL query results
   */
  async explainQueryResults(
    naturalLanguageQuery: string, 
    sqlQuery: string, 
    results: any[],
    databaseSchema: string
  ): Promise<string> {
    try {
      if (!this.client) {
        throw new Error('OpenAI service not initialized');
      }
      
      // Format the result data for the prompt
      const resultData = JSON.stringify(results, null, 2);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a speech therapist assistant who explains database query results in natural language.
            
Here is the database schema:
${databaseSchema}

Your task is to explain the results of a database query in a way that's informative and helpful to a speech therapist.
Focus on extracting insights relevant to clinical practice, patient progress, and administrative needs.
Be concise but complete. Organize information in a structured way. Use professional clinical language.
If there are no results, explain why this might be the case based on the query and schema.`
          },
          {
            role: 'user',
            content: `I asked: "${naturalLanguageQuery}"
            
The SQL query used was:
${sqlQuery}

The query returned the following results:
${resultData}

Please explain these results in a clear, professional way. Provide relevant insights for a speech therapist.`
          }
        ],
        temperature: this.temperature,
      });
      
      const explanation = response.choices[0]?.message?.content?.trim() || '';
      
      if (!explanation) {
        throw new Error('Failed to generate explanation');
      }
      
      return explanation;
    } catch (error) {
      console.error('Error explaining results:', error);
      throw error;
    }
  }
}

// Create a singleton instance
let openAIServiceInstance: OpenAIService | null = null;

/**
 * Get the OpenAI Service instance
 */
export function getOpenAIService(): OpenAIService {
  if (!openAIServiceInstance) {
    openAIServiceInstance = new OpenAIService();
  }
  return openAIServiceInstance;
}