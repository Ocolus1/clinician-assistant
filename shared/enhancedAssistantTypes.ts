/**
 * Enhanced Clinician Assistant Types
 * 
 * This module defines types for the enhanced clinician assistant system.
 * These types support advanced schema understanding, query templates,
 * multi-query chains, and enhanced result formatting.
 */

/**
 * Metadata for a database table
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
 * Metadata for a database column
 */
export interface ColumnMetadata {
  name: string;
  displayName: string;
  description: string;
  type: string;
  isNullable: boolean;
  businessContext?: string[];
  values?: string[]; // For enum-like columns
}

/**
 * Metadata for a relationship between tables
 */
export interface RelationshipMetadata {
  name: string;
  description: string;
  targetTable: string;
  sourceColumn: string;
  targetColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

/**
 * Parameter for a query template
 */
export interface TemplateParameter {
  name: string;
  description: string;
  type: string;
  required: boolean;
  default?: any;
  extractionHints?: string[];
}

/**
 * Result mapping for a query template
 */
export interface ResultMapping {
  renameColumns?: Record<string, string>;
  visualizationType?: 'table' | 'bar' | 'line' | 'pie' | 'card';
  hideColumns?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Query template
 */
export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  patterns: string[];
  sqlTemplate: string;
  parameters: TemplateParameter[];
  resultMapping: ResultMapping;
  responseTemplate?: string;
}

/**
 * Step in a multi-query chain
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

/**
 * Multi-query chain
 */
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

/**
 * Enhanced assistant question with options
 */
export interface EnhancedAssistantQuestion {
  question: string;
  useBusinessContext?: boolean;
  useTemplates?: boolean;
  useMultiQuery?: boolean;
  format?: 'natural' | 'table' | 'json' | 'chart';
  clientId?: number;
  therapistId?: number;
}

/**
 * Enhanced assistant response
 */
export interface EnhancedAssistantResponse {
  question: string;
  answer: string;
  data: any[];
  query: string;
  executionTime?: number;
  usedTemplate?: boolean;
  templateId?: string;
  usedMultiQuery?: boolean;
  queryChain?: QueryChain;
  usedBusinessContext?: boolean;
  error?: string;
}

/**
 * Context for generating SQL queries
 */
export interface SQLQueryContext {
  schema: TableMetadata[];
  question: string;
  useBusinessContext: boolean;
}

/**
 * Enhanced assistant feature description
 */
export interface EnhancedFeature {
  id: string;
  name: string;
  description: string;
  exampleQuestions: string[];
  enabled: boolean;
}