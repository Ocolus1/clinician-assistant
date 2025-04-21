/**
 * Shared types for the Enhanced Clinician Assistant
 * 
 * This file extends the base assistant types with new functionality
 * specific to the enhanced assistant.
 */

import { AssistantStatusResponse, QueryResult } from './assistantTypes';

/**
 * Enhanced assistant status response interface
 * Extends the base AssistantStatusResponse with enhanced features
 */
export interface EnhancedAssistantStatusResponse extends AssistantStatusResponse {
  enhanced: boolean;
  useTemplates?: boolean;
  useMultiQuery?: boolean;
  useBusinessContext?: boolean;
}

/**
 * Enhanced query result interface
 * Extends the base QueryResult with enhanced features
 */
export interface EnhancedQueryResult extends QueryResult {
  metadata: {
    executionTime?: number;
    rowCount?: number;
    queryText?: string;
    fromTemplate?: boolean;
    fromMultiQuery?: boolean;
    usedBusinessContext?: boolean;
  };
}

/**
 * Schema metadata interfaces
 */
export interface TableMetadata {
  name: string;
  displayName: string;
  description: string;
  columns: ColumnMetadata[];
  primaryKey?: string[];
  relationships?: RelationshipMetadata[];
  businessContext?: string[];
  sampleQueries?: string[];
}

export interface ColumnMetadata {
  name: string;
  displayName: string;
  description: string;
  type: string;
  isNullable: boolean;
  businessContext?: string[];
  values?: string[]; // For enum-like fields, list of possible values
}

export interface RelationshipMetadata {
  name: string;
  targetTable: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  sourceColumn: string;
  targetColumn: string;
  description: string;
}

/**
 * Query template interfaces
 */
export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  patterns: string[];
  sqlTemplate: string;
  parameters: TemplateParameter[];
  resultMapping?: ResultMapping;
  responseTemplate?: string;
}

export interface TemplateParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'entity';
  required: boolean;
  entityType?: string; // For entity parameters, e.g., 'client', 'goal', etc.
  default?: any;
  extractionHints?: string[]; // Patterns to help extract this parameter from natural language
}

export interface ResultMapping {
  renameColumns?: Record<string, string>; // Original column name -> display name
  formatColumns?: Record<string, string>; // Column name -> format (e.g., 'date', 'currency', 'percent')
  visualizationType?: string;
  groupBy?: string[];
  sortBy?: string[];
  limit?: number;
}

/**
 * Multi-query interfaces
 */
export interface QueryStep {
  id: string;
  purpose: string;
  query: string;
  dependsOn: string[];
  results?: any[];
  error?: string;
  executionTime?: number;
}

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