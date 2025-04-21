/**
 * Enhanced Clinician Assistant Types
 * 
 * This file extends the base assistant types with additional interfaces
 * for the enhanced clinician assistant features.
 */

import { Message, MessageRole, QueryResult } from './assistantTypes';

// Base interfaces to replicate and extend
export interface AssistantQuestion {
  question: string;
  conversationId?: string;
}

export interface AssistantResponse {
  answer: string;
  query?: string;
  data?: any[];
  error?: string;
  success: boolean;
  executionTime?: number;
}

/**
 * Enhanced Clinician Assistant question with additional metadata options
 */
export interface EnhancedAssistantQuestion extends AssistantQuestion {
  useTemplates?: boolean;
  useMultiQuery?: boolean;
  useBusinessContext?: boolean;
}

/**
 * Enhanced Clinician Assistant response with additional metadata
 */
export interface EnhancedAssistantResponse extends AssistantResponse {
  fromTemplate?: boolean;
  fromMultiQuery?: boolean;
  usedBusinessContext?: boolean;
  executionPlan?: string;
}

/**
 * Table metadata information
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
 * Column metadata information
 */
export interface ColumnMetadata {
  name: string;
  displayName: string;
  description: string;
  type: string;
  isNullable: boolean;
  values?: string[];
  businessContext?: string[];
}

/**
 * Relationship metadata information
 */
export interface RelationshipMetadata {
  name: string;
  targetTable: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  sourceColumn: string;
  targetColumn: string;
  description: string;
}

/**
 * Query template for common question patterns
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
 * Parameter for template substitution
 */
export interface TemplateParameter {
  name: string;
  description: string;
  type: string;
  required: boolean;
  default?: any;
  entityType?: string;
  extractionHints?: string[];
}

/**
 * Result mapping for transforming query results
 */
export interface ResultMapping {
  renameColumns?: Record<string, string>;
  formatValues?: Record<string, string>;
  visualizationType?: 'table' | 'bar' | 'line' | 'pie';
}

/**
 * Multi-query chain for complex questions
 */
export interface QueryChain {
  id: string;
  originalQuestion: string;
  steps: QueryStep[];
  maxSteps: number;
  currentStep: number;
  complete: boolean;
  error?: string;
  finalResults?: any[];
  startTime: number;
  endTime?: number;
  totalExecutionTime?: number;
}

/**
 * Single step in a query chain
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