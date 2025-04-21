/**
 * Schema Metadata Service
 * 
 * This service provides enhanced schema metadata with business context
 * for the natural language query processor. It includes table and column
 * descriptions, relationships, and business domain knowledge.
 */

import { sql } from '../../db';
import { TableMetadata, ColumnMetadata, RelationshipMetadata } from '@shared/enhancedAssistantTypes';
import { openaiService } from '../openaiService';

/**
 * Service for managing database schema metadata
 */
export class SchemaMetadataService {
  private schemaCache: TableMetadata[] | null = null;
  private schemaWithContextCache: TableMetadata[] | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds
  
  constructor() {}
  
  /**
   * Get schema metadata for compatibility with other components
   * This is an alias for getSchemaMetadata for backward compatibility
   */
  async getSchema(): Promise<TableMetadata[]> {
    return this.getSchemaMetadata();
  }

  /**
   * Get schema metadata with business context
   */
  async getSchemaWithBusinessContext(): Promise<TableMetadata[]> {
    try {
      // Check if we have a valid cache
      if (this.schemaWithContextCache && (Date.now() - this.lastCacheTime < this.CACHE_TTL)) {
        return this.schemaWithContextCache;
      }
      
      // Get basic schema information
      const schema = await this.getSchemaMetadata();
      
      // Enrich with business context
      const enrichedSchema = await this.enrichSchemaWithContext(schema);
      
      // Update cache
      this.schemaWithContextCache = enrichedSchema;
      this.lastCacheTime = Date.now();
      
      return enrichedSchema;
    } catch (error) {
      console.error('[SchemaMetadata] Error getting schema with business context:', error);
      throw error;
    }
  }
  
  /**
   * Get basic schema metadata without business context
   */
  async getSchemaMetadata(): Promise<TableMetadata[]> {
    try {
      // Check if we have a valid cache
      if (this.schemaCache && (Date.now() - this.lastCacheTime < this.CACHE_TTL)) {
        return this.schemaCache;
      }
      
      // Fetch table metadata
      const tables = await this.fetchTableMetadata();
      
      // For each table, fetch column metadata
      for (const table of tables) {
        table.columns = await this.fetchColumnMetadata(table.name);
        table.relationships = await this.fetchRelationships(table.name);
      }
      
      // Update cache
      this.schemaCache = tables;
      this.lastCacheTime = Date.now();
      
      return tables;
    } catch (error) {
      console.error('[SchemaMetadata] Error fetching schema metadata:', error);
      throw error;
    }
  }
  
  /**
   * Fetch table metadata from database
   */
  private async fetchTableMetadata(): Promise<TableMetadata[]> {
    try {
      const query = `
        SELECT 
          table_name as name,
          table_name as "displayName", 
          obj_description(('"' || table_schema || '"."' || table_name || '"')::regclass) as description
        FROM 
          information_schema.tables
        WHERE 
          table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('_prisma_migrations', 'drizzle_migrations', 'spatial_ref_sys')
        ORDER BY 
          table_name;
      `;
      
      console.log('[SchemaMetadata] Fetching table metadata');
      const results = await sql.unsafe(query);
      
      // Process results into TableMetadata format
      return results.map(row => ({
        name: row.name,
        displayName: this.formatDisplayName(row.displayName),
        description: row.description || `Table containing ${this.formatDisplayName(row.displayName.toLowerCase())} data`,
        primaryKey: [], // Will be populated later
        columns: []
      }));
    } catch (error) {
      console.error('[SchemaMetadata] Error fetching table metadata:', error);
      throw error;
    }
  }
  
  /**
   * Fetch column metadata for a table
   */
  private async fetchColumnMetadata(tableName: string): Promise<ColumnMetadata[]> {
    try {
      const query = `
        SELECT 
          column_name as name,
          column_name as "displayName",
          data_type as type,
          is_nullable = 'YES' as "isNullable",
          col_description(('"' || table_schema || '"."' || table_name || '"')::regclass, ordinal_position) as description
        FROM 
          information_schema.columns
        WHERE 
          table_schema = 'public' 
          AND table_name = $1
        ORDER BY 
          ordinal_position;
      `;
      
      const results = await sql.unsafe(`${query.replace('$1', "'" + tableName + "'")}`);
      
      // Process results into ColumnMetadata format
      return results.map(row => ({
        name: row.name,
        displayName: this.formatDisplayName(row.displayName),
        description: row.description || `The ${this.formatDisplayName(row.displayName.toLowerCase())} of the ${this.formatDisplayName(tableName.toLowerCase())}`,
        type: row.type,
        isNullable: row.isNullable
      }));
    } catch (error) {
      console.error(`[SchemaMetadata] Error fetching column metadata for table ${tableName}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch relationships for a table
   */
  private async fetchRelationships(tableName: string): Promise<RelationshipMetadata[]> {
    try {
      const query = `
        SELECT
          tc.constraint_name as name,
          tc.table_name as table_name,
          kcu.column_name as column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE 
          tc.constraint_type = 'FOREIGN KEY' 
          AND (tc.table_name = $1 OR ccu.table_name = $1)
          AND tc.table_schema = 'public';
      `;
      
      const results = await sql.unsafe(`${query.replace('$1', "'" + tableName + "'")}`);
      
      // Process results into RelationshipMetadata format
      return results.map(row => {
        const isManyToOne = row.table_name === tableName;
        const sourceTable = isManyToOne ? row.table_name : row.foreign_table_name;
        const targetTable = isManyToOne ? row.foreign_table_name : row.table_name;
        const sourceColumn = isManyToOne ? row.column_name : row.foreign_column_name;
        const targetColumn = isManyToOne ? row.foreign_column_name : row.column_name;
        
        return {
          name: row.name,
          description: `${this.formatDisplayName(sourceTable)} is related to ${this.formatDisplayName(targetTable)}`,
          sourceColumn,
          targetTable,
          targetColumn,
          type: isManyToOne ? 'many-to-one' : 'one-to-many'
        };
      });
    } catch (error) {
      console.error(`[SchemaMetadata] Error fetching relationships for table ${tableName}:`, error);
      return []; // Return empty array on error so we can still continue
    }
  }
  
  /**
   * Enrich schema with business context
   */
  private async enrichSchemaWithContext(schema: TableMetadata[]): Promise<TableMetadata[]> {
    try {
      // Create a deep copy of the schema
      const enrichedSchema = JSON.parse(JSON.stringify(schema));
      
      // Add business context to each table and its columns
      for (const table of enrichedSchema) {
        // Get business context for the table
        table.businessContext = await this.generateBusinessContext(table);
        
        // Generate sample questions for this table
        table.sampleQueries = await this.generateSampleQueries(table);
        
        // Get business context for each column
        for (const column of table.columns) {
          column.businessContext = await this.generateColumnBusinessContext(table, column);
          
          // If the column looks like an enum, try to determine possible values
          if (column.name.includes('status') || 
              column.name.includes('type') || 
              column.name.includes('category') ||
              column.name.endsWith('_state')) {
            column.values = await this.inferPossibleValues(table.name, column.name);
          }
        }
      }
      
      return enrichedSchema;
    } catch (error) {
      console.error('[SchemaMetadata] Error enriching schema with context:', error);
      return schema; // Return original schema on error
    }
  }
  
  /**
   * Generate business context for a table
   */
  private async generateBusinessContext(table: TableMetadata): Promise<string[]> {
    // For now, return hard-coded business context based on table name
    // In a production system, this would be generated by an LLM or stored in a configuration
    const contextMap: Record<string, string[]> = {
      clients: [
        'Clients are the patients receiving speech therapy services',
        'Each client can have multiple sessions, goals, and budget items',
        'Important client attributes include status (active/inactive), insurance details, and demographic information',
        'Clients are typically assigned to a primary therapist'
      ],
      therapists: [
        'Therapists are the healthcare providers delivering speech therapy services',
        'Each therapist can have multiple clients and sessions',
        'Therapists have specialties and certifications that determine which clients they work with',
        'Therapist productivity is measured by billable hours and session counts'
      ],
      sessions: [
        'Sessions represent individual therapy appointments',
        'Each session is linked to exactly one client and one therapist',
        'Sessions have a status (scheduled, completed, cancelled, no-show)',
        'Completed sessions typically have notes and associated service codes for billing'
      ],
      budgets: [
        'Budgets track financial allocations for client services',
        'Each client can have multiple budget sources (insurance, self-pay, grant)',
        'Budget utilization tracks how much of allocated services have been used',
        'Budget items have start and end dates that define their validity period'
      ],
      goals: [
        'Goals represent therapeutic objectives for clients',
        'Each goal can have multiple sub-goals or targets',
        'Goals have a status (active, completed, discontinued)',
        'Goal progress is tracked through session notes and assessments'
      ],
      reports: [
        'Reports document client progress or assessments',
        'Reports are typically created at regular intervals or after specific milestones',
        'Each report is linked to a client and authored by a therapist',
        'Reports may reference multiple goals and sessions'
      ]
    };
    
    // Return context if we have it, otherwise generate a generic one
    return contextMap[table.name.toLowerCase()] || [
      `${this.formatDisplayName(table.name)} stores information related to the clinical practice`,
      `This table contains data that is used in clinical operations`
    ];
  }
  
  /**
   * Generate business context for a column
   */
  private async generateColumnBusinessContext(
    table: TableMetadata, 
    column: ColumnMetadata
  ): Promise<string[]> {
    // For now, return hard-coded business context for common columns
    // In a production system, this would be generated by an LLM or stored in a configuration
    const columnKey = `${table.name.toLowerCase()}.${column.name.toLowerCase()}`;
    
    const contextMap: Record<string, string[]> = {
      'clients.status': [
        'Indicates whether the client is currently receiving services',
        'Common values include "active", "inactive", "on-hold", and "discharged"',
        'Inactive clients are not currently scheduled for appointments'
      ],
      'sessions.status': [
        'Indicates the current state of a therapy session',
        'Common values include "scheduled", "completed", "cancelled", and "no-show"',
        'Only completed sessions count toward utilization and billing'
      ],
      'budgets.total_amount': [
        'The total monetary amount allocated for services',
        'Typically measured in the local currency (USD)',
        'May represent insurance authorization, grant funding, or private pay amount'
      ],
      'budgets.remaining_amount': [
        'The remaining monetary amount available for services',
        'Updated after each billable session',
        'Alerts are typically generated when this falls below threshold'
      ]
    };
    
    return contextMap[columnKey] || [];
  }
  
  /**
   * Generate sample questions for a table
   */
  private async generateSampleQueries(table: TableMetadata): Promise<string[]> {
    // For now, return hard-coded sample questions based on table name
    // In a production system, this would be generated by an LLM or stored in a configuration
    const questionsMap: Record<string, string[]> = {
      clients: [
        'How many active clients do we have?',
        'Which clients have sessions scheduled next week?',
        'Show me clients with expiring budgets this month',
        'List clients assigned to therapist Smith'
      ],
      therapists: [
        'Which therapist completed the most sessions last month?',
        'How many clients does each therapist have?',
        'Show therapists with specialty in fluency disorders',
        'What is the average caseload per therapist?'
      ],
      sessions: [
        'How many sessions were completed last week?',
        'What is our cancellation rate this month?',
        'Which client had the most sessions in the past quarter?',
        'Show sessions with incomplete documentation'
      ],
      budgets: [
        'Which clients have less than 20% of their budget remaining?',
        'How many budget authorizations expire next month?',
        'What is the total value of all active budgets?',
        'Which insurance provider has the highest average authorization amount?'
      ]
    };
    
    return questionsMap[table.name.toLowerCase()] || [
      `List all ${table.name.toLowerCase()}`,
      `How many ${table.name.toLowerCase()} do we have?`,
      `What is the most common ${table.name.toLowerCase()} type?`
    ];
  }
  
  /**
   * Infer possible values for enum-like columns
   */
  private async inferPossibleValues(tableName: string, columnName: string): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT ${columnName} 
        FROM ${tableName}
        WHERE ${columnName} IS NOT NULL
        LIMIT 20;
      `;
      
      const results = await sql.unsafe(query);
      
      // Extract unique values
      return results
        .map(row => String(row[columnName]))
        .filter(value => value && value.trim() !== '');
    } catch (error) {
      console.error(`[SchemaMetadata] Error inferring possible values for ${tableName}.${columnName}:`, error);
      return [];
    }
  }
  
  /**
   * Format a snake_case or camelCase string as a readable display name
   */
  private formatDisplayName(name: string): string {
    // Convert snake_case or camelCase to Title Case
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }
}

// Create singleton instance
export const schemaMetadataService = new SchemaMetadataService();