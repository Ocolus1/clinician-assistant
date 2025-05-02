/**
 * Debug API Endpoint for ReactAgentService Testing
 * 
 * This file creates a debug API endpoint that allows direct testing of the specialized tools.
 */

import express from 'express';
import { getPatientGoals } from '../services/tools/patientGoalsTool.ts';
import { getPatientBudget } from '../services/tools/budgetTrackingTool.ts';
import { getPatientStrategies } from '../services/tools/strategyInsightsTool.ts';
import { getPatientSessions } from '../services/tools/patientSessionsTool.ts';

const router = express.Router();

// Debug endpoint for testing the Goal Tracking tool
router.post('/test-goal-tracking', async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }
    
    const result = await getPatientGoals(input);
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error testing Goal Tracking tool:', error);
    res.status(500).json({ error: 'Failed to test Goal Tracking tool' });
  }
});

// Debug endpoint for testing the Budget Tracking tool
router.post('/test-budget-tracking', async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }
    
    const result = await getPatientBudget(input);
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error testing Budget Tracking tool:', error);
    res.status(500).json({ error: 'Failed to test Budget Tracking tool' });
  }
});

// Debug endpoint for testing the Strategy Insights tool
router.post('/test-strategy-insights', async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }
    
    const result = await getPatientStrategies(input);
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error testing Strategy Insights tool:', error);
    res.status(500).json({ error: 'Failed to test Strategy Insights tool' });
  }
});

// Debug endpoint for testing the Session Engagement tool
router.post('/test-session-engagement', async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }
    
    const result = await getPatientSessions(input);
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error testing Session Engagement tool:', error);
    res.status(500).json({ error: 'Failed to test Session Engagement tool' });
  }
});

export default router;
