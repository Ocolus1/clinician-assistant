/**
 * Shared types for the Clinician Assistant
 */

// Message role types
export type MessageRole = 'user' | 'assistant' | 'system';

// Visualization types
export type VisualizationType = 'table' | 'bar' | 'line' | 'pie' | 'none';

// Query result interface
export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  visualizationType?: VisualizationType;
  metadata?: {
    executionTime?: number;
    rowCount?: number;
    queryText?: string;
  };
}

// Message interface
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  queryResult?: QueryResult;
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

/**
 * Memory management types
 */
export interface MemorySummary {
  id: string;
  conversationId: string;
  content: string;
  startTimestamp: string;
  endTimestamp: string;
  messageCount: number;
  topics: string[];
  createdAt: string;
}

export interface MemoryRetrievalResult {
  recentMessages: Message[];
  relevantMessages: Message[];
  summaries: MemorySummary[];
  combinedContext: string;
}

/**
 * Schema Analysis and SQL Generation Types
 */

// Column Metadata
export interface ColumnMetadata {
  name: string;
  dataType: string;
  isNullable: boolean;
  description: string;
  format?: string;
  examples?: string[];
  isIdentifier?: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
  statistics?: {
    distinctValuesCount?: number;
    nullCount?: number;
    minValue?: string | number;
    maxValue?: string | number;
    distributionDescription?: string;
  };
}

// Table Metadata
export interface TableMetadata {
  name: string;
  description: string;
  columns: ColumnMetadata[];
  primaryKey?: string[];
  foreignKeys?: {
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }[];
  rowCount?: number;
  identifierFields?: string[];
  isJoinTable?: boolean;
  childTables?: string[];
  parentTables?: string[];
  relatedTables?: string[];
  sampleData?: any[];
}

// SQL Query Generation Types
export interface QueryGenerationRequest {
  question: string;
  context?: string;
  attemptCount?: number;
}

export interface QueryGenerationResult {
  query: string;
  reasoning: string;
  success: boolean;
  errorMessage?: string;
}