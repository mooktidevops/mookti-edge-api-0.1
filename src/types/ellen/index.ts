export * from './socratic';
export * from './formative';
export type { 
  PlanTier, 
  PlanFeatures, 
  RateLimits, 
  ModelAccess,
  UserEntitlements
} from './entitlements';
export type { 
  ToolDefinition,
  ToolRegistry,
  ToolRequest,
  ToolResponse
} from './tools';

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