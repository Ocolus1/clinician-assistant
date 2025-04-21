/**
 * Type definitions for the enhanced clinician assistant
 */

/**
 * Database table metadata
 */
export interface TableMetadata {
  name: string;
  displayName: string;
  description: string;
  primaryKey: string[];
  columns: ColumnMetadata[];
  relationships?: RelationshipMetadata[];
  businessContext?: string[];
  sampleQueries?: string[];
}

/**
 * Database column metadata
 */
export interface ColumnMetadata {
  name: string;
  displayName: string;
  description: string;
  type: string;
  isNullable: boolean;
  businessContext?: string[];
  values?: string[];
}

/**
 * Database relationship metadata
 */
export interface RelationshipMetadata {
  name: string;
  description: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

/**
 * Context for SQL query generation
 */
export interface SQLQueryContext {
  schema: TableMetadata[];
  question: string;
  useBusinessContext: boolean;
}

/**
 * A step in a multi-query chain
 */
export interface QueryStep {
  id: string;
  purpose: string;
  query: string;
  dependsOn: string[];
  results?: any[];
  executionTime?: number;
  error?: string;
}

/**
 * A chain of dependent queries for complex questions
 */
export interface QueryChain {
  id: string;
  originalQuestion: string;
  steps: QueryStep[];
  maxSteps: number;
  currentStep: number;
  complete: boolean;
  startTime: number;
  endTime?: number;
  totalExecutionTime?: number;
  finalResults?: any[];
  error?: string;
}

/**
 * Question with enhanced features
 */
export interface EnhancedAssistantQuestion {
  question: string;
  useBusinessContext?: boolean;
  useTemplates?: boolean;
  useMultiQuery?: boolean;
  specificTemplate?: string;
}

/**
 * Response from the enhanced assistant
 */
export interface EnhancedAssistantResponse {
  originalQuestion: string;
  // If the question could be answered with SQL
  sqlQuery?: string;
  data?: any[];
  explanation?: string;
  
  // If a template was used
  usedTemplate?: string;
  templateParameters?: Record<string, any>;
  
  // If multi-query was used
  usedMultiQuery?: boolean;
  querySteps?: QueryStep[];
  
  // Execution details
  executionTime?: number;
  errorMessage?: string;
}

/**
 * Feature flag/capability of the enhanced assistant
 */
export interface EnhancedAssistantFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon?: string;
}