/**
 * Enhanced Assistant Routes
 * 
 * This file provides API routes for the enhanced clinician assistant
 * with improved schema understanding, multi-query, and templating capabilities.
 */

import express from 'express';
import { z } from 'zod';
import { enhancedClinicianAssistantService } from '../services/enhanced/clinicianAssistantService';
import { schemaMetadataService } from '../services/enhanced/schemaMetadata';
import { queryTemplateService } from '../services/enhanced/queryTemplates';
import { enhancedSQLQueryGenerator } from '../services/enhanced/sqlQueryGenerator';
import { conversationService } from '../services/conversationService';

const router = express.Router();

/**
 * Validate assistant configuration
 */
const assistantConfigSchema = z.object({
  apiKey: z.string().min(1, { message: "API key is required" }),
  model: z.string().min(1, { message: "Model name is required" }),
  temperature: z.number().min(0).max(1).default(0.7),
  useTemplates: z.boolean().optional().default(true),
  useMultiQuery: z.boolean().optional().default(true),
  useBusinessContext: z.boolean().optional().default(true)
});

/**
 * Add message schema
 */
const addMessageSchema = z.object({
  content: z.string().min(1, { message: "Message content is required" })
});

/**
 * Test route to verify enhanced assistant is working
 */
router.get('/ping', (_req, res) => {
  res.json({ status: 'ok', message: 'Enhanced Clinician Assistant is available' });
});

/**
 * Get the configuration status of the enhanced assistant
 */
router.get('/status', (_req, res) => {
  const status = enhancedClinicianAssistantService.getStatus();
  res.json(status);
});

/**
 * Configure the enhanced assistant
 */
router.post('/configure', (req, res) => {
  try {
    // Validate the request body
    const result = assistantConfigSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid configuration',
        details: result.error.format()
      });
    }
    
    // Initialize the enhanced assistant
    enhancedClinicianAssistantService.initialize(result.data);
    
    // Return the current status
    res.json({
      message: 'Enhanced Clinician Assistant configured successfully',
      status: enhancedClinicianAssistantService.getStatus()
    });
  } catch (error: any) {
    console.error('Error configuring enhanced assistant:', error);
    res.status(500).json({ error: 'Failed to configure enhanced assistant', message: error.message });
  }
});

/**
 * Get all conversations
 */
router.get('/conversations', async (_req, res) => {
  try {
    const conversations = await conversationService.getConversations();
    res.json({ conversations });
  } catch (error: any) {
    console.error('Error retrieving conversations:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations', message: error.message });
  }
});

/**
 * Create a new conversation
 */
router.post('/conversations', async (req, res) => {
  try {
    const name = req.body.name || `New Conversation - ${new Date().toLocaleTimeString()}`;
    const conversation = await conversationService.createConversation(name);
    
    if (!conversation) {
      return res.status(500).json({ error: 'Failed to create conversation' });
    }
    
    res.json({ conversation });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation', message: error.message });
  }
});

/**
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await conversationService.deleteConversation(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation', message: error.message });
  }
});

/**
 * Get all messages in a conversation
 */
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    
    const messages = await conversationService.getMessageHistory(id);
    
    res.json({ messages });
  } catch (error: any) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({ error: 'Failed to retrieve messages', message: error.message });
  }
});

/**
 * Add a message to a conversation and get assistant response
 */
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the assistant is configured
    if (!enhancedClinicianAssistantService.isConfigured()) {
      return res.status(400).json({ error: 'Enhanced Clinician Assistant not configured' });
    }
    
    // Validate the request body
    const result = addMessageSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid message',
        details: result.error.format()
      });
    }
    
    // Process the message and get a response
    const assistantMessage = await enhancedClinicianAssistantService.processMessage(
      id,
      result.data.content
    );
    
    if (!assistantMessage) {
      return res.status(500).json({ error: 'Failed to process message' });
    }
    
    res.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message', message: error.message });
  }
});

/**
 * Get metadata about the enhanced schema
 */
router.get('/schema-metadata', (_req, res) => {
  try {
    const metadata = schemaMetadataService.getMetadata();
    res.json({ metadata });
  } catch (error: any) {
    console.error('Error retrieving schema metadata:', error);
    res.status(500).json({ error: 'Failed to retrieve schema metadata', message: error.message });
  }
});

/**
 * Get all query templates
 */
router.get('/templates', (_req, res) => {
  try {
    const templates = queryTemplateService.getTemplates();
    res.json({ templates });
  } catch (error: any) {
    console.error('Error retrieving templates:', error);
    res.status(500).json({ error: 'Failed to retrieve templates', message: error.message });
  }
});

/**
 * Test query template matching for a question
 */
router.post('/test-template', (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    const result = queryTemplateService.processQuestion(question);
    res.json({ result });
  } catch (error: any) {
    console.error('Error testing template:', error);
    res.status(500).json({ error: 'Failed to test template', message: error.message });
  }
});

/**
 * Test SQL query generation for a question
 */
router.post('/test-query', async (req, res) => {
  try {
    const { question, options } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    const query = await enhancedSQLQueryGenerator.generateQuery(question, options || {});
    res.json({ query });
  } catch (error: any) {
    console.error('Error generating query:', error);
    res.status(500).json({ error: 'Failed to generate query', message: error.message });
  }
});

/**
 * Execute an SQL query
 */
router.post('/execute-query', async (req, res) => {
  try {
    const { query, options } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const result = await enhancedSQLQueryGenerator.executeQuery(query, options || {});
    res.json({ result });
  } catch (error: any) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Failed to execute query', message: error.message });
  }
});

// Export the router
export default router;