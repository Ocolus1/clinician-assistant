/**
 * Enhanced Clinician Assistant Types
 * 
 * This file contains the shared types used between the frontend and backend
 * for the enhanced clinician assistant feature.
 */

// Table metadata for schema information
export interface TableMetadata {
  name: string;
  description: string;
  columns: ColumnMetadata[];
  relationships?: RelationshipMetadata[];
}

// Column metadata for schema information
export interface ColumnMetadata {
  name: string;
  type: string;
  description: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencesTable?: string;
  referencesColumn?: string;
}

// Relationship metadata for schema information
export interface RelationshipMetadata {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  sourceTable: string;
  targetTable: string;
  sourceColumn: string;
  targetColumn: string;
}

// Query chain for multi-query operations
export interface QueryChain {
  id: string;
  originalQuestion: string;
  steps: QueryStep[];
  maxSteps: number;
  currentStep: number;
  complete: boolean;
  error?: string;
  startTime: number;
  endTime?: number;
  totalExecutionTime?: number;
  finalResults?: any[];
}

// SQL query context for enhanced query generation
export interface SQLQueryContext {
  question: string;
  previousQueries?: string[];
  previousResults?: any[];
  schema?: TableMetadata[];
  userContext?: Record<string, any>;
}

// Template parameter definition
export interface TemplateParameter {
  name: string;
  description?: string;
  required: boolean;
  defaultValue?: string;
}

// Query template definition
export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  patterns: string[];
  parameters: TemplateParameter[];
  sampleQuestions?: string[];
}

// Enhanced assistant feature toggle
export interface EnhancedAssistantFeature {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  enabled?: boolean;
  icon?: string;
}

// Single query step in a multi-query operation
export interface QueryStep {
  id?: string;
  purpose: string;
  query: string;
  results?: any[];
  executionTime?: number;
  error?: string;
  dependsOn?: string[];
}

// Entity extracted from a message
export interface ExtractedEntity {
  text: string;
  type: 'ClientName' | 'ClientID' | 'GoalName' | 'GoalID' | 'Date' | 'Category' | 'Amount' | 'Concept';
  value?: string | number | Date;
}

// Conversation memory for maintaining context
export interface ConversationMemory {
  lastQuestion?: string;
  activeClientId?: string;
  activeClientName?: string;
  recentEntities?: ExtractedEntity[];
  contextCarryover?: {
    subject?: string;
    timeframe?: string;
    category?: string;
  };
}

// Enhanced assistant question request
export interface EnhancedQuestionRequest {
  question: string;
  useBusinessContext?: boolean;
  useTemplates?: boolean;
  useMultiQuery?: boolean;
  specificTemplate?: string;
  conversationId?: string;
  conversationMemory?: ConversationMemory;
}

// Alias for server-side usage (same as EnhancedQuestionRequest)
export interface EnhancedAssistantQuestion extends EnhancedQuestionRequest {}

// Enhanced assistant response
export interface EnhancedAssistantResponse {
  originalQuestion: string;
  explanation?: string;
  data?: any[];
  sqlQuery?: string;
  usedTemplate?: string;
  templateParameters?: Record<string, any>;
  usedMultiQuery?: boolean;
  querySteps?: QueryStep[];
  executionTime?: number;
  errorMessage?: string;
  updatedMemory?: ConversationMemory;
  detectedEntities?: ExtractedEntity[];
}