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

export interface UserEntitlements {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  features: {
    uploads_enabled: boolean;
    upload_size_limit_mb: number;
    daily_upload_limit: number;
    frontier_models: boolean;
    model_picker: boolean;
    advanced_tools: boolean;
  };
  rate_limits: {
    requests_per_minute: number;
    tokens_per_day: number;
  };
}