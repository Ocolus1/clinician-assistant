/**
 * Enhanced Assistant API Client
 * 
 * This file contains the client-side functions for communicating with the
 * Enhanced Assistant API.
 */

import { apiRequest } from './queryClient';
import { EnhancedAssistantResponse, EnhancedQuestionRequest, EnhancedAssistantFeature, QueryTemplate } from '@shared/enhancedAssistantTypes';

/**
 * Asks a question to the enhanced assistant
 */
export async function askEnhancedQuestion(data: EnhancedQuestionRequest): Promise<EnhancedAssistantResponse> {
  return apiRequest('POST', '/api/enhanced-assistant/query', data);
}

/**
 * Gets the list of available enhanced features
 */
export async function getEnhancedFeatures(): Promise<EnhancedAssistantFeature[]> {
  return apiRequest('GET', '/api/enhanced-assistant/features');
}

/**
 * Gets the list of query templates
 */
export async function getQueryTemplates(): Promise<QueryTemplate[]> {
  return apiRequest('GET', '/api/enhanced-assistant/templates');
}

/**
 * Gets detailed schema metadata for data exploration
 */
export async function getSchemaMetadata(): Promise<any> {
  return apiRequest('GET', '/api/enhanced-assistant/schema');
}