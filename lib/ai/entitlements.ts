import { AIProvider } from './providers';
import { ModelConfig } from './models';

// User entitlement levels
export type EntitlementTier = 'free' | 'basic' | 'pro' | 'enterprise';

// Entitlement configuration
export interface EntitlementConfig {
  tier: EntitlementTier;
  allowedProviders: AIProvider[];
  allowedModelTiers: ModelConfig['tier'][];
  maxRequestsPerDay: number;
  maxTokensPerRequest: number;
  maxTokensPerMonth: number;
  features: {
    ragEnabled: boolean;
    toolsEnabled: boolean;
    visionEnabled: boolean;
    customSystemPrompts: boolean;
    priorityQueue: boolean;
  };
}

// Default entitlement configurations
export const entitlementConfigs: Record<EntitlementTier, EntitlementConfig> = {
  free: {
    tier: 'free',
    allowedProviders: ['anthropic'], // Limited to one provider
    allowedModelTiers: [1 as ModelConfig['tier']],
    maxRequestsPerDay: 50,
    maxTokensPerRequest: 2000,
    maxTokensPerMonth: 50000,
    features: {
      ragEnabled: false,
      toolsEnabled: false,
      visionEnabled: false,
      customSystemPrompts: false,
      priorityQueue: false,
    },
  },
  basic: {
    tier: 'basic',
    allowedProviders: ['anthropic', 'openai'],
    allowedModelTiers: [1 as ModelConfig['tier'], 2 as ModelConfig['tier']],
    maxRequestsPerDay: 500,
    maxTokensPerRequest: 4000,
    maxTokensPerMonth: 500000,
    features: {
      ragEnabled: true,
      toolsEnabled: true,
      visionEnabled: false,
      customSystemPrompts: false,
      priorityQueue: false,
    },
  },
  pro: {
    tier: 'pro',
    allowedProviders: ['anthropic', 'openai', 'google'],
    allowedModelTiers: [1 as ModelConfig['tier'], 2 as ModelConfig['tier'], 3 as ModelConfig['tier']],
    maxRequestsPerDay: 2000,
    maxTokensPerRequest: 8000,
    maxTokensPerMonth: 2000000,
    features: {
      ragEnabled: true,
      toolsEnabled: true,
      visionEnabled: true,
      customSystemPrompts: true,
      priorityQueue: true,
    },
  },
  enterprise: {
    tier: 'enterprise',
    allowedProviders: ['anthropic', 'openai', 'google'],
    allowedModelTiers: [1 as ModelConfig['tier'], 2 as ModelConfig['tier'], 3 as ModelConfig['tier'], 4 as ModelConfig['tier']],
    maxRequestsPerDay: 10000,
    maxTokensPerRequest: 32000,
    maxTokensPerMonth: 10000000,
    features: {
      ragEnabled: true,
      toolsEnabled: true,
      visionEnabled: true,
      customSystemPrompts: true,
      priorityQueue: true,
    },
  },
};

// Check if a user can access a specific model
export function canAccessModel(
  userTier: EntitlementTier,
  modelConfig: ModelConfig
): boolean {
  const entitlement = entitlementConfigs[userTier];
  
  // Check provider access
  if (!entitlement.allowedProviders.includes(modelConfig.provider)) {
    return false;
  }
  
  // Check model tier access
  if (modelConfig.tier && !entitlement.allowedModelTiers.includes(modelConfig.tier)) {
    return false;
  }
  
  // Check vision capability if model requires it
  if (modelConfig.capabilities.vision && !entitlement.features.visionEnabled) {
    return false;
  }
  
  return true;
}

// Get user's entitlement configuration
export function getUserEntitlement(userTier: EntitlementTier): EntitlementConfig {
  return entitlementConfigs[userTier];
}

// Filter available models based on user entitlements
export function getEntitledModels(
  userTier: EntitlementTier,
  allModels: ModelConfig[]
): ModelConfig[] {
  return allModels.filter(model => canAccessModel(userTier, model));
}

// Usage tracking interface
export interface UsageMetrics {
  userId: string;
  date: string;
  requestCount: number;
  tokenCount: number;
  byProvider: Record<AIProvider, {
    requests: number;
    tokens: number;
  }>;
  byModel: Record<string, {
    requests: number;
    tokens: number;
  }>;
}

// Check if user has exceeded limits
export function checkUsageLimits(
  userTier: EntitlementTier,
  currentUsage: UsageMetrics,
  requestTokens: number
): { allowed: boolean; reason?: string } {
  const entitlement = entitlementConfigs[userTier];
  
  // Check daily request limit
  if (currentUsage.requestCount >= entitlement.maxRequestsPerDay) {
    return { allowed: false, reason: 'Daily request limit exceeded' };
  }
  
  // Check per-request token limit
  if (requestTokens > entitlement.maxTokensPerRequest) {
    return { allowed: false, reason: 'Request token limit exceeded' };
  }
  
  // Check monthly token limit (assuming currentUsage.tokenCount is monthly)
  if (currentUsage.tokenCount + requestTokens > entitlement.maxTokensPerMonth) {
    return { allowed: false, reason: 'Monthly token limit exceeded' };
  }
  
  return { allowed: true };
}