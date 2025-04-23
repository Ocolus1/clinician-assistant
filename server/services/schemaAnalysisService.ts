/**
 * Schema Analysis Service
 * 
 * This service provides rich metadata about the database schema, including:
 * - Table relationships and structure
 * - Column formats and patterns
 * - Data distributions and statistics
 * - Client identifier pattern recognition
 */

import { sql } from "../db";
import { TableMetadata, ColumnMetadata } from "@shared/assistantTypes";

/**
 * Schema Analysis Service Class
 */
export class SchemaAnalysisService {
  private initialized = false;
  private tablesMetadata = new Map<string, TableMetadata>();
  private fieldNamePatterns = new Map<string, string[]>();
  private clientIdentifierFields: { [field: string]: string } = {
    name: 'Combined name (e.g., "Radwan-585666")',
    unique_identifier: 'Numeric portion (e.g., "585666")',
    original_name: 'Name portion without ID (e.g., "Radwan")'
  };
  
  /**
   * Initialize the service by analyzing the schema
   */
  async initialize(): Promise<void> {
    try {
      if (this.initialized) {
        return;
      }
      
      // Get schema information from the database
      await this.analyzeSchema();
      
      // Analyze column patterns to identify common fields
      await this.identifyCommonPatterns();
      
      // Sample data from key tables to understand formats
      await this.sampleTableData();
      
      // Analyze relationships between tables
      await this.analyzeRelationships();
      
      // Analyze client identifiers
      await this.analyzeClientIdentifiers();
      
      this.initialized = true;
      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Failed to initialize schema analysis service:', error);
      throw new Error('Failed to initialize schema analysis service');
    }
  }
  
  /**
   * Get the metadata for a specific table
   */
  getTableMetadata(tableName: string): TableMetadata | undefined {
    return this.tablesMetadata.get(tableName.toLowerCase());
  }
  
  /**
   * Get a list of all table names
   */
  getTableNames(): string[] {
    return Array.from(this.tablesMetadata.keys());
  }
  
  /**
   * Get a description of the schema suitable for context generation
   */
  getSchemaDescription(): string {
    let description = 'Database Schema:\n\n';
    
    for (const [tableName, metadata] of this.tablesMetadata) {
      description += `Table: ${tableName}\n`;
      description += `Description: ${metadata.description}\n`;
      
      if (metadata.identifierFields && metadata.identifierFields.length > 0) {
        description += `Identifier fields: ${metadata.identifierFields.join(', ')}\n`;
      }
      
      description += 'Columns:\n';
      for (const column of metadata.columns) {
        description += `- ${column.name} (${column.dataType})`;
        if (column.isIdentifier) {
          description += ' [IDENTIFIER]';
        }
        if (column.foreignKey) {
          description += ` [FK -> ${column.foreignKey.table}.${column.foreignKey.column}]`;
        }
        if (column.description) {
          description += `: ${column.description}`;
        }
        description += '\n';
      }
      
      // Add relevant information about related tables
      if (metadata.parentTables && metadata.parentTables.length > 0) {
        description += `Parent tables: ${metadata.parentTables.join(', ')}\n`;
      }
      if (metadata.childTables && metadata.childTables.length > 0) {
        description += `Child tables: ${metadata.childTables.join(', ')}\n`;
        
        // Add specific join information for child tables
        for (const childTable of metadata.childTables) {
          const childMetadata = this.tablesMetadata.get(childTable);
          if (childMetadata) {
            // Find the foreign key column that points to this table
            const fkColumn = childMetadata.columns.find(col => 
              col.foreignKey && col.foreignKey.table === tableName
            );
            
            if (fkColumn) {
              description += `  - To query ${childTable} for this ${tableName}, use: ${childTable}.${fkColumn.name} = ${tableName}.id\n`;
            }
          }
        }
      }
      
      // Add special notes for known tables
      if (tableName === 'clients') {
        description += `Note: Clients can be identified by three fields:\n`;
        description += `- name: Combined format (e.g., "Radwan-585666")\n`;
        description += `- unique_identifier: Just the numeric part (e.g., "585666")\n`;
        description += `- original_name: Just the name part (e.g., "Radwan")\n`;
        description += `Important: When checking if a client has goals, you need to join the goals table with clients using: goals.client_id = clients.id\n`;
        description += `Example query: "SELECT * FROM goals WHERE client_id IN (SELECT id FROM clients WHERE name = 'Client-Name' OR unique_identifier = 'ID' OR original_name = 'Name')"\n`;
      }
      
      description += '\n';
    }
    
    return description;
  }
  
  /**
   * Get schema suggestions specifically for a SQL query that might need help
   */
  getSchemaSuggestionsForQuery(query: string): string {
    try {
      let suggestions = '';
      
      // Check if this query uses the clients table and might need identifier help
      if (query.toLowerCase().includes('clients') || query.toLowerCase().includes('client')) {
        suggestions += `Client Identification: The clients table has three related identifier fields:\n`;
        suggestions += `- name: Combined format (e.g., "Radwan-585666")\n`;
        suggestions += `- unique_identifier: Just the numeric part (e.g., "585666")\n`;
        suggestions += `- original_name: Just the name part (e.g., "Radwan")\n`;
        suggestions += `Try using all three fields in your query conditions to maximize the chances of finding a match.\n\n`;
        
        // If this query might be about goals
        if (query.toLowerCase().includes('goal') || query.toLowerCase().includes('goals')) {
          suggestions += `Client-Goal Relationship: To find goals for a specific client:\n`;
          suggestions += `1. First identify the client's ID using the client identifiers\n`;
          suggestions += `2. Then query the goals table using client_id to join with the clients table\n`;
          suggestions += `Example: SELECT g.* FROM goals g JOIN clients c ON g.client_id = c.id WHERE c.name = 'Radwan-585666'\n`;
          suggestions += `Alternative: SELECT g.* FROM goals g WHERE g.client_id IN (SELECT id FROM clients WHERE name = 'Radwan-585666')\n\n`;
        }
      }
      
      // Extract table names from the query
      const tablePattern = /\bFROM\s+(\w+)|JOIN\s+(\w+)/gi;
      const tableMatches = Array.from(query.matchAll(tablePattern));
      const mentionedTables = new Set<string>();
      
      tableMatches.forEach(match => {
        const tableName = match[1] || match[2];
        if (tableName) mentionedTables.add(tableName.toLowerCase());
      });
      
      // Suggest fields from these tables
      for (const tableName of Array.from(mentionedTables)) {
        const tableMetadata = this.tablesMetadata.get(tableName);
        if (tableMetadata) {
          suggestions += `Table ${tableName}:\n`;
          
          // Suggest identifier fields
          const identifiers = tableMetadata.columns.filter(c => c.isIdentifier);
          if (identifiers.length > 0) {
            suggestions += `Key identifier fields: ${identifiers.map(c => c.name).join(', ')}\n`;
          }
          
          // Suggest common join fields
          const foreignKeys = tableMetadata.columns.filter(c => c.foreignKey);
          if (foreignKeys.length > 0) {
            suggestions += `Foreign keys for joins:\n`;
            foreignKeys.forEach(fk => {
              suggestions += `- ${fk.name} -> ${fk.foreignKey?.table}.${fk.foreignKey?.column}\n`;
            });
          }
          
          // Suggest related tables not in the query
          if (tableMetadata.relatedTables && tableMetadata.relatedTables.length > 0) {
            const missingRelatedTables = tableMetadata.relatedTables.filter(t => !mentionedTables.has(t.toLowerCase()));
            if (missingRelatedTables.length > 0) {
              suggestions += `Related tables you might want to join: ${missingRelatedTables.join(', ')}\n`;
            }
          }
          
          suggestions += '\n';
        }
      }
      
      return suggestions;
    } catch (error) {
      console.error('Error generating schema suggestions:', error);
      return 'Could not generate schema suggestions.';
    }
  }
  
  /**
   * Analyze schema to gather metadata
   */
  private async analyzeSchema(): Promise<void> {
    try {
      // Get list of tables
      const tables = await sql`
        SELECT 
          table_name
        FROM 
          information_schema.tables
        WHERE 
          table_schema = 'public'
          AND table_type = 'BASE TABLE'
      `;
      
      // Process each table
      for (const table of tables) {
        const tableName = table.table_name;
        
        // Get columns for this table
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
            ordinal_position
        `;
        
        // Get primary key
        const primaryKeys = await sql`
          SELECT 
            c.column_name
          FROM 
            information_schema.table_constraints tc
          JOIN 
            information_schema.constraint_column_usage AS ccu 
            USING (constraint_schema, constraint_name)
          JOIN 
            information_schema.columns AS c 
            ON c.table_schema = tc.constraint_schema
            AND tc.table_name = c.table_name
            AND ccu.column_name = c.column_name
          WHERE 
            tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = ${tableName}
        `;
        
        // Get foreign keys
        const foreignKeys = await sql`
          SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM
            information_schema.table_constraints AS tc
          JOIN
            information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN
            information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE
            tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = ${tableName}
        `;
        
        // Get approximate row count
        const rowCountQuery = await sql.unsafe(`
          SELECT count(*) AS row_count FROM "${tableName}"
        `);
        const rowCount = rowCountQuery[0]?.row_count || 0;
        
        // Create column metadata
        const columnsMetadata: ColumnMetadata[] = columns.map(column => {
          const isIdentifier = primaryKeys.some(pk => pk.column_name === column.column_name);
          const foreignKey = foreignKeys.find(fk => fk.column_name === column.column_name);
          
          // Determine if this is likely an identifier field based on name
          const possibleIdField = column.column_name.endsWith('_id') || 
            column.column_name === 'id' ||
            column.column_name.toLowerCase().includes('code') ||
            column.column_name.toLowerCase().includes('identifier');
          
          // Create initial column metadata
          const columnMetadata: ColumnMetadata = {
            name: column.column_name,
            dataType: column.data_type,
            isNullable: column.is_nullable === 'YES',
            description: this.generateColumnDescription(column.column_name, column.data_type),
            isIdentifier: isIdentifier || possibleIdField
          };
          
          // Add foreign key information if present
          if (foreignKey) {
            columnMetadata.foreignKey = {
              table: foreignKey.foreign_table_name,
              column: foreignKey.foreign_column_name
            };
          }
          
          return columnMetadata;
        });
        
        // Create table metadata
        const tableMetadata: TableMetadata = {
          name: tableName,
          description: this.generateTableDescription(tableName),
          columns: columnsMetadata,
          primaryKey: primaryKeys.map(pk => pk.column_name),
          foreignKeys: foreignKeys.map(fk => ({
            column: fk.column_name,
            referencedTable: fk.foreign_table_name,
            referencedColumn: fk.foreign_column_name
          })),
          rowCount: Number(rowCount),
          identifierFields: primaryKeys.map(pk => pk.column_name)
        };
        
        // Store metadata
        this.tablesMetadata.set(tableName.toLowerCase(), tableMetadata);
      }
    } catch (error) {
      console.error('Error analyzing schema:', error);
      throw error;
    }
  }
  
  /**
   * Sample data from key tables to understand formats
   */
  private async sampleTableData(): Promise<void> {
    try {
      // Process each table
      for (const [tableName, metadata] of this.tablesMetadata) {
        try {
          // Skip large tables or system tables
          if (metadata.rowCount && metadata.rowCount > 10000) {
            continue;
          }
          
          // Get sample data
          const sampleQuery = `
            SELECT * FROM "${tableName}" 
            LIMIT 5
          `;
          
          const sampleData = await sql.unsafe(sampleQuery);
          
          // Store sample data
          metadata.sampleData = sampleData;
          
          // Analyze column formats based on sample data
          if (sampleData.length > 0) {
            for (const column of metadata.columns) {
              // Extract examples from sample data
              const examples: any[] = [];
              for (const row of sampleData) {
                const value = row[column.name];
                if (value !== null && value !== undefined && !examples.includes(value)) {
                  examples.push(value);
                }
                if (examples.length >= 3) break;
              }
              
              // Add examples to column metadata
              if (examples.length > 0) {
                column.examples = examples.map(e => String(e));
                
                // Try to infer format patterns
                column.format = this.inferColumnFormat(column.name, examples);
              }
            }
          }
        } catch (error) {
          console.warn(`Error sampling data from table ${tableName}:`, error);
          // Continue with next table
        }
      }
    } catch (error) {
      console.error('Error sampling table data:', error);
      throw error;
    }
  }
  
  /**
   * Analyze relationships between tables
   */
  private async analyzeRelationships(): Promise<void> {
    try {
      // For each table, identify parent and child tables
      for (const [tableName, metadata] of this.tablesMetadata) {
        const parentTables: string[] = [];
        const childTables: string[] = [];
        
        // Find parent tables (tables this table references)
        for (const column of metadata.columns) {
          if (column.foreignKey) {
            parentTables.push(column.foreignKey.table);
          }
        }
        
        // Find child tables (tables that reference this table)
        for (const [otherTableName, otherMetadata] of this.tablesMetadata) {
          if (otherTableName === tableName) continue;
          
          for (const column of otherMetadata.columns) {
            if (column.foreignKey && column.foreignKey.table === tableName) {
              childTables.push(otherTableName);
              break;
            }
          }
        }
        
        // Update metadata
        metadata.parentTables = parentTables;
        metadata.childTables = childTables;
        metadata.relatedTables = [...new Set([...parentTables, ...childTables])];
        
        // Check if this is likely a join table
        const hasTwoOrMoreForeignKeys = metadata.columns.filter(col => col.foreignKey).length >= 2;
        const hasSmallColumnCount = metadata.columns.length <= 5;
        metadata.isJoinTable = hasTwoOrMoreForeignKeys && hasSmallColumnCount;
      }
    } catch (error) {
      console.error('Error analyzing relationships:', error);
      throw error;
    }
  }
  
  /**
   * Identify common patterns in column names and data
   */
  private async identifyCommonPatterns(): Promise<void> {
    try {
      const commonPatterns: { [pattern: string]: string[] } = {
        identifier: ['id', 'code', 'key', 'identifier', 'number'],
        name: ['name', 'title', 'label'],
        description: ['description', 'details', 'text', 'content'],
        date: ['date', 'created_at', 'updated_at', 'timestamp', 'time'],
        status: ['status', 'state', 'condition', 'flag'],
        amount: ['amount', 'price', 'cost', 'total', 'sum', 'units'],
        user: ['user', 'owner', 'creator', 'author'],
        type: ['type', 'category', 'kind', 'class'],
        parent: ['parent', 'superior', 'master', 'root'],
        child: ['child', 'member', 'sub', 'detail']
      };
      
      // Scan all column names and categorize them
      for (const [tableName, metadata] of this.tablesMetadata) {
        for (const column of metadata.columns) {
          const columnName = column.name.toLowerCase();
          
          for (const [patternName, keywords] of Object.entries(commonPatterns)) {
            for (const keyword of keywords) {
              if (columnName === keyword || columnName.includes(keyword)) {
                const patternColumns = this.fieldNamePatterns.get(patternName) || [];
                patternColumns.push(`${tableName}.${column.name}`);
                this.fieldNamePatterns.set(patternName, patternColumns);
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error identifying common patterns:', error);
      throw error;
    }
  }
  
  /**
   * Analyze client identifiers
   */
  private async analyzeClientIdentifiers(): Promise<void> {
    try {
      const clientsTable = this.tablesMetadata.get('clients');
      if (!clientsTable) return;
      
      // Check if clients table has the expected identifier fields
      const hasName = clientsTable.columns.some(c => c.name === 'name');
      const hasUniqueIdentifier = clientsTable.columns.some(c => c.name === 'unique_identifier');
      const hasOriginalName = clientsTable.columns.some(c => c.name === 'original_name');
      
      if (hasName && hasUniqueIdentifier && hasOriginalName) {
        console.log('Client identifier pattern detected: name, unique_identifier, original_name');
        
        // Add this knowledge to the table metadata
        clientsTable.identifierFields = ['name', 'unique_identifier', 'original_name'];
        
        // Update the column descriptions to clarify their purpose
        const nameColumn = clientsTable.columns.find(c => c.name === 'name');
        if (nameColumn) {
          nameColumn.description = 'Combined name with identifier (e.g., "Radwan-585666")';
          nameColumn.isIdentifier = true;
        }
        
        const uniqueIdentifierColumn = clientsTable.columns.find(c => c.name === 'unique_identifier');
        if (uniqueIdentifierColumn) {
          uniqueIdentifierColumn.description = 'Numeric portion of client identifier (e.g., "585666")';
          uniqueIdentifierColumn.isIdentifier = true;
        }
        
        const originalNameColumn = clientsTable.columns.find(c => c.name === 'original_name');
        if (originalNameColumn) {
          originalNameColumn.description = 'Name portion without identifier (e.g., "Radwan")';
          originalNameColumn.isIdentifier = false;
        }
      }
    } catch (error) {
      console.error('Error analyzing client identifiers:', error);
      throw error;
    }
  }
  
  /**
   * Generate a description for a table based on its name
   */
  private generateTableDescription(tableName: string): string {
    const name = tableName.toLowerCase();
    
    if (name === 'clients') return 'Stores information about all clients in the practice';
    if (name === 'users') return 'Stores user accounts for therapists and staff';
    if (name === 'sessions') return 'Therapy session records for clients';
    if (name === 'goals') return 'Therapy goals for clients';
    if (name === 'notes') return 'Clinical notes for therapy sessions';
    if (name === 'budget_items') return 'Budget allocation and usage tracking for clients';
    if (name === 'budget_settings') return 'Configuration for client budget plans';
    if (name === 'products') return 'Service products and billing codes';
    if (name === 'assessments') return 'Client assessment records';
    if (name === 'documents') return 'Files and documents associated with clients';
    if (name === 'progress_reports') return 'Reports tracking client progress over time';
    if (name === 'appointments') return 'Scheduled therapy appointments';
    if (name === 'invoices') return 'Billing invoices for clients';
    if (name === 'payments') return 'Payment records for client invoices';
    
    // Generic description for unknown tables
    return `Stores ${tableName.replace(/_/g, ' ')} data`;
  }
  
  /**
   * Generate a description for a column based on its name and type
   */
  private generateColumnDescription(columnName: string, dataType: string): string {
    const name = columnName.toLowerCase();
    
    if (name === 'id') return 'Unique identifier';
    if (name.endsWith('_id')) {
      const entity = name.slice(0, -3).replace(/_/g, ' ');
      return `Reference to ${entity}`;
    }
    
    if (name === 'name') return 'Name';
    if (name === 'title') return 'Title';
    if (name === 'description') return 'Description';
    if (name === 'details') return 'Detailed information';
    if (name === 'status') return 'Current status';
    if (name === 'created_at') return 'Creation timestamp';
    if (name === 'updated_at') return 'Last update timestamp';
    if (name === 'date') return 'Date';
    if (name.includes('date')) return 'Date';
    if (name === 'amount') return 'Monetary amount';
    if (name === 'quantity') return 'Quantity';
    if (name === 'price') return 'Price';
    if (name === 'cost') return 'Cost';
    if (name === 'total') return 'Total value';
    if (name === 'notes') return 'Additional notes';
    if (name === 'type') return 'Type classification';
    if (name === 'category') return 'Category';
    if (name === 'email') return 'Email address';
    if (name === 'phone') return 'Phone number';
    if (name === 'address') return 'Address';
    if (name === 'active') return 'Active status flag';
    if (name === 'enabled') return 'Enabled status flag';
    if (name === 'priority') return 'Priority level';
    if (name === 'order') return 'Ordering sequence';
    if (name === 'position') return 'Position';
    if (name === 'code') return 'Code identifier';
    if (name === 'unique_identifier') return 'Unique identifier string';
    if (name === 'original_name') return 'Original name without additional identifiers';
    
    // Special handling for products table fields
    if (name === 'product_code') return 'Billing code for the product';
    if (name === 'unit_price') return 'Price per unit of the product';
    if (name === 'unit_type') return 'Type of unit for pricing (e.g., hour, session)';
    
    // Special handling for budget fields
    if (name === 'total_units') return 'Total units allocated in the budget';
    if (name === 'used_units') return 'Units used from the budget allocation';
    if (name === 'remaining_units') return 'Units remaining in the budget';
    if (name === 'budget_period') return 'Time period for the budget (e.g., monthly, yearly)';
    
    // Generate description based on data type
    if (dataType.includes('timestamp')) return 'Timestamp';
    if (dataType.includes('date')) return 'Date';
    if (dataType.includes('time')) return 'Time';
    if (dataType.includes('boolean')) return 'Boolean flag';
    if (dataType.includes('int') || dataType.includes('numeric')) return 'Numeric value';
    if (dataType.includes('text') || dataType.includes('char')) return 'Text value';
    if (dataType.includes('json')) return 'JSON data';
    if (dataType.includes('array')) return 'Array of values';
    
    // Generic description
    return 'Field';
  }
  
  /**
   * Infer column format from examples
   */
  private inferColumnFormat(columnName: string, examples: any[]): string | undefined {
    if (examples.length === 0) return undefined;
    
    // Convert all examples to strings for pattern analysis
    const stringExamples = examples.map(e => String(e));
    
    // Check for date patterns
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
    
    if (stringExamples.every(ex => datePattern.test(ex))) {
      return 'YYYY-MM-DD';
    }
    
    if (stringExamples.every(ex => isoDatePattern.test(ex))) {
      return 'ISO 8601 date and time';
    }
    
    // Check for numeric patterns
    const integerPattern = /^-?\d+$/;
    const decimalPattern = /^-?\d+\.\d+$/;
    const moneyPattern = /^\$?\d+(\.\d{2})?$/;
    
    if (stringExamples.every(ex => integerPattern.test(ex))) {
      return 'Integer';
    }
    
    if (stringExamples.every(ex => decimalPattern.test(ex))) {
      return 'Decimal number';
    }
    
    if (stringExamples.every(ex => moneyPattern.test(ex))) {
      return 'Currency amount';
    }
    
    // Check for client identifier pattern
    const clientIdPattern = /^[\w\s]+-\d+$/;
    if (columnName === 'name' && stringExamples.some(ex => clientIdPattern.test(ex))) {
      return 'Client identifier (name-number format)';
    }
    
    // Check for email pattern
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (stringExamples.every(ex => emailPattern.test(ex))) {
      return 'Email address';
    }
    
    // Check for phone number pattern
    const phonePattern = /^\+?[\d\s()-]+$/;
    if (stringExamples.every(ex => phonePattern.test(ex))) {
      return 'Phone number';
    }
    
    // Check for UUID pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (stringExamples.every(ex => uuidPattern.test(ex))) {
      return 'UUID';
    }
    
    // Check for JSON pattern
    const jsonPattern = /^[\[{].*[\]}]$/;
    if (stringExamples.every(ex => jsonPattern.test(ex))) {
      return 'JSON data';
    }
    
    // Check for URL pattern
    const urlPattern = /^https?:\/\/.+/;
    if (stringExamples.every(ex => urlPattern.test(ex))) {
      return 'URL';
    }
    
    // If no specific pattern found
    return undefined;
  }
  
  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create a singleton instance
export const schemaAnalysisService = new SchemaAnalysisService();