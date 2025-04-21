/**
 * Enhanced Clinician Assistant Client
 * 
 * This module provides functions for interacting with the enhanced assistant API.
 */

import { EnhancedAssistantQuestion, EnhancedAssistantResponse, EnhancedAssistantFeature, QueryTemplate } from '@shared/enhancedAssistantTypes';
import { ApiError } from './errors';

/**
 * Ask a question to the enhanced assistant
 */
export async function askEnhancedQuestion(question: EnhancedAssistantQuestion): Promise<EnhancedAssistantResponse> {
  try {
    const response = await fetch('/api/enhanced-assistant/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(question),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        `Error from enhanced assistant API: ${errorData.error || response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error asking enhanced assistant:', error);
    if (error instanceof ApiError) throw error;
    
    throw new ApiError(
      `Failed to communicate with enhanced assistant: ${(error as Error).message}`,
      500
    );
  }
}

/**
 * Get all available enhanced assistant features
 */
export async function getEnhancedFeatures(): Promise<EnhancedAssistantFeature[]> {
  try {
    const response = await fetch('/api/enhanced-assistant/features');

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        `Error fetching enhanced features: ${errorData.error || response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching enhanced features:', error);
    if (error instanceof ApiError) throw error;
    
    throw new ApiError(
      `Failed to fetch enhanced features: ${(error as Error).message}`,
      500
    );
  }
}

/**
 * Get all available query templates
 */
export async function getQueryTemplates(): Promise<QueryTemplate[]> {
  try {
    const response = await fetch('/api/enhanced-assistant/templates');

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        `Error fetching query templates: ${errorData.error || response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching query templates:', error);
    if (error instanceof ApiError) throw error;
    
    throw new ApiError(
      `Failed to fetch query templates: ${(error as Error).message}`,
      500
    );
  }
}