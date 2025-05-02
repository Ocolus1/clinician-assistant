/**
 * Debug routes for testing and troubleshooting
 */

import express from "express";
import { db } from "../db";
import { patients } from "../../shared/schema";
import { sql } from "drizzle-orm";
import { patientQueriesService } from "../services/patientQueriesService";
import { responseGenerationService } from "../services/responseGenerationService";
import { getPatientGoals } from "../services/tools/patientGoalsTool";
import { getPatientBudget } from "../services/tools/budgetTrackingTool";
import { getPatientStrategies } from "../services/tools/strategyInsightsTool";
import { getPatientSessions } from "../services/tools/patientSessionsTool";

const router = express.Router();

/**
 * Get the total patient count directly from the database
 */
router.get("/patient-count", async (req, res) => {
  try {
    console.log("Debug: Getting patient count directly from database");
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients);
    
    console.log("Debug: Database query result:", result);
    
    const totalPatients = result[0].count;
    console.log("Debug: Total patients:", totalPatients);
    
    // Test the response formatting
    const formattedResponse = responseGenerationService.formatPatientCountData({ totalPatients });
    console.log("Debug: Formatted response:", formattedResponse);
    
    res.status(200).json({
      totalPatients,
      formattedResponse,
      rawResult: result
    });
  } catch (error) {
    console.error("Debug: Error getting patient count:", error);
    res.status(500).json({ error: "Failed to get patient count" });
  }
});

/**
 * Test the patient count query flow
 */
router.get("/test-patient-count", async (req, res) => {
  try {
    console.log("Debug: Testing patient count query flow");
    
    // Step 1: Get the patient count from the service
    console.log("Debug: Step 1 - Getting patient count from service");
    const totalPatients = await patientQueriesService.getTotalPatientCount();
    console.log("Debug: Patient count from service:", totalPatients);
    
    // Step 2: Format the response
    console.log("Debug: Step 2 - Formatting response");
    const formattedResponse = responseGenerationService.formatPatientCountData({ totalPatients });
    console.log("Debug: Formatted response:", formattedResponse);
    
    res.status(200).json({
      totalPatients,
      formattedResponse
    });
  } catch (error) {
    console.error("Debug: Error testing patient count flow:", error);
    res.status(500).json({ error: "Failed to test patient count flow" });
  }
});

/**
 * Debug endpoints for testing ReactAgentService tools
 */

// Debug endpoint for testing the Goal Tracking tool
router.post("/test-goal-tracking", async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }
    
    const result = await getPatientGoals(input);
    res.status(200).json({ result });
  } catch (error) {
    console.error("Debug: Error testing Goal Tracking tool:", error);
    res.status(500).json({ error: "Failed to test Goal Tracking tool" });
  }
});

// Debug endpoint for testing the Budget Tracking tool
router.post("/test-budget-tracking", async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }
    
    const result = await getPatientBudget(input);
    res.status(200).json({ result });
  } catch (error) {
    console.error("Debug: Error testing Budget Tracking tool:", error);
    res.status(500).json({ error: "Failed to test Budget Tracking tool" });
  }
});

// Debug endpoint for testing the Strategy Insights tool
router.post("/test-strategy-insights", async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }
    
    const result = await getPatientStrategies(input);
    res.status(200).json({ result });
  } catch (error) {
    console.error("Debug: Error testing Strategy Insights tool:", error);
    res.status(500).json({ error: "Failed to test Strategy Insights tool" });
  }
});

// Debug endpoint for testing the Session Engagement tool
router.post("/test-session-engagement", async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }
    
    const result = await getPatientSessions(input);
    res.status(200).json({ result });
  } catch (error) {
    console.error("Debug: Error testing Session Engagement tool:", error);
    res.status(500).json({ error: "Failed to test Session Engagement tool" });
  }
});

export default router;
