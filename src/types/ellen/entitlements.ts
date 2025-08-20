export interface PlanTier {
  name: 'free' | 'basic' | 'pro' | 'enterprise';
  display_name: string;
  features: PlanFeatures;
  rate_limits: RateLimits;
  model_access: ModelAccess;
}

export interface PlanFeatures {
  uploads_enabled: boolean;
  upload_size_limit_mb: number;
  daily_upload_limit: number;
  upload_total_storage_gb: number;
  frontier_models: boolean;
  model_picker: boolean;
  advanced_tools: string[];
  socratic_depth: number;
  revision_scheduler: boolean;
  concept_maps: boolean;
  worked_examples: boolean;
  peer_instruction: boolean;
}

export interface RateLimits {
  requests_per_minute: number;
  requests_per_hour: number;
  tokens_per_day: number;
  uploads_per_day: number;
}

export interface ModelAccess {
  default_tier: 'S' | 'M' | 'L';
  available_tiers: Array<'S' | 'M' | 'L' | 'F'>;
  escalation_allowed: boolean;
}

export interface UserEntitlements {
  user_id: string;
  plan: PlanTier;
  usage: {
    requests_today: number;
    tokens_today: number;
    uploads_today: number;
    storage_used_mb: number;
  };
  overrides?: Partial<PlanFeatures>;
}