/**
 * Enhanced Clinician Assistant Types
 * 
 * This file contains the shared types used between the frontend and backend
 * for the enhanced clinician assistant feature.
 */

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
}

// Single query step in a multi-query operation
export interface QueryStep {
  purpose: string;
  query: string;
  results?: any[];
  executionTime?: number;
  error?: string;
}

// Enhanced assistant question request
export interface EnhancedQuestionRequest {
  question: string;
  useBusinessContext?: boolean;
  useTemplates?: boolean;
  useMultiQuery?: boolean;
  specificTemplate?: string;
}

// Enhanced assistant response
export interface EnhancedAssistantResponse {
  originalQuestion: string;
  explanation?: string;
  data?: any[];
  sqlQuery?: string;
  usedTemplate?: string;
  usedMultiQuery?: boolean;
  querySteps?: QueryStep[];
  executionTime?: number;
  errorMessage?: string;
}