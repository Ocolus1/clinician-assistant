/**
 * Clinician Assistant Routes
 * 
 * This file contains the API routes for the Clinician Assistant feature.
 */

import express from 'express';
import { 
  ConfigureAssistantRequest,
  CreateConversationRequest,
  UpdateConversationRequest,
  SendMessageRequest
} from '@shared/assistantTypes';
import { getConversationService } from '../services/conversationService';
import { getClinicianAssistantService } from '../services/clinicianAssistantService';

// Create router
const router = express.Router();

// Get conversation service instance
const conversationService = getConversationService();

// Get clinician assistant service instance
const clinicianAssistantService = getClinicianAssistantService();

/**
 * Check assistant status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await clinicianAssistantService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking assistant status:', error);
    res.status(500).json({ error: 'Failed to check assistant status' });
  }
});

/**
 * Configure the assistant
 */
router.post('/configure', async (req, res) => {
  try {
    const configRequest = req.body as ConfigureAssistantRequest;
    const result = await clinicianAssistantService.configure(configRequest);
    res.json(result);
  } catch (error) {
    console.error('Error configuring assistant:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to configure assistant' 
    });
  }
});

/**
 * Get all conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await conversationService.getConversations();
    res.json({ conversations });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

/**
 * Create a new conversation
 */
router.post('/conversations', async (req, res) => {
  try {
    const createRequest = req.body as CreateConversationRequest;
    const conversation = await conversationService.createConversation(createRequest.name);
    res.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * Update a conversation
 */
router.put('/conversations/:id', async (req, res) => {
  try {
    const updateRequest = req.body as UpdateConversationRequest;
    const id = req.params.id;
    
    await conversationService.updateConversation(id, updateRequest.name);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update conversation' 
    });
  }
});

/**
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await conversationService.deleteConversation(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete conversation' 
    });
  }
});

/**
 * Clear a conversation's messages
 */
router.post('/conversations/:id/clear', async (req, res) => {
  try {
    const id = req.params.id;
    await conversationService.clearConversation(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear conversation' 
    });
  }
});

/**
 * Send a message and get a response
 */
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const id = req.params.id;
    const messageRequest = req.body as SendMessageRequest;
    
    const message = await clinicianAssistantService.processMessage(
      id, 
      messageRequest.message
    );
    
    res.json({ message });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process message' 
    });
  }
});

export default router;