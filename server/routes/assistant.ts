/**
 * Clinician Assistant Routes
 * 
 * This module defines the API routes for the Clinician Assistant feature,
 * handling requests related to assistant configuration, conversations, and messages.
 */

import express from 'express';
import { z } from 'zod';
import { clinicianAssistantService } from '../services/clinicianAssistantService';
import { conversationService } from '../services/conversationService';
import { AssistantConfig } from '@shared/assistantTypes';

const router = express.Router();

// Initialize the assistant service when the server starts
(async () => {
  try {
    await clinicianAssistantService.initialize();
  } catch (error) {
    console.error('Failed to initialize clinician assistant service:', error);
  }
})();

// Schema for assistant configuration
const configureAssistantSchema = z.object({
  config: z.object({
    apiKey: z.string().min(1),
    model: z.string().min(1),
    temperature: z.number().min(0).max(2)
  })
});

// Schema for creating a conversation
const createConversationSchema = z.object({
  name: z.string().min(1)
});

// Schema for updating a conversation
const updateConversationSchema = z.object({
  name: z.string().min(1)
});

// Schema for sending a message
const sendMessageSchema = z.object({
  message: z.string().min(1)
});

/**
 * GET /api/assistant/status
 * Get the current status of the assistant
 */
router.get('/status', async (req, res) => {
  try {
    const status = clinicianAssistantService.getStatus();
    
    // Test connection if configured
    if (status.isConfigured) {
      status.connectionValid = await clinicianAssistantService.testConnection();
    }
    
    res.json(status);
  } catch (error: any) {
    console.error('Error getting assistant status:', error);
    res.status(500).json({ error: error.message || 'Failed to get assistant status' });
  }
});

/**
 * POST /api/assistant/test-connection
 * Test the connection to the OpenAI API
 */
router.post('/test-connection', async (req, res) => {
  try {
    const status = clinicianAssistantService.getStatus();
    
    if (!status.isConfigured) {
      return res.status(400).json({ 
        success: false,
        message: 'Assistant is not configured'
      });
    }
    
    const connectionValid = await clinicianAssistantService.testConnection();
    
    res.json({ 
      success: true,
      connectionValid,
      message: connectionValid 
        ? 'Connection test successful' 
        : 'Connection test failed'
    });
  } catch (error: any) {
    console.error('Error testing connection:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to test connection'
    });
  }
});

/**
 * POST /api/assistant/configure
 * Configure the assistant with API key and model settings
 */
router.post('/configure', async (req, res) => {
  try {
    const parseResult = configureAssistantSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid configuration parameters',
        errors: parseResult.error.errors
      });
    }
    
    const { config } = parseResult.data;
    
    // Configure the assistant
    clinicianAssistantService.configureAssistant(config);
    
    // Test the connection
    const connectionValid = await clinicianAssistantService.testConnection();
    
    res.json({ 
      success: true, 
      connectionValid,
      message: connectionValid 
        ? 'Assistant configured successfully' 
        : 'Assistant configured but connection test failed'
    });
  } catch (error: any) {
    console.error('Error configuring assistant:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to configure assistant'
    });
  }
});

/**
 * GET /api/assistant/conversations
 * Get all conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await conversationService.getConversations();
    res.json({ conversations });
  } catch (error: any) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: error.message || 'Failed to get conversations' });
  }
});

/**
 * POST /api/assistant/conversations
 * Create a new conversation
 */
router.post('/conversations', async (req, res) => {
  try {
    const parseResult = createConversationSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid conversation parameters',
        errors: parseResult.error.errors
      });
    }
    
    const { name } = parseResult.data;
    const conversation = await conversationService.createConversation(name);
    
    res.status(201).json({ 
      success: true,
      id: conversation.id,
      name: conversation.name
    });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create conversation'
    });
  }
});

/**
 * PUT /api/assistant/conversations/:id
 * Update a conversation
 */
router.put('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = updateConversationSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid update parameters',
        errors: parseResult.error.errors
      });
    }
    
    const { name } = parseResult.data;
    const success = await conversationService.updateConversation(id, { name });
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: `Conversation ${id} not found`
      });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update conversation'
    });
  }
});

/**
 * DELETE /api/assistant/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await conversationService.deleteConversation(id);
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: `Conversation ${id} not found`
      });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete conversation'
    });
  }
});

/**
 * POST /api/assistant/conversations/:id/clear
 * Clear all messages from a conversation
 */
router.post('/conversations/:id/clear', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await conversationService.clearConversation(id);
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: `Conversation ${id} not found`
      });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to clear conversation'
    });
  }
});

/**
 * POST /api/assistant/conversations/:id/messages
 * Send a message to the assistant
 */
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = sendMessageSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid message',
        errors: parseResult.error.errors
      });
    }
    
    const { message } = parseResult.data;
    
    // Process the message
    const response = await clinicianAssistantService.processMessage(id, message);
    
    if (!response) {
      return res.status(404).json({ 
        success: false, 
        message: `Conversation ${id} not found`
      });
    }
    
    res.json({ 
      success: true,
      message: response
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to send message'
    });
  }
});

export default router;