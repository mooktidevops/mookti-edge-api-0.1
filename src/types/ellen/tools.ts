import { UserEntitlements } from './entitlements';

export interface ToolDefinition {
  name: string;
  request_schema: string;
  response_schema: string;
  default_model_tier: 'S' | 'M' | 'L' | 'F';
  escalate_if?: {
    condition: string;
    to_tier: 'M' | 'L' | 'F';
  };
}

export interface ToolRegistry {
  formative_only: boolean;
  blocked_fields: string[];
  tools: ToolDefinition[];
  routing_default_loop: string[];
}

export interface ToolRequest {
  tool_name: string;
  payload: any;
  user_id?: string;
  session_id?: string;
  entitlements?: UserEntitlements;
}

export interface ToolResponse {
  tool_name: string;
  success: boolean;
  response?: any;
  error?: string;
  meta?: {
    model_tier?: 'S' | 'M' | 'L' | 'F';
    latency_ms?: number;
    tokens_used?: number;
  };
}