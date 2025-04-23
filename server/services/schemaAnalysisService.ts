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
      
      // Add detailed relationship information
      description += '\nRelationships:\n';
      
      // Parent tables (tables that this table references)
      if (metadata.parentTables && metadata.parentTables.length > 0) {
        description += `Parent tables (tables this references):\n`;
        for (const parentTable of metadata.parentTables) {
          const fkColumns = metadata.columns.filter(col => 
            col.foreignKey && col.foreignKey.table === parentTable
          );
          
          for (const fkCol of fkColumns) {
            description += `  - This table's ${fkCol.name} references ${parentTable}.${fkCol.foreignKey?.column}\n`;
            description += `    Join: ${tableName}.${fkCol.name} = ${parentTable}.${fkCol.foreignKey?.column}\n`;
            description += `    Example: SELECT * FROM ${tableName} JOIN ${parentTable} ON ${tableName}.${fkCol.name} = ${parentTable}.${fkCol.foreignKey?.column}\n`;
          }
        }
      }
      
      // Child tables (tables that reference this table)
      if (metadata.childTables && metadata.childTables.length > 0) {
        description += `Child tables (tables that reference this):\n`;
        
        for (const childTable of metadata.childTables) {
          const childMetadata = this.tablesMetadata.get(childTable);
          if (childMetadata) {
            // Find the foreign key columns that point to this table
            const fkColumns = childMetadata.columns.filter(col => 
              col.foreignKey && col.foreignKey.table === tableName
            );
            
            for (const fkCol of fkColumns) {
              description += `  - ${childTable}.${fkCol.name} references this table's ${fkCol.foreignKey?.column}\n`;
              description += `    Join: ${childTable}.${fkCol.name} = ${tableName}.${fkCol.foreignKey?.column}\n`;
              description += `    Example: SELECT * FROM ${childTable} JOIN ${tableName} ON ${childTable}.${fkCol.name} = ${tableName}.${fkCol.foreignKey?.column}\n`;
            }
          }
        }
      }
      
      // Add special notes for specific tables
      if (tableName === 'clients') {
        description += `\nSpecial note for clients table:\n`;
        description += `Clients can be identified by three fields:\n`;
        description += `- name: Combined format (e.g., "Radwan-585666")\n`;
        description += `- unique_identifier: Just the numeric part (e.g., "585666")\n`;
        description += `- original_name: Just the name part (e.g., "Radwan")\n`;
        description += `\nTo check if a client has goals:\n`;
        description += `SELECT g.* FROM goals g JOIN clients c ON g.client_id = c.id WHERE c.name = 'Radwan-585666'\n`;
        description += `Alternative: SELECT g.* FROM goals g WHERE g.client_id IN (SELECT id FROM clients WHERE name = 'Radwan-585666')\n`;
      }
      
      if (tableName === 'goals') {
        description += `\nSpecial note for goals table:\n`;
        description += `Goals belong to clients through the client_id foreign key.\n`;
        description += `To find all goals for a client:\n`;
        description += `SELECT * FROM goals WHERE client_id = (SELECT id FROM clients WHERE name = 'Client-Name')\n`;
        description += `\nTo find subgoals for a goal:\n`;
        description += `SELECT * FROM subgoals WHERE goal_id = [goal_id]\n`;
      }
      
      if (tableName === 'subgoals') {
        description += `\nSpecial note for subgoals table:\n`;
        description += `Subgoals are linked to goals through the goal_id foreign key.\n`;
        description += `Goals are linked to clients, so there's a hierarchical relationship: client -> goals -> subgoals.\n`;
        description += `To find all subgoals for a client:\n`;
        description += `SELECT s.* FROM subgoals s JOIN goals g ON s.goal_id = g.id JOIN clients c ON g.client_id = c.id WHERE c.name = 'Client-Name'\n`;
      }
      
      if (tableName === 'sessions') {
        description += `\nSpecial note for sessions table:\n`;
        description += `Sessions are linked to clients through the client_id foreign key.\n`;
        description += `To find all sessions for a client:\n`;
        description += `SELECT * FROM sessions WHERE client_id = (SELECT id FROM clients WHERE name = 'Client-Name')\n`;
      }
      
      if (tableName === 'budget_items') {
        description += `\nSpecial note for budget_items table:\n`;
        description += `Budget items are linked to clients through budget_settings, which are linked to clients.\n`;
        description += `To find all budget items for a client:\n`;
        description += `SELECT bi.* FROM budget_items bi JOIN budget_settings bs ON bi.budget_settings_id = bs.id WHERE bs.client_id = (SELECT id FROM clients WHERE name = 'Client-Name')\n`;
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
      const lowerQuery = query.toLowerCase();
      
      // Check for common relationship patterns in the query
      
      // Client-related queries
      if (lowerQuery.includes('clients') || lowerQuery.includes('client')) {
        suggestions += `Client Identification: The clients table has three related identifier fields:\n`;
        suggestions += `- name: Combined format (e.g., "Radwan-585666")\n`;
        suggestions += `- unique_identifier: Just the numeric part (e.g., "585666")\n`;
        suggestions += `- original_name: Just the name part (e.g., "Radwan")\n`;
        suggestions += `Try using all three fields in your query conditions to maximize the chances of finding a match.\n\n`;
        
        // Client-Goal relationship
        if (lowerQuery.includes('goal') || lowerQuery.includes('goals')) {
          suggestions += `Client-Goal Relationship: To find goals for a specific client:\n`;
          suggestions += `1. First identify the client's ID using the client identifiers\n`;
          suggestions += `2. Then query the goals table using client_id to join with the clients table\n`;
          suggestions += `Example: SELECT g.* FROM goals g JOIN clients c ON g.client_id = c.id WHERE c.name = 'Radwan-585666'\n`;
          suggestions += `Alternative: SELECT g.* FROM goals g WHERE g.client_id IN (SELECT id FROM clients WHERE name = 'Radwan-585666')\n\n`;
        }
        
        // Client-Session relationship
        if (lowerQuery.includes('session') || lowerQuery.includes('sessions')) {
          suggestions += `Client-Session Relationship: To find sessions for a specific client:\n`;
          suggestions += `Example: SELECT s.* FROM sessions s JOIN clients c ON s.client_id = c.id WHERE c.name = 'Client-Name'\n`;
          suggestions += `Alternative: SELECT * FROM sessions WHERE client_id = (SELECT id FROM clients WHERE name = 'Client-Name')\n\n`;
        }
        
        // Client-Budget relationship
        if (lowerQuery.includes('budget') || lowerQuery.includes('fund')) {
          suggestions += `Client-Budget Relationship: To find budget information for a client:\n`;
          suggestions += `Example: SELECT bs.*, bi.* FROM budget_settings bs JOIN clients c ON bs.client_id = c.id LEFT JOIN budget_items bi ON bi.budget_settings_id = bs.id WHERE c.name = 'Client-Name'\n\n`;
        }
      }
      
      // Goal-related queries
      if (lowerQuery.includes('goal') && !lowerQuery.includes('client')) {
        suggestions += `Goal Information: Goals are linked to clients through client_id.\n`;
        suggestions += `To find details about a goal including its client: \n`;
        suggestions += `Example: SELECT g.*, c.name as client_name FROM goals g JOIN clients c ON g.client_id = c.id WHERE g.id = [goal_id]\n\n`;
      }
      
      // Subgoal-related queries
      if (lowerQuery.includes('subgoal')) {
        suggestions += `Subgoal Relationships: Subgoals belong to goals which belong to clients.\n`;
        suggestions += `To find all subgoals with their parent goals and clients:\n`;
        suggestions += `Example: SELECT s.*, g.title as goal_title, c.name as client_name FROM subgoals s JOIN goals g ON s.goal_id = g.id JOIN clients c ON g.client_id = c.id\n\n`;
      }
      
      // Budget-related queries
      if ((lowerQuery.includes('budget') || lowerQuery.includes('fund')) && !lowerQuery.includes('client')) {
        suggestions += `Budget Structure: Budget items belong to budget settings which belong to clients.\n`;
        suggestions += `To find all budget items with their settings and client information:\n`;
        suggestions += `Example: SELECT bi.*, bs.name as budget_name, c.name as client_name FROM budget_items bi JOIN budget_settings bs ON bi.budget_settings_id = bs.id JOIN clients c ON bs.client_id = c.id\n\n`;
      }
      
      // Session-related queries
      if (lowerQuery.includes('session') && !lowerQuery.includes('client')) {
        suggestions += `Session Information: Sessions are linked directly to clients via client_id.\n`;
        suggestions += `To find details about sessions including client information:\n`;
        suggestions += `Example: SELECT s.*, c.name as client_name FROM sessions s JOIN clients c ON s.client_id = c.id\n\n`;
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