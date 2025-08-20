export * from './socratic';
export * from './formative';
export * from './entitlements';
export * from './tools';

export type ModelTier = 'S' | 'M' | 'L' | 'F';

export interface Citation {
  title: string;
  source: string;
  loc?: string;
  is_user_source?: boolean;
}

export interface RetrievalSnippet {
  text: string;
  citation: string;
  score?: number;
  metadata?: Record<string, any>;
}

export interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  meta?: {
    model_tier?: ModelTier;
    latency_ms?: number;
    tokens_used?: number;
  };
}