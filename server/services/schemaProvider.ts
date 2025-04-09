/**
 * Schema Provider Service
 * 
 * This service provides database schema information to the Clinician Assistant
 * for generating SQL queries. It examines the database schema and returns
 * a description of tables and their relationships.
 */

import { sql } from '../db';

/**
 * Table schema information
 */
interface TableSchema {
  name: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    references?: {
      table: string;
      column: string;
    };
  }[];
}

/**
 * Full database schema
 */
interface DatabaseSchema {
  tables: TableSchema[];
}

/**
 * Schema Provider class
 */
export class SchemaProvider {
  private schema: DatabaseSchema | null = null;
  
  /**
   * Initialize the schema provider
   */
  async initialize(): Promise<void> {
    try {
      this.schema = await this.fetchDatabaseSchema();
      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database schema:', error);
      throw new Error('Failed to initialize database schema');
    }
  }
  
  /**
   * Get the database schema
   */
  getSchema(): DatabaseSchema {
    if (!this.schema) {
      throw new Error('Schema not initialized');
    }
    return this.schema;
  }
  
  /**
   * Fetch the database schema from PostgreSQL
   */
  private async fetchDatabaseSchema(): Promise<DatabaseSchema> {
    // Query to get tables and columns
    const tablesQuery = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        (
          SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
              ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_name = t.table_name
              AND ccu.column_name = c.column_name
          )
        ) as is_primary_key
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position;
    `;
    
    // Query to get foreign keys
    const foreignKeysQuery = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `;
    
    try {
      const [tablesResult, foreignKeysResult] = await Promise.all([
        sql.unsafe(tablesQuery),
        sql.unsafe(foreignKeysQuery)
      ]);
      
      // Convert to our schema format
      const tableMap = new Map<string, TableSchema>();
      
      // Process the table and column information
      for (const row of tablesResult) {
        const tableName = row.table_name;
        const columnName = row.column_name;
        const dataType = row.data_type;
        const nullable = row.is_nullable === 'YES';
        const isPrimaryKey = row.is_primary_key;
        
        if (!tableMap.has(tableName)) {
          tableMap.set(tableName, {
            name: tableName,
            columns: []
          });
        }
        
        const table = tableMap.get(tableName)!;
        table.columns.push({
          name: columnName,
          type: dataType,
          nullable,
          isPrimaryKey,
          isForeignKey: false // Will update this in the next step
        });
      }
      
      // Process foreign key information
      for (const row of foreignKeysResult) {
        const tableName = row.table_name;
        const columnName = row.column_name;
        const foreignTableName = row.foreign_table_name;
        const foreignColumnName = row.foreign_column_name;
        
        const table = tableMap.get(tableName);
        if (table) {
          const column = table.columns.find(c => c.name === columnName);
          if (column) {
            column.isForeignKey = true;
            column.references = {
              table: foreignTableName,
              column: foreignColumnName
            };
          }
        }
      }
      
      return {
        tables: Array.from(tableMap.values())
      };
    } catch (error) {
      console.error('Error fetching database schema:', error);
      throw new Error('Failed to fetch database schema');
    }
  }
  
  /**
   * Get a plain text description of the database schema for the LLM
   */
  getSchemaDescription(): string {
    if (!this.schema) {
      throw new Error('Schema not initialized');
    }
    
    let description = `# Database Schema\n\n`;
    
    for (const table of this.schema.tables) {
      description += `## Table: ${table.name}\n\n`;
      description += `Columns:\n`;
      
      for (const column of table.columns) {
        description += `- ${column.name} (${column.type})`;
        
        if (column.isPrimaryKey) {
          description += ` [PRIMARY KEY]`;
        }
        
        if (column.isForeignKey && column.references) {
          description += ` [FOREIGN KEY -> ${column.references.table}.${column.references.column}]`;
        }
        
        if (!column.nullable) {
          description += ` [NOT NULL]`;
        }
        
        description += `\n`;
      }
      
      description += `\n`;
    }
    
    return description;
  }
}

// Create a singleton instance
export const schemaProvider = new SchemaProvider();