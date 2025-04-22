/**
 * Debug Routes for Development and Testing
 * 
 * These routes provide debugging and testing capabilities for the application.
 * Note: These should be disabled or removed in production.
 */

import express from 'express';
import { LangChainConfig, langchainService } from '../services/langchainService';
import { vectorStoreService } from '../services/vectorStoreService';
import { memoryManagementService } from '../services/memoryManagementService';

export const debugRouter = express.Router();

// Debug assistant route - get configuration
debugRouter.get('/assistant/config', async (req, res) => {
  try {
    const config = langchainService.getConfig();
    
    // Only send safe parts of the config, not the API key
    const safeConfig: Partial<LangChainConfig> = {
      model: config?.model,
      temperature: config?.temperature
    };
    
    res.json(safeConfig);
  } catch (error) {
    console.error('Error in debug config route:', error);
    res.status(500).json({ error: 'Failed to get assistant configuration' });
  }
});

// Debug assistant route - test memory system
debugRouter.post('/assistant/memory', async (req, res) => {
  try {
    const { conversationId, userMessage } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }
    
    // Fetch memory context information
    const memoryContext = await memoryManagementService.getTieredMemoryContext(
      conversationId,
      userMessage || 'test query',
      [] // Empty recent messages array for testing
    );
    
    // Get vector store stats if available
    let vectorStats = null;
    if (vectorStoreService.isInitialized()) {
      try {
        const messages = await vectorStoreService.retrieveSimilarMessages(
          conversationId,
          userMessage || 'test query',
          5
        );
        
        vectorStats = {
          messagesStored: messages.length,
          retrievalSuccess: messages.length > 0
        };
      } catch (error) {
        console.error('Error getting vector store stats:', error);
        vectorStats = {
          error: 'Failed to retrieve vector store information'
        };
      }
    }
    
    // Return debugging information
    res.json({
      conversationId,
      memoryServiceInitialized: memoryManagementService.isInitialized(),
      vectorServiceInitialized: vectorStoreService.isInitialized(),
      recentMessages: memoryContext.recentMessages,
      relevantMessages: memoryContext.relevantMessages,
      summaries: memoryContext.summaries,
      combinedContext: memoryContext.combinedContext,
      vectorStats
    });
  } catch (error) {
    console.error('Error in debug memory route:', error);
    res.status(500).json({ error: 'Failed to get memory debug information' });
  }
});

// Debug assistant route - test connection
debugRouter.get('/assistant/connection', async (req, res) => {
  try {
    const connectionValid = await langchainService.testConnection();
    res.json({ connectionValid });
  } catch (error) {
    console.error('Error in debug connection route:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Register debug assistant routes
export function registerDebugAssistantRoutes(app: express.Application) {
  app.use('/api/assistant/debug', debugRouter);
  console.log('Debug assistant routes registered successfully');
}