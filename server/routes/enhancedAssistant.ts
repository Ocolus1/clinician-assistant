/**
 * Enhanced Assistant Routes
 * 
 * This module defines API routes for the enhanced clinician assistant with
 * improved schema understanding, query templates, and multi-query capabilities.
 */

import express from 'express';
import { clinicianAssistantService } from '../services/enhanced/clinicianAssistantService';
import { EnhancedAssistantQuestion } from '@shared/enhancedAssistantTypes';

/**
 * Helper function to ensure service is initialized
 */
async function ensureInitialized(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    await clinicianAssistantService.initialize();
    next();
  } catch (error) {
    console.error('[EnhancedAssistant] Error initializing service:', error);
    res.status(500).json({ error: 'Failed to initialize enhanced assistant service' });
  }
}

/**
 * @route POST /api/enhanced-assistant/ask
 * @description Process a question using the enhanced assistant
 */
async function askQuestion(req: express.Request, res: express.Response) {
  try {
    const { 
      question, 
      useBusinessContext, 
      useTemplates, 
      useMultiQuery, 
      specificTemplate,
      conversationId,
      conversationMemory 
    } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required and must be a string' });
    }
    
    const enhancedQuestion: EnhancedAssistantQuestion = {
      question,
      useBusinessContext: useBusinessContext !== false,
      useTemplates: useTemplates !== false,
      useMultiQuery: useMultiQuery !== false,
      specificTemplate: specificTemplate || undefined,
      conversationId,
      conversationMemory
    };
    
    console.log('[EnhancedAssistant] Processing question with memory:', 
      conversationMemory ? 'Present' : 'None',
      conversationId ? `ConversationID: ${conversationId}` : '');
      
    const response = await clinicianAssistantService.processQuestion(enhancedQuestion);
    res.json(response);
  } catch (error: any) {
    console.error('[EnhancedAssistant] Error handling question:', error);
    res.status(500).json({ 
      error: `Failed to process question: ${error.message}`,
      originalQuestion: req.body.question
    });
  }
}

/**
 * @route GET /api/enhanced-assistant/features
 * @description Get available enhanced features
 */
async function getFeatures(req: express.Request, res: express.Response) {
  try {
    const features = clinicianAssistantService.getFeatures();
    res.json(features);
  } catch (error: any) {
    console.error('[EnhancedAssistant] Error getting features:', error);
    res.status(500).json({ error: `Failed to get features: ${error.message}` });
  }
}

/**
 * @route GET /api/enhanced-assistant/templates
 * @description Get available query templates
 */
async function getTemplates(req: express.Request, res: express.Response) {
  try {
    const templates = clinicianAssistantService.getTemplates();
    res.json(templates);
  } catch (error: any) {
    console.error('[EnhancedAssistant] Error getting templates:', error);
    res.status(500).json({ error: `Failed to get templates: ${error.message}` });
  }
}

/**
 * Register enhanced assistant routes on the Express app
 */
export function registerEnhancedAssistantRoutes(app: express.Express) {
  // Middleware to ensure the service is initialized
  app.use('/api/enhanced-assistant', ensureInitialized);
  
  // Route definitions
  app.post('/api/enhanced-assistant/ask', askQuestion);
  app.get('/api/enhanced-assistant/features', getFeatures);
  app.get('/api/enhanced-assistant/templates', getTemplates);
  
  console.log('[EnhancedAssistant] Routes registered');
}