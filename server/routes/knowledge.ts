/**
 * Knowledge API Routes for the Agentic Assistant
 * 
 * These routes provide aggregated data and insights from the database
 * to power intelligent responses in the agentic assistant.
 */
import { Request, Response, Express } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { knowledgeService } from "../services/knowledgeService";

/**
 * Register knowledge API routes
 */
export function registerKnowledgeRoutes(app: Express) {
  /**
   * Get general budget information
   */
  app.get('/api/knowledge/budgets', async (req: Request, res: Response) => {
    try {
      const subtopic = req.query.subtopic as string | undefined;
      const data = await knowledgeService.getBudgetInfo(subtopic);
      res.json(data);
    } catch (error) {
      console.error("Error fetching budget knowledge:", error);
      res.status(500).json({ 
        error: 'Failed to retrieve budget information',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get general progress information
   */
  app.get('/api/knowledge/progress', async (req: Request, res: Response) => {
    try {
      const subtopic = req.query.subtopic as string | undefined;
      const data = await knowledgeService.getProgressInfo(subtopic);
      res.json(data);
    } catch (error) {
      console.error("Error fetching progress knowledge:", error);
      res.status(500).json({ 
        error: 'Failed to retrieve progress information',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get general strategy information
   */
  app.get('/api/knowledge/strategies', async (req: Request, res: Response) => {
    try {
      const subtopic = req.query.subtopic as string | undefined;
      const data = await knowledgeService.getStrategyInfo(subtopic);
      res.json(data);
    } catch (error) {
      console.error("Error fetching strategy knowledge:", error);
      res.status(500).json({ 
        error: 'Failed to retrieve strategy information',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get database metadata
   */
  app.get('/api/knowledge/metadata', async (req: Request, res: Response) => {
    try {
      const table = req.query.table as string | undefined;
      const data = await knowledgeService.getDatabaseMetadata(table);
      res.json(data);
    } catch (error) {
      console.error("Error fetching database metadata:", error);
      res.status(500).json({ 
        error: 'Failed to retrieve database metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get therapy domain concepts
   */
  app.get('/api/knowledge/concepts', async (req: Request, res: Response) => {
    try {
      const concept = req.query.concept as string | undefined;
      const data = await knowledgeService.getTherapyDomainConcepts(concept);
      res.json(data);
    } catch (error) {
      console.error("Error fetching therapy domain concepts:", error);
      res.status(500).json({ 
        error: 'Failed to retrieve therapy domain concepts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Generate combined insights (placeholder for future implementation)
   */
  app.get('/api/knowledge/insights', async (req: Request, res: Response) => {
    try {
      res.json({
        message: "Combined insights endpoint",
        status: "Not yet implemented"
      });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  });

  /**
   * Entity relationships (placeholder for future implementation)
   */
  app.get('/api/knowledge/relationships', async (req: Request, res: Response) => {
    try {
      res.json({
        message: "Entity relationships endpoint",
        status: "Not yet implemented"
      });
    } catch (error) {
      console.error("Error fetching entity relationships:", error);
      res.status(500).json({ error: 'Failed to retrieve entity relationships' });
    }
  });

  /**
   * Aggregate metrics (placeholder for future implementation)
   */
  app.get('/api/knowledge/metrics', async (req: Request, res: Response) => {
    try {
      res.json({
        message: "Aggregate metrics endpoint",
        status: "Not yet implemented"
      });
    } catch (error) {
      console.error("Error fetching aggregate metrics:", error);
      res.status(500).json({ error: 'Failed to retrieve aggregate metrics' });
    }
  });

  /**
   * Data patterns (placeholder for future implementation)
   */
  app.get('/api/knowledge/patterns', async (req: Request, res: Response) => {
    try {
      res.json({
        message: "Data patterns endpoint",
        status: "Not yet implemented"
      });
    } catch (error) {
      console.error("Error analyzing data patterns:", error);
      res.status(500).json({ error: 'Failed to analyze data patterns' });
    }
  });

  /**
   * Client statistics from the actual database
   */
  app.get('/api/knowledge/clients/stats', async (req: Request, res: Response) => {
    try {
      const clientStats = await knowledgeService.getClientStatistics();
      res.json(clientStats);
    } catch (error) {
      console.error("Error fetching client statistics:", error);
      res.status(500).json({ error: 'Failed to retrieve client statistics' });
    }
  });
}