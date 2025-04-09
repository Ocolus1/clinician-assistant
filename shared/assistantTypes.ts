/**
 * Shared types for the Clinician Assistant
 */

// Message role types
export type MessageRole = 'user' | 'assistant' | 'system';

// Message interface
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

// Conversation interface
export interface Conversation {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messages: Message[];
}

/**
 * Assistant configuration interface
 * Used when configuring the assistant
 */
export interface AssistantConfig {
  apiKey: string;
  model: string;
  temperature: number;
}

/**
 * Assistant status response interface
 * Returned by the status API endpoint
 */
export interface AssistantStatusResponse {
  isConfigured: boolean;
  connectionValid: boolean;
  model?: string;
}

// Assistant settings interface
export interface AssistantSettings {
  openaiApiKey?: string;
  readOnly: boolean;
  model?: string;
  temperature?: number;
}

// Assistant status interface
export interface AssistantStatus {
  isConfigured: boolean;
  connectionValid: boolean;
}

// API response interfaces
export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface StatusResponse {
  isConfigured: boolean;
  connectionValid: boolean;
}

export interface ConnectionTestResponse {
  success: boolean;
  error?: string;
}

// Request interfaces
export interface CreateConversationRequest {
  name: string;
}

export interface UpdateConversationRequest {
  conversationId: string;
  name: string;
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
}

export interface UpdateSettingsRequest {
  openaiApiKey?: string;
  model?: string;
  temperature?: number;
  readOnly?: boolean;
}