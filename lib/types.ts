// Type definitions for Mookti Edge API

export interface ClaudeRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ClaudeResponse {
  content: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface SearchRequest {
  query: string;
  topK?: number;
  filter?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}