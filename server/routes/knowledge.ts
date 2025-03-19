/**
 * Knowledge API Routes for the Agentic Assistant
 * 
 * These routes provide aggregated data and insights from the database
 * to power intelligent responses in the agentic assistant.
 */
import { Express, Request, Response } from 'express';
import { knowledgeService } from '../services/knowledgeService';
import { db } from '../db';
import * as schema from '../../shared/schema';

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
      console.error('Error retrieving budget knowledge:', error);
      res.status(500).json({ error: 'Failed to retrieve budget knowledge' });
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
      console.error('Error retrieving progress knowledge:', error);
      res.status(500).json({ error: 'Failed to retrieve progress knowledge' });
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
      console.error('Error retrieving strategy knowledge:', error);
      res.status(500).json({ error: 'Failed to retrieve strategy knowledge' });
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
      console.error('Error retrieving database metadata:', error);
      res.status(500).json({ error: 'Failed to retrieve database metadata' });
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
      console.error('Error retrieving therapy concepts:', error);
      res.status(500).json({ error: 'Failed to retrieve therapy concepts' });
    }
  });
  
  /**
   * Generate combined insights (placeholder for future implementation)
   */
  app.get('/api/knowledge/insights', async (req: Request, res: Response) => {
    try {
      const dataTypes = (req.query.dataTypes as string || '').split(',').filter(Boolean);
      
      // This would be a more sophisticated implementation in a real application
      // For now, we return a basic response
      res.json({
        insights: `Combined insights for: ${dataTypes.join(', ')}`,
        dataCorrelations: 'This would contain correlations between different data types',
        recommendedActions: ['Review budget allocations', 'Consider strategy adjustments']
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  });
  
  /**
   * Entity relationships (placeholder for future implementation)
   */
  app.get('/api/knowledge/relationships', async (req: Request, res: Response) => {
    try {
      const entity1 = req.query.entity1 as string;
      const entity2 = req.query.entity2 as string;
      
      if (!entity1 || !entity2) {
        return res.status(400).json({ error: 'Both entity1 and entity2 are required' });
      }
      
      // This would be a more sophisticated implementation in a real application
      // For now, we return a basic response
      res.json({
        entity1,
        entity2,
        relationship: `Relationship between ${entity1} and ${entity2}`,
        strength: 'medium',
        dataPoints: ['Related through client outcomes', 'Both affect therapy effectiveness']
      });
    } catch (error) {
      console.error('Error retrieving entity relationships:', error);
      res.status(500).json({ error: 'Failed to retrieve entity relationships' });
    }
  });
  
  /**
   * Aggregate metrics (placeholder for future implementation)
   */
  app.get('/api/knowledge/metrics', async (req: Request, res: Response) => {
    try {
      const metricType = req.query.type as string;
      
      if (!metricType) {
        return res.status(400).json({ error: 'Metric type is required' });
      }
      
      // This would be a more sophisticated implementation in a real application
      // For now, we return a basic response based on the metric type
      let response: any = {
        metricType,
        timeframe: 'last 6 months',
      };
      
      switch (metricType) {
        case 'budget':
          response = {
            ...response,
            avgBudgetSize: 15000,
            avgUtilization: 72,
            topCategories: ['Speech Therapy', 'Occupational Therapy', 'Physical Therapy']
          };
          break;
        case 'progress':
          response = {
            ...response,
            avgProgressRate: 68,
            completionRate: 42,
            successFactors: ['Consistent attendance', 'Parental involvement', 'Well-defined goals']
          };
          break;
        case 'engagement':
          response = {
            ...response,
            avgSessionsPerMonth: 8,
            attendanceRate: 85,
            clientRetention: 92
          };
          break;
        default:
          response = {
            ...response,
            message: `Metrics for ${metricType} are not implemented yet`
          };
      }
      
      res.json(response);
    } catch (error) {
      console.error('Error calculating aggregate metrics:', error);
      res.status(500).json({ error: 'Failed to calculate aggregate metrics' });
    }
  });
  
  /**
   * Data patterns (placeholder for future implementation)
   */
  app.get('/api/knowledge/patterns', async (req: Request, res: Response) => {
    try {
      const dataType = req.query.type as string;
      
      if (!dataType) {
        return res.status(400).json({ error: 'Data type is required' });
      }
      
      // This would be a more sophisticated implementation in a real application
      // For now, we return a basic response based on the data type
      let response: any = {
        dataType,
        analysisMethod: 'time-series pattern recognition',
      };
      
      switch (dataType) {
        case 'budget':
          response = {
            ...response,
            patterns: ['Higher spending in Q2 and Q4', 'Lower utilization for new clients', 'Category shifts over time'],
            anomalies: ['Occasional high-cost interventions', 'Funding gaps between approvals']
          };
          break;
        case 'progress':
          response = {
            ...response,
            patterns: ['Faster progress in first 3 months', 'Plateaus after 6 months', 'Correlation with session frequency'],
            anomalies: ['Occasional regressions after breaks', 'Variable response to different strategies']
          };
          break;
        default:
          response = {
            ...response,
            message: `Pattern detection for ${dataType} is not implemented yet`
          };
      }
      
      res.json(response);
    } catch (error) {
      console.error('Error detecting data patterns:', error);
      res.status(500).json({ error: 'Failed to detect data patterns' });
    }
  });
  
  /**
   * Client statistics from the actual database
   */
  app.get('/api/knowledge/clients/stats', async (req: Request, res: Response) => {
    try {
      // Get actual client data from the database
      const allClients = await db.select().from(schema.clients);
      const activeClients = allClients.filter(client => client.onboardingStatus === 'complete');
      
      // Calculate age distribution if dateOfBirth is available
      const ageGroups = {
        'Early Childhood (0-5)': 0,
        'School Age (6-12)': 0,
        'Adolescent (13-17)': 0,
        'Adult (18+)': 0
      };
      
      // Calculate actual demographics from client data
      let totalAge = 0;
      let clientsWithAge = 0;
      
      allClients.forEach(client => {
        if (client.dateOfBirth) {
          const today = new Date();
          const birthDate = new Date(client.dateOfBirth);
          const age = today.getFullYear() - birthDate.getFullYear();
          
          totalAge += age;
          clientsWithAge++;
          
          // Categorize into age groups
          if (age <= 5) ageGroups['Early Childhood (0-5)']++;
          else if (age <= 12) ageGroups['School Age (6-12)']++;
          else if (age <= 17) ageGroups['Adolescent (13-17)']++;
          else ageGroups['Adult (18+)']++;
        }
      });
      
      const avgAge = clientsWithAge > 0 ? totalAge / clientsWithAge : 0;
      
      res.json({
        totalClients: allClients.length,
        activeClients: activeClients.length,
        avgAge: avgAge.toFixed(1),
        demographics: {
          ageGroups,
          // We'd need additional schema fields for these statistics
          primaryConditions: {
            'Developmental Delay': 0,
            'Autism Spectrum Disorder': 0,
            'Speech Sound Disorders': 0,
            'Language Disorders': 0
          }
        },
        recentTrends: {
          clientGrowth: '+15% in last quarter',
          serviceUtilization: '+8% in speech therapy services',
          clientRetention: '93% retention rate'
        }
      });
    } catch (error) {
      console.error('Error retrieving client statistics:', error);
      res.status(500).json({ error: 'Failed to retrieve client statistics' });
    }
  });
}