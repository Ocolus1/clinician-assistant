/**
 * Enhanced Assistant Routes
 * 
 * This module defines API routes for the enhanced clinician assistant with
 * improved schema understanding, query templates, and multi-query capabilities.
 */

import express from 'express';
import { enhancedClinicianAssistantService } from '../services/enhanced/clinicianAssistantService';
import { EnhancedAssistantQuestion } from '../../shared/enhancedAssistantTypes';

// Create a router
const router = express.Router();

/**
 * Helper function to ensure service is initialized
 */
async function ensureInitialized(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    if (!enhancedClinicianAssistantService.isConfigured()) {
      await enhancedClinicianAssistantService.initialize();
    }
    next();
  } catch (error: any) {
    console.error('Failed to initialize enhanced clinician assistant:', error);
    res.status(500).json({
      error: 'Failed to initialize enhanced clinician assistant',
      message: error.message
    });
  }
}

/**
 * @route POST /api/enhanced-assistant/ask
 * @description Process a question using the enhanced assistant
 */
router.post('/ask', ensureInitialized, async (req, res) => {
  try {
    const { question, useTemplates, useMultiQuery, useBusinessContext } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    console.log('[Enhanced API] Processing question:', question);
    
    const enhancedQuestion: EnhancedAssistantQuestion = {
      question,
      useTemplates,
      useMultiQuery,
      useBusinessContext
    };
    
    const response = await enhancedClinicianAssistantService.processQuestion(enhancedQuestion);
    
    res.json(response);
  } catch (error: any) {
    console.error('[Enhanced API] Error processing question:', error);
    res.status(500).json({
      error: 'Error processing question',
      message: error.message
    });
  }
});

/**
 * @route GET /api/enhanced-assistant/features
 * @description Get available enhanced features
 */
router.get('/features', ensureInitialized, async (req, res) => {
  try {
    // Return information about available features
    res.json({
      features: {
        templateMatching: true,
        multiQueryChains: true,
        businessContext: true,
        enhancedNLGeneration: true
      }
    });
  } catch (error: any) {
    console.error('[Enhanced API] Error fetching features:', error);
    res.status(500).json({
      error: 'Error fetching features',
      message: error.message
    });
  }
});

/**
 * @route GET /api/enhanced-assistant/templates
 * @description Get available query templates
 */
router.get('/templates', ensureInitialized, async (req, res) => {
  try {
    // Import the template service here to avoid circular dependencies
    const { queryTemplateService } = require('../services/enhanced/queryTemplates');
    
    const templates = queryTemplateService.getTemplates();
    
    res.json({
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        exampleQuestions: template.patterns.slice(0, 3)
      }))
    });
  } catch (error: any) {
    console.error('[Enhanced API] Error fetching templates:', error);
    res.status(500).json({
      error: 'Error fetching templates',
      message: error.message
    });
  }
});

// Register routes
export function registerEnhancedAssistantRoutes(app: express.Express) {
  app.use('/api/enhanced-assistant', router);
  console.log('STEP 2.6: Registering enhanced assistant API routes');
}