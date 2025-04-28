/**
 * Reports API Routes
 * 
 * Routes for generating and retrieving patient performance reports
 */
import { Request, Response, Express } from "express";
import { generatePatientReport } from "../services/reportService";

/**
 * Register report API routes
 */
export function registerReportRoutes(app: Express) {
  /**
   * Get patient performance report
   * 
   * Optional query parameters:
   * - startDate: ISO date string (e.g., 2025-01-01)
   * - endDate: ISO date string (e.g., 2025-12-31)
   */
  app.get('/api/patients/:id/reports/performance', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.id);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      
      // Parse date range parameters if provided
      const dateRange = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined
      };
      
      console.log(`Generating performance report for patient ${patientId} with date range:`, dateRange);
      
      const report = await generatePatientReport(patientId, dateRange);
      res.json(report);
    } catch (error) {
      console.error("Error generating patient performance report:", error);
      res.status(500).json({ 
        error: "Failed to generate patient report",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Get patient strategy details - for drill-down visualization
   */
  app.get('/api/patients/:id/reports/strategies', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.id);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      
      // Parse date range parameters if provided
      const dateRange = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined
      };
      
      console.log(`Getting detailed strategy data for patient ${patientId} with date range:`, dateRange);
      
      // This is a simplified endpoint that just returns the strategies part of the report
      const fullReport = await generatePatientReport(patientId, dateRange);
      res.json(fullReport.strategies);
    } catch (error) {
      console.error("Error fetching patient strategy details:", error);
      res.status(500).json({ 
        error: "Failed to fetch strategy details",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}