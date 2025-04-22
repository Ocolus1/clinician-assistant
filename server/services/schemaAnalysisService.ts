/**
 * Schema Analysis Service
 * 
 * This service provides enhanced database schema understanding by:
 * 1. Performing a thorough schema exploration on startup
 * 2. Sampling data from key tables to understand field formats and relationships
 * 3. Building a detailed schema metadata store with descriptions, formats, and examples
 */

import { sql } from '../db';

/**
 * Table metadata structure
 */
interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  rowCount: number;
  sampleData: any[];
  relationships: RelationshipMetadata[];
  lastAnalyzed: Date;
}

/**
 * Column metadata structure
 */
interface ColumnMetadata {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description: string;
  valueFormats: string[];
  examples: string[];
  uniqueValues: any[];
  minValue?: any;
  maxValue?: any;
  averageLength?: number;
  distinctValueCount?: number;
}

/**
 * Relationship metadata structure
 */
interface RelationshipMetadata {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

/**
 * Schema Analysis Service class
 */
export class SchemaAnalysisService {
  private initialized = false;
  private schema: Map<string, TableMetadata> = new Map();
  private identifierFields: Map<string, string[]> = new Map();
  private identifierPatterns: Map<string, RegExp[]> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;
  
  /**
   * Tables that are important for the application
   */
  private readonly keyTables = [
    'clients',
    'goals',
    'subgoals',
    'sessions',
    'session_notes',
    'budget_items',
    'budget_settings',
    'clinicians',
    'client_clinicians',
    'allies'
  ];
  
  /**
   * Initialize the schema analysis service
   */
  async initialize(): Promise<void> {
    try {
      console.log('Starting schema analysis service initialization...');
      
      // Clear existing data if re-initializing
      this.schema.clear();
      
      // Analyze the schema structure
      await this.analyzeSchemaStructure();
      
      // Analyze data patterns in key tables
      await this.analyzeDataPatterns();
      
      // Analyze relationships between tables
      await this.analyzeRelationships();
      
      // Identify fields that contain identifiers and their patterns
      await this.identifyIdentifierFields();
      
      // Setup periodic refresh (every 12 hours by default)
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
      
      // Set up a schedule to refresh schema data once a day
      this.refreshInterval = setInterval(() => {
        this.refreshSchema()
          .catch(error => console.error('Error during schema refresh:', error));
      }, 12 * 60 * 60 * 1000); // 12 hours in milliseconds
      
      this.initialized = true;
      console.log('Schema analysis service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize schema analysis service:', error);
      // Don't throw - allow application to continue without schema analysis
      // as it's an enhancement, not a critical component
    }
  }
  
  /**
   * Analyze the structure of the database schema
   */
  private async analyzeSchemaStructure(): Promise<void> {
    try {
      console.log('Analyzing database schema structure...');
      
      // Get list of all tables
      const tables = await sql`
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
      `;
      
      // For each table, get column information
      for (const table of tables) {
        const tableName = table.tablename;
        console.log(`Analyzing table structure: ${tableName}`);
        
        // Get column information
        const columns = await sql`
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position;
        `;
        
        // Get primary key information
        const primaryKeys = await sql`
          SELECT 
            c.column_name
          FROM 
            information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
            JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
              AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
          WHERE 
            tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = ${tableName};
        `;
        
        // Get foreign key information
        const foreignKeys = await sql`
          SELECT
            kcu.column_name,
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
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ${tableName};
        `;
        
        // Count rows in table
        const rowCountResult = await sql`
          SELECT COUNT(*) as count FROM ${sql(tableName)};
        `;
        const rowCount = Number(rowCountResult[0]?.count || 0);
        
        // Create column metadata objects
        const columnMetadata: ColumnMetadata[] = columns.map(column => {
          const isPrimaryKey = primaryKeys.some(pk => pk.column_name === column.column_name);
          const foreignKeyInfo = foreignKeys.find(fk => fk.column_name === column.column_name);
          
          return {
            name: column.column_name,
            dataType: column.data_type,
            isNullable: column.is_nullable === 'YES',
            isPrimaryKey,
            isForeignKey: !!foreignKeyInfo,
            description: this.generateColumnDescription(column.column_name, column.data_type),
            valueFormats: [],
            examples: [],
            uniqueValues: []
          };
        });
        
        // Create table metadata
        const tableMetadata: TableMetadata = {
          name: tableName,
          columns: columnMetadata,
          rowCount,
          sampleData: [],
          relationships: [],
          lastAnalyzed: new Date()
        };
        
        // Store in schema map
        this.schema.set(tableName, tableMetadata);
      }
      
      console.log(`Completed schema structure analysis for ${tables.length} tables`);
    } catch (error) {
      console.error('Error during schema structure analysis:', error);
      throw error;
    }
  }
  
  /**
   * Generate a human-readable description for a column based on its name and data type
   */
  private generateColumnDescription(columnName: string, dataType: string): string {
    // Common column name patterns
    if (columnName === 'id') return 'Primary identifier for this record';
    if (columnName.endsWith('_id')) return `Reference to a ${columnName.replace('_id', '')} record`;
    if (columnName === 'created_at') return 'Timestamp when this record was created';
    if (columnName === 'updated_at') return 'Timestamp when this record was last updated';
    if (columnName === 'name') return 'Name of this entity';
    if (columnName === 'description') return 'Detailed description of this entity';
    if (columnName === 'status') return 'Current status of this entity';
    if (columnName === 'unique_identifier') return 'Unique identifier used for referencing this entity';
    
    // Data type based descriptions
    if (dataType.includes('timestamp')) return 'Date and time value';
    if (dataType.includes('date')) return 'Date value';
    if (dataType === 'boolean') return 'True/false flag';
    if (dataType.includes('int')) return 'Numeric value';
    if (dataType === 'text' || dataType.includes('char')) return 'Text content';
    if (dataType.includes('json')) return 'JSON structured data';
    
    // Default description
    return `${columnName} (${dataType})`;
  }
  
  /**
   * Analyze data patterns in key tables
   */
  private async analyzeDataPatterns(): Promise<void> {
    try {
      console.log('Analyzing data patterns in key tables...');
      
      for (const tableName of this.keyTables) {
        const tableMetadata = this.schema.get(tableName);
        if (!tableMetadata) {
          console.log(`Table ${tableName} not found in schema, skipping pattern analysis`);
          continue;
        }
        
        console.log(`Analyzing data patterns in table: ${tableName}`);
        
        // Sample rows from the table (max 100)
        const sampleData = await sql`
          SELECT * FROM ${sql(tableName)} LIMIT 100;
        `;
        tableMetadata.sampleData = sampleData;
        
        // For each column, analyze patterns
        for (const column of tableMetadata.columns) {
          console.log(`Analyzing patterns for column: ${column.name}`);
          
          // Skip analysis for very large text fields
          if (column.dataType === 'text' && column.name.includes('content')) {
            continue;
          }
          
          try {
            // Get distinct values (limited to 50 to avoid performance issues)
            const distinctValues = await sql`
              SELECT DISTINCT ${sql(column.name)} 
              FROM ${sql(tableName)} 
              WHERE ${sql(column.name)} IS NOT NULL 
              LIMIT 50;
            `;
            
            column.uniqueValues = distinctValues.map(row => row[column.name]);
            
            // Collect sample values for examples
            column.examples = column.uniqueValues
              .slice(0, 5)
              .map(val => String(val).substring(0, 100));
            
            // If it's a string column, analyze formats
            if (column.dataType === 'text' || column.dataType.includes('char')) {
              column.valueFormats = this.detectStringFormats(column.uniqueValues);
            }
            
            // Count distinct values
            const distinctCountResult = await sql`
              SELECT COUNT(DISTINCT ${sql(column.name)}) as count 
              FROM ${sql(tableName)};
            `;
            column.distinctValueCount = Number(distinctCountResult[0]?.count || 0);
            
            // For numeric columns, get min/max
            if (column.dataType.includes('int') || column.dataType.includes('numeric')) {
              const minMaxResult = await sql`
                SELECT 
                  MIN(${sql(column.name)}) as min_val, 
                  MAX(${sql(column.name)}) as max_val 
                FROM ${sql(tableName)} 
                WHERE ${sql(column.name)} IS NOT NULL;
              `;
              
              if (minMaxResult.length > 0) {
                column.minValue = minMaxResult[0].min_val;
                column.maxValue = minMaxResult[0].max_val;
              }
            }
            
            // For string columns, get average length
            if (column.dataType === 'text' || column.dataType.includes('char')) {
              const avgLengthResult = await sql`
                SELECT AVG(LENGTH(${sql(column.name)}::text)) as avg_length 
                FROM ${sql(tableName)} 
                WHERE ${sql(column.name)} IS NOT NULL;
              `;
              
              if (avgLengthResult.length > 0 && avgLengthResult[0].avg_length) {
                column.averageLength = Number(avgLengthResult[0].avg_length);
              }
            }
          } catch (error) {
            console.error(`Error analyzing patterns for column ${column.name}:`, error);
            // Continue with other columns even if one fails
          }
        }
        
        // Update the schema map
        this.schema.set(tableName, tableMetadata);
      }
      
      console.log('Completed data pattern analysis');
    } catch (error) {
      console.error('Error during data pattern analysis:', error);
      throw error;
    }
  }
  
  /**
   * Detect string formats from a set of sample values
   */
  private detectStringFormats(values: any[]): string[] {
    const formats: Set<string> = new Set();
    const stringValues = values.filter(v => v !== null && v !== undefined).map(v => String(v));
    
    if (stringValues.length === 0) return [];
    
    // Check for email format
    if (stringValues.some(v => v.includes('@') && v.includes('.'))) {
      formats.add('email');
    }
    
    // Check for date format
    if (stringValues.some(v => /^\d{4}-\d{2}-\d{2}/.test(v))) {
      formats.add('date');
    }
    
    // Check for UUID format
    if (stringValues.some(v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))) {
      formats.add('uuid');
    }
    
    // Check for numeric ID format
    if (stringValues.some(v => /^\d+$/.test(v))) {
      formats.add('numeric-id');
    }
    
    // Check for name-number format (e.g., "Radwan-585666")
    if (stringValues.some(v => /^[A-Za-z][\w\s]*-\d+$/.test(v))) {
      formats.add('name-number');
    }
    
    // Check for base name format (just the name part without the number, e.g. "Radwan")
    if (stringValues.some(v => /^[A-Za-z][\w\s]*$/.test(v) && !formats.has('name-number'))) {
      formats.add('base-name');
    }
    
    // Check for JSON format
    if (stringValues.some(v => {
      try {
        JSON.parse(v);
        return v.startsWith('{') || v.startsWith('[');
      } catch (e) {
        return false;
      }
    })) {
      formats.add('json');
    }
    
    return Array.from(formats);
  }
  
  /**
   * Analyze relationships between tables
   */
  private async analyzeRelationships(): Promise<void> {
    try {
      console.log('Analyzing relationships between tables...');
      
      // Get all foreign key relationships
      const foreignKeys = await sql`
        SELECT
          tc.table_name AS source_table,
          kcu.column_name AS source_column,
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
      
      // Process each foreign key to determine relationship type
      for (const fk of foreignKeys) {
        const sourceTable = fk.source_table;
        const targetTable = fk.target_table;
        
        // Skip if source or target table is not in our schema map
        if (!this.schema.has(sourceTable) || !this.schema.has(targetTable)) {
          continue;
        }
        
        // Determine relationship type by analyzing the data pattern
        let relationType: RelationshipMetadata['relationType'] = 'many-to-one'; // Default
        
        // Check if source column has a unique constraint
        const sourceUnique = await sql`
          SELECT COUNT(*) as count
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.constraint_column_usage AS ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'UNIQUE'
            AND tc.table_name = ${sourceTable}
            AND ccu.column_name = ${fk.source_column};
        `;
        
        const isSourceUnique = sourceUnique[0]?.count > 0;
        
        // Check if target column is a primary key
        const targetPrimary = await sql`
          SELECT COUNT(*) as count
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.constraint_column_usage AS ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = ${targetTable}
            AND ccu.column_name = ${fk.target_column};
        `;
        
        const isTargetPrimary = targetPrimary[0]?.count > 0;
        
        // Determine relationship type
        if (isSourceUnique && isTargetPrimary) {
          relationType = 'one-to-one';
        } else if (isSourceUnique && !isTargetPrimary) {
          relationType = 'one-to-many';
        } else if (!isSourceUnique && isTargetPrimary) {
          relationType = 'many-to-one';
        } else {
          relationType = 'many-to-many';
        }
        
        // Create relationship metadata
        const relationship: RelationshipMetadata = {
          sourceTable: fk.source_table,
          sourceColumn: fk.source_column,
          targetTable: fk.target_table,
          targetColumn: fk.target_column,
          relationType
        };
        
        // Add relationship to source table
        const sourceTableMetadata = this.schema.get(sourceTable);
        if (sourceTableMetadata) {
          sourceTableMetadata.relationships.push(relationship);
          this.schema.set(sourceTable, sourceTableMetadata);
        }
        
        // Also add it to target table for convenience
        const targetTableMetadata = this.schema.get(targetTable);
        if (targetTableMetadata) {
          // Swap the relationship direction for the target table
          const inverseRelationship: RelationshipMetadata = {
            sourceTable: fk.target_table,
            sourceColumn: fk.target_column,
            targetTable: fk.source_table,
            targetColumn: fk.source_column,
            relationType: this.inverseRelationType(relationType)
          };
          
          targetTableMetadata.relationships.push(inverseRelationship);
          this.schema.set(targetTable, targetTableMetadata);
        }
      }
      
      console.log('Completed relationship analysis');
    } catch (error) {
      console.error('Error during relationship analysis:', error);
      throw error;
    }
  }
  
  /**
   * Invert a relationship type
   */
  private inverseRelationType(relationType: RelationshipMetadata['relationType']): RelationshipMetadata['relationType'] {
    switch (relationType) {
      case 'one-to-one': return 'one-to-one';
      case 'one-to-many': return 'many-to-one';
      case 'many-to-one': return 'one-to-many';
      case 'many-to-many': return 'many-to-many';
      default: return 'many-to-one';
    }
  }
  
  /**
   * Identify fields that contain identifiers and their patterns
   */
  private async identifyIdentifierFields(): Promise<void> {
    try {
      console.log('Identifying identifier fields and patterns...');
      
      // Common identifier field names
      const identifierFieldNames = [
        'id', 'uuid', 'unique_identifier', 'identifier',
        'code', 'number', 'reference', 'external_id'
      ];
      
      // Check each table for identifier fields
      for (const [tableName, tableMetadata] of this.schema.entries()) {
        const identifierFields: string[] = [];
        const identifierPatterns: RegExp[] = [];
        
        // Check each column in this table
        for (const column of tableMetadata.columns) {
          // Primary key is always an identifier
          if (column.isPrimaryKey) {
            identifierFields.push(column.name);
            continue;
          }
          
          // Check if column name matches common identifier patterns
          if (identifierFieldNames.some(name => 
            column.name === name || 
            column.name.endsWith(`_${name}`) || 
            column.name.startsWith(`${name}_`))) {
            identifierFields.push(column.name);
          }
          
          // Check for columns with specific formats that indicate identifiers
          if (column.valueFormats.includes('uuid') || 
              column.valueFormats.includes('numeric-id') ||
              column.valueFormats.includes('name-number')) {
            identifierFields.push(column.name);
            
            // If it's a name-number format, add a specific pattern for this field
            if (column.valueFormats.includes('name-number') && column.examples.length > 0) {
              // Try to extract the pattern from examples
              for (const example of column.examples) {
                const match = example.match(/^([A-Za-z]+)-(\d+)$/);
                if (match) {
                  // Found a name-number pattern
                  const namePrefix = match[1];
                  identifierPatterns.push(new RegExp(`^${namePrefix}-\\d+$`));
                  
                  // Also add pattern for just the number part
                  identifierPatterns.push(new RegExp(`^\\d+$`));
                  break;
                }
              }
            }
          }
        }
        
        // Store identified fields and patterns
        if (identifierFields.length > 0) {
          this.identifierFields.set(tableName, identifierFields);
        }
        
        if (identifierPatterns.length > 0) {
          this.identifierPatterns.set(tableName, identifierPatterns);
        }
      }
      
      console.log('Completed identifier field analysis');
    } catch (error) {
      console.error('Error during identifier field analysis:', error);
      throw error;
    }
  }
  
  /**
   * Refresh the schema analysis
   */
  private async refreshSchema(): Promise<void> {
    try {
      console.log('Starting schema refresh...');
      await this.analyzeSchemaStructure();
      await this.analyzeDataPatterns();
      await this.analyzeRelationships();
      await this.identifyIdentifierFields();
      console.log('Schema refresh completed successfully');
    } catch (error) {
      console.error('Error during schema refresh:', error);
    }
  }
  
  /**
   * Get all schema metadata
   */
  getFullSchema(): Map<string, TableMetadata> {
    return this.schema;
  }
  
  /**
   * Get metadata for a specific table
   */
  getTableMetadata(tableName: string): TableMetadata | undefined {
    return this.schema.get(tableName);
  }
  
  /**
   * Get identifier fields for a specific table
   */
  getIdentifierFields(tableName: string): string[] {
    return this.identifierFields.get(tableName) || [];
  }
  
  /**
   * Get identifier patterns for a specific table
   */
  getIdentifierPatterns(tableName: string): RegExp[] {
    return this.identifierPatterns.get(tableName) || [];
  }
  
  /**
   * Find a table containing a specific column
   */
  findTableWithColumn(columnName: string): string[] {
    const tablesWithColumn: string[] = [];
    
    for (const [tableName, tableMetadata] of this.schema.entries()) {
      if (tableMetadata.columns.some(column => column.name === columnName)) {
        tablesWithColumn.push(tableName);
      }
    }
    
    return tablesWithColumn;
  }
  
  /**
   * Get examples of a specific column value
   */
  getColumnExamples(tableName: string, columnName: string): string[] {
    const tableMetadata = this.schema.get(tableName);
    if (!tableMetadata) return [];
    
    const column = tableMetadata.columns.find(c => c.name === columnName);
    return column?.examples || [];
  }
  
  /**
   * Find related tables from a source table
   */
  getRelatedTables(tableName: string): string[] {
    const tableMetadata = this.schema.get(tableName);
    if (!tableMetadata) return [];
    
    return tableMetadata.relationships.map(rel => rel.targetTable);
  }
  
  /**
   * Get a detailed description of the database schema as text
   */
  getSchemaDescription(): string {
    let description = 'Database Schema Overview:\n\n';
    
    for (const [tableName, tableMetadata] of this.schema.entries()) {
      description += `Table: ${tableName} (${tableMetadata.rowCount} rows)\n`;
      
      // Add column descriptions
      description += 'Columns:\n';
      for (const column of tableMetadata.columns) {
        const keyInfo = [];
        if (column.isPrimaryKey) keyInfo.push('PK');
        if (column.isForeignKey) keyInfo.push('FK');
        
        const keyInfoStr = keyInfo.length > 0 ? ` [${keyInfo.join(', ')}]` : '';
        description += `- ${column.name} (${column.dataType})${keyInfoStr}: ${column.description}\n`;
        
        // Add examples if available
        if (column.examples.length > 0) {
          description += `  Examples: ${column.examples.join(', ')}\n`;
        }
        
        // Add format information if available
        if (column.valueFormats.length > 0) {
          description += `  Formats: ${column.valueFormats.join(', ')}\n`;
        }
      }
      
      // Add relationship information
      if (tableMetadata.relationships.length > 0) {
        description += 'Relationships:\n';
        for (const rel of tableMetadata.relationships) {
          description += `- ${rel.relationType} with ${rel.targetTable} via ${rel.sourceColumn} -> ${rel.targetColumn}\n`;
        }
      }
      
      description += '\n';
    }
    
    return description;
  }
  
  /**
   * Get schema suggestions for a query pattern
   */
  getSchemaSuggestionsForQuery(query: string): string {
    // Extract table names mentioned in the query
    const tablePattern = /\bfrom\s+(\w+)|\bjoin\s+(\w+)/gi;
    const tableMatches = Array.from(query.matchAll(tablePattern));
    const mentionedTables = new Set<string>();
    
    tableMatches.forEach(match => {
      const tableName = match[1] || match[2];
      if (tableName && this.schema.has(tableName)) {
        mentionedTables.add(tableName);
      }
    });
    
    // If no tables mentioned or found, return generic advice
    if (mentionedTables.size === 0) {
      return 'No specific tables identified in the query. Consider checking table and column names.';
    }
    
    let suggestions = 'Schema suggestions for this query:\n\n';
    
    // For each mentioned table, provide suggestions
    Array.from(mentionedTables).forEach(tableName => {
      const tableMetadata = this.schema.get(tableName);
      if (!tableMetadata) return;
      
      suggestions += `Table ${tableName}:\n`;
      
      // Add identifier field information
      const identifiers = this.getIdentifierFields(tableName);
      if (identifiers.length > 0) {
        suggestions += `- Identifier fields: ${identifiers.join(', ')}\n`;
        
        // Add examples for each identifier
        identifiers.forEach(idField => {
          const column = tableMetadata.columns.find(c => c.name === idField);
          if (column && column.examples.length > 0) {
            suggestions += `  Examples of ${idField}: ${column.examples.slice(0, 3).join(', ')}\n`;
          }
        });
      }
      
      // Mention related tables that might be useful
      const relatedTables = this.getRelatedTables(tableName);
      if (relatedTables.length > 0) {
        suggestions += `- Related tables: ${relatedTables.join(', ')}\n`;
        
        // For each related table, show how they are connected
        relatedTables.forEach(relatedTable => {
          const relationship = tableMetadata.relationships.find(rel => rel.targetTable === relatedTable);
          if (relationship) {
            suggestions += `  ${relatedTable} is related via ${relationship.sourceColumn} -> ${relationship.targetColumn} (${relationship.relationType})\n`;
          }
        });
      }
      
      suggestions += '\n';
    });
    
    return suggestions;
  }
  
  /**
   * Handle special identifier cases
   */
  resolveIdentifier(tableName: string, identifierColumn: string, providedValue: string): string[] {
    // Get the table metadata
    const tableMetadata = this.schema.get(tableName);
    if (!tableMetadata) return [providedValue];
    
    // Get the column metadata
    const column = tableMetadata.columns.find(c => c.name === identifierColumn);
    if (!column) return [providedValue];
    
    // Special handling for clients table which has name, unique_identifier, and original_name
    if (tableName === 'clients') {
      // For name-number patterns, try all possible formats
      const nameNumberMatch = providedValue.match(/^([A-Za-z][\w\s]*)-(\d+)$/);
      if (nameNumberMatch) {
        const namePart = nameNumberMatch[1];
        const numberPart = nameNumberMatch[2];
        
        // Different alternatives based on which column we're querying
        if (identifierColumn === 'unique_identifier') {
          // unique_identifier stores just the number part
          return [numberPart, providedValue];
        } else if (identifierColumn === 'name') {
          // name stores the full pattern
          return [providedValue, `${namePart}-${numberPart}`];
        } else if (identifierColumn === 'original_name') {
          // original_name stores just the name part without the number
          return [namePart, providedValue];
        }
      }
      
      // If just a number is provided
      if (/^\d+$/.test(providedValue)) {
        // Get sample data to find pattern
        if (tableMetadata.sampleData.length > 0) {
          // Look for a sample row to construct alternatives
          const sampleRow = tableMetadata.sampleData[0];
          
          // Construct all format variations
          if (sampleRow.name && sampleRow.unique_identifier && sampleRow.original_name) {
            const nameFormat = sampleRow.name;
            const nameMatch = nameFormat.match(/^([A-Za-z][\w\s]*)-(\d+)$/);
            
            if (nameMatch) {
              // If original_name exists, use that for reconstruction
              const baseName = sampleRow.original_name;
              
              return [
                providedValue,                // Just the number (for unique_identifier)
                `${baseName}-${providedValue}`, // Full reconstruction (for name)
                baseName                      // Just the name (for original_name)
              ];
            }
          }
        }
      }
      
      // If just a name part is provided (no hyphen or numbers)
      if (/^[A-Za-z][\w\s]*$/.test(providedValue) && !providedValue.includes('-')) {
        // This might be an original_name, but we might need to construct other formats
        if (identifierColumn === 'original_name') {
          return [providedValue]; // Original name is already in the right format
        } else {
          // For other columns, we need to find some sample identifiers
          const sampleIds = this.getColumnExamples('clients', 'unique_identifier').slice(0, 3);
          
          const alternatives = [providedValue];
          
          // Add combinations with sample IDs
          for (const sampleId of sampleIds) {
            alternatives.push(`${providedValue}-${sampleId}`);
          }
          
          return alternatives;
        }
      }
    } else {
      // For other tables, use the original logic
      
      // Get patterns for this table
      const patterns = this.getIdentifierPatterns(tableName);
      
      // If no patterns or the value matches none of them, return as is
      if (patterns.length === 0 || !patterns.some(p => p.test(providedValue))) {
        return [providedValue];
      }
      
      // For name-number patterns, try both the full value and just the number part
      const nameNumberMatch = providedValue.match(/^([A-Za-z][\w\s]*)-(\d+)$/);
      if (nameNumberMatch) {
        const namePrefix = nameNumberMatch[1];
        const numberPart = nameNumberMatch[2];
        
        // For "unique_identifier" fields, usually just the number part is stored
        if (identifierColumn === 'unique_identifier') {
          return [numberPart, providedValue];
        }
        
        // For "name" fields, usually the full pattern is stored
        if (identifierColumn === 'name') {
          return [providedValue, namePrefix, numberPart];
        }
        
        // For other fields, try both
        return [providedValue, numberPart];
      }
      
      // If just a number is provided, check if we should add a prefix
      if (/^\d+$/.test(providedValue)) {
        // Look through examples to find a possible name prefix
        for (const example of column.examples) {
          const match = example.match(/^([A-Za-z][\w\s]*)-(\d+)$/);
          if (match) {
            // Found a name prefix
            const namePrefix = match[1];
            return [providedValue, `${namePrefix}-${providedValue}`];
          }
        }
      }
    }
    
    return [providedValue];
  }
  
  /**
   * Generate alternative queries for a given query and identifier value
   */
  generateAlternativeQueries(originalQuery: string, tableName: string, columnName: string, value: string): string[] {
    // Resolve alternative identifiers
    const alternativeValues = this.resolveIdentifier(tableName, columnName, value);
    
    // If no alternatives were found, return original query
    if (alternativeValues.length <= 1) {
      return [originalQuery];
    }
    
    const alternativeQueries: string[] = [];
    
    // Create queries with alternatives
    for (const altValue of alternativeValues) {
      if (altValue === value) continue; // Skip the original value
      
      // Replace the value in the query, considering SQL syntax
      let alternativeQuery = originalQuery;
      
      // Handle different SQL formats for the value
      const valueFormats = [
        `'${value}'`,                 // Simple string literal
        `"${value}"`,                 // Double-quoted string
        `${tableName}.${columnName} = '${value}'`,  // Table qualified
        `${columnName} = '${value}'`, // Column only
      ];
      
      for (const format of valueFormats) {
        if (originalQuery.includes(format)) {
          const replacement = format.replace(value, altValue);
          alternativeQuery = alternativeQuery.replace(format, replacement);
          alternativeQueries.push(alternativeQuery);
          break;
        }
      }
    }
    
    return [originalQuery, ...alternativeQueries];
  }
  
  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
export const schemaAnalysisService = new SchemaAnalysisService();