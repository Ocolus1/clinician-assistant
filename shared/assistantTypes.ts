/**
 * Type definitions for the Clinician Assistant feature
 */

/**
 * Message Role - defines who sent the message
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message - represents a single message in a conversation
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

/**
 * Conversation - represents a conversation with the assistant
 */
export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  lastMessageAt: string;
}

/**
 * Assistant Configuration
 */
export interface AssistantConfig {
  apiKey: string;
  model: string;
  temperature: number;
}

// API Request/Response Types

/**
 * Assistant Status Response
 */
export interface AssistantStatusResponse {
  isConfigured: boolean;
  connectionValid: boolean;
  model?: string;
}

/**
 * Configure Assistant Request
 */
export interface ConfigureAssistantRequest {
  config: AssistantConfig;
}

/**
 * Configure Assistant Response
 */
export interface ConfigureAssistantResponse {
  success: boolean;
  connectionValid?: boolean;
  message?: string;
}

/**
 * Create Conversation Request
 */
export interface CreateConversationRequest {
  name: string;
}

/**
 * Create Conversation Response
 */
export interface CreateConversationResponse {
  id: string;
  name: string;
  success: boolean;
}

/**
 * Update Conversation Request
 */
export interface UpdateConversationRequest {
  conversationId: string;
  name: string;
}

/**
 * Get Conversations Response
 */
export interface GetConversationsResponse {
  conversations: Conversation[];
}

/**
 * Send Message Request
 */
export interface SendMessageRequest {
  conversationId: string;
  message: string;
}

/**
 * Send Message Response
 */
export interface SendMessageResponse {
  message: Message;
  success: boolean;
}

/**
 * Get Assistant Settings Response
 */
export interface GetAssistantSettingsResponse {
  openaiApiKey?: string;
  useGpt4?: boolean;
  isConfigured: boolean;
}