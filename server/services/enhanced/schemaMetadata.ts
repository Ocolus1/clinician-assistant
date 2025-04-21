/**
 * Schema Metadata Service
 * 
 * This service provides enhanced database schema metadata for the clinician assistant,
 * including business context and relationships between tables.
 */

import { TableMetadata, ColumnMetadata, RelationshipMetadata } from '@shared/enhancedAssistantTypes';
import { sql } from '../../db';

/**
 * Schema Metadata Service class
 */
export class SchemaMetadataService {
  private schemaCache: TableMetadata[] | null = null;
  private businessContextCache: TableMetadata[] | null = null;
  private cacheExpirationTime: number = 1000 * 60 * 60; // 1 hour
  private lastCacheTime: number = 0;
  
  /**
   * Get basic database schema metadata
   */
  async getSchema(): Promise<TableMetadata[]> {
    // Check cache first
    if (this.schemaCache && (Date.now() - this.lastCacheTime) < this.cacheExpirationTime) {
      return this.schemaCache;
    }
    
    try {
      // Fetch table information from Postgres information schema
      const tables = await this.fetchTableMetadata();
      
      // Cache the result
      this.schemaCache = tables;
      this.lastCacheTime = Date.now();
      
      return tables;
    } catch (error) {
      console.error('[SchemaMetadata] Error fetching schema metadata:', error);
      
      // Return empty schema if we can't fetch it
      return [];
    }
  }
  
  /**
   * Get schema metadata with business context
   */
  async getSchemaWithBusinessContext(): Promise<TableMetadata[]> {
    // Check cache first
    if (this.businessContextCache && (Date.now() - this.lastCacheTime) < this.cacheExpirationTime) {
      return this.businessContextCache;
    }
    
    try {
      // Fetch basic schema first
      const basicSchema = await this.getSchema();
      
      // Enhance with business context
      const enhancedSchema = this.addBusinessContext(basicSchema);
      
      // Cache the result
      this.businessContextCache = enhancedSchema;
      
      return enhancedSchema;
    } catch (error) {
      console.error('[SchemaMetadata] Error enhancing schema with business context:', error);
      
      // Fall back to basic schema
      return this.schemaCache || [];
    }
  }
  
  /**
   * Check if a table exists in the schema
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const schema = await this.getSchema();
      return schema.some(table => table.name.toLowerCase() === tableName.toLowerCase());
    } catch (error) {
      console.error('[SchemaMetadata] Error checking if table exists:', error);
      return false;
    }
  }
  
  /**
   * Get metadata for a specific table
   */
  async getTableMetadata(tableName: string): Promise<TableMetadata | null> {
    try {
      const schema = await this.getSchemaWithBusinessContext();
      return schema.find(table => table.name.toLowerCase() === tableName.toLowerCase()) || null;
    } catch (error) {
      console.error('[SchemaMetadata] Error getting table metadata:', error);
      return null;
    }
  }
  
  /**
   * Fetch table metadata from database
   */
  private async fetchTableMetadata(): Promise<TableMetadata[]> {
    try {
      // Get all tables
      const tablesQuery = `
        SELECT 
          table_name 
        FROM 
          information_schema.tables 
        WHERE 
          table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY
          table_name;
      `;
      
      const tables = await sql`${tablesQuery}`;
      
      // For each table, get columns and primary keys
      const tableMetadata: TableMetadata[] = [];
      
      for (const tableRow of tables) {
        const tableName = tableRow.table_name;
        
        // Get columns
        const columnsQuery = `
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM 
            information_schema.columns 
          WHERE 
            table_schema = 'public' 
            AND table_name = $1
          ORDER BY
            ordinal_position;
        `;
        
        const columns = await sql`
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM 
            information_schema.columns 
          WHERE 
            table_schema = 'public' 
            AND table_name = ${tableName}
          ORDER BY
            ordinal_position;
        `;
        
        // Get primary keys
        const primaryKeysQuery = `
          SELECT 
            c.column_name
          FROM 
            information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
            JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
              AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
          WHERE 
            tc.constraint_type = 'PRIMARY KEY' 
            AND tc.table_name = $1;
        `;
        
        const primaryKeys = await sql`
          SELECT 
            c.column_name
          FROM 
            information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
            JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
              AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
          WHERE 
            tc.constraint_type = 'PRIMARY KEY' 
            AND tc.table_name = ${tableName};
        `;
        const primaryKeyArray = primaryKeys.map((pk: any) => pk.column_name);
        
        // Create column metadata
        const columnMetadata: ColumnMetadata[] = columns.map((col: any) => ({
          name: col.column_name,
          displayName: this.formatDisplayName(col.column_name),
          description: this.generateColumnDescription(col.column_name, col.data_type),
          type: col.data_type,
          isNullable: col.is_nullable === 'YES'
        }));
        
        // Create table metadata
        tableMetadata.push({
          name: tableName,
          displayName: this.formatDisplayName(tableName),
          description: this.generateTableDescription(tableName),
          primaryKey: primaryKeyArray,
          columns: columnMetadata
        });
      }
      
      // Fetch foreign key relationships
      const relationshipsQuery = `
        SELECT
          tc.table_name as source_table, 
          kcu.column_name as source_column, 
          ccu.table_name AS target_table,
          ccu.column_name AS target_column
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY';
      `;
      
      const relationships = await sql`
        SELECT
          tc.table_name as source_table, 
          kcu.column_name as source_column, 
          ccu.table_name AS target_table,
          ccu.column_name AS target_column
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY';
      `;
      
      // Add relationships to tables
      for (const rel of relationships) {
        const sourceTable = tableMetadata.find(t => t.name === rel.source_table);
        const targetTable = tableMetadata.find(t => t.name === rel.target_table);
        
        if (sourceTable && targetTable) {
          if (!sourceTable.relationships) {
            sourceTable.relationships = [];
          }
          
          // Determine relationship type
          let relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many' = 'many-to-one';
          
          // If the source column is part of a primary key, it's likely one-to-one
          if (sourceTable.primaryKey.includes(rel.source_column)) {
            relationType = 'one-to-one';
          }
          
          sourceTable.relationships.push({
            name: `${rel.source_table}_${rel.source_column}_to_${rel.target_table}`,
            targetTable: rel.target_table,
            type: relationType,
            sourceColumn: rel.source_column,
            targetColumn: rel.target_column,
            description: this.generateRelationshipDescription(
              rel.source_table, 
              rel.source_column, 
              rel.target_table, 
              rel.target_column
            )
          });
        }
      }
      
      return tableMetadata;
    } catch (error) {
      console.error('[SchemaMetadata] Error fetching table metadata:', error);
      return [];
    }
  }
  
  /**
   * Add business context to schema metadata
   */
  private addBusinessContext(schema: TableMetadata[]): TableMetadata[] {
    // Deep clone the schema
    const enhancedSchema: TableMetadata[] = JSON.parse(JSON.stringify(schema));
    
    // Add business context to tables and columns
    for (const table of enhancedSchema) {
      // Add table-level business context
      table.businessContext = this.getTableBusinessContext(table.name);
      table.sampleQueries = this.getTableSampleQueries(table.name);
      
      // Add column-level business context
      for (const column of table.columns) {
        column.businessContext = this.getColumnBusinessContext(table.name, column.name);
        
        // Add sample values for enum-like columns
        if (this.isEnumLikeColumn(table.name, column.name)) {
          column.values = this.getEnumValues(table.name, column.name);
        }
      }
    }
    
    return enhancedSchema;
  }
  
  /**
   * Format a column or table name for display
   */
  private formatDisplayName(name: string): string {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Generate a description for a table
   */
  private generateTableDescription(tableName: string): string {
    // Define descriptions for common tables
    const tableDescriptions: Record<string, string> = {
      clients: 'Stores information about therapy clients, including personal details and therapy-related data.',
      therapists: 'Contains records of therapists and clinicians, including their specializations and contact information.',
      appointments: 'Records of scheduled therapy sessions, including date, time, and status.',
      sessions: 'Detailed information about completed therapy sessions, including progress notes and outcomes.',
      budget_settings: 'Configuration data for client budget plans, including authorized hours and billing parameters.',
      budget_items: 'Individual line items within a client\'s budget, representing services or products with allocated funds.',
      assessments: 'Clinical assessments and evaluations performed on clients, including scores and recommendations.',
      notes: 'Clinical notes and observations recorded by therapists during or after sessions.',
      products: 'Therapy products, services, and billable items offered by the practice.',
      insurance_plans: 'Details about insurance plans accepted by the practice, including coverage limits and requirements.',
      goals: 'Therapy goals set for clients, including descriptions and target outcomes.',
      payments: 'Records of financial transactions related to therapy services.',
      documents: 'Client-related documents such as reports, prescriptions, and therapy materials.',
      progress_reports: 'Periodic reports documenting client progress toward therapy goals.',
      users: 'System users including clinicians, administrative staff, and application administrators.'
    };
    
    return tableDescriptions[tableName] || `Table containing ${this.formatDisplayName(tableName)} data.`;
  }
  
  /**
   * Generate a description for a column
   */
  private generateColumnDescription(columnName: string, dataType: string): string {
    // Common column descriptions based on naming patterns
    if (columnName === 'id') return 'Unique identifier for the record.';
    if (columnName === 'created_at') return 'Timestamp when the record was created.';
    if (columnName === 'updated_at') return 'Timestamp when the record was last updated.';
    if (columnName === 'deleted_at') return 'Timestamp when the record was soft-deleted (null if active).';
    if (columnName.endsWith('_id')) {
      const relatedEntity = columnName.replace('_id', '');
      return `Foreign key reference to the ${this.formatDisplayName(relatedEntity)} table.`;
    }
    if (columnName.includes('name')) return 'Name or title.';
    if (columnName.includes('email')) return 'Email address.';
    if (columnName.includes('phone')) return 'Phone number.';
    if (columnName.includes('address')) return 'Physical address.';
    if (columnName.includes('status')) return 'Current status.';
    if (columnName.includes('description')) return 'Detailed description or notes.';
    if (columnName.includes('date')) return 'Date value.';
    if (columnName.includes('time')) return 'Time value.';
    if (columnName.includes('amount')) return 'Monetary or numeric amount.';
    if (columnName.includes('price')) return 'Price or cost value.';
    if (columnName.includes('type')) return 'Type or category.';
    if (columnName.includes('code')) return 'Identifying code or reference number.';
    
    // Generic description based on data type
    return `${this.formatDisplayName(columnName)} (${dataType}).`;
  }
  
  /**
   * Generate a description for a relationship
   */
  private generateRelationshipDescription(
    sourceTable: string, 
    sourceColumn: string, 
    targetTable: string, 
    targetColumn: string
  ): string {
    const sourceEntity = sourceTable.endsWith('s') ? sourceTable.slice(0, -1) : sourceTable;
    const targetEntity = targetTable.endsWith('s') ? targetTable.slice(0, -1) : targetTable;
    
    return `A ${sourceEntity} is associated with a ${targetEntity} through the ${sourceColumn} field referencing ${targetTable}.${targetColumn}.`;
  }
  
  /**
   * Get business context for a table
   */
  private getTableBusinessContext(tableName: string): string[] {
    // Define business context for common tables
    const tableContext: Record<string, string[]> = {
      clients: [
        'Clients are individuals receiving therapy services.',
        'Each client may have multiple budget plans, goals, and sessions.',
        'Demographics information is used for reporting and billing purposes.',
        'Status fields track whether a client is active, on hold, or discharged.'
      ],
      therapists: [
        'Therapists are clinical providers who deliver services to clients.',
        'They have specializations and certifications in various therapy approaches.',
        'Therapists may have assigned caseloads of clients.',
        'Availability is tracked for scheduling purposes.'
      ],
      appointments: [
        'Appointments represent scheduled therapy sessions.',
        'They have statuses like scheduled, confirmed, completed, or cancelled.',
        'Appointments link to specific therapists, clients, and locations.',
        'They contain time, date, and duration information.'
      ],
      sessions: [
        'Sessions represent completed therapy appointments.',
        'They contain billable time information and clinical notes.',
        'Each session may use multiple product codes for billing.',
        'Sessions directly impact budget utilization.'
      ],
      budget_settings: [
        'Budget settings define the overall parameters for a client\'s therapy budget.',
        'They include authorization periods, funding sources, and total allocated amounts.',
        'A client can have multiple budget settings over time.',
        'Budget settings determine which services are billable.'
      ],
      budget_items: [
        'Budget items are specific allocations within a budget plan.',
        'They relate to specific product codes or service types.',
        'Each budget item has a quantity, rate, and total value.',
        'Budget items track utilization against authorized amounts.'
      ],
      goals: [
        'Goals represent therapeutic objectives for clients.',
        'They have descriptions, target dates, and status tracking.',
        'Goals are typically organized into short-term and long-term categories.',
        'Progress toward goals is documented in session notes and assessments.'
      ]
    };
    
    return tableContext[tableName] || [];
  }
  
  /**
   * Get sample queries for a table
   */
  private getTableSampleQueries(tableName: string): string[] {
    // Define sample queries for common tables
    const tableSampleQueries: Record<string, string[]> = {
      clients: [
        'How many active clients do we have?',
        'Which clients have upcoming appointments this week?',
        'List clients with expiring budgets in the next 30 days',
        'What\'s the average age of our pediatric clients?'
      ],
      therapists: [
        'Which therapists are available on Mondays?',
        'What\'s the average caseload size per therapist?',
        'List therapists with speech therapy certification',
        'Who has the highest client satisfaction rating?'
      ],
      sessions: [
        'How many sessions were conducted last month?',
        'What\'s the average session duration?',
        'Which client had the most sessions this quarter?',
        'List sessions with billing issues'
      ],
      budget_items: [
        'What\'s the total remaining budget for client #123?',
        'Which clients have used more than 80% of their allocated therapy hours?',
        'List budget items expiring within 30 days',
        'What\'s the average utilization rate across all active budgets?'
      ],
      goals: [
        'How many goals were achieved in the last quarter?',
        'Which clients have overdue goal reviews?',
        'List goals related to communication skills',
        'What\'s the average time to complete articulation goals?'
      ]
    };
    
    return tableSampleQueries[tableName] || [];
  }
  
  /**
   * Get business context for a column
   */
  private getColumnBusinessContext(tableName: string, columnName: string): string[] {
    // Define business context for specific columns
    const columnKey = `${tableName}.${columnName}`;
    const columnContext: Record<string, string[]> = {
      'clients.status': [
        'Active status means the client is currently receiving services.',
        'On Hold status indicates temporary pause in services.',
        'Discharged means therapy has been completed.',
        'Inactive means the client is not currently receiving services but may return.'
      ],
      'sessions.billable_time': [
        'Billable time is the portion of a session that can be charged to insurance or other payers.',
        'It typically excludes administrative tasks or documentation time.',
        'Measured in minutes and used for calculating budget utilization.',
        'Different funding sources may have different rules about billable time.'
      ],
      'budget_items.authorized_units': [
        'Authorized units represent the quantity of a service approved by a funding source.',
        'Units may represent sessions, hours, or specific products depending on the service.',
        'When all authorized units are used, the budget item is considered exhausted.',
        'Additional authorization may be needed if more units are required.'
      ]
    };
    
    return columnContext[columnKey] || [];
  }
  
  /**
   * Check if a column is likely an enum
   */
  private isEnumLikeColumn(tableName: string, columnName: string): boolean {
    // Columns likely to contain enumerated values
    const enumLikeColumns = [
      'clients.status',
      'appointments.status',
      'sessions.session_type',
      'goals.priority',
      'therapists.specialization',
      'budget_settings.funding_source',
      'goals.status'
    ];
    
    return enumLikeColumns.includes(`${tableName}.${columnName}`);
  }
  
  /**
   * Get sample enum values for a column
   */
  private getEnumValues(tableName: string, columnName: string): string[] {
    // Define enum values for specific columns
    const columnKey = `${tableName}.${columnName}`;
    const enumValues: Record<string, string[]> = {
      'clients.status': ['active', 'inactive', 'on_hold', 'discharged'],
      'appointments.status': ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
      'sessions.session_type': ['evaluation', 'individual', 'group', 'consultation', 'telehealth'],
      'goals.priority': ['high', 'medium', 'low'],
      'therapists.specialization': ['speech', 'language', 'feeding', 'swallowing', 'voice', 'fluency'],
      'budget_settings.funding_source': ['insurance', 'self_pay', 'grant', 'scholarship', 'school_district'],
      'goals.status': ['active', 'on_hold', 'completed', 'discontinued']
    };
    
    return enumValues[columnKey] || [];
  }
}

// Create singleton instance
export const schemaMetadataService = new SchemaMetadataService();