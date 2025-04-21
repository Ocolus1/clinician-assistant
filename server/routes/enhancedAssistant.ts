/**
 * Enhanced Assistant Routes
 * 
 * This module defines API routes for the enhanced clinician assistant with
 * improved schema understanding, query templates, and multi-query capabilities.
 */

import express from 'express';
import { enhancedClinicianAssistantService } from '../services/enhanced/clinicianAssistantService';
import { EnhancedAssistantQuestion } from '@shared/enhancedAssistantTypes';

/**
 * Helper function to ensure service is initialized
 */
async function ensureInitialized(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!enhancedClinicianAssistantService.getInitializationStatus()) {
    return res.status(503).json({
      error: 'Enhanced assistant service is still initializing. Please try again in a moment.'
    });
  }
  next();
}

/**
 * @route POST /api/enhanced-assistant/ask
 * @description Process a question using the enhanced assistant
 */
async function askQuestion(req: express.Request, res: express.Response) {
  try {
    const { question, useBusinessContext, useTemplates, useMultiQuery, format, clientId, therapistId } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    // Process the question with enhanced capabilities
    const enhancedQuestion: EnhancedAssistantQuestion = {
      question,
      useBusinessContext,
      useTemplates,
      useMultiQuery,
      format,
      clientId,
      therapistId
    };
    
    console.log(`[EnhancedAssistantAPI] Processing question: "${question}"`);
    const response = await enhancedClinicianAssistantService.processQuestion(enhancedQuestion);
    
    return res.json(response);
  } catch (error: any) {
    console.error('[EnhancedAssistantAPI] Error processing question:', error);
    
    return res.status(500).json({
      error: `Error processing question: ${error.message}`,
      details: error.stack
    });
  }
}

/**
 * @route GET /api/enhanced-assistant/features
 * @description Get available enhanced features
 */
async function getFeatures(req: express.Request, res: express.Response) {
  try {
    const features = enhancedClinicianAssistantService.getAvailableFeatures();
    return res.json(features);
  } catch (error: any) {
    console.error('[EnhancedAssistantAPI] Error fetching features:', error);
    
    return res.status(500).json({
      error: `Error fetching features: ${error.message}`
    });
  }
}

/**
 * @route GET /api/enhanced-assistant/templates
 * @description Get available query templates
 */
async function getTemplates(req: express.Request, res: express.Response) {
  try {
    const templates = enhancedClinicianAssistantService.getAvailableTemplates();
    
    // Format templates for client display
    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      parameters: template.parameters.map(param => ({
        name: param.name,
        description: param.description,
        type: param.type,
        required: param.required
      })),
      examplePatterns: template.patterns
    }));
    
    return res.json(formattedTemplates);
  } catch (error: any) {
    console.error('[EnhancedAssistantAPI] Error fetching templates:', error);
    
    return res.status(500).json({
      error: `Error fetching templates: ${error.message}`
    });
  }
}

/**
 * Register enhanced assistant routes on the Express app
 */
export function registerEnhancedAssistantRoutes(app: express.Express) {
  console.log('STEP 2.6: Registering enhanced assistant API routes');
  
  // Register the middleware to ensure service is initialized
  app.use('/api/enhanced-assistant', ensureInitialized);
  
  // Register routes
  app.post('/api/enhanced-assistant/ask', askQuestion);
  app.get('/api/enhanced-assistant/features', getFeatures);
  app.get('/api/enhanced-assistant/templates', getTemplates);
  
  console.log('STEP 2.6: Registering enhanced assistant API routes');
}