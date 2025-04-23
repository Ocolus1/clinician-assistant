/**
 * Goal Tracking Routes
 * 
 * This file defines routes specifically for goal and milestone tracking queries.
 */
import express from 'express';
import { handleGoalTrackingQuestion } from '../services/agentGoalTrackingHandler';

const router = express.Router();

// Route to handle goal tracking questions
router.post('/api/goal-tracking/query', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    
    console.log(`Processing goal tracking question: "${question}"`);
    
    // Process the question with our specialized handler
    const response = await handleGoalTrackingQuestion(question);
    
    res.json({
      success: true,
      result: response
    });
  } catch (error: any) {
    console.error('Error processing goal tracking question:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while processing the question'
    });
  }
});

// Route to test if a question is related to goal tracking
router.post('/api/goal-tracking/detect', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    
    // Simple pattern matching to detect goal tracking questions
    const isGoalTrackingQuestion = detectGoalTrackingQuestion(question);
    
    res.json({
      success: true,
      isGoalTrackingQuestion
    });
  } catch (error: any) {
    console.error('Error detecting goal tracking question:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while processing the question'
    });
  }
});

/**
 * Detect if a question is related to goal tracking
 */
export function detectGoalTrackingQuestion(question: string): boolean {
  const lowerCaseQuestion = question.toLowerCase();
  
  // Define patterns for goal tracking questions
  const goalPatterns = [
    /\bgoals?\b/i,
    /\bmilestones?\b/i,
    /\bprogress\b/i,
    /\bworking on\b/i,
    /\bsubgoals?\b/i,
    /\bstrategies?\b/i,
    /\btracking\b/i,
    /\bsessions?\b/i,
    /\bimprovement\b/i,
    /\bscores?\b/i,
    /\brating\b/i,
    /\bbenchmarks?\b/i,
    /\bcompleted\b/i,
    /\bfinished\b/i,
    /\bbudget\b/i,
    /\bfunding\b/i,
    /\bmoney\b/i,
    /\bappointments?\b/i
  ];
  
  // Check if any pattern matches
  return goalPatterns.some(pattern => pattern.test(lowerCaseQuestion));
}

export default router;