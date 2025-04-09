/**
 * Schema Provider Service
 * 
 * This service provides information about the database schema
 * for the Clinician Assistant.
 */

import { pool } from '../db';

/**
 * Schema Provider class
 */
export class SchemaProvider {
  constructor() {}

  /**
   * Get a list of all tables in the database
   */
  async getTables(): Promise<string[]> {
    try {
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      
      const result = await pool.query(query);
      
      return result.rows.map(row => row.table_name);
    } catch (error) {
      console.error('Error getting tables:', error);
      throw error;
    }
  }

  /**
   * Get columns for a specific table
   */
  async getTableColumns(tableName: string): Promise<{ name: string; type: string }[]> {
    try {
      const query = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position
      `;
      
      const result = await pool.query(query, [tableName]);
      
      return result.rows.map(row => ({
        name: row.column_name,
        type: row.data_type,
      }));
    } catch (error) {
      console.error(`Error getting columns for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get foreign keys for a specific table
   */
  async getTableForeignKeys(tableName: string): Promise<{ column: string; foreignTable: string; foreignColumn: string }[]> {
    try {
      const query = `
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
        WHERE
          tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
          AND tc.table_schema = 'public'
      `;
      
      const result = await pool.query(query, [tableName]);
      
      return result.rows.map(row => ({
        column: row.column_name,
        foreignTable: row.foreign_table_name,
        foreignColumn: row.foreign_column_name,
      }));
    } catch (error) {
      console.error(`Error getting foreign keys for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get a formatted representation of the database schema
   */
  async getFormattedSchema(): Promise<string> {
    try {
      // Get all tables
      const tables = await this.getTables();
      
      // Build schema representation
      let schemaText = '';
      
      for (const tableName of tables) {
        // Get columns
        const columns = await this.getTableColumns(tableName);
        
        // Get foreign keys
        const foreignKeys = await this.getTableForeignKeys(tableName);
        
        // Add table header
        schemaText += `TABLE: ${tableName}\n`;
        
        // Add columns
        schemaText += 'Columns:\n';
        for (const column of columns) {
          schemaText += `  - ${column.name} (${column.type})\n`;
        }
        
        // Add foreign keys if any
        if (foreignKeys.length > 0) {
          schemaText += 'Foreign Keys:\n';
          for (const fk of foreignKeys) {
            schemaText += `  - ${fk.column} -> ${fk.foreignTable}(${fk.foreignColumn})\n`;
          }
        }
        
        schemaText += '\n';
      }
      
      return schemaText;
    } catch (error) {
      console.error('Error getting formatted schema:', error);
      throw error;
    }
  }
}

// Create a singleton instance
let schemaProviderInstance: SchemaProvider | null = null;

/**
 * Get the Schema Provider instance
 */
export function getSchemaProvider(): SchemaProvider {
  if (!schemaProviderInstance) {
    schemaProviderInstance = new SchemaProvider();
  }
  return schemaProviderInstance;
}