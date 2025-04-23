/**
 * Client Progress Routes
 * 
 * This file contains API routes for handling client progress questions
 * and retrieving relevant clinical data.
 */

import { Router, Request, Response } from 'express';
import { clientProgressService } from '../services/clientProgressService';

// Create a router instance
const router = Router();

/**
 * Initialize client progress routes
 */
export async function registerClientProgressRoutes(): Promise<Router> {
  try {
    // Import and ensure SQLQueryGenerationService is initialized first
    const { sqlQueryGenerationService } = await import('../services/sqlQueryGenerationService');
    
    // Initialize SQL Query Generation Service if not already initialized
    if (!sqlQueryGenerationService.isInitialized()) {
      // Get OpenAI API key from environment
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('OpenAI API key not found in environment');
        throw new Error('OpenAI API key required to initialize SQL Query Generation Service');
      }
      
      await sqlQueryGenerationService.initialize(apiKey, 'gpt-4o');
      console.log('SQL Query Generation Service initialized for Client Progress Service');
    }
    
    // Now initialize client progress service
    if (!clientProgressService.isInitialized()) {
      await clientProgressService.initialize();
    }
    
    // Endpoint to process client progress questions
    router.post('/api/client-progress/ask', async (req: Request, res: Response) => {
      try {
        const { question } = req.body;
        
        if (!question || typeof question !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'A valid question is required'
          });
        }
        
        console.log(`Processing client progress question: "${question}"`);
        const result = await clientProgressService.processClientQuestion(question);
        
        if (!result.success) {
          console.error('Failed to process client progress question:', result.error);
          return res.status(400).json({
            success: false,
            error: result.error || 'Failed to process question'
          });
        }
        
        return res.json({
          success: true,
          answer: result.answer,
          data: result.data,
          questionType: result.questionType,
          clientName: result.clientName,
          confidence: result.confidence
        });
      } catch (error: any) {
        console.error('Error in client progress question endpoint:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Unknown error'
        });
      }
    });
    
    // Debug endpoint to analyze a client progress question without executing it
    router.post('/api/client-progress/analyze', async (req: Request, res: Response) => {
      try {
        // This is a debugging endpoint for testing question analysis
        const { question } = req.body;
        
        if (!question || typeof question !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'A valid question is required'
          });
        }
        
        console.log(`Analyzing client progress question: "${question}"`);
        
        // We'll call the private method directly for debugging
        // By using any as a type assertion, we can access private methods
        const analysis = await (clientProgressService as any).analyzeQuestion(question);
        
        return res.json({
          success: true,
          analysis
        });
      } catch (error: any) {
        console.error('Error in client progress analysis endpoint:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Unknown error'
        });
      }
    });
    
    console.log('Client progress routes registered successfully');
    return router;
  } catch (error: any) {
    console.error('Error registering client progress routes:', error);
    throw error;
  }
}