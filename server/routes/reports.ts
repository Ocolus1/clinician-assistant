/**
 * Reports API Routes
 * 
 * Routes for generating and retrieving client performance reports
 */

import { Express, Request, Response } from 'express';
import { generateClientReport } from '../services/reportService';

/**
 * Register report API routes
 */
export function registerReportRoutes(app: Express) {
  /**
   * Get client performance report
   * 
   * Optional query parameters:
   * - startDate: ISO date string (e.g., 2025-01-01)
   * - endDate: ISO date string (e.g., 2025-12-31)
   */
  app.get('/api/clients/:id/reports/performance', async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }
      
      // Extract date range parameters if provided
      const dateRange = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined
      };
      
      const report = await generateClientReport(clientId, dateRange);
      res.json(report);
    } catch (error: any) {
      console.error('Error generating client performance report:', error);
      res.status(500).json({ error: error.message || 'Failed to generate report' });
    }
  });

  /**
   * Get client strategy details - for drill-down visualization
   */
  app.get('/api/clients/:id/reports/strategies', async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }
      
      // Extract date range parameters if provided
      const dateRange = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined
      };
      
      // Get the full report and extract just the strategies section
      const report = await generateClientReport(clientId, dateRange);
      res.json(report.strategies);
    } catch (error: any) {
      console.error('Error getting client strategy details:', error);
      res.status(500).json({ error: error.message || 'Failed to get strategy details' });
    }
  });
}