export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date | string;
}

export interface Session {
  id: number;
  title: string;
  createdAt: Date | string;
}

export interface SendMessageRequest {
  sessionId: number;
  content: string;
}

export interface SendMessageResponse {
  message?: string;
  content?: string;
  response?: string;
  error?: string;
}
