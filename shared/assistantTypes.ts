/**
 * Shared types for the Clinician Assistant
 */

/**
 * Message role type
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Message type
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

/**
 * Conversation type
 */
export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  lastMessageAt: string;
}

/**
 * Assistant Status Response
 */
export interface AssistantStatusResponse {
  isConfigured: boolean;
  connectionValid: boolean;
}

/**
 * Configure Assistant Request
 */
export interface ConfigureAssistantRequest {
  config: {
    apiKey: string;
    model?: string;
    temperature?: number;
  };
}

/**
 * Configure Assistant Response
 */
export interface ConfigureAssistantResponse {
  success: boolean;
  connectionValid: boolean;
  message?: string;
}

/**
 * Get Conversations Response
 */
export interface GetConversationsResponse {
  conversations: Conversation[];
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
  conversation: Conversation;
}

/**
 * Update Conversation Request
 */
export interface UpdateConversationRequest {
  conversationId: string;
  name: string;
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
}

/**
 * SQL Query Result
 */
export interface SQLQueryResult {
  sqlQuery: string;
  data: any[];
  error?: string;
}