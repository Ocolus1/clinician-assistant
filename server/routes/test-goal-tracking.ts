import express, { Request, Response } from 'express';
import { handleGoalTrackingQuestion } from '../services/agentGoalTrackingHandler';

const router = express.Router();

/**
 * Test endpoint for trying the goal tracking handler directly
 * This helps test the system without needing to go through the full agent
 */
router.post('/test-goal-tracking', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    console.log(`Processing goal tracking question: "${question}"`);
    
    const answer = await handleGoalTrackingQuestion(question);
    
    return res.json({ 
      question,
      answer,
      processed: true
    });
  } catch (error: any) {
    console.error('Error processing goal tracking question:', error);
    return res.status(500).json({ 
      error: 'Error processing goal tracking question',
      message: error.message || 'Unknown error'
    });
  }
});

export default router;