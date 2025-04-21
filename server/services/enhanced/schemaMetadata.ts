/**
 * Schema Metadata Service
 * 
 * This service provides enriched metadata about the database schema,
 * including business context, descriptions, and relationships.
 */

import { TableMetadata, ColumnMetadata, RelationshipMetadata } from '../../../shared/enhancedAssistantTypes';

/**
 * Schema Metadata Service class
 */
export class SchemaMetadataService {
  private tables: TableMetadata[];
  
  constructor() {
    // Initialize with our schema metadata
    this.tables = [
      // Clients table
      {
        name: 'clients',
        displayName: 'Clients',
        description: 'Stores information about therapy clients',
        primaryKey: ['id'],
        columns: [
          {
            name: 'id',
            displayName: 'ID',
            description: 'Unique identifier for the client',
            type: 'text',
            isNullable: false
          },
          {
            name: 'name',
            displayName: 'Name',
            description: 'Full name of the client',
            type: 'text',
            isNullable: false
          },
          {
            name: 'date_of_birth',
            displayName: 'Date of Birth',
            description: 'Client\'s date of birth',
            type: 'date',
            isNullable: true
          },
          {
            name: 'email',
            displayName: 'Email',
            description: 'Client\'s email address for correspondence',
            type: 'text',
            isNullable: true
          },
          {
            name: 'phone',
            displayName: 'Phone',
            description: 'Client\'s phone number',
            type: 'text',
            isNullable: true
          },
          {
            name: 'address',
            displayName: 'Address',
            description: 'Client\'s residential address',
            type: 'text',
            isNullable: true
          },
          {
            name: 'onboarding_status',
            displayName: 'Onboarding Status',
            description: 'Current status of client onboarding process',
            type: 'text',
            isNullable: false,
            values: ['pending', 'incomplete', 'complete']
          },
          {
            name: 'created_at',
            displayName: 'Created At',
            description: 'When the client record was created',
            type: 'timestamp',
            isNullable: false
          },
          {
            name: 'updated_at',
            displayName: 'Updated At',
            description: 'When the client record was last updated',
            type: 'timestamp',
            isNullable: false
          }
        ],
        businessContext: [
          'Active clients have onboarding_status = "complete"',
          'Clients may be referred to by their unique ID or name in queries',
          'Client contact information is used for appointment reminders and notifications'
        ],
        sampleQueries: [
          'How many active clients do we have?',
          'List all clients who joined in the last month',
          'What percentage of clients have incomplete onboarding?'
        ]
      },
      
      // Sessions table
      {
        name: 'sessions',
        displayName: 'Therapy Sessions',
        description: 'Records of therapy sessions conducted with clients',
        primaryKey: ['id'],
        columns: [
          {
            name: 'id',
            displayName: 'ID',
            description: 'Unique identifier for the session',
            type: 'text',
            isNullable: false
          },
          {
            name: 'client_id',
            displayName: 'Client ID',
            description: 'Reference to the client who attended the session',
            type: 'text',
            isNullable: false
          },
          {
            name: 'clinician_id',
            displayName: 'Clinician ID',
            description: 'Reference to the clinician who conducted the session',
            type: 'text',
            isNullable: false
          },
          {
            name: 'session_date',
            displayName: 'Session Date',
            description: 'Date when the session took place',
            type: 'date',
            isNullable: false
          },
          {
            name: 'session_type',
            displayName: 'Session Type',
            description: 'Category or type of therapy session',
            type: 'text',
            isNullable: false,
            values: ['initial_assessment', 'individual', 'group', 'parent_coaching', 'follow_up']
          },
          {
            name: 'status',
            displayName: 'Status',
            description: 'Current status of the session',
            type: 'text',
            isNullable: false,
            values: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']
          },
          {
            name: 'duration_minutes',
            displayName: 'Duration (Minutes)',
            description: 'Length of the session in minutes',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'created_at',
            displayName: 'Created At',
            description: 'When the session record was created',
            type: 'timestamp',
            isNullable: false
          },
          {
            name: 'updated_at',
            displayName: 'Updated At',
            description: 'When the session record was last updated',
            type: 'timestamp',
            isNullable: false
          }
        ],
        relationships: [
          {
            name: 'client',
            targetTable: 'clients',
            type: 'many-to-one',
            sourceColumn: 'client_id',
            targetColumn: 'id',
            description: 'Each session belongs to one client'
          },
          {
            name: 'clinician',
            targetTable: 'clinicians',
            type: 'many-to-one',
            sourceColumn: 'clinician_id',
            targetColumn: 'id',
            description: 'Each session is conducted by one clinician'
          },
          {
            name: 'session_notes',
            targetTable: 'session_notes',
            type: 'one-to-many',
            sourceColumn: 'id',
            targetColumn: 'session_id',
            description: 'A session may have multiple notes'
          }
        ],
        businessContext: [
          'Completed sessions contribute to budget usage',
          'Sessions are the primary billable unit',
          'Session duration affects billing and resource allocation',
          'Session types have different billing rates and procedures'
        ],
        sampleQueries: [
          'How many sessions were completed last month?',
          'What is the average session duration for client X?',
          'Which session types are most common for our adult clients?',
          'What is the cancellation rate for sessions?'
        ]
      },
      
      // Goals table
      {
        name: 'goals',
        displayName: 'Therapy Goals',
        description: 'Treatment goals established for clients',
        primaryKey: ['id'],
        columns: [
          {
            name: 'id',
            displayName: 'ID',
            description: 'Unique identifier for the goal',
            type: 'text',
            isNullable: false
          },
          {
            name: 'client_id',
            displayName: 'Client ID',
            description: 'Reference to the client this goal is for',
            type: 'text',
            isNullable: false
          },
          {
            name: 'title',
            displayName: 'Title',
            description: 'Short title describing the goal',
            type: 'text',
            isNullable: false
          },
          {
            name: 'description',
            displayName: 'Description',
            description: 'Detailed description of the goal',
            type: 'text',
            isNullable: true
          },
          {
            name: 'status',
            displayName: 'Status',
            description: 'Current status of progress toward the goal',
            type: 'text',
            isNullable: false,
            values: ['not_started', 'in_progress', 'achieved', 'discontinued']
          },
          {
            name: 'priority',
            displayName: 'Priority',
            description: 'Relative importance of the goal',
            type: 'text',
            isNullable: true,
            values: ['low', 'medium', 'high']
          },
          {
            name: 'created_at',
            displayName: 'Created At',
            description: 'When the goal was created',
            type: 'timestamp',
            isNullable: false
          },
          {
            name: 'target_date',
            displayName: 'Target Date',
            description: 'Date by which the goal should be achieved',
            type: 'date',
            isNullable: true
          },
          {
            name: 'achieved_date',
            displayName: 'Achieved Date',
            description: 'Date when the goal was achieved',
            type: 'date',
            isNullable: true
          }
        ],
        relationships: [
          {
            name: 'client',
            targetTable: 'clients',
            type: 'many-to-one',
            sourceColumn: 'client_id',
            targetColumn: 'id',
            description: 'Each goal belongs to one client'
          },
          {
            name: 'subgoals',
            targetTable: 'subgoals',
            type: 'one-to-many',
            sourceColumn: 'id',
            targetColumn: 'goal_id',
            description: 'A goal may have multiple subgoals'
          },
          {
            name: 'progress_assessments',
            targetTable: 'goal_progress',
            type: 'one-to-many',
            sourceColumn: 'id',
            targetColumn: 'goal_id',
            description: 'A goal has multiple progress assessments'
          }
        ],
        businessContext: [
          'Goals guide the overall treatment plan for clients',
          'Progress toward goals is a key success metric for therapy',
          'Goals are regularly reviewed and updated in progress meetings',
          'Insurance often requires goal-related documentation'
        ],
        sampleQueries: [
          'What percentage of Client X\'s goals are achieved?',
          'How long does it take on average for high-priority goals to be achieved?',
          'List all clients with goals that have no progress updates in the last month',
          'Which clinicians have the highest goal achievement rates?'
        ]
      },
      
      // Budget tables
      {
        name: 'budget_settings',
        displayName: 'Budget Settings',
        description: 'Budget plans and funding allocations for clients',
        primaryKey: ['id'],
        columns: [
          {
            name: 'id',
            displayName: 'ID',
            description: 'Unique identifier for the budget settings',
            type: 'text',
            isNullable: false
          },
          {
            name: 'client_id',
            displayName: 'Client ID',
            description: 'Reference to the client these budget settings apply to',
            type: 'text',
            isNullable: false
          },
          {
            name: 'name',
            displayName: 'Budget Name',
            description: 'Name of the budget or funding source',
            type: 'text',
            isNullable: false
          },
          {
            name: 'total_amount',
            displayName: 'Total Amount',
            description: 'Total monetary amount allocated in the budget',
            type: 'numeric',
            isNullable: false
          },
          {
            name: 'start_date',
            displayName: 'Start Date',
            description: 'Date when the budget period begins',
            type: 'date',
            isNullable: false
          },
          {
            name: 'end_date',
            displayName: 'End Date',
            description: 'Date when the budget period ends',
            type: 'date',
            isNullable: false
          },
          {
            name: 'funding_source',
            displayName: 'Funding Source',
            description: 'Origin of the budget funds',
            type: 'text',
            isNullable: true,
            values: ['insurance', 'government', 'private', 'scholarship', 'other']
          },
          {
            name: 'active',
            displayName: 'Active',
            description: 'Whether this budget is currently active',
            type: 'boolean',
            isNullable: false
          },
          {
            name: 'created_at',
            displayName: 'Created At',
            description: 'When the budget settings were created',
            type: 'timestamp',
            isNullable: false
          },
          {
            name: 'updated_at',
            displayName: 'Updated At',
            description: 'When the budget settings were last updated',
            type: 'timestamp',
            isNullable: false
          }
        ],
        relationships: [
          {
            name: 'client',
            targetTable: 'clients',
            type: 'many-to-one',
            sourceColumn: 'client_id',
            targetColumn: 'id',
            description: 'Each budget settings record belongs to one client'
          },
          {
            name: 'budget_items',
            targetTable: 'budget_items',
            type: 'one-to-many',
            sourceColumn: 'id',
            targetColumn: 'budget_settings_id',
            description: 'Budget settings contain multiple budget line items'
          }
        ],
        businessContext: [
          'Budget settings define the overall funding available for a client\'s therapy',
          'Budgets typically have specific start and end dates (often annual)',
          'Different funding sources have different requirements and restrictions',
          'Budget tracking is critical for financial planning and client communication'
        ],
        sampleQueries: [
          'How many clients have budgets expiring in the next 30 days?',
          'What is the average total budget amount for clients with insurance funding?',
          'Which clients have used more than 80% of their current budget?',
          'How many budgets were renewed in the last quarter?'
        ]
      },
      
      {
        name: 'budget_items',
        displayName: 'Budget Items',
        description: 'Individual line items within a client\'s budget',
        primaryKey: ['id'],
        columns: [
          {
            name: 'id',
            displayName: 'ID',
            description: 'Unique identifier for the budget item',
            type: 'text',
            isNullable: false
          },
          {
            name: 'budget_settings_id',
            displayName: 'Budget Settings ID',
            description: 'Reference to the parent budget settings',
            type: 'text',
            isNullable: false
          },
          {
            name: 'name',
            displayName: 'Item Name',
            description: 'Name of the budget item',
            type: 'text',
            isNullable: false
          },
          {
            name: 'description',
            displayName: 'Description',
            description: 'Detailed description of what this budget item covers',
            type: 'text',
            isNullable: true
          },
          {
            name: 'product_code',
            displayName: 'Product Code',
            description: 'Service or product code for billing',
            type: 'text',
            isNullable: true
          },
          {
            name: 'quantity',
            displayName: 'Quantity',
            description: 'Number of units allocated',
            type: 'numeric',
            isNullable: false
          },
          {
            name: 'unit_price',
            displayName: 'Unit Price',
            description: 'Price per unit',
            type: 'numeric',
            isNullable: false
          },
          {
            name: 'total_amount',
            displayName: 'Total Amount',
            description: 'Total monetary amount (quantity * unit_price)',
            type: 'numeric',
            isNullable: false
          },
          {
            name: 'usage',
            displayName: 'Usage',
            description: 'Amount of units used so far',
            type: 'numeric',
            isNullable: false,
            businessContext: [
              'Usage tracks how many units have been consumed from this budget item',
              'Usage is updated automatically when sessions are completed'
            ]
          },
          {
            name: 'created_at',
            displayName: 'Created At',
            description: 'When the budget item was created',
            type: 'timestamp',
            isNullable: false
          },
          {
            name: 'updated_at',
            displayName: 'Updated At',
            description: 'When the budget item was last updated',
            type: 'timestamp',
            isNullable: false
          }
        ],
        relationships: [
          {
            name: 'budget_settings',
            targetTable: 'budget_settings',
            type: 'many-to-one',
            sourceColumn: 'budget_settings_id',
            targetColumn: 'id',
            description: 'Each budget item belongs to one budget settings record'
          }
        ],
        businessContext: [
          'Budget items represent specific services or products covered by the budget',
          'Product codes are used to match sessions to budget items for usage tracking',
          'Monitoring usage vs. quantity helps prevent budget overruns',
          'Budget items typically correspond to specific billable therapy services'
        ],
        sampleQueries: [
          'What budget items have the highest usage rate for client X?',
          'Which product codes are most frequently used across all clients?',
          'List all budget items with less than 10% remaining quantity',
          'What is the average unit price for individual therapy sessions?'
        ]
      }
    ];
  }
  
  /**
   * Get all tables with their metadata
   */
  getMetadata(): TableMetadata[] {
    return this.tables;
  }
  
  /**
   * Get metadata for a specific table
   */
  getTableMetadata(tableName: string): TableMetadata | undefined {
    return this.tables.find(table => table.name === tableName);
  }
  
  /**
   * Get a human-readable description of the database schema
   */
  getDescription(): string {
    let description = `
      DATABASE SCHEMA INFORMATION
      
      The database contains the following main entities:
    `;
    
    // Add each table description
    this.tables.forEach(table => {
      description += `
        - ${table.displayName}: ${table.description}
          Key columns: ${table.columns.slice(0, 5).map(col => col.displayName).join(', ')}...
          ${table.businessContext ? 'Business context: ' + table.businessContext[0] : ''}
      `;
    });
    
    // Add important relationships
    description += `
      KEY RELATIONSHIPS:
      - Clients have many Sessions, Goals, and Budget Settings
      - Sessions are linked to Clinicians and can have Session Notes
      - Goals can have Subgoals and Progress Assessments
      - Budget Settings contain multiple Budget Items
      
      IMPORTANT BUSINESS RULES:
      - Active clients have onboarding_status = "complete"
      - Completed sessions contribute to budget usage
      - Budget items track usage against allocated quantities
      - Goals guide treatment planning and progress measurement
    `;
    
    return description;
  }
}

// Create singleton instance
export const schemaMetadataService = new SchemaMetadataService();