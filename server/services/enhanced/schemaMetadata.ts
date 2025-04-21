/**
 * Schema Metadata
 * 
 * This file provides enhanced metadata about the database schema to improve
 * natural language understanding and query generation. It maps business concepts
 * to database entities and provides additional context for the AI assistant.
 */

import * as schema from '../../../shared/schema';

/**
 * Types for table metadata
 */
export interface ColumnMetadata {
  description: string;
  businessTerms: string[];
  examples?: string[];
}

export interface TableMetadata {
  description: string;
  businessTerms: string[];
  conceptMappings: Record<string, string | string[]>;
  columns?: Record<string, ColumnMetadata>;
}

export interface SchemaMetadataType {
  version: string;
  tables: Record<string, TableMetadata>;
  businessConcepts: Record<string, string[]>;
}

/**
 * Schema metadata with business context
 */
export const schemaMetadata: SchemaMetadataType = {
  // Schema version - update when making changes
  version: '1.0.0',
  
  // Table metadata
  tables: {
    clients: {
      description: "Therapy clients receiving services at the clinic",
      businessTerms: ["patient", "customer", "client", "recipient", "service user", "student"],
      conceptMappings: {
        "client identifier": ["name", "unique_identifier"],
        "personal details": ["name", "date_of_birth", "gender", "preferred_language"],
        "contact information": ["contact_email", "contact_phone", "address"],
        "client status": ["onboarding_status"],
        "funding information": ["funds_management", "ndis_funds"]
      },
      columns: {
        name: {
          description: "Full name of the client, may include identifier suffix",
          businessTerms: ["full name", "client name", "patient name"]
        },
        unique_identifier: {
          description: "Unique 6-digit identifier for the client",
          businessTerms: ["ID", "client ID", "identifier", "client number"]
        },
        onboarding_status: {
          description: "Client's current onboarding status (complete, incomplete, pending)",
          businessTerms: ["status", "client status", "onboarding"]
        }
      }
    },
    
    allies: {
      description: "Support persons associated with clients (parents, caregivers, teachers)",
      businessTerms: ["caregiver", "parent", "support person", "family member", "teacher"],
      conceptMappings: {
        "ally information": ["name", "relationship", "email", "phone"],
        "support network": "client_id"
      }
    },
    
    clinicians: {
      description: "Clinical staff providing therapy services",
      businessTerms: ["therapist", "staff", "provider", "professional", "practitioner", "specialist"],
      conceptMappings: {
        "staff details": ["name", "title", "email", "specialization"],
        "staff status": "active"
      }
    },
    
    client_clinicians: {
      description: "Relationships between clients and their assigned clinicians",
      businessTerms: ["assignment", "therapist relationship", "clinical relationship"],
      conceptMappings: {
        "clinical assignment": ["client_id", "clinician_id", "role"],
        "assignment details": ["assigned_date", "notes"]
      }
    },
    
    sessions: {
      description: "Therapy sessions conducted with clients",
      businessTerms: ["appointment", "visit", "meeting", "therapy session", "service", "sales"],
      conceptMappings: {
        "session details": ["title", "description", "session_date", "duration", "location"],
        "session status": "status",
        "service delivery": ["client_id", "therapist_id", "session_date", "duration"],
        "revenue": ["duration", "status='completed'"], // Completed sessions often correlate with revenue
        "attendance": ["client_id", "session_date", "status"],
        "sales": ["status='completed'", "duration"] // Completed sessions are considered sales
      }
    },
    
    session_notes: {
      description: "Detailed notes and observations from therapy sessions",
      businessTerms: ["notes", "observations", "session documentation", "clinical notes", "progress notes"],
      conceptMappings: {
        "session documentation": ["notes", "session_id"],
        "ratings": ["mood_rating", "physical_activity_rating", "focus_rating", "cooperation_rating"],
        "session participants": "present_allies",
        "session products": "products"
      }
    },
    
    goals: {
      description: "Therapy goals set for clients",
      businessTerms: ["objective", "target", "aim", "therapy goal", "outcome", "plan"],
      conceptMappings: {
        "goal details": ["title", "description", "client_id"],
        "goal tracking": ["status", "start_date", "target_date", "completed_date"],
        "goal progress": ["status", "progress_percentage"],
        "active goals": "status='active'"
      }
    },
    
    subgoals: {
      description: "Smaller, measurable components of main therapy goals",
      businessTerms: ["milestone", "sub-objective", "step", "component", "subgoal"],
      conceptMappings: {
        "subgoal details": ["title", "description", "goal_id"],
        "subgoal progress": ["status", "priority"],
        "active subgoals": "status='active'"
      }
    },
    
    budget_settings: {
      description: "Budget configuration and settings for client funding",
      businessTerms: ["budget", "funding", "financial plan", "service budget", "NDIS plan"],
      conceptMappings: {
        "budget configuration": ["client_id", "settings"],
        "funding details": ["start_date", "end_date", "total_amount"],
        "active budgets": "end_date > CURRENT_DATE"
      }
    },
    
    budget_items: {
      description: "Individual line items within a client's budget",
      businessTerms: ["line item", "budget allocation", "service item", "funding category", "expense item"],
      conceptMappings: {
        "budget allocation": ["budget_settings_id", "product_code", "item_number"],
        "funding usage": ["quantity", "total_allocated", "total_used"],
        "available funding": "total_allocated - total_used",
        "budget utilization": "total_used / total_allocated"
      }
    },
    
    strategies: {
      description: "Therapeutic techniques and approaches used in sessions",
      businessTerms: ["technique", "approach", "method", "intervention", "therapy strategy"],
      conceptMappings: {
        "strategy details": ["name", "category", "description"],
        "therapy approaches": ["name", "category"]
      }
    },
    
    performance_assessments: {
      description: "Assessments of client performance on goals and subgoals",
      businessTerms: ["assessment", "evaluation", "rating", "review", "performance measure"],
      conceptMappings: {
        "performance evaluation": ["session_note_id", "goal_id", "subgoal_id", "rating", "score"],
        "strategy application": "strategies",
        "progress tracking": ["rating", "score", "notes"]
      }
    },
    
    milestone_assessments: {
      description: "Assessments of client achievement on specific milestones",
      businessTerms: ["milestone rating", "milestone achievement", "progress marker"],
      conceptMappings: {
        "milestone evaluation": ["performance_assessment_id", "milestone_id", "rating"],
        "strategy effectiveness": ["strategies", "rating"],
        "milestone notes": "notes"
      }
    }
  },
  
  // Business concept mappings to support natural language understanding
  businessConcepts: {
    "attendance": ["sessions", "session_date", "status"],
    "progress": ["goals", "subgoals", "status", "progress_percentage", "performance_assessments"],
    "funding": ["budget_settings", "budget_items", "total_allocated", "total_used"],
    "client load": ["client_clinicians", "clients", "clinicians"],
    "strategy effectiveness": ["strategies", "milestone_assessments", "performance_assessments", "rating"],
    "service delivery": ["sessions", "session_notes", "duration", "status"],
    "client engagement": ["session_notes", "cooperation_rating", "mood_rating", "sessions"],
    "revenue": ["budget_items", "sessions", "duration", "status='completed'"]
  }
};

/**
 * Generate a business-friendly description of the schema for the AI
 */
export function generateSchemaDescription(): string {
  let description = `# Enhanced Database Schema with Business Context\n\n`;
  description += `This schema represents a speech therapy clinic management system with the following key entities:\n\n`;
  
  // Add each table with its business context
  for (const [tableName, metadata] of Object.entries(schemaMetadata.tables)) {
    description += `## ${tableName} (${metadata.businessTerms.join(", ")})\n`;
    description += `${metadata.description}\n\n`;
    
    // Add concept mappings
    description += `Business concepts:\n`;
    for (const [concept, fields] of Object.entries(metadata.conceptMappings)) {
      const fieldList = Array.isArray(fields) ? fields.join(", ") : fields;
      description += `- ${concept}: ${fieldList}\n`;
    }
    description += `\n`;
  }
  
  // Add cross-table business concepts
  description += `## Business Concept Mappings\n`;
  description += `These concepts may span multiple tables:\n\n`;
  
  for (const [concept, tables] of Object.entries(schemaMetadata.businessConcepts)) {
    description += `- ${concept}: ${tables.join(", ")}\n`;
  }
  
  return description;
}

/**
 * Get a table's metadata by exact name or business term
 */
export function getTableMetadata(tableNameOrTerm: string): TableMetadata | null {
  // Check for exact table name match
  if (schemaMetadata.tables[tableNameOrTerm]) {
    return schemaMetadata.tables[tableNameOrTerm];
  }
  
  // Check for business term match
  for (const [tableName, metadata] of Object.entries(schemaMetadata.tables)) {
    if (metadata.businessTerms.includes(tableNameOrTerm.toLowerCase())) {
      return metadata;
    }
  }
  
  return null;
}

/**
 * Find tables related to a business concept
 */
export function getTablesForConcept(concept: string): string[] {
  const relatedTables: string[] = [];
  
  // Check direct concept mappings in business concepts
  if (schemaMetadata.businessConcepts[concept]) {
    return schemaMetadata.businessConcepts[concept];
  }
  
  // Check individual table concepts
  for (const [tableName, metadata] of Object.entries(schemaMetadata.tables)) {
    // Check if any concepts contain the search term
    for (const tableConcept of Object.keys(metadata.conceptMappings)) {
      if (tableConcept.toLowerCase().includes(concept.toLowerCase())) {
        relatedTables.push(tableName);
        break;
      }
    }
  }
  
  return relatedTables;
}

// Export singleton instance
export const schemaMetadataService = {
  getMetadata: () => schemaMetadata,
  getDescription: generateSchemaDescription,
  getTableMetadata,
  getTablesForConcept
};