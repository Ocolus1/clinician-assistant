/**
 * Reports API Routes
 * 
 * Routes for generating and retrieving client performance reports
 */
import { Request, Response, Express } from "express";
import { generateClientReport } from "../services/reportService";

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
        return res.status(400).json({ error: "Invalid client ID" });
      }
      
      // Parse date range parameters if provided
      const dateRange = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined
      };
      
      console.log(`Generating performance report for client ${clientId} with date range:`, dateRange);
      
      const report = await generateClientReport(clientId, dateRange);
      res.json(report);
    } catch (error) {
      console.error("Error generating client performance report:", error);
      res.status(500).json({ 
        error: "Failed to generate client report",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Get client strategy details - for drill-down visualization
   */
  app.get('/api/clients/:id/reports/strategies', async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ error: "Invalid client ID" });
      }
      
      // Parse date range parameters if provided
      const dateRange = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined
      };
      
      console.log(`Getting detailed strategy data for client ${clientId} with date range:`, dateRange);
      
      // This is a simplified endpoint that just returns the strategies part of the report
      const fullReport = await generateClientReport(clientId, dateRange);
      res.json(fullReport.strategies);
    } catch (error) {
      console.error("Error fetching client strategy details:", error);
      res.status(500).json({ 
        error: "Failed to fetch strategy details",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}